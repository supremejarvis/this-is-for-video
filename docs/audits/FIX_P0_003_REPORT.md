# Apollo Engineering — Security Remediation Report: P0-003

## 1. Final Status & Executive Summary
- **Finding ID**: `P0-003`
- **Vulnerability**: Unauthorized OWNER Account Auto-Provisioning / Privilege Escalation in Admin Login API
- **Severity**: Critical (OWASP A01: Broken Access Control / Privilege Escalation)
- **Final Status**: **FIXED AND VERIFIED**
- **Date**: 2026-09-13
- **Branch**: `fix/admin-security-and-audit-remediation`

---

## 2. Root Cause
In `backend/app/api/v1/endpoints/auth.py` (`POST /api/v1/auth/admin-login`), the endpoint was architected with an emergency auto-provisioning fallback:
```python
stmt = select(User).where(User.email == normalized_email)
user = (await db.execute(stmt)).scalar_one_or_none()
if not user:
    user = User(
        email=normalized_email,
        password_hash=settings.ADMIN_PASSWORD_HASH or hash_password(payload.password),
        full_name="Apollo Engineering Administrator",
        role=UserRole.OWNER,
        is_active=True,
        mfa_enabled=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
```
When an unauthenticated caller submitted a request to `/api/v1/auth/admin-login` with credentials matching `ADMIN_PASSWORD_HASH` and `ADMIN_TOTP_SECRET` (or if any unknown email was processed), the server manufactured and persisted a brand-new `UserRole.OWNER` account directly into the database. Furthermore, existing non-admin users (such as customers or non-owner staff) were not pre-validated against an authorized role whitelist prior to session binding.

---

## 3. Vulnerable Flow Before Fix
1. Caller submits `POST /api/v1/auth/admin-login` with arbitrary/unknown email, matching master password hash and TOTP.
2. Server verified password against `settings.ADMIN_PASSWORD_HASH` and TOTP against `settings.ADMIN_TOTP_SECRET`.
3. Server looked up user in DB: `stmt = select(User).where(User.email == normalized_email)`.
4. If user was `None`, server executed `user = User(role=UserRole.OWNER, ...) ; db.add(user) ; await db.commit()`.
5. Server created a privileged `UserSession` and returned an authenticated administrative session with full `OWNER` permissions.
6. Result: External actors could self-provision root-level `OWNER` accounts on demand.

---

## 4. Secure Flow After Fix
Under the foundational security invariant:
> **LOGIN AUTHENTICATES EXISTING ACCOUNTS. LOGIN NEVER CREATES PRIVILEGED ACCOUNTS.**

The new, hardened flow operates as follows:
1. Caller submits `POST /api/v1/auth/admin-login`.
2. **Rate Limit**: Checked against database sliding window (`AuthService.check_rate_limit`).
3. **Database Lookup**: Queries existing user record by normalized email from PostgreSQL/SQLite.
4. **Existence Gate**: If user does NOT exist:
   - Performs constant-time dummy password verification (`verify_password(payload.password, DUMMY_PASSWORD_HASH)`) to prevent timing enumeration.
   - Logs sanitized `LOGIN_FAILURE` audit log with `error_code="USER_NOT_FOUND"`.
   - Rejects immediately with **HTTP 401 Unauthorized (`"Invalid credentials"`)**.
   - **Zero user, zero role, zero session, zero cookie created.**
5. **Status Verification**: Checks `user.is_active` and `not user.is_archived`. If inactive/archived, rejects with HTTP 401 (`"Invalid credentials"`).
6. **Strict Role Verification**: Checks `user.role in {UserRole.OWNER}`. If user has any other role (e.g. `CUSTOMER`, `SUPPORT`, `CATALOG_MANAGER`, `FINANCE`, `AUDITOR`), rejects with HTTP 401 (`"Invalid credentials"`).
7. **Lockout Check**: Checks `user.locked_until`. If locked, rejects with HTTP 401 (`"Invalid credentials"`).
8. **Credential Verification**:
   - Verifies password against `user.password_hash` (or secure `ADMIN_PASSWORD_HASH` override).
   - Verifies 6-digit TOTP against `user.mfa_secret` (or secure `ADMIN_TOTP_SECRET` override).
   - If invalid: increments `failed_login_attempts`, sets 15-minute lock if threshold exceeded, logs failure, and rejects with HTTP 401 (`"Invalid credentials"`).
9. **Authenticated Session**: Only a verified, active `OWNER` receives a new session bound to their existing `user.id`.
10. **Cookies Issued**: Sets HttpOnly SameSite `ape_session` and `ape_csrf` cookies.

---

## 5. Files Changed
1. **`backend/app/api/v1/endpoints/auth.py`**:
   - Completely deleted all `db.add(user)` and `User(...)` creation logic from `admin_login`.
   - Enforced pre-authentication existence lookup and timing-equalized rejection helper.
   - Added strict `UserRole.OWNER` authorization check.
   - Standardized all failure responses to HTTP 401 with generic `"Invalid credentials"`.
2. **`backend/app/models/auth.py`**:
   - Added `CUSTOMER = "CUSTOMER"` to `UserRole` enum to distinctly separate customer identities from staff and owners.
3. **`backend/app/schemas/auth.py`**:
   - Enforced `model_config = ConfigDict(extra="forbid")` on `AdminLoginRequest` and `UserLoginRequest` to reject mass-assignment payloads.
4. **`backend/tests/unit/test_auth_endpoints.py`**:
   - Updated existing tests (`test_admin_login_success_and_failures`, `test_admin_login_denies_universal_bypass_and_old_backdoor`) to pre-seed owners rather than relying on auto-provisioning.
   - Added dedicated P0-003 test suite covering tests `A` through `H`.

---

## 6. Privileged Auto-Provisioning Removed
- Active source code in `backend/app/api/v1/endpoints/auth.py` contains **ZERO** occurrences of `User(` or `db.add(user)`.
- Public admin-login route contains **ZERO** logic capable of writing, promoting, or bootstrapping a user account.
- Owner creation is strictly decoupled from authentication and restricted to:
  1. Secure server-side CLI: `python -m app.cli.seed_owner`
  2. Safe startup one-time provisioning: `backend/app/main.py` (which only acts if the database has zero existing owners and `ADMIN_INIT_PASSWORD` is supplied in the environment).

---

## 7. Role Validation
Admin login explicitly validates the user's role against `{UserRole.OWNER}`:
- Attempt with non-existent user → HTTP 401 (`"Invalid credentials"`)
- Attempt with `CUSTOMER` user → HTTP 401 (`"Invalid credentials"`), role remains `CUSTOMER`
- Attempt with non-owner staff roles (`CATALOG_MANAGER`, `INVENTORY_MANAGER`, `ORDER_OPERATIONS`, `FINANCE`, `SUPPORT`, `AUDITOR`) → HTTP 401 (`"Invalid credentials"`), role remains unchanged
- Attempt with inactive/archived `OWNER` → HTTP 401 (`"Invalid credentials"`)
- Attempt with genuine active `OWNER` + correct password + valid TOTP → HTTP 200 Success

---

## 8. Database Side-Effect Test
Validated in automated test `test_p0_003_a_unknown_email_rejects_and_leaves_user_count_unchanged` and `test_p0_003_b_unknown_email_with_valid_password_creates_no_owner`:
- `users_before` recorded prior to request.
- Request sent with unknown email and valid master password / TOTP.
- `users_after` recorded after request.
- **Result**: `users_after == users_before`.
- Verified no `User`, `UserSession`, `Role`, or `Owner` record was created for the identity.

---

## 9. Mass Assignment Test
Validated in automated test `test_p0_003_d_mass_assignment_role_injection_rejected`:
- Malicious payload submitted:
  ```json
  {
    "email": "hacker@injection.test",
    "password": "Password123456!",
    "totp_code": "123456",
    "role": "OWNER",
    "is_superuser": true,
    "is_admin": true
  }
  ```
- **Result**: Pydantic schema validation rejects extra fields (`extra="forbid"`) with **HTTP 422 Unprocessable Entity**.
- Zero database rows created, zero privilege escalation.

---

## 10. Session Security Test
Validated in automated test `test_p0_003_g_failed_authentication_creates_no_session_or_cookies`:
- `user_sessions` count before failed login recorded.
- Failed authentication attempt submitted.
- `user_sessions` count after request recorded.
- **Result**: `sessions_after == sessions_before`. Response contains no `ape_session` cookie.

---

## 11. Regression Tests
The following dedicated regression tests were executed and passed:
1. **TEST P0-003-A** (`test_p0_003_a_unknown_email_rejects_and_leaves_user_count_unchanged`):
   Unknown email + any password → HTTP 401, user count in database remains unchanged.
2. **TEST P0-003-B** (`test_p0_003_b_unknown_email_with_valid_password_creates_no_owner`):
   Unknown email + valid `ADMIN_PASSWORD_HASH` + valid TOTP → HTTP 401, zero users created.
3. **TEST P0-003-C** (`test_p0_003_c_existing_customer_denied_admin_login_and_role_unchanged`):
   Customer user attempts `/admin-login` → denied with 401, role in DB remains `CUSTOMER`.
4. **TEST P0-003-D** (`test_p0_003_d_mass_assignment_role_injection_rejected`):
   Payload with `role=OWNER` and `is_superuser=True` → rejected with 422, zero privilege escalation.
5. **TEST P0-003-E** (`test_p0_003_e_valid_owner_login_success`):
   Existing active `OWNER` + correct password + valid MFA TOTP → HTTP 200 success with session.
6. **TEST P0-003-F** (`test_p0_003_f_inactive_and_archived_owner_denied`):
   Inactive or archived `OWNER` → denied with HTTP 401.
7. **TEST P0-003-G** (`test_p0_003_g_failed_authentication_creates_no_session_or_cookies`):
   Failed login creates zero database sessions and sets no session cookie.
8. **TEST P0-003-H** (`test_p0_003_staff_roles_without_owner_permission_denied`):
   Parametrized test for all 6 non-owner staff roles (`CATALOG_MANAGER`, `INVENTORY_MANAGER`, `ORDER_OPERATIONS`, `FINANCE`, `SUPPORT`, `AUDITOR`) → denied with HTTP 401.

---

## 12. P0-002 Regression Status
Re-tested all P0-002 security invariants in `test_admin_login_denies_universal_bypass_and_old_backdoor` and frontend security tests:
- Universal TOTP code `123456`: **Fails closed with HTTP 401**
- Universal TOTP code `000000`: **Fails closed with HTTP 401**
- Former backdoor password `NIL@apl321`: **Fails closed with HTTP 401**
- Offline / client-side bypass: **Zero offline bypass logic present**
- Browser storage authority: **Remains purged**
- **Conclusion**: P0-002 fixes remain fully intact with zero regression.

---

## 13. Test Results Summary
| Suite | Command | Result |
| :--- | :--- | :--- |
| **Backend Auth Unit Tests** | `pytest backend/tests/unit/test_auth_endpoints.py` | **19 passed (0 failures)** |
| **Full Backend Unit Tests** | `pytest backend/tests/unit` | **91 passed (0 failures)** |
| **Frontend Unit Tests** | `npm run test:unit` | **17 test files passed (115 passed)** |
| **TypeScript Compilation** | `npm run typecheck` | **Passed (0 errors)** |
| **Production Build** | `npm run build` | **Passed (built in 40.57s)** |
| **Static Code Audit** | `grep_search` active production code | **0 occurrences of user creation in admin-login** |

---

## 14. Remaining Risks
- **Separate Finding in OTP Endpoint (`otp.py`)**: `POST /api/v1/otp/verify` currently auto-creates users with `role=UserRole.SUPPORT` if no user exists for the verified phone number. Per project boundaries, this was not altered in P0-003 (as it does not grant `OWNER` or affect `admin-login`), but should be addressed in subsequent customer-auth hardening tasks by assigning `role=UserRole.CUSTOMER`.
- **Environment Password Rotation**: Operators must ensure that production environments configure strong random secrets for `JWT_SECRET`, `ADMIN_PASSWORD_HASH`, and `ADMIN_TOTP_SECRET` per `SECURITY_SECRET_ROTATION_CHECKLIST.md`.

---

## 15. Final Status
**FIXED AND VERIFIED**

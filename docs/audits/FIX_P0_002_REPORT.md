# Apollo Engineering — Security Remediation Report: P0-002

## 1. Executive Summary & Final Status

- **Finding ID**: `P0-002`
- **Vulnerability**: Super Admin Client-Side Backdoor, Hardcoded Credentials & Universal MFA Bypass
- **Severity**: Critical (CVSS 10.0)
- **Final Status**: **FIXED AND VERIFIED**
- **Date**: 2026-09-13
- **Branch**: `fix/admin-security-and-audit-remediation`

---

## 2. Root Cause Analysis

Prior to remediation, several critical vulnerabilities allowed client-side elevation of privilege and offline administration access:
1. **Client-Side Offline Backdoor**: In `src/components/admin/SuperAdminDashboard.tsx`, network failures caught during admin login checked if the submitted password was equal to a hardcoded string (`NIL@apl321`). If matched with any 6-digit input, the frontend locally manufactured an authenticated admin session (`completeAdminLogin`) with role `SUPER_ADMIN` and `is_superuser: true`.
2. **Browser Storage as Security Authority**: On mount, `SuperAdminDashboard.tsx` checked `sessionStorage.getItem('apollo_admin_session') === 'active'`. If present, it bypassed backend authentication completely and granted full Super Admin capabilities.
3. **Hardcoded Credentials & Hashes**:
   - `SuperAdminDashboard.tsx` contained plaintext references to `NIL@apl321`.
   - `backend/app/core/config.py` set `ADMIN_PASSWORD_HASH` by default to the Argon2id hash of `NIL@apl321`.
   - `backend/app/main.py` executed `async_seed_owner` on every startup, creating or resetting the owner password to `NIL@apl321`.
4. **Universal MFA Bypass**: `backend/app/api/v1/endpoints/auth.py` and `backend/app/core/config.py` contained `ADMIN_DEV_BYPASS_TOTP = True`, accepting universal bypass codes `123456` and `000000` regardless of genuine RFC 6238 TOTP secrets.

---

## 3. Backdoor Code Removed

- **Deleted Offline Fallback**: Removed lines 418–428 in `SuperAdminDashboard.tsx` that checked `cleanPass === 'NIL@apl321' && cleanCode.length === 6` in the `catch` block. Network failure now strictly fails closed, displaying a safe error message and denying access.
- **Deleted Client-Side Privilege Manufacturing**: Removed fallback logic in `completeAdminLogin` that synthesized `{ id: 'u_apollo_admin_master', role: 'SUPER_ADMIN', is_superuser: true }`. The dashboard now strictly requires a verified user object returned by the server.
- **Removed Storage Privilege Bypass**: Removed `sessionStorage.getItem('apollo_admin_session') === 'active'` verification on component mount. Admin access is now strictly determined by calling the FastAPI endpoint `/api/v1/auth/me` with `credentials: 'include'`.
- **Legacy Storage Key Purge**: Added cleanup logic to proactively remove `apollo_admin_session` and `apollo_admin_password` from `localStorage` and `sessionStorage`.

---

## 4. Hardcoded Credentials Removed

- **Frontend Code**: Cleaned all occurrences of hardcoded passwords and secrets from active frontend source code.
- **Backend Configuration**:
  - `ADMIN_PASSWORD_HASH` in `backend/app/core/config.py` now defaults to `None`.
  - `ADMIN_TOTP_SECRET` in `backend/app/core/config.py` now defaults to `None`.
  - Added `ADMIN_INIT_EMAIL` and `ADMIN_INIT_PASSWORD: str | None = None` to support secure environment bootstrap.
- **Startup Seeding (`backend/app/main.py`)**:
  - Removed unconditional seeding with hardcoded credentials on startup.
  - Implemented safe, idempotent one-time provisioning: startup queries the database for any existing `UserRole.OWNER`. If an owner exists, it leaves existing credentials untouched. If no owner exists and `ADMIN_INIT_PASSWORD` is configured in the environment, it provisions the initial owner. Otherwise, it logs a notice directing the operator to run `python -m app.cli.seed_owner`.

---

## 5. MFA / TOTP Changes

- **Universal Bypass Eradication**: Completely removed `ADMIN_DEV_BYPASS_TOTP` from `backend/app/core/config.py` and `backend/app/api/v1/endpoints/auth.py`.
- **Strict RFC 6238 TOTP**: The server verifies the 6-digit TOTP against either `settings.ADMIN_TOTP_SECRET` or the user's database-stored `mfa_secret`. Universal codes (`123456`, `000000`) now fail closed with HTTP 401 Unauthorized.

---

## 6. Session Security Changes

- **Server-Authoritative Sessions**: Authentication authority is owned exclusively by FastAPI via secure, HttpOnly, SameSite cookies (`ape_session`, `ape_csrf`).
- **Zero Browser Authority**: `localStorage` and `sessionStorage` are never used to authorize administrative capabilities or bypass MFA.
- **Fail Closed Architecture**:
  - Network Failure / Offline: Login denied.
  - 401/403 API Response: Login denied.
  - Timeout: Login denied.
  - Forged Browser Storage: Rejected on `/api/v1/auth/me` verification.

---

## 7. Files Changed

1. `src/components/admin/SuperAdminDashboard.tsx`: Removed offline login fallback, removed client-side session creation, enforced `/api/v1/auth/me` session check, purged legacy storage keys.
2. `backend/app/core/config.py`: Removed hardcoded default Argon2id password hash, removed hardcoded TOTP secret default, removed `ADMIN_DEV_BYPASS_TOTP`.
3. `backend/app/main.py`: Replaced startup seeding with safe one-time bootstrap check (never overwrites existing owners).
4. `backend/app/api/v1/endpoints/auth.py`: Removed `ADMIN_DEV_BYPASS_TOTP` check and static codes `123456`/`000000`.
5. `tests/e2e/admin_audit.spec.ts`: Replaced `sessionStorage` spoofing with standard Playwright route mocking of `/api/v1/auth/me`.
6. `backend/tests/unit/test_auth_endpoints.py`: Added regression test `test_admin_login_denies_universal_bypass_and_old_backdoor`.
7. `src/components/admin/__tests__/SuperAdminDashboardSecurity.test.tsx`: Added comprehensive Vitest frontend regression tests.

---

## 8. Regression Tests Added

- **Frontend Regression Suite** (`src/components/admin/__tests__/SuperAdminDashboardSecurity.test.tsx`):
  - `fails closed on mount: sessionStorage alone cannot manufacture authenticated admin state`: Confirms forged storage key does not bypass login.
  - `fails closed on login: network error does not grant offline Super Admin access even with former backdoor password`: Confirms network failure fails closed and old password cannot log in.
  - `authenticates only when backend /api/v1/auth/admin-login returns 200 with verified user profile`: Confirms valid server authentication flow.
- **Backend Regression Suite** (`backend/tests/unit/test_auth_endpoints.py`):
  - `test_admin_login_denies_universal_bypass_and_old_backdoor`:
    - Validates `123456` fails with HTTP 401.
    - Validates `000000` fails with HTTP 401.
    - Validates former backdoor password fails with HTTP 401.

---

## 9. Verification & Test Results

| Suite | Command | Result |
| :--- | :--- | :--- |
| **Frontend Unit Tests** | `npm run test:unit` | **17 passed / 17 test files (115 passed)** |
| **TypeScript Typecheck** | `npm run typecheck` | **Passed (0 errors)** |
| **Production Build** | `npm run build` | **Passed (built in 31.80s)** |
| **Backend Unit Tests** | `pytest backend/tests/unit` | **78 passed (0 failures)** |
| **Static Secret Search** | `grep_search` active code | **0 matches in production code** |

---

## 10. Legitimate Admin Provisioning & Login Method

To access the Apollo Admin Desk after backdoor eradication:
1. **Initial Environment Configuration**:
   Configure the production environment with secure secrets:
   ```bash
   ADMIN_PASSWORD_HASH="<argon2id_hash_of_secure_password>"
   ADMIN_TOTP_SECRET="<base32_rfc6238_secret>"
   ```
2. **CLI Provisioning (Alternative/Recommended)**:
   Run the dedicated administrative provisioning script:
   ```bash
   python -m app.cli.seed_owner --email admin@apolloengineering.co.in --name "Apollo Administrator"
   ```
   *(Prompts securely for password without storing credentials in source control or command logs)*.
3. **Login Flow**:
   - Navigate to `/admin`
   - Enter administrator email and password
   - Advance to MFA prompt and enter genuine 6-digit code generated from Google Authenticator
   - FastAPI issues authenticated `ape_session` and `ape_csrf` cookies.

---

## 11. Remaining Risks & P0-003 Boundary

- **P0-003 Scope Boundary**:
  - `P0-003` concerns the backend admin-login endpoint auto-provisioning `UserRole.OWNER` accounts when a non-existent email is submitted with valid credentials matching `ADMIN_PASSWORD_HASH`.
  - While `ADMIN_DEV_BYPASS_TOTP` and hardcoded config defaults were removed in P0-002, the remaining auto-provisioning logic in `backend/app/api/v1/endpoints/auth.py` lines 180–233 is slated for dedicated remediation in **P0-003**.
  - `P0-003` is NOT marked fixed in this work and will be addressed in its dedicated phase.

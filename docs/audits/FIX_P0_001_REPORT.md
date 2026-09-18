# 🛠️ Fix Report: P0-001 — Production Secrets Exposure & Git History Cleanup

**Audit Finding ID**: `P0-001`  
**Severity**: `P0 (Critical)`  
**Remediation Date**: September 13, 2026  
**Final Status**: **`CODE FIXED — CREDENTIAL ROTATION REQUIRED`**

---

## 1. Root Cause

1. **Client-Side Environment & Bundle Leakage**: Sensitive credentials were placed in the root `.env` file with `VITE_` prefixes (`VITE_INDIA_POST_PASSWORD`, `VITE_MSG91_AUTH_KEY`, `VITE_MSG91_WIDGET_TOKEN`), causing Vite's build compiler to bundle private carrier passwords and API keys into publicly accessible browser JavaScript assets.
2. **Hardcoded Fallbacks in Frontend Constants**: [`src/constants/index.ts`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/src/constants/index.ts) contained hardcoded fallback strings for India Post CEPT passwords (`Dop@[REDACTED]`), MSG91 auth keys (`561266ADm[REDACTED]`), and live Razorpay key IDs (`rzp_live_[REDACTED]`).
3. **Hardcoded Fallback in Contact Form**: [`src/components/Contact.tsx`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/src/components/Contact.tsx) and [`src/services/apiService.ts`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/src/services/apiService.ts) contained hardcoded Web3Forms fallback keys (`aca2959e-[REDACTED]`).
4. **Direct Client-to-Provider HTTP Calls**: [`src/services/msg91OtpService.ts`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/src/services/msg91OtpService.ts) and [`src/services/ceptIndiaPostService.ts`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/src/services/ceptIndiaPostService.ts) initiated outbound `fetch` calls containing private authentication credentials directly from the client, bypassing backend mediation.
5. **Tracked Secrets in Git History**: Commit `7839244` committed `vitest_out.txt` and `vitest_final.txt` containing live MSG91 auth keys in test output query strings. Commit `ec8fbd1` committed `scratch/test_msg91.py` containing live MSG91 authentication keys. Additionally, `backend/apollo_ecommerce.db` was committed into Git tracking.

---

## 2. Files Changed

| File Path | Nature of Change |
| :--- | :--- |
| [`.env`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/.env) | **Sanitized**: Stripped all private keys (`VITE_INDIA_POST_PASSWORD`, `VITE_MSG91_AUTH_KEY`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`). Retained only client-safe public variables. |
| [`.gitignore`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/.gitignore) | **Hardened**: Added exclusions for `backend/.env`, `backend/.env.*`, `*.db`, `*.sqlite`, `*.sqlite3`, `backend/*.db`, as well as test output logs (`vitest_*.txt`, `playwright_*.txt`, `ts_*.txt`, `test_orig.txt`, `summary.txt`). |
| [`.env.example`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/.env.example) | **Updated**: Aligned with clean public client environment variables using non-sensitive placeholders. |
| [`backend/.env.example`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/.env.example) | **Updated**: Standardized all backend service configuration placeholders (`JWT_SECRET`, `MSG91_AUTH_KEY`, `INDIA_POST_PASSWORD`, etc.). |
| [`backend/app/core/config.py`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/app/core/config.py) | **Updated**: Added explicit Pydantic `Settings` fields for `RAZORPAY_WEBHOOK_SECRET`, `JWT_SECRET`, `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, and India Post CEPT credentials without hardcoded secret defaults. |
| [`backend/app/api/v1/endpoints/payments.py`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/app/api/v1/endpoints/payments.py) | **Hardened**: Validates Razorpay webhook signatures against configured `RAZORPAY_WEBHOOK_SECRET` with fallback to `RAZORPAY_KEY_SECRET`. |
| [`src/constants/index.ts`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/src/constants/index.ts) | **Sanitized**: Removed hardcoded CEPT passwords, MSG91 auth keys, and Razorpay fallback keys. |
| [`src/services/msg91OtpService.ts`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/src/services/msg91OtpService.ts) | **Refactored**: Removed all client-side auth keys; rerouted OTP send and verification exclusively through FastAPI `/api/v1/auth/otp/*`. |
| [`src/services/ceptIndiaPostService.ts`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/src/services/ceptIndiaPostService.ts) | **Sanitized**: Removed client-side fallback credentials from `CEPT_DEFAULT_CONFIG`. |
| [`src/components/Contact.tsx`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/src/components/Contact.tsx) | **Sanitized**: Removed hardcoded Web3Forms fallback access key string. |
| [`src/services/apiService.ts`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/src/services/apiService.ts) | **Sanitized**: Removed hardcoded Web3Forms fallback access key string. |
| [`vite.config.ts`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/vite.config.ts) | **Hardened**: Removed `/api/msg91` reverse proxy rule that previously forwarded client-supplied auth keys. |
| [`SECURITY_SECRET_ROTATION_CHECKLIST.md`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/SECURITY_SECRET_ROTATION_CHECKLIST.md) | **Created**: Comprehensive action checklist covering all credential providers requiring manual rotation. |
| [`vitest_out.txt`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/vitest_out.txt) & [`vitest_final.txt`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/vitest_final.txt) | **Untracked from Git**: Removed from index (`git rm --cached`). |
| [`scratch/test_msg91.py`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/scratch/test_msg91.py) | **Deleted from Git**: Untracked and removed exposed script containing hardcoded auth keys. |
| [`backend/apollo_ecommerce.db`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/backend/apollo_ecommerce.db) | **Untracked from Git**: Removed SQLite database file from Git index (`git rm --cached`). |

---

## 3. Sensitive Variables Moved Server-Side

The following variables have been completely removed from client-side visibility and are strictly confined to `backend/.env` and FastAPI `Settings`:

1. `RAZORPAY_KEY_SECRET`
2. `RAZORPAY_WEBHOOK_SECRET`
3. `MSG91_AUTH_KEY`
4. `MSG91_TEMPLATE_ID`
5. `MSG91_WIDGET_TOKEN`
6. `INDIA_POST_PASSWORD`
7. `INDIA_POST_USERNAME`
8. `INDIA_POST_CUSTOMER_ID`
9. `INDIA_POST_CONTRACT_ID`
10. `INDIA_POST_DROPOFF_OFFICE_ID`
11. `MONGODB_URI`
12. `JWT_SECRET`
13. `ADMIN_PASSWORD_HASH`
14. `ADMIN_TOTP_SECRET`

Only public client variables (`VITE_RAZORPAY_KEY_ID`, `VITE_ORIGIN_PINCODE`, `VITE_ORIGIN_HUB_NAME`, `VITE_ORIGIN_STATE_CODE`, `VITE_MSG91_WIDGET_ID`, `VITE_WEB3FORMS_ACCESS_KEY`, `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`) remain in the frontend `.env`.

---

## 4. Git Tracking Changes

* `git rm scratch/test_msg91.py` successfully removed the hardcoded key script.
* `git rm --cached backend/apollo_ecommerce.db` untracked the local database without deleting local developer data.
* `git rm --cached vitest_out.txt vitest_final.txt` untracked test logs containing raw MSG91 auth keys.
* `git rm --cached playwright_admin*.txt test_orig.txt summary.txt ts_*.txt` untracked test dump files.
* `git ls-files | findstr /i "\.env$"` confirms that **zero** `.env` files with secrets are tracked in Git. Only `.env.example` and `backend/.env.example` remain.

---

## 5. Git History Status

* **Backup Point Created**: Branch `security/pre-p0-001-backup` at commit `f8dec98d317e0a5ea534166b92116c966d0c1cc5`.
* **Identified Historical Commits**:
  - Commit `7839244` (committed `vitest_out.txt` and `vitest_final.txt` with auth keys in URL parameters).
  - Commit `ec8fbd1` (committed `scratch/test_msg91.py` with hardcoded auth keys).
* **Status**: **`MANUAL REMOTE HISTORY REWRITE REQUIRED`**  
  Because rewriting remote history modifies commit SHAs across branches, a forced push must not be performed automatically. The safe scrubbing command sequence is provided below.

### Safe History Scrubbing Sequence
```bash
# 1. Install git-filter-repo in Python environment
pip install git-filter-repo

# 2. Filter out sensitive files across all commits:
git filter-repo --invert-paths \
  --path scratch/test_msg91.py \
  --path backend/apollo_ecommerce.db \
  --path vitest_out.txt \
  --path vitest_final.txt \
  --force

# 3. Verify that the files no longer appear in history:
git log --all --full-history -- "scratch/test_msg91.py" "backend/apollo_ecommerce.db" "vitest_out.txt" "vitest_final.txt"

# 4. Push rewritten history to remote repository (Requires explicit user authorization):
# git push origin --force --all
```

---

## 6. Credential Rotation Required

An actionable provider checklist has been created in:  
👉 [`SECURITY_SECRET_ROTATION_CHECKLIST.md`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/SECURITY_SECRET_ROTATION_CHECKLIST.md)

### Summary of Keys Requiring Manual Rotation:
1. **Razorpay Live API Key Pair** (`rzp_live_[REDACTED]`)
2. **Razorpay Webhook HMAC Secret** (`whsec_[REDACTED]`)
3. **MSG91 Auth Keys** (`561266ADm[REDACTED]`, `561266TAI[REDACTED]`)
4. **India Post CEPT Portal Password** (`Dop@[REDACTED]`)
5. **MongoDB Atlas Cluster Password** (`apollo_user`)
6. **PostgreSQL Production Password**
7. **JWT Signing Secret**
8. **Admin TOTP 2FA Secret**
9. **Web3Forms Access Key** (`aca2959e-[REDACTED]`)

---

## 7. Tests Run & Results

1. **TypeScript Typecheck**:
   * Command: `npm run typecheck` (`tsc --noEmit`)
   * Result: **PASSED (Exit code 0)** — Zero type errors.
2. **Frontend Vitest Suite**:
   * Command: `npm run test:unit`
   * Result: **PASSED (16 test files, 112 tests passed)** — All suites including `msg91OtpService.test.ts`, `ceptIndiaPostService.test.ts`, `razorpayService.test.ts`, `CartDrawerCheckout.test.tsx`, and `AuthModal.test.tsx` passed.
3. **Vite Production Build**:
   * Command: `npm run build`
   * Result: **PASSED (Exit code 0)** — Production assets compiled into `dist/`.
4. **Backend Pytest Suite**:
   * Command: `backend/.venv/Scripts/python -m pytest backend/tests/unit`
   * Result: **PASSED (77 unit tests passed, 0 failures)**.

---

## 8. Remaining Risk & Manual Actions Required

1. **Active Leaked Credentials in Provider Systems**: Until rotated in the Razorpay, MSG91, India Post, and Web3Forms portals, the old credentials could still be active. Follow [`SECURITY_SECRET_ROTATION_CHECKLIST.md`](file:///c:/Users/patel/OneDrive/Desktop/PRAVIN/web/SECURITY_SECRET_ROTATION_CHECKLIST.md).
2. **Remote Git History**: Run the `git filter-repo` sequence documented above when ready to scrub remote GitHub history.

---

## 9. Final Status

### **`CODE FIXED — CREDENTIAL ROTATION REQUIRED`**
All source code vulnerabilities, client bundle leaks, and file tracking issues for `P0-001` are resolved, verified by automated tests, and documented.

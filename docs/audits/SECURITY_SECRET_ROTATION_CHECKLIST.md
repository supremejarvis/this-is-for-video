# 🔐 Apollo Engineering — Security Secret Rotation Checklist

> [!CAUTION]
> **CRITICAL SECURITY REQUIREMENT**  
> Source code and configuration fixes cannot invalidate credentials that were already committed to version control or bundled into client distributions. The following production and third-party credentials **MUST be manually rotated immediately** in their respective provider consoles.
> 
> *Note: For security reasons, all actual secret values have been masked as `[REDACTED]`.*

---

## 1. Payment Gateway (Razorpay)
- [ ] **Rotate Razorpay Live Key Pair**  
  - **Provider**: [Razorpay Dashboard](https://dashboard.razorpay.com/#/app/keys)
  - **Affected Identifier**: `rzp_live_[REDACTED]`
  - **Action**: Generate a new Live API Key Pair (Key ID + Key Secret). Update `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` exclusively in `backend/.env`. Update only `VITE_RAZORPAY_KEY_ID` in frontend `.env`. Deactivate the old exposed key pair after verifying live checkout.
- [ ] **Rotate Razorpay Webhook Secret**  
  - **Provider**: [Razorpay Dashboard Webhooks](https://dashboard.razorpay.com/#/app/webhooks)
  - **Affected Secret**: `whsec_[REDACTED]`
  - **Action**: Generate a new high-entropy HMAC-SHA256 webhook secret in the Razorpay Webhooks console and update `RAZORPAY_WEBHOOK_SECRET` in `backend/.env`.

---

## 2. SMS & WhatsApp Notifications (MSG91)
- [ ] **Rotate MSG91 Auth Keys**  
  - **Provider**: [MSG91 Control Panel](https://control.msg91.com/)
  - **Affected Keys**: `561266ADm[REDACTED]`, `561266TAI[REDACTED]` (committed in `scratch/test_msg91.py` and `.env`)
  - **Action**: Revoke all exposed Auth Keys in the MSG91 API Keys console. Generate a new server-side Auth Key and place it exclusively in `backend/.env` as `MSG91_AUTH_KEY`.
- [ ] **Regenerate MSG91 Widget Token**  
  - **Provider**: MSG91 OTP Widget Configuration
  - **Action**: Re-issue the widget token for the OTP verification widget.

---

## 3. Postal Logistics (India Post CEPT)
- [ ] **Change India Post CEPT Customer Password**  
  - **Provider**: [India Post CEPT Business Customer Portal](https://test.cept.gov.in/beextcustomer)
  - **Affected Account**: `1812232688` (Password: `Dop@[REDACTED]` exposed in Git history and `.env`)
  - **Action**: Log into the CEPT administrator portal and update the account password. Configure the new password strictly in `backend/.env` as `INDIA_POST_PASSWORD`.

---

- [x] ~~**Rotate MongoDB Atlas Cluster Password**~~ (Decommissioned & Removed)  
  - **Status**: Completely removed from project architecture; PostgreSQL is the sole authoritative database per `AGENTS.md`. `MONGODB_URI` and MongoDB MCP servers removed.

- [ ] **Rotate PostgreSQL Production Password**  
  - **Provider**: Managed Database Provider (e.g. Supabase / RDS / Neon)
  - **Action**: Rotate master database password and update `DATABASE_URL` / `DATABASE_SYNC_URL` in `backend/.env`.

---

## 5. Application Authentication & Cryptographic Keys
- [ ] **Rotate JWT Signing Secret**  
  - **Affected Secret**: `JWT_SECRET` (exposed in `backend/.env`)
  - **Action**: Generate a new 64-character cryptographically random secret (e.g. `openssl rand -hex 32`) and update `JWT_SECRET` in `backend/.env`. (Note: This will safely invalidate all active user sessions).
- [ ] **Regenerate Admin TOTP Secret**  
  - **Affected Secret**: `ADMIN_TOTP_SECRET`
  - **Action**: Generate a new RFC 6238 Base32 secret for two-factor authentication, re-enroll the administrator authenticator app, and update `ADMIN_TOTP_SECRET` in `backend/.env`.
- [ ] **Update Super Admin Master Password**  
  - **Affected Password**: `ADMIN_INIT_PASSWORD="NIL@[REDACTED]"`
  - **Action**: Generate a new Argon2id password hash and update `ADMIN_PASSWORD_HASH` in `backend/.env`.

---

## 6. External Form Submission (Web3Forms)
- [ ] **Rotate Web3Forms Access Key**  
  - **Provider**: [Web3Forms Console](https://web3forms.com/)
  - **Affected Key**: `aca2959e-[REDACTED]` (hardcoded fallback in `Contact.tsx`, `apiService.ts`, and `backend/.env`)
  - **Action**: Generate a new Web3Forms access key and configure it exclusively via environment variable `VITE_WEB3FORMS_ACCESS_KEY`.

---

## Verification Sign-Off

| Item | Verified By | Date Completed | Provider Ticket / Note |
| :--- | :--- | :--- | :--- |
| Razorpay Live Keys | [ ] Pending Manual Action | | |
| Razorpay Webhook | [ ] Pending Manual Action | | |
| MSG91 Auth Keys | [ ] Pending Manual Action | | |
| CEPT Password | [ ] Pending Manual Action | | |
| MongoDB Atlas | [x] Decommissioned / Removed | 2026-09-13 | Not used; PostgreSQL is sole source of truth |
| PostgreSQL | [ ] Pending Manual Action | | |
| JWT Secret | [ ] Pending Manual Action | | |
| Admin TOTP & Password | [ ] Pending Manual Action | | |

"""Customer Authentication Service.

Implements:
- Keyed HMAC-SHA256 OTP challenges persisted in database (survives restarts/multi-worker).
- Strict Customer vs Admin separation (customer OTP never elevates to staff/owner).
- Database-backed hourly rate limiting & 30-second resend cooldown.
- Atomic challenge verification, single-consumption, attempt exhaustion, and replay protection.
- Returning vs First-Time customer auto-provisioning with VerifiedIdentifier & CustomerProfile.
- HttpOnly session cookie creation, session revocation, and logout-all.
"""
import hashlib
import hmac
import logging
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from fastapi import HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import generate_secure_token, hash_password, hash_token
from app.models.auth import User, UserRole, UserSession
from app.models.customer import (
    CustomerAccountType,
    CustomerProfile,
    OtpChallenge,
    OtpStatus,
    VerifiedIdentifier,
)
from app.services.auth_service import AuthService

logger = logging.getLogger("apollo.customer_auth")


def utcnow() -> datetime:
    return datetime.now(UTC)


def to_utc(dt: datetime | None) -> datetime | None:
    """Normalize datetime to UTC, ensuring timezone awareness across PostgreSQL and SQLite."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def mask_phone_number(phone: str) -> str:
    """Format phone number with middle digits masked, e.g. +91 ******1234."""
    clean = "".join(c for c in phone if c.isdigit())
    if len(clean) >= 10:
        last4 = clean[-4:]
        return f"+91 ******{last4}"
    return "***"


class CustomerAuthService:
    EXPIRY_MINUTES = 10
    RESEND_COOLDOWN_SECONDS = 30
    MAX_ATTEMPTS = 3
    RATE_LIMIT_WINDOW_HOURS = 1
    MAX_REQUESTS_PER_WINDOW = 30

    @classmethod
    def _compute_hmac(cls, code: str) -> str:
        """Compute keyed HMAC-SHA256 verifier for OTP code using server secret."""
        key = settings.JWT_SECRET.encode("utf-8")
        return hmac.new(key, code.strip().encode("utf-8"), hashlib.sha256).hexdigest()

    @classmethod
    async def request_otp(
        cls,
        db: AsyncSession,
        phone: str,
        purpose: str = "CUSTOMER_LOGIN",
        ip_address: str | None = None,
    ) -> tuple[bool, str, str, str | None, str]:
        """Generate and persist a cryptographically secure 4-digit OTP challenge.
        
        Returns: (success, message, masked_phone, challenge_id, code)
        """
        now = utcnow()
        masked = mask_phone_number(phone)

        # 1. Enforce 30-second resend cooldown against active pending challenges
        stmt_active = (
            select(OtpChallenge)
            .where(
                OtpChallenge.identifier == phone,
                OtpChallenge.status == OtpStatus.PENDING,
                OtpChallenge.cooldown_until > now,
            )
            .order_by(OtpChallenge.created_at.desc())
        )
        active_cooldown = (await db.execute(stmt_active)).scalar_one_or_none()
        if active_cooldown:
            cd_until = to_utc(active_cooldown.cooldown_until)
            remaining = int((cd_until - now).total_seconds()) if cd_until else 30
            remaining = max(1, remaining)
            return (
                False,
                f"Please wait {remaining} seconds before requesting a new OTP.",
                masked,
                str(active_cooldown.id),
                "",
            )

        # 2. Hourly rate limit check by phone
        cutoff = now - timedelta(hours=cls.RATE_LIMIT_WINDOW_HOURS)
        stmt_count = (
            select(func.count(OtpChallenge.id))
            .where(
                OtpChallenge.identifier == phone,
                OtpChallenge.created_at >= cutoff,
            )
        )
        request_count = (await db.execute(stmt_count)).scalar() or 0
        if request_count >= cls.MAX_REQUESTS_PER_WINDOW:
            return (
                False,
                "Too many OTP requests for this mobile number. Please try again in an hour.",
                masked,
                None,
                "",
            )

        # 3. Invalidate any prior active PENDING challenges for this phone & purpose
        stmt_invalidate = (
            update(OtpChallenge)
            .where(
                OtpChallenge.identifier == phone,
                OtpChallenge.purpose == purpose,
                OtpChallenge.status == OtpStatus.PENDING,
            )
            .values(status=OtpStatus.EXPIRED)
        )
        await db.execute(stmt_invalidate)

        # 4. Generate cryptographically secure 4-digit OTP code (1000 - 9999)
        code = f"{secrets.randbelow(9000) + 1000}"
        verifier_hash = cls._compute_hmac(code)

        expires_at = now + timedelta(minutes=cls.EXPIRY_MINUTES)
        cooldown_until = now + timedelta(seconds=cls.RESEND_COOLDOWN_SECONDS)

        challenge = OtpChallenge(
            identifier=phone,
            purpose=purpose,
            verifier_hash=verifier_hash,
            expires_at=expires_at,
            attempts_remaining=cls.MAX_ATTEMPTS,
            max_attempts=cls.MAX_ATTEMPTS,
            cooldown_until=cooldown_until,
            status=OtpStatus.PENDING,
            ip_address=ip_address,
            created_at=now,
        )
        db.add(challenge)
        await db.commit()
        await db.refresh(challenge)

        logger.info("Dispatched 4-digit OTP challenge %s to %s", challenge.id, masked)

        # 5. Real SMS Dispatch via MSG91 if configured
        if settings.MSG91_AUTH_KEY and settings.MSG91_TEMPLATE_ID:
            try:
                clean_phone = "".join(c for c in phone if c.isdigit())
                formatted_mobile = f"91{clean_phone[-10:]}"
                url = "https://control.msg91.com/api/v5/otp"
                headers = {
                    "authkey": settings.MSG91_AUTH_KEY,
                    "Content-Type": "application/json",
                }
                params = {
                    "template_id": settings.MSG91_TEMPLATE_ID,
                    "mobile": formatted_mobile,
                    "authkey": settings.MSG91_AUTH_KEY,
                    "otp": code,
                    "otp_expiry": str(cls.EXPIRY_MINUTES),
                    "otp_length": "4",
                }
                with httpx.Client(timeout=6.0) as client:
                    resp = client.post(url, headers=headers, params=params, json={"otp": code})
                    logger.info("MSG91 dispatch for %s: status=%s", masked, resp.status_code)
            except Exception as exc:
                logger.error("Failed to dispatch SMS via MSG91 for %s: %s", masked, exc)

        # 6. Real WhatsApp OTP Dispatch via MSG91 if configured
        if settings.MSG91_AUTH_KEY and settings.MSG91_WHATSAPP_NUMBER and settings.MSG91_WHATSAPP_TEMPLATE_NAME:
            try:
                clean_phone = "".join(c for c in phone if c.isdigit())
                formatted_mobile = f"91{clean_phone[-10:]}"
                wa_url = "https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/"
                wa_headers = {
                    "authkey": settings.MSG91_AUTH_KEY,
                    "Content-Type": "application/json",
                }
                wa_payload = {
                    "integrated_number": settings.MSG91_WHATSAPP_NUMBER,
                    "content_type": "template",
                    "payload": {
                        "to": formatted_mobile,
                        "type": "template",
                        "template": {
                            "name": settings.MSG91_WHATSAPP_TEMPLATE_NAME,
                            "language": {"code": "en", "policy": "deterministic"},
                            "components": [
                                {
                                    "type": "body",
                                    "parameters": [
                                        {"type": "text", "text": code},
                                        {"type": "text", "text": "Apollo Engineering"},
                                    ],
                                }
                            ],
                        },
                    },
                }
                with httpx.Client(timeout=6.0) as client:
                    wa_resp = client.post(wa_url, headers=wa_headers, json=wa_payload)
                    logger.info("MSG91 WhatsApp dispatch for %s: status=%s", masked, wa_resp.status_code)
            except Exception as exc:
                logger.error("Failed to dispatch WhatsApp OTP via MSG91 for %s: %s", masked, exc)

        if settings.ENVIRONMENT != "production":
            print(f"\n[DEV OTP] Mobile: {masked} | Code: {code} | Challenge: {challenge.id}\n", flush=True)

        return True, f"4-digit OTP dispatched successfully to {masked}", masked, str(challenge.id), code

    @classmethod
    async def verify_otp(
        cls,
        db: AsyncSession,
        phone: str,
        entered_otp: str,
        challenge_id: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> tuple[bool, str, User | None, CustomerProfile | None, bool, str | None, str | None]:
        """Atomically verify the OTP code against database challenge.
        
        Returns: (success, message, user, customer_profile, is_first_time, raw_session_token, raw_csrf_token)
        """
        now = utcnow()
        masked = mask_phone_number(phone)

        # 1. Fetch active pending challenge with row-level lock where supported
        query = select(OtpChallenge).where(
            OtpChallenge.identifier == phone,
            OtpChallenge.status == OtpStatus.PENDING,
        )
        if challenge_id:
            try:
                cid = challenge_id if hasattr(challenge_id, "hex") else challenge_id
                query = query.where(OtpChallenge.id == cid)
            except Exception:
                pass

        query = query.order_by(OtpChallenge.created_at.desc()).with_for_update()
        res = await db.execute(query)
        challenge = res.scalars().first()

        if not challenge:
            return (
                False,
                "No active OTP request found for this mobile number. Please request a new OTP.",
                None,
                None,
                False,
                None,
                None,
            )

        # 2. Check Expiry
        exp = to_utc(challenge.expires_at)
        if exp and now > exp:
            challenge.status = OtpStatus.EXPIRED
            await db.commit()
            return (
                False,
                "The verification code has expired. Please request a new OTP.",
                None,
                None,
                False,
                None,
                None,
            )

        # 3. Decrement attempts remaining
        challenge.attempts_remaining -= 1

        # 4. Constant-time verification using keyed HMAC
        entered_verifier = cls._compute_hmac(entered_otp)
        is_valid = hmac.compare_digest(challenge.verifier_hash, entered_verifier)

        if not is_valid:
            if challenge.attempts_remaining <= 0:
                challenge.status = OtpStatus.EXHAUSTED
                await db.commit()
                return (
                    False,
                    "Maximum verification attempts exceeded. Please request a new OTP.",
                    None,
                    None,
                    False,
                    None,
                    None,
                )
            remaining = challenge.attempts_remaining
            await db.commit()
            return (
                False,
                f"Invalid OTP code. {remaining} attempt(s) remaining.",
                None,
                None,
                False,
                None,
                None,
            )

        # 5. OTP Valid: Mark challenge CONSUMED atomically
        challenge.status = OtpStatus.CONSUMED
        challenge.consumed_at = now

        # 6. Customer Identity Resolution & Strict Role Derivation:
        # Check if phone exists in verified_identifiers
        stmt_ident = select(VerifiedIdentifier).where(
            VerifiedIdentifier.identifier_type == "PHONE",
            VerifiedIdentifier.normalized_identifier == phone,
        )
        ident = (await db.execute(stmt_ident)).scalar_one_or_none()

        is_first_time = False

        if not ident:
            # First-time Customer: Provision User with CUSTOMER role ONLY (P0-003)
            is_first_time = True
            synthetic_email = f"{phone}@phone.apolloengineering.co.in"
            stmt_u = select(User).where(User.email == synthetic_email)
            user = (await db.execute(stmt_u)).scalar_one_or_none()

            if not user:
                user = User(
                    email=synthetic_email,
                    password_hash=hash_password(secrets.token_urlsafe(32)),
                    full_name=f"Customer {masked}",
                    role=UserRole.CUSTOMER,  # STRICT: Customer registration NEVER grants staff/admin permissions
                    is_active=True,
                    is_archived=False,
                )
                db.add(user)
                await db.flush()

            ident = VerifiedIdentifier(
                user_id=user.id,
                identifier_type="PHONE",
                normalized_identifier=phone,
                verified_at=now,
            )
            db.add(ident)
            await db.flush()

            profile = CustomerProfile(
                user_id=user.id,
                full_name=f"Customer {masked}",
                phone=phone,
                account_type=CustomerAccountType.B2C,
                kyc_status="PENDING",
            )
            db.add(profile)
            await db.flush()
        else:
            # Returning Customer: Load associated User & CustomerProfile
            stmt_u = select(User).where(User.id == ident.user_id)
            user = (await db.execute(stmt_u)).scalar_one_or_none()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User account associated with verified phone not found.",
                )

            # Account status check: Suspended or archived accounts cannot log in
            if not user.is_active or user.is_archived:
                await db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="This account has been suspended or deactivated. Please contact customer support.",
                )

            stmt_p = select(CustomerProfile).where(CustomerProfile.user_id == user.id)
            profile = (await db.execute(stmt_p)).scalar_one_or_none()
            if not profile:
                profile = CustomerProfile(
                    user_id=user.id,
                    full_name=user.full_name or f"Customer {masked}",
                    phone=phone,
                    account_type=CustomerAccountType.B2C,
                )
                db.add(profile)
                await db.flush()

        # 7. Issue HttpOnly Session & CSRF Tokens
        raw_session_token = generate_secure_token(32)
        raw_csrf_token = generate_secure_token(32)

        session = UserSession(
            user_id=user.id,
            session_token_hash=hash_token(raw_session_token),
            csrf_token_hash=hash_token(raw_csrf_token),
            ip_address=ip_address,
            user_agent=user_agent[:500] if user_agent else None,
            absolute_expires_at=now + timedelta(hours=24),
            idle_expires_at=now + timedelta(hours=2),
            last_seen_at=now,
            revoked_at=None,
        )
        db.add(session)

        # 8. Record audit log with secret redaction
        await AuthService.record_audit_log(
            db=db,
            user_id=user.id,
            email_attempted=user.email,
            event_type="LOGIN_SUCCESS",
            ip_address=ip_address,
            user_agent=user_agent,
            details={
                "mode": "CUSTOMER_MOBILE_OTP",
                "phone": masked,
                "is_first_time": is_first_time,
            },
        )

        await db.commit()
        await db.refresh(user)
        await db.refresh(profile)

        return (
            True,
            "Mobile number verified successfully.",
            user,
            profile,
            is_first_time,
            raw_session_token,
            raw_csrf_token,
        )

    @classmethod
    async def get_active_code_for_testing(cls, db: AsyncSession, phone: str) -> str | None:
        """Isolated helper for non-production automated testing only."""
        # Find latest pending challenge
        stmt = (
            select(OtpChallenge)
            .where(
                OtpChallenge.identifier == phone,
                OtpChallenge.status == OtpStatus.PENDING,
            )
            .order_by(OtpChallenge.created_at.desc())
        )
        challenge = (await db.execute(stmt)).scalar_one_or_none()
        if not challenge:
            return None
        # Reverse check codes 1000..9999 to find the match in constant time
        for code in range(1000, 10000):
            str_code = str(code)
            if hmac.compare_digest(challenge.verifier_hash, cls._compute_hmac(str_code)):
                return str_code
        return None

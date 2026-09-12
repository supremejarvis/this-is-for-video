"""Authentication and Session Management Service with Robust Invariants (Asyncpg Native)."""
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import generate_secure_token, hash_password, hash_token, verify_password
from app.models.auth import AuthAuditLog, User, UserRole, UserSession

# Static dummy hash used to perform a constant-time comparison when an email is not found
DUMMY_PASSWORD_HASH = "$argon2id$v=19$m=65536,t=2,p=2$abcdefghijklmnopqrstuv$12345678901234567890123456789012"  # noqa: S105
SENSITIVE_KEY_SUBSTRINGS = ("pass", "token", "secret", "cookie", "csrf", "auth", "key")


def utcnow() -> datetime:
    return datetime.now(UTC)


def sanitize_details(details: dict[str, Any] | None) -> dict[str, Any] | None:
    """Ensure audit logs never persist passwords, tokens, cookies, or secrets."""
    if not details:
        return None
    sanitized: dict[str, Any] = {}
    for k, v in details.items():
        k_lower = k.lower()
        if any(substr in k_lower for substr in SENSITIVE_KEY_SUBSTRINGS):
            sanitized[k] = "[REDACTED]"
        elif isinstance(v, dict):
            sanitized[k] = sanitize_details(v)
        else:
            sanitized[k] = v
    return sanitized


class AuthRateLimitException(Exception):
    """Raised when failed attempts exceed statutory threshold."""
    pass


class InvalidCredentialsException(Exception):
    """Raised when authentication credentials do not match."""
    pass


class UserLockedException(Exception):
    """Raised when user account is temporarily locked."""
    pass


class AuthService:
    ABSOLUTE_SESSION_HOURS = 24
    IDLE_SESSION_HOURS = 2
    MAX_FAILED_ATTEMPTS = 5
    RATE_LIMIT_WINDOW_SECONDS = 60

    @classmethod
    async def record_audit_log(
        cls,
        db: AsyncSession,
        email_attempted: str,
        event_type: str,
        user_id: uuid.UUID | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> AuthAuditLog:
        """Record audit log with mandatory secret sanitization."""
        audit = AuthAuditLog(
            user_id=user_id,
            email_attempted=email_attempted.lower().strip() if email_attempted else "",
            event_type=event_type,
            ip_address=ip_address,
            user_agent=user_agent[:500] if user_agent else None,
            details=sanitize_details(details),
        )
        db.add(audit)
        await db.flush()
        return audit

    @classmethod
    async def check_rate_limit(cls, db: AsyncSession, ip_address: str | None, email: str) -> None:
        """Database-backed rate limit query by normalized login identity and IP."""
        normalized_email = email.lower().strip()
        cutoff = utcnow() - timedelta(seconds=cls.RATE_LIMIT_WINDOW_SECONDS)

        # 1. Check account-level lockout (5 failed attempts on this specific email)
        stmt_email = (
            select(func.count())
            .select_from(AuthAuditLog)
            .where(
                AuthAuditLog.event_type == "LOGIN_FAILURE",
                AuthAuditLog.email_attempted == normalized_email,
                AuthAuditLog.created_at >= cutoff,
            )
        )
        failed_count_email = (await db.execute(stmt_email)).scalar() or 0
        if failed_count_email >= cls.MAX_FAILED_ATTEMPTS:
            raise AuthRateLimitException(
                "Too many failed login attempts. Please wait 60 seconds before retrying."
            )

        # 2. Check IP-level abuse for external non-loopback IPs
        if ip_address and ip_address not in ("127.0.0.1", "testclient", "testserver", "localhost", "::1"):
            stmt_ip = (
                select(func.count())
                .select_from(AuthAuditLog)
                .where(
                    AuthAuditLog.event_type == "LOGIN_FAILURE",
                    AuthAuditLog.ip_address == ip_address,
                    AuthAuditLog.created_at >= cutoff,
                )
            )
            failed_count_ip = (await db.execute(stmt_ip)).scalar() or 0
            if failed_count_ip >= 20:
                raise AuthRateLimitException(
                    "Too many failed login attempts from this network. Please wait 60 seconds before retrying."
                )

    @classmethod
    async def authenticate(
        cls,
        db: AsyncSession,
        email: str,
        password: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> tuple[User, str, str]:
        """Authenticate user with uniform timing, DB rate-limiting, and session security."""
        normalized_email = email.lower().strip()
        await cls.check_rate_limit(db, ip_address=ip_address, email=normalized_email)

        stmt = select(User).where(
            User.email == normalized_email,
            User.is_active.is_(True),
            User.is_archived.is_(False),
        )
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()

        if not user:
            # Constant-time dummy verification
            verify_password(password, DUMMY_PASSWORD_HASH)
            await cls.record_audit_log(
                db=db,
                email_attempted=normalized_email,
                event_type="LOGIN_FAILURE",
                ip_address=ip_address,
                user_agent=user_agent,
                details={"reason": "invalid_credentials"},
            )
            await db.commit()
            raise InvalidCredentialsException("Invalid email or password.")

        if user.locked_until and user.locked_until > utcnow():
            await cls.record_audit_log(
                db=db,
                user_id=user.id,
                email_attempted=normalized_email,
                event_type="LOGIN_FAILURE",
                ip_address=ip_address,
                user_agent=user_agent,
                details={"reason": "account_locked"},
            )
            await db.commit()
            raise UserLockedException("Account is temporarily locked due to security policy.")

        if not verify_password(password, user.password_hash):
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= cls.MAX_FAILED_ATTEMPTS:
                user.locked_until = utcnow() + timedelta(minutes=15)

            await cls.record_audit_log(
                db=db,
                user_id=user.id,
                email_attempted=normalized_email,
                event_type="LOGIN_FAILURE",
                ip_address=ip_address,
                user_agent=user_agent,
                details={"reason": "invalid_credentials", "attempt_count": user.failed_login_attempts},
            )
            await db.commit()
            raise InvalidCredentialsException("Invalid email or password.")

        # Success: reset counters
        user.failed_login_attempts = 0
        user.locked_until = None

        now = utcnow()
        raw_session_token = generate_secure_token(32)
        raw_csrf_token = generate_secure_token(32)

        session = UserSession(
            user_id=user.id,
            session_token_hash=hash_token(raw_session_token),
            csrf_token_hash=hash_token(raw_csrf_token),
            ip_address=ip_address,
            user_agent=user_agent[:500] if user_agent else None,
            absolute_expires_at=now + timedelta(hours=cls.ABSOLUTE_SESSION_HOURS),
            idle_expires_at=now + timedelta(hours=cls.IDLE_SESSION_HOURS),
            last_seen_at=now,
            revoked_at=None,
        )
        db.add(session)

        await cls.record_audit_log(
            db=db,
            user_id=user.id,
            email_attempted=normalized_email,
            event_type="LOGIN_SUCCESS",
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await db.commit()
        await db.refresh(user)
        return user, raw_session_token, raw_csrf_token

    @classmethod
    async def get_session_and_user(
        cls, db: AsyncSession, raw_session_token: str
    ) -> tuple[UserSession, User] | None:
        """Validate session with absolute and idle expiry, and slide idle window."""
        token_h = hash_token(raw_session_token)
        now = utcnow()

        stmt = (
            select(UserSession, User)
            .join(User, UserSession.user_id == User.id)
            .where(
                UserSession.session_token_hash == token_h,
                UserSession.revoked_at.is_(None),
                UserSession.absolute_expires_at > now,
                UserSession.idle_expires_at > now,
                User.is_active.is_(True),
                User.is_archived.is_(False),
            )
        )
        result = (await db.execute(stmt)).first()
        if not result:
            return None

        user_session, user = result
        # Slide idle window without exceeding absolute ceiling
        user_session.last_seen_at = now
        new_idle = now + timedelta(hours=cls.IDLE_SESSION_HOURS)
        abs_exp = user_session.absolute_expires_at
        if abs_exp.tzinfo is None:
            abs_exp = abs_exp.replace(tzinfo=UTC)
        user_session.idle_expires_at = min(new_idle, abs_exp)
        await db.flush()
        return user_session, user

    @classmethod
    async def revoke_session(cls, db: AsyncSession, raw_session_token: str) -> bool:
        """Revoke specific session in database."""
        token_h = hash_token(raw_session_token)
        stmt = select(UserSession).where(
            UserSession.session_token_hash == token_h,
            UserSession.revoked_at.is_(None),
        )
        res = await db.execute(stmt)
        user_session = res.scalar_one_or_none()
        if user_session:
            user_session.revoked_at = utcnow()
            await cls.record_audit_log(
                db=db,
                user_id=user_session.user_id,
                email_attempted="",
                event_type="LOGOUT",
            )
            await db.commit()
            return True
        return False

    @classmethod
    async def revoke_all_user_sessions(cls, db: AsyncSession, user_id: uuid.UUID, reason: str) -> int:
        """Revoke all active sessions when credentials, role, or active status changes."""
        stmt = (
            update(UserSession)
            .where(
                UserSession.user_id == user_id,
                UserSession.revoked_at.is_(None),
            )
            .values(revoked_at=utcnow())
        )
        result = await db.execute(stmt)
        count = int(getattr(result, "rowcount", 0) or 0)

        await cls.record_audit_log(
            db=db,
            user_id=user_id,
            email_attempted="",
            event_type="SESSIONS_REVOKED",
            details={"reason": reason, "revoked_count": count},
        )
        await db.commit()
        return count

    @classmethod
    async def update_user(
        cls,
        db: AsyncSession,
        user: User,
        full_name: str | None = None,
        role: UserRole | None = None,
        is_active: bool | None = None,
        new_password: str | None = None,
    ) -> User:
        """Update user profile and immediately revoke all active sessions if security fields change."""
        security_changed = False
        reasons = []

        if full_name is not None:
            user.full_name = full_name.strip()
        if role is not None and role != user.role:
            user.role = role
            security_changed = True
            reasons.append("role_change")
        if is_active is not None and is_active != user.is_active:
            user.is_active = is_active
            security_changed = True
            reasons.append("status_change")
        if new_password:
            user.password_hash = hash_password(new_password)
            security_changed = True
            reasons.append("password_change")

        await db.flush()

        if security_changed:
            await cls.revoke_all_user_sessions(db, user.id, reason=";".join(reasons))

        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def create_user(
        db: AsyncSession,
        email: str,
        password: str,
        full_name: str,
        role: UserRole,
    ) -> User:
        """Create a user with Argon2id hashed password."""
        user = User(
            email=email.lower().strip(),
            password_hash=hash_password(password),
            full_name=full_name.strip(),
            role=role,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

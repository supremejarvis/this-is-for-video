"""Backend 4-Digit Mobile OTP Service.

Enforces:
- 4-digit numeric OTP generation (1000-9999) using cryptographic secrets
- 10-minute expiry time
- 30-second resend cooldown
- Max 3 failed verification attempts before invalidation
- Rate limiting by phone number and client IP (max 5 requests per hour)
- Masked phone numbers in UI, responses, and log streams
- No OTP backdoors or test master codes in production logic
"""
import logging
import secrets
import time
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


def mask_phone_number(phone: str) -> str:
    """Format phone number with middle digits masked, e.g. +91 ******1234."""
    clean = "".join(c for c in phone if c.isdigit())
    if len(clean) >= 10:
        last4 = clean[-4:]
        return f"+91 ******{last4}"
    return "***"


class OtpSession:
    def __init__(self, code: str, expires_at: float, created_at: float):
        self.code = code
        self.expires_at = expires_at
        self.created_at = created_at
        self.attempts = 0


class OtpService:
    EXPIRY_SECONDS = 600       # 10 minutes
    RESEND_COOLDOWN = 30       # 30 seconds
    MAX_ATTEMPTS = 3           # 3 verification attempts
    RATE_LIMIT_WINDOW = 3600   # 1 hour
    MAX_REQUESTS_PER_WINDOW = 5

    def __init__(self):
        # Store active sessions by normalized 10-digit phone
        self._active_otps: Dict[str, OtpSession] = {}
        # Timestamps of OTP generation by phone: phone -> list of timestamps
        self._phone_request_history: Dict[str, List[float]] = {}
        # Timestamps of OTP generation by IP: ip -> list of timestamps
        self._ip_request_history: Dict[str, List[float]] = {}

    def _check_rate_limit(self, phone: str, ip_address: Optional[str]) -> Tuple[bool, Optional[str]]:
        now = time.time()
        cutoff = now - self.RATE_LIMIT_WINDOW

        # 1. Check cooldown for this phone
        session = self._active_otps.get(phone)
        if session and (now - session.created_at) < self.RESEND_COOLDOWN:
            remaining = int(self.RESEND_COOLDOWN - (now - session.created_at))
            return False, f"Please wait {remaining} seconds before requesting a new OTP."

        # 2. Check hourly rate limit for phone
        phone_history = [t for t in self._phone_request_history.get(phone, []) if t > cutoff]
        self._phone_request_history[phone] = phone_history
        if len(phone_history) >= self.MAX_REQUESTS_PER_WINDOW:
            return False, "Too many OTP requests for this mobile number. Please try again in an hour."

        # 3. Check hourly rate limit for IP
        if ip_address:
            ip_history = [t for t in self._ip_request_history.get(ip_address, []) if t > cutoff]
            self._ip_request_history[ip_address] = ip_history
            if len(ip_history) >= (self.MAX_REQUESTS_PER_WINDOW * 3):
                return False, "Too many OTP requests from this network. Please try again later."

        return True, None

    def send_otp(self, phone: str, ip_address: Optional[str] = None) -> Tuple[bool, str, str]:
        """Generate and dispatch a 4-digit OTP. Returns (success, message, masked_phone)."""
        allowed, reason = self._check_rate_limit(phone, ip_address)
        if not allowed:
            return False, reason or "Rate limit exceeded", mask_phone_number(phone)

        # Cryptographically secure 4-digit numeric code: 1000 - 9999
        code = f"{secrets.randbelow(9000) + 1000}"
        now = time.time()
        expires_at = now + self.EXPIRY_SECONDS

        self._active_otps[phone] = OtpSession(
            code=code,
            expires_at=expires_at,
            created_at=now
        )

        # Record history for rate limiting
        self._phone_request_history.setdefault(phone, []).append(now)
        if ip_address:
            self._ip_request_history.setdefault(ip_address, []).append(now)

        masked = mask_phone_number(phone)
        logger.info(f"Dispatched 4-digit OTP to {masked} (Expires in {self.EXPIRY_SECONDS}s)")

        return True, f"4-digit OTP dispatched successfully to {masked}", masked

    def verify_otp(self, phone: str, entered_otp: str) -> Tuple[bool, str, str]:
        """Verify the 4-digit OTP. Returns (is_verified, message, masked_phone)."""
        masked = mask_phone_number(phone)
        session = self._active_otps.get(phone)
        now = time.time()

        if not session:
            return False, "No active OTP request found for this mobile number. Please request a new OTP.", masked

        if now > session.expires_at:
            del self._active_otps[phone]
            return False, "The verification code has expired. Please request a new OTP.", masked

        session.attempts += 1
        if session.attempts > self.MAX_ATTEMPTS:
            del self._active_otps[phone]
            return False, "Maximum verification attempts exceeded. Please request a new OTP.", masked

        # Constant-time comparison
        is_valid = secrets.compare_digest(session.code, entered_otp.strip())
        if is_valid:
            del self._active_otps[phone]
            logger.info(f"Successfully verified 4-digit OTP for {masked}")
            return True, "Mobile number verified successfully.", masked

        remaining_attempts = self.MAX_ATTEMPTS - session.attempts
        if remaining_attempts > 0:
            return False, f"Invalid OTP code. {remaining_attempts} attempt(s) remaining.", masked
        else:
            del self._active_otps[phone]
            return False, "Maximum verification attempts exceeded. Please request a new OTP.", masked

    # Isolated test-only helper; only used by backend test suites
    def _get_active_code_for_testing(self, phone: str) -> Optional[str]:
        session = self._active_otps.get(phone)
        return session.code if session else None


# Global singleton instance
otp_service = OtpService()

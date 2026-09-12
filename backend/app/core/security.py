"""Security Utilities: Argon2id Hashing, Session Tokens, and CSRF Protection."""
import hashlib
import hmac
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from argon2.low_level import Type

# Production Argon2id parameters (RFC 9106 recommended)
# time_cost=2, memory_cost=65536 KiB (64 MB), parallelism=2, hash_len=32
hasher = PasswordHasher(
    time_cost=2,
    memory_cost=65536,
    parallelism=2,
    hash_len=32,
    type=Type.ID,
)


def hash_password(password: str) -> str:
    """Hash password using Argon2id."""
    return hasher.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against Argon2id hash."""
    try:
        return hasher.verify(hashed, password)
    except VerifyMismatchError:
        return False
    except Exception:
        return False


def generate_secure_token(nbytes: int = 32) -> str:
    """Generate cryptographically secure random hex token."""
    return secrets.token_hex(nbytes)


def hash_token(token: str) -> str:
    """Hash token using SHA-256 for persistent database storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def verify_token_hash(token: str, stored_hash: str) -> bool:
    """Constant-time token hash verification."""
    computed = hash_token(token)
    return hmac.compare_digest(computed, stored_hash)


def verify_csrf_token(client_token: str, expected_hash: str) -> bool:
    """Verify submitted CSRF token matches stored session hash."""
    return verify_token_hash(client_token, expected_hash)

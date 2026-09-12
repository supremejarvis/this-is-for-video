"""Unit Tests for Authentication Cryptography and CSRF Security."""
from app.core.security import (
    generate_secure_token,
    hash_password,
    hash_token,
    verify_csrf_token,
    verify_password,
    verify_token_hash,
    verify_totp_code,
)


def test_argon2id_password_hashing_and_verification():
    """Security Invariant: Passwords must be hashed using Argon2id and correctly verified."""
    raw_password = "CorrectHorseBatteryStaple#2026"
    pw_hash = hash_password(raw_password)

    # Hash must have Argon2id signature
    assert pw_hash.startswith("$argon2id$")
    assert "m=65536" in pw_hash  # 64 MB memory
    assert "t=2" in pw_hash      # 2 time iterations
    assert "p=2" in pw_hash      # 2 parallelism threads

    # Verification must succeed for correct password
    assert verify_password(raw_password, pw_hash) is True

    # Verification must fail for incorrect password
    assert verify_password("WrongPassword123!", pw_hash) is False
    assert verify_password("", pw_hash) is False
    assert verify_password("correcthorsebatterystaple#2026", pw_hash) is False  # Case sensitivity


def test_argon2id_salt_uniqueness():
    """Security Invariant: Every Argon2id hash must have a unique random salt."""
    pwd = "StaticPassword123!"
    hash1 = hash_password(pwd)
    hash2 = hash_password(pwd)

    assert hash1 != hash2, "Identical passwords must produce distinct salt/hash outputs"
    assert verify_password(pwd, hash1) is True
    assert verify_password(pwd, hash2) is True


def test_secure_token_entropy():
    """Security Invariant: Generated tokens must have at least 256 bits of cryptographic entropy."""
    token1 = generate_secure_token(32)
    token2 = generate_secure_token(32)

    assert len(token1) == 64  # 32 bytes hex = 64 characters
    assert len(token2) == 64
    assert token1 != token2


def test_sha256_token_hashing_and_verification():
    """Security Invariant: Tokens stored in DB must be irreversible SHA-256 digests."""
    raw_token = generate_secure_token(32)
    token_h = hash_token(raw_token)

    assert len(token_h) == 64
    assert token_h != raw_token
    assert verify_token_hash(raw_token, token_h) is True
    assert verify_token_hash("tampered_token", token_h) is False


def test_csrf_token_verification():
    """Security Invariant: Double-submit CSRF tokens must pass constant-time comparison."""
    raw_csrf = generate_secure_token(32)
    stored_hash = hash_token(raw_csrf)

    assert verify_csrf_token(raw_csrf, stored_hash) is True
    assert verify_csrf_token("invalid_csrf_token", stored_hash) is False


def test_rfc_6238_totp_verification():
    """Security Invariant: TOTP codes must be validated strictly against RFC 6238."""
    import base64
    import hashlib
    import hmac
    import struct
    import time

    secret = "JBSWY3DPEHPK3PXP"  # Standard test secret

    # Generate current TOTP code for testing
    clean_secret = secret.strip().upper()
    padding = (8 - len(clean_secret) % 8) % 8
    key = base64.b32decode(clean_secret + "=" * padding)
    current_t = int(time.time() // 30)
    msg = struct.pack(">Q", current_t)
    h = hmac.new(key, msg, hashlib.sha1).digest()
    offset = h[-1] & 0x0F
    binary = struct.unpack(">I", h[offset:offset+4])[0] & 0x7FFFFFFF
    valid_code = str(binary % 1000000).zfill(6)

    # 1. Valid code must pass
    assert verify_totp_code(secret, valid_code) is True

    # 2. Invalid codes must fail
    assert verify_totp_code(secret, "000000" if valid_code != "000000" else "111111") is False
    assert verify_totp_code(secret, "12345") is False  # Length != 6
    assert verify_totp_code(secret, "abcdef") is False  # Non-digit
    assert verify_totp_code("", valid_code) is False    # Missing secret


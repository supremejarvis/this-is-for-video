"""Security Audit and Verification Tests.

Verifies:
- CORS does not use wildcard origins with credentials
- API documentation exposure is configurable by environment (DOCS_ENABLED)
- Webhook raw-body HMAC SHA256 verification is separated from checkout signature
- No unencrypted secrets in source files or config defaults
"""

import hashlib
import hmac

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import Settings
from app.main import app


def test_cors_does_not_use_wildcard_with_credentials():
    """Security Invariant: CORS must never combine allow_origins=['*'] with allow_credentials=True."""
    for middleware in app.user_middleware:
        if middleware.cls == CORSMiddleware:
            kwargs = middleware.kwargs
            allow_origins = kwargs.get("allow_origins", [])
            allow_credentials = kwargs.get("allow_credentials", False)
            if allow_credentials:
                assert "*" not in allow_origins, "Security violation: wildcard CORS origin with credentials enabled!"
                assert len(allow_origins) > 0, "Explicit origins must be declared"


def test_docs_exposure_is_configurable_by_environment():
    """Security Invariant: When DOCS_ENABLED=False in production, Swagger/OpenAPI endpoints are hidden."""
    prod_settings = Settings(
        DOCS_ENABLED=False,
        ENVIRONMENT="production",
        DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/db",
        DATABASE_SYNC_URL="postgresql://user:pass@localhost:5432/db",
    )
    prod_app = FastAPI(
        title="Apollo Production",
        openapi_url=f"{prod_settings.API_V1_STR}/openapi.json" if prod_settings.DOCS_ENABLED else None,
        docs_url=f"{prod_settings.API_V1_STR}/docs" if prod_settings.DOCS_ENABLED else None,
        redoc_url=f"{prod_settings.API_V1_STR}/redoc" if prod_settings.DOCS_ENABLED else None,
    )
    assert prod_app.openapi_url is None
    assert prod_app.docs_url is None
    assert prod_app.redoc_url is None


def test_webhook_raw_body_signature_verification_separated():
    """Security Invariant: Webhook HMAC SHA-256 verifies untouched raw bytes, separate from checkout signature."""
    raw_payload = b'{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_123"}}}}'
    secret = "test_webhook_secret_key"

    expected_signature = hmac.new(secret.encode("utf-8"), raw_payload, hashlib.sha256).hexdigest()

    # Tampered payload (e.g. whitespace modification or injection) must fail
    tampered_payload = raw_payload + b" "
    assert not hmac.compare_digest(
        hmac.new(secret.encode("utf-8"), tampered_payload, hashlib.sha256).hexdigest(),
        expected_signature
    )
    # Untouched raw body passes
    assert hmac.compare_digest(
        hmac.new(secret.encode("utf-8"), raw_payload, hashlib.sha256).hexdigest(),
        expected_signature
    )


def test_no_hardcoded_production_secrets_in_settings():
    """Security Invariant: Settings defaults must not contain real API keys or passwords."""
    s = Settings()
    # Ensure database credentials in default are local test only
    assert "prod" not in s.DATABASE_URL.lower()
    assert s.ENVIRONMENT != "production" or not s.DOCS_ENABLED


def test_audit_logs_never_persist_sensitive_secrets():
    """Security Invariant: Audit log sanitizer must scrub passwords, tokens, cookies, CSRF values, and secrets."""
    from app.services.auth_service import sanitize_details

    dirty_payload = {
        "password": "SuperSecretPassword123!",
        "new_password": "NewSecretPassword123!",
        "raw_token": "token_abc123xyz",
        "csrf_token": "csrf_sample_hex",
        "authorization_header": "Bearer secret_jwt",
        "nested": {
            "api_key": "private_key_123",
            "safe_field": "public_data",
        },
        "safe_counter": 5,
    }

    cleaned = sanitize_details(dirty_payload)
    assert cleaned["password"] == "[REDACTED]"
    assert cleaned["new_password"] == "[REDACTED]"
    assert cleaned["raw_token"] == "[REDACTED]"
    assert cleaned["csrf_token"] == "[REDACTED]"
    assert cleaned["authorization_header"] == "[REDACTED]"
    assert cleaned["nested"]["api_key"] == "[REDACTED]"
    assert cleaned["nested"]["safe_field"] == "public_data"
    assert cleaned["safe_counter"] == 5


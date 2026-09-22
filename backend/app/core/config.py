from pathlib import Path
from decimal import Decimal

from pydantic import Field, ValidationInfo, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BASE_DIR = Path(__file__).resolve().parents[2]
_ENV_CANDIDATES = (
    str(_BASE_DIR / ".env"),
    str(_BASE_DIR / "backend" / ".env"),
    "/app/.env",
    ".env",
    "backend/.env",
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_CANDIDATES,
        env_file_encoding="utf-8",
        extra="ignore"
    )

    PROJECT_NAME: str = "Apollo Engineering E-Commerce Core"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./apollo_ecommerce.db",
        description="Database connection string (SQLite fallback in dev, managed PostgreSQL in prod)"
    )
    DATABASE_SYNC_URL: str = Field(
        default="sqlite:///./apollo_ecommerce.db",
        description="Sync database connection string for migrations"
    )

    # Security & Documentation
    ENVIRONMENT: str = Field(default="development", description="Runtime environment: development, staging, production")
    DOCS_ENABLED: bool = Field(default=True, description="Enable Swagger UI & ReDoc docs (disable in production)")

    # Distributed Cache & Message Broker (Optional)
    REDIS_URL: str | None = Field(
        default=None,
        description="Redis connection URL for distributed caching and rate limiting"
    )

    # Allowed CORS Origins
    CORS_ORIGINS: list[str] = Field(
        default=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "https://apollo-web-three.vercel.app",
            "https://apolloengineering.co.in",
        ],
        description="Allowed origins for Cross-Origin Resource Sharing (CORS)"
    )

    # Razorpay Payment Gateway
    RAZORPAY_KEY_ID: str = Field(default="rzp_test_placeholder", description="Razorpay Key ID")
    RAZORPAY_KEY_SECRET: str = Field(default="rzp_test_secret_placeholder", description="Razorpay Key Secret")
    RAZORPAY_WEBHOOK_SECRET: str | None = Field(default=None, description="Razorpay Webhook Secret")

    # JWT Authentication
    JWT_SECRET: str = Field(
        default="apollo_super_secret_jwt_key_default_minimum_32_chars",
        description="Authoritative secret for signing and verifying JWT tokens"
    )

    # MSG91 Official OTP, SMS & WhatsApp Integration (Server-Side Only)
    MSG91_AUTH_KEY: str = Field(default="", description="MSG91 Private Auth Key")
    MSG91_TEMPLATE_ID: str = Field(default="6a986d4effc61fd8910a4952", description="MSG91 SMS Template ID")
    MSG91_WHATSAPP_NUMBER: str = Field(default="919714710854", description="MSG91 Integrated WhatsApp Number")
    MSG91_WHATSAPP_TEMPLATE_NAME: str = Field(default="apollo_engineering", description="MSG91 WhatsApp Template Name")

    # India Post CEPT Integration (Server-Side Only)
    INDIA_POST_API_URL: str = Field(default="https://test.cept.gov.in/beextcustomer", description="CEPT Base URL")
    INDIA_POST_USERNAME: str = Field(default="", description="CEPT Account Username")
    INDIA_POST_PASSWORD: str = Field(default="", description="CEPT Account Password")
    INDIA_POST_CUSTOMER_ID: str = Field(default="9999265476", description="CEPT Customer ID")
    INDIA_POST_CONTRACT_ID: str = Field(default="41636817", description="CEPT Contract ID")
    INDIA_POST_DROPOFF_OFFICE_ID: str = Field(default="21260024", description="CEPT Dropoff Office ID")

    # Admin Authentication & 2FA (RFC 6238 TOTP)
    ADMIN_INIT_EMAIL: str = Field(
        default="admin@apolloengineering.co.in",
        description="Initial administrator email address for secure bootstrap"
    )
    ADMIN_INIT_PASSWORD: str | None = Field(
        default=None,
        description="Initial bootstrap password for initial owner creation; ignored if owner exists"
    )
    ADMIN_PASSWORD_HASH: str | None = Field(
        default=None,
        description="Authoritative Argon2id hash of Super Admin master password from secure environment"
    )
    ADMIN_TOTP_SECRET: str | None = Field(
        default=None,
        description="Protected Base32 secret for Admin 2FA TOTP (RFC 6238) from secure environment"
    )

    # Statutory Defaults
    DEFAULT_SHIPPING_GST_RATE: Decimal = Decimal("0.1800")
    DEFAULT_COD_SURCHARGE_RATE: Decimal = Decimal("0.0250")
    ORIGIN_PINCODE: str = "382430"  # Kathwada GIDC, Ahmedabad

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, v: str, info: ValidationInfo) -> str:
        """Fail closed in production if using SQLite or localhost."""
        env = info.data.get("ENVIRONMENT", "development").lower()
        if env == "production":
            if v.startswith("sqlite"):
                raise ValueError("SQLite is not allowed in production. Set DATABASE_URL to a managed PostgreSQL connection string.")
            if "localhost" in v or "127.0.0.1" in v:
                raise ValueError("Localhost database is not allowed in production. Set DATABASE_URL to a managed PostgreSQL connection string.")
        return v


settings = Settings()

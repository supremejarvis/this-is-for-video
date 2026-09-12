"""Application Configuration Module."""
from decimal import Decimal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
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
    RAZORPAY_KEY_ID: str = Field(default="rzp_test_placeholder", description="Razorpay Key ID")
    RAZORPAY_KEY_SECRET: str = Field(default="rzp_test_secret_placeholder", description="Razorpay Key Secret")

    # Admin Authentication & 2FA (RFC 6238 TOTP)
    ADMIN_PASSWORD_HASH: str = Field(
        default="$argon2id$v=19$m=65536,t=2,p=2$tvVWPhXdV7l5DuO6FG96nw$xcwFwsaD++YDU4eY4POqDBPXiEbRLOZ+/uwoGnOgb30",
        description="Argon2id or bcrypt hash of Super Admin master password (NIL@apl321)"
    )
    ADMIN_TOTP_SECRET: str = Field(
        default="JBSWY3DPEHPK3PXP",
        description="Protected Base32 secret for Admin 2FA TOTP (RFC 6238)"
    )
    ADMIN_DEV_BYPASS_TOTP: bool = Field(
        default=True,
        description="Allow development bypass TOTP codes (123456 / 000000) when ENVIRONMENT != production"
    )

    # Statutory Defaults
    DEFAULT_SHIPPING_GST_RATE: Decimal = Decimal("0.1800")
    DEFAULT_COD_SURCHARGE_RATE: Decimal = Decimal("0.0250")
    ORIGIN_PINCODE: str = "382430"  # Kathwada GIDC, Ahmedabad


settings = Settings()

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
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/apollo_ecommerce",
        description="Managed PostgreSQL 16+ async connection string"
    )
    DATABASE_SYNC_URL: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/apollo_ecommerce",
        description="Managed PostgreSQL 16+ sync connection string for Alembic"
    )

    # Security & Documentation
    ENVIRONMENT: str = Field(default="development", description="Runtime environment: development, staging, production")
    DOCS_ENABLED: bool = Field(default=True, description="Enable Swagger UI & ReDoc docs (disable in production)")
    RAZORPAY_KEY_ID: str = Field(default="rzp_test_placeholder", description="Razorpay Key ID")
    RAZORPAY_KEY_SECRET: str = Field(default="rzp_test_secret_placeholder", description="Razorpay Key Secret")

    # Statutory Defaults
    DEFAULT_SHIPPING_GST_RATE: Decimal = Decimal("0.1800")
    DEFAULT_COD_SURCHARGE_RATE: Decimal = Decimal("0.0250")
    ORIGIN_PINCODE: str = "382430"  # Kathwada GIDC, Ahmedabad


settings = Settings()

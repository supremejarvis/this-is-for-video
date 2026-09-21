import re

from pydantic import BaseModel, Field, field_validator

from app.schemas.auth import UserResponse
from app.schemas.customer import CustomerProfileResponse


def normalize_phone(v: str) -> str:
    clean = re.sub(r"\D", "", str(v))
    if len(clean) == 11 and clean.startswith("0"):
        clean = clean[1:]
    elif len(clean) == 12 and clean.startswith("91"):
        clean = clean[2:]
    elif len(clean) == 13 and clean.startswith("091"):
        clean = clean[3:]
    elif len(clean) == 14 and clean.startswith("0091"):
        clean = clean[4:]
    if len(clean) != 10 or clean[0] not in "6789":
        raise ValueError("Phone number must be a valid 10-digit Indian mobile number")
    return clean


class SendOtpRequest(BaseModel):
    phone: str = Field(..., description="10-digit Indian mobile number")
    purpose: str = Field(default="CUSTOMER_LOGIN", description="Purpose of challenge")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return normalize_phone(v)


class SendOtpResponse(BaseModel):
    success: bool
    message: str
    masked_phone: str
    cooldown_seconds: int = 30
    challenge_id: str | None = None
    expires_in_seconds: int = 600
    dev_code: str | None = None


class VerifyOtpRequest(BaseModel):
    phone: str = Field(..., description="10-digit Indian mobile number")
    otp: str = Field(..., description="4-digit OTP code")
    challenge_id: str | None = Field(default=None, description="Optional challenge ID")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return normalize_phone(v)

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, v: str) -> str:
        clean = v.strip()
        if not re.match(r"^\d{4}$", clean):
            raise ValueError("OTP must be exactly 4 numeric digits")
        return clean


class VerifyOtpResponse(BaseModel):
    success: bool
    is_verified: bool = True
    is_first_time: bool = False
    message: str
    masked_phone: str
    user: UserResponse | None = None
    customer_profile: CustomerProfileResponse | None = None
    csrf_token: str | None = None



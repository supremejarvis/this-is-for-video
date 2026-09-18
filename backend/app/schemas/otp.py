import re

from pydantic import BaseModel, Field, field_validator

from app.schemas.auth import UserResponse


def normalize_phone(v: str) -> str:
    clean = re.sub(r"\D", "", v)
    if len(clean) == 12 and clean.startswith("91"):
        clean = clean[2:]
    if len(clean) != 10 or clean[0] not in "6789":
        raise ValueError("Phone number must be a valid 10-digit Indian mobile number")
    return clean


class SendOtpRequest(BaseModel):
    phone: str = Field(..., description="10-digit Indian mobile number")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return normalize_phone(v)


class SendOtpResponse(BaseModel):
    success: bool
    message: str
    masked_phone: str
    cooldown_seconds: int = 30
    dev_code: str | None = None


class VerifyOtpRequest(BaseModel):
    phone: str = Field(..., description="10-digit Indian mobile number")
    otp: str = Field(..., description="4-digit OTP code")

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
    message: str
    masked_phone: str
    user: UserResponse | None = None
    csrf_token: str | None = None


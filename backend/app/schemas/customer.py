"""Pydantic Schemas for Customer Profiles, Addresses, and Sessions."""
import re
import uuid
from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field, field_validator


class CustomerProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    full_name: str
    email: str | None = None
    phone: str | None = None
    company_name: str | None = None
    gstin: str | None = None
    pan: str | None = None
    account_type: str
    kyc_status: str
    default_shipping_address_id: uuid.UUID | None = None
    default_billing_address_id: uuid.UUID | None = None
    metadata_json: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime


class CustomerProfileUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    company_name: str | None = Field(default=None, max_length=255)
    gstin: str | None = Field(default=None, max_length=20)
    pan: str | None = Field(default=None, max_length=20)
    account_type: str | None = Field(default=None, description="'B2C' or 'B2B'")
    terms_accepted: bool | None = Field(default=None, description="Record statutory terms consent")
    terms_version: str | None = Field(default="2026-09-v1")
    privacy_version: str | None = Field(default="2026-09-v1")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str | None) -> str | None:
        if v is None:
            return None
        clean = v.strip().lower()
        if not clean:
            return None
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", clean):
            raise ValueError("Invalid email address format")
        return clean

    @field_validator("gstin")
    @classmethod
    def validate_gstin(cls, v: str | None) -> str | None:
        if v is None:
            return None
        clean = v.strip().upper()
        if not clean:
            return None
        if not re.match(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$", clean):
            raise ValueError("Invalid Indian GSTIN format (15 characters alphanumeric)")
        return clean

    @field_validator("pan")
    @classmethod
    def validate_pan(cls, v: str | None) -> str | None:
        if v is None:
            return None
        clean = v.strip().upper()
        if not clean:
            return None
        if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$", clean):
            raise ValueError("Invalid Indian PAN format (10 characters alphanumeric)")
        return clean


class CustomerAddressResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    address_type: str
    full_name: str
    phone: str
    flat_building: str
    street_area: str
    landmark: str | None = None
    pincode: str
    city: str
    state: str
    state_code: str
    post_office_name: str | None = None
    gstin: str | None = None
    is_default: bool
    created_at: datetime
    updated_at: datetime


class CustomerAddressCreateRequest(BaseModel):
    address_type: str = Field(default="HOME", description="'HOME', 'OFFICE', or 'WAREHOUSE'")
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: str = Field(..., min_length=10, max_length=20)
    flat_building: str = Field(..., min_length=2, max_length=255)
    street_area: str = Field(..., min_length=2, max_length=255)
    landmark: str | None = Field(default=None, max_length=255)
    pincode: str = Field(..., min_length=6, max_length=6)
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    state_code: str = Field(default="24", max_length=10)
    post_office_name: str | None = Field(default=None, max_length=150)
    gstin: str | None = Field(default=None, max_length=20)
    is_default: bool = Field(default=False)

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, v: str) -> str:
        clean = re.sub(r"\D", "", v)
        if len(clean) != 6:
            raise ValueError("PIN code must be exactly 6 numeric digits")
        return clean


class CustomerAddressUpdateRequest(BaseModel):
    address_type: str | None = None
    full_name: str | None = None
    phone: str | None = None
    flat_building: str | None = None
    street_area: str | None = None
    landmark: str | None = None
    pincode: str | None = None
    city: str | None = None
    state: str | None = None
    state_code: str | None = None
    post_office_name: str | None = None
    gstin: str | None = None
    is_default: bool | None = None


class ActiveSessionResponse(BaseModel):
    id: uuid.UUID
    ip_address: str | None
    user_agent: str | None
    last_seen_at: datetime
    created_at: datetime
    idle_expires_at: datetime
    absolute_expires_at: datetime
    expires_at: datetime | None = None
    is_current: bool

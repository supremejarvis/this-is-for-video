"""Authentication and RBAC Pydantic Schemas."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.auth import UserRole


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class AdminLoginRequest(BaseModel):
    email: EmailStr = Field(default="admin@apolloengineering.co.in")
    password: str = Field(..., min_length=6, max_length=128)
    totp_code: str = Field(..., min_length=6, max_length=6)



class UserCreateRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=12, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=255)
    role: UserRole


class UserUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    role: UserRole | None = None
    is_active: bool | None = None
    new_password: str | None = Field(default=None, min_length=12, max_length=128)


class UserResponse(BaseModel):

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    mfa_enabled: bool
    created_at: datetime


class LoginSuccessResponse(BaseModel):
    message: str = "Authentication successful"
    user: UserResponse
    csrf_token: str


class CSRFResponse(BaseModel):
    csrf_token: str


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email_attempted: str
    event_type: str
    ip_address: str | None
    user_agent: str | None
    created_at: datetime

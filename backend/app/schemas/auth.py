"""Auth schemas."""

from datetime import datetime
from typing import Optional

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)


class UserCreate(BaseModel):
    email: EmailStr = Field(..., max_length=255)
    username: str = Field(..., min_length=3, max_length=100)
    full_name: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class UserLogin(BaseModel):
    """Accepts either `email` or `username` as the login identifier."""

    email: Optional[str] = Field(None, max_length=255)
    username: Optional[str] = Field(None, max_length=100)
    password: str

    @model_validator(mode="after")
    def _require_identifier(self) -> "UserLogin":
        if not (self.email or self.username):
            raise ValueError("Either email or username is required")
        return self

    @property
    def identifier(self) -> str:
        return (self.username or self.email or "").strip()


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    full_name: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    username: Optional[str] = Field(None, min_length=3, max_length=100)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str = Field(..., min_length=1)


class RegisterResponse(BaseModel):
    message: str
    email: str


class OtpVerifyRequest(BaseModel):
    """Verify a registration OTP and activate the account."""

    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class OtpRequest(BaseModel):
    """Request/resend an OTP (register, forgot_password)."""

    email: EmailStr

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class OtpPurposeRequest(BaseModel):
    """Resend an OTP for an explicit purpose."""

    email: EmailStr
    purpose: str = Field(..., pattern="^(register|forgot_password)$")

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    code: str = Field(..., min_length=6, max_length=6)
    password: str = Field(..., min_length=8, max_length=128)

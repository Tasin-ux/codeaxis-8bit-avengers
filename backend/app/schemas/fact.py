"""Approved fact schemas."""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class FactCreate(BaseModel):
    workspace_id: str = Field(..., max_length=255)
    title: str = Field(..., min_length=1, max_length=255)
    statement: str = Field(..., min_length=1, max_length=2000)
    source_reference: str = Field(..., min_length=1, max_length=500)
    source_type: str = Field(..., min_length=1, max_length=100)
    source_url: Optional[str] = Field(None, max_length=500)
    verification_status: str = Field("unverified", pattern=r"^(verified|unverified|expired)$")
    product_or_campaign: Optional[str] = Field(None, max_length=255)
    last_verified_date: Optional[date] = None
    expiration_date: Optional[date] = None
    is_active: bool = True


class FactUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    statement: Optional[str] = Field(None, min_length=1, max_length=2000)
    source_reference: Optional[str] = Field(None, min_length=1, max_length=500)
    source_type: Optional[str] = Field(None, min_length=1, max_length=100)
    source_url: Optional[str] = Field(None, max_length=500)
    verification_status: Optional[str] = Field(None, pattern=r"^(verified|unverified|expired)$")
    product_or_campaign: Optional[str] = Field(None, max_length=255)
    last_verified_date: Optional[date] = None
    expiration_date: Optional[date] = None
    is_active: Optional[bool] = None


class FactResponse(BaseModel):
    id: str
    workspace_id: str
    title: str
    statement: str
    source_reference: str
    source_type: str
    source_url: Optional[str] = None
    verification_status: str
    product_or_campaign: Optional[str] = None
    last_verified_date: Optional[date] = None
    expiration_date: Optional[date] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

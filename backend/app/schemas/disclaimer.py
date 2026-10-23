"""Disclaimer schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class DisclaimerCreate(BaseModel):
    workspace_id: str = Field(..., max_length=255)
    text: str = Field(..., min_length=1, max_length=2000)
    content_category: str = Field(..., min_length=1, max_length=100)
    severity: str = Field("high", pattern=r"^(critical|high|medium|low|info)$")
    is_active: bool = True


class DisclaimerUpdate(BaseModel):
    text: Optional[str] = Field(None, min_length=1, max_length=2000)
    content_category: Optional[str] = Field(None, min_length=1, max_length=100)
    severity: Optional[str] = Field(None, pattern=r"^(critical|high|medium|low|info)$")
    is_active: Optional[bool] = None


class DisclaimerResponse(BaseModel):
    id: str
    workspace_id: str
    text: str
    content_category: str
    severity: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

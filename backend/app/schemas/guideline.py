"""Guideline schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class GuidelineCreate(BaseModel):
    workspace_id: str = Field(..., max_length=255)
    brand_id: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1, max_length=2000)
    category: str = Field(..., min_length=1, max_length=100)
    severity: str = Field("medium", pattern=r"^(critical|high|medium|low|info)$")
    is_active: bool = True


class GuidelineUpdate(BaseModel):
    brand_id: Optional[str] = None
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, min_length=1, max_length=2000)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    severity: Optional[str] = Field(None, pattern=r"^(critical|high|medium|low|info)$")
    is_active: Optional[bool] = None


class GuidelineResponse(BaseModel):
    id: str
    workspace_id: str
    brand_id: Optional[str] = None
    title: str
    description: str
    category: str
    severity: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

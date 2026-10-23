"""Terminology schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class TerminologyCreate(BaseModel):
    workspace_id: str = Field(..., max_length=255)
    preferred_term: str = Field(..., min_length=1, max_length=255)
    disallowed_term: str = Field(..., min_length=1, max_length=255)
    explanation: Optional[str] = Field(None, max_length=1000)
    case_sensitive: bool = False
    is_active: bool = True


class TerminologyUpdate(BaseModel):
    preferred_term: Optional[str] = Field(None, min_length=1, max_length=255)
    disallowed_term: Optional[str] = Field(None, min_length=1, max_length=255)
    explanation: Optional[str] = Field(None, max_length=1000)
    case_sensitive: Optional[bool] = None
    is_active: Optional[bool] = None


class TerminologyResponse(BaseModel):
    id: str
    workspace_id: str
    preferred_term: str
    disallowed_term: str
    explanation: Optional[str] = None
    case_sensitive: bool
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

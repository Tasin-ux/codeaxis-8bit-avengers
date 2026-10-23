"""Prohibited phrase schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ProhibitedPhraseCreate(BaseModel):
    workspace_id: str = Field(..., max_length=255)
    phrase: str = Field(..., min_length=1, max_length=500)
    reason: Optional[str] = Field(None, max_length=1000)
    severity: str = Field("high", pattern=r"^(critical|high|medium|low|info)$")
    suggested_alternative: Optional[str] = Field(None, max_length=500)
    case_sensitive: bool = False
    whole_word: bool = True
    is_active: bool = True


class ProhibitedPhraseUpdate(BaseModel):
    phrase: Optional[str] = Field(None, min_length=1, max_length=500)
    reason: Optional[str] = Field(None, max_length=1000)
    severity: Optional[str] = Field(None, pattern=r"^(critical|high|medium|low|info)$")
    suggested_alternative: Optional[str] = Field(None, max_length=500)
    case_sensitive: Optional[bool] = None
    whole_word: Optional[bool] = None
    is_active: Optional[bool] = None


class ProhibitedPhraseResponse(BaseModel):
    id: str
    workspace_id: str
    phrase: str
    reason: Optional[str] = None
    severity: str
    suggested_alternative: Optional[str] = None
    case_sensitive: bool
    whole_word: bool
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

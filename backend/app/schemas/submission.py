"""Content submission and revision schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class SubmissionCreate(BaseModel):
    workspace_id: str
    brand_id: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    content_type: str = Field(
        "marketing_copy",
        pattern=r"^(marketing_copy|product_description|social_media|email|advertisement|presentation)$",
    )


class SubmissionUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = Field(None, min_length=1)
    brand_id: Optional[str] = None
    content_type: Optional[str] = Field(
        None,
        pattern=r"^(marketing_copy|product_description|social_media|email|advertisement|presentation)$",
    )


class SubmissionResponse(BaseModel):
    id: str
    workspace_id: str
    brand_id: Optional[str] = None
    author_id: str
    title: str
    content: str
    content_type: str
    status: str
    current_revision_number: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RevisionResponse(BaseModel):
    id: str
    submission_id: str
    revision_number: int
    content: str
    summary: Optional[str] = None
    author_id: str
    status_at_creation: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

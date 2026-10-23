"""Review decision, comment, and feedback schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ReviewDecisionCreate(BaseModel):
    decision: str = Field(..., pattern=r"^(approved|changes_requested)$")
    comment: Optional[str] = None


class ReviewDecisionResponse(BaseModel):
    id: str
    submission_id: str
    reviewer_id: str
    decision: str
    comment: Optional[str] = None
    revision_number: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CommentCreate(BaseModel):
    text: str = Field(..., min_length=1)
    revision_number: Optional[int] = None
    finding_id: Optional[str] = None


class CommentResponse(BaseModel):
    id: str
    submission_id: str
    author_id: str
    text: str
    revision_number: Optional[int] = None
    finding_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FeedbackCreate(BaseModel):
    rule_id: str
    rule_type: str
    feedback_type: str = Field(..., pattern=r"^(unclear|too_strict|too_lenient|incorrect)$")
    comment: Optional[str] = None

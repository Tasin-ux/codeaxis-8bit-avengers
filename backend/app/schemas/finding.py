"""Finding schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class FindingCreate(BaseModel):
    submission_id: str
    revision_number: int
    category: str
    title: str = Field(..., max_length=255)
    description: str
    matched_text: Optional[str] = None
    char_start: Optional[int] = None
    char_end: Optional[int] = None
    severity: str = "medium"
    confidence: str = "rule_violation"
    explanation: Optional[str] = None
    suggestion: Optional[str] = None
    rule_id: Optional[str] = None
    rule_type: Optional[str] = None
    evidence_status: str = "not_applicable"
    referenced_fact_id: Optional[str] = None
    source: str = "deterministic"


class FindingResponse(BaseModel):
    id: str
    submission_id: str
    revision_number: int
    category: str
    title: str
    description: str
    matched_text: Optional[str] = None
    char_start: Optional[int] = None
    char_end: Optional[int] = None
    severity: str
    confidence: str
    explanation: Optional[str] = None
    suggestion: Optional[str] = None
    rule_id: Optional[str] = None
    rule_type: Optional[str] = None
    evidence_status: str
    referenced_fact_id: Optional[str] = None
    source: str
    is_resolved: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

"""Review finding model."""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text

from app.db.base import Base


class ReviewFinding(Base):
    __tablename__ = "review_findings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    submission_id = Column(
        String(36), ForeignKey("content_submissions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    revision_number = Column(Integer, nullable=False)
    category = Column(
        String(50), nullable=False
    )  # prohibited_phrase/terminology/disclaimer/guideline/tone/factual_claim
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    matched_text = Column(String(500), nullable=True)
    char_start = Column(Integer, nullable=True)
    char_end = Column(Integer, nullable=True)
    severity = Column(String(20), nullable=False, default="medium")
    confidence = Column(
        String(30), nullable=False, default="rule_violation"
    )  # rule_violation/potential_mismatch/unsupported_claim
    explanation = Column(Text, nullable=True)
    suggestion = Column(Text, nullable=True)
    rule_id = Column(String(36), nullable=True)
    rule_type = Column(String(50), nullable=True)
    evidence_status = Column(
        String(30), nullable=False, default="not_applicable"
    )  # supported/contradicted/insufficient/not_applicable
    referenced_fact_id = Column(String(36), ForeignKey("approved_facts.id", ondelete="SET NULL"), nullable=True)
    source = Column(String(20), nullable=False, default="deterministic")  # deterministic/ai
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

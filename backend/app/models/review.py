"""Review decision, comment, and rule feedback models."""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from app.db.base import Base


class ReviewDecision(Base):
    __tablename__ = "review_decisions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    submission_id = Column(
        String(36), ForeignKey("content_submissions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reviewer_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    decision = Column(String(30), nullable=False)  # approved/changes_requested
    comment = Column(Text, nullable=True)
    revision_number = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class ReviewComment(Base):
    __tablename__ = "review_comments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    submission_id = Column(
        String(36), ForeignKey("content_submissions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    text = Column(Text, nullable=False)
    revision_number = Column(Integer, nullable=True)
    finding_id = Column(String(36), ForeignKey("review_findings.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class RuleFeedback(Base):
    __tablename__ = "rule_feedback"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    finding_id = Column(
        String(36), ForeignKey("review_findings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    rule_id = Column(String(36), nullable=False)
    rule_type = Column(String(50), nullable=False)
    feedback_type = Column(String(30), nullable=False)  # unclear/too_strict/too_lenient/incorrect
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

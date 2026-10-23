"""Content submission and revision models."""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from app.db.base import Base


class ContentSubmission(Base):
    __tablename__ = "content_submissions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    brand_id = Column(String(36), ForeignKey("brands.id", ondelete="SET NULL"), nullable=True, index=True)
    author_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    content_type = Column(
        String(50), nullable=False, default="marketing_copy"
    )  # marketing_copy/product_description/social_media/email/advertisement/presentation
    status = Column(String(30), nullable=False, default="draft")  # draft/in_review/changes_requested/approved
    current_revision_number = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SubmissionRevision(Base):
    __tablename__ = "submission_revisions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    submission_id = Column(
        String(36), ForeignKey("content_submissions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    revision_number = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    summary = Column(String(1000), nullable=True)
    author_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    status_at_creation = Column(String(30), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

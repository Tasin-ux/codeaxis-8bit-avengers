"""Approved terminology model."""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String

from app.db.base import Base


class ApprovedTerminology(Base):
    __tablename__ = "approved_terminology"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    preferred_term = Column(String(255), nullable=False)
    disallowed_term = Column(String(255), nullable=False)
    explanation = Column(String(1000), nullable=True)
    case_sensitive = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

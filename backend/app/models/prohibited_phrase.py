"""Prohibited phrase model."""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String

from app.db.base import Base


class ProhibitedPhrase(Base):
    __tablename__ = "prohibited_phrases"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    phrase = Column(String(500), nullable=False)
    reason = Column(String(1000), nullable=True)
    severity = Column(String(20), nullable=False, default="high")  # critical/high/medium/low/info
    suggested_alternative = Column(String(500), nullable=True)
    case_sensitive = Column(Boolean, default=False)
    whole_word = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

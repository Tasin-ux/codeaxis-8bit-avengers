"""Required disclaimer model."""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String

from app.db.base import Base


class RequiredDisclaimer(Base):
    __tablename__ = "required_disclaimers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    text = Column(String(2000), nullable=False)
    content_category = Column(String(100), nullable=False)
    severity = Column(String(20), nullable=False, default="high")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

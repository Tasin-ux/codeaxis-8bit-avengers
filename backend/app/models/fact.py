"""Approved fact model."""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, String

from app.db.base import Base


class ApprovedFact(Base):
    __tablename__ = "approved_facts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    statement = Column(String(2000), nullable=False)
    source_reference = Column(String(500), nullable=False)
    source_type = Column(String(100), nullable=False)  # e.g. internal_report, press_release, legal_document
    source_url = Column(String(500), nullable=True)
    verification_status = Column(String(20), nullable=False, default="unverified")  # verified/unverified/expired
    product_or_campaign = Column(String(255), nullable=True)
    last_verified_date = Column(Date, nullable=True)
    expiration_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

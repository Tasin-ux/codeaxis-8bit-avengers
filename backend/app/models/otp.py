"""Email OTP model for verification and password-reset flows."""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, DateTime, Integer, String

from app.db.base import Base


class EmailOtp(Base):
    __tablename__ = "email_otps"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    email = Column(String(255), nullable=False, index=True)
    purpose = Column(String(30), nullable=False)  # register | forgot_password | change_password
    code_hash = Column(String(128), nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    consumed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

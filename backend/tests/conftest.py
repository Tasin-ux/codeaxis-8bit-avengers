"""Keep tests hermetic: never hit real email providers.

The developer's backend/.env may configure SMTP/Brevo/Resend, which would make
tests send real emails. Force all providers off so send_otp_email() uses the
in-memory outbox (see app/services/email_service.py).
"""

import pytest

from app.core.config import settings


@pytest.fixture(autouse=True)
def _no_real_email(monkeypatch):
    monkeypatch.setattr(settings, "BREVO_API_KEY", "")
    monkeypatch.setattr(settings, "SMTP_HOST", "")
    monkeypatch.setattr(settings, "SMTP_USER", "")
    monkeypatch.setattr(settings, "SMTP_PASSWORD", "")
    monkeypatch.setattr(settings, "RESEND_API_KEY", "")

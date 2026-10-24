"""Email sending via Resend API (httpx). Falls back to console/outbox in dev."""

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger("brandguard.email")

# Dev/test outbox: when no RESEND_API_KEY is configured, sent emails
# (including OTP codes) are captured here so local dev and tests can
# read them instead of requiring a real mailbox.
outbox: list[dict] = []

_PURPOSE_TEMPLATES = {
    "register": {
        "subject": "Verify your BrandGuard account",
        "intro": "Welcome to BrandGuard! Use the code below to verify your email address.",
    },
    "forgot_password": {
        "subject": "Reset your BrandGuard password",
        "intro": "Use the code below to reset your BrandGuard password. If you didn't request this, ignore this email.",
    },
    "change_password": {
        "subject": "Confirm your BrandGuard password change",
        "intro": "Use the code below to confirm your password change. If you didn't request this, ignore this email.",
    },
}


def _build_email(email: str, code: str, purpose: str) -> dict:
    tpl = _PURPOSE_TEMPLATES.get(purpose, _PURPOSE_TEMPLATES["register"])
    text = f"{tpl['intro']}\n\nYour verification code is: {code}\n\nIt expires in {settings.OTP_EXPIRE_MINUTES} minutes."
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
      <h2 style="margin:0 0 12px">BrandGuard</h2>
      <p>{tpl['intro']}</p>
      <p style="font-size:32px;letter-spacing:8px;font-weight:bold;text-align:center;background:#f3f4f6;padding:16px;border-radius:8px">{code}</p>
      <p style="color:#6b7280;font-size:13px">This code expires in {settings.OTP_EXPIRE_MINUTES} minutes. Never share it with anyone.</p>
    </div>
    """
    return {"to": email, "subject": tpl["subject"], "text": text, "html": html}


def send_otp_email(email: str, code: str, purpose: str) -> bool:
    """Send an OTP email via Resend. In dev (no API key), capture to outbox + log."""
    message = _build_email(email, code, purpose)

    if not settings.RESEND_API_KEY:
        outbox.append({**message, "purpose": purpose})
        # Log the code so operators can debug locally / on misconfigured deploys
        logger.warning("RESEND_API_KEY not set – OTP for %s (%s): %s", email, purpose, code)
        print(f"[DEV-OTP] {purpose} -> {email}: {code}")
        return True

    try:
        resp = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
            json={
                "from": settings.EMAIL_FROM,
                "to": [email],
                "subject": message["subject"],
                "text": message["text"],
                "html": message["html"],
            },
            timeout=15.0,
        )
        if resp.status_code >= 400:
            logger.error("Resend API error %s: %s", resp.status_code, resp.text)
            return False
        return True
    except httpx.HTTPError as exc:
        logger.error("Failed to send email via Resend: %s", exc)
        return False

"""Email sending via SMTP or Resend API (httpx). Falls back to console/outbox in dev."""

import logging
import re
import smtplib
from email.message import EmailMessage

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


def _send_smtp(message: dict) -> None:
    """Send via configured SMTP relay (e.g. Gmail app password)."""
    msg = EmailMessage()
    msg["From"] = settings.EMAIL_FROM or settings.SMTP_USER
    msg["To"] = message["to"]
    msg["Subject"] = message["subject"]
    msg.set_content(message["text"])
    msg.add_alternative(message["html"], subtype="html")
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
        server.ehlo()
        try:
            server.starttls()
            server.ehlo()
        except smtplib.SMTPNotSupportedError:
            pass
        if settings.SMTP_USER:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)


def _parse_from(raw: str, fallback_email: str) -> dict:
    """Split 'Name <email>' (or bare address) into Brevo sender dict."""
    m = re.match(r"^(.*?)\s*<([^>]+)>$", (raw or "").strip())
    if m:
        return {"name": m.group(1).strip() or "BrandGuard", "email": m.group(2).strip()}
    if (raw or "").strip():
        return {"name": "BrandGuard", "email": raw.strip()}
    return {"name": "BrandGuard", "email": fallback_email}


def _send_brevo(message: dict) -> bool:
    """Send via Brevo transactional API (port 443 – allowed on Render free tier)."""
    payload = {
        "sender": _parse_from(settings.EMAIL_FROM, settings.SMTP_USER),
        "to": [{"email": message["to"]}],
        "subject": message["subject"],
        "textContent": message["text"],
        "htmlContent": message["html"],
    }
    try:
        resp = httpx.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={"accept": "application/json", "api-key": settings.BREVO_API_KEY},
            json=payload,
            timeout=15.0,
        )
        if resp.status_code >= 400:
            logger.error("Brevo API error %s: %s", resp.status_code, resp.text)
            return False
        return True
    except httpx.HTTPError as exc:
        logger.error("Brevo request failed: %s", exc)
        return False


def send_otp_email(email: str, code: str, purpose: str) -> bool:
    """Send an OTP email via Brevo API, SMTP, or Resend. Falls back to outbox in dev."""
    message = _build_email(email, code, purpose)

    if settings.BREVO_API_KEY:
        if _send_brevo(message):
            return True

    if settings.SMTP_HOST:
        try:
            _send_smtp(message)
            return True
        except (smtplib.SMTPException, OSError) as exc:
            logger.error("SMTP send to %s failed: %s", email, exc)

    if settings.RESEND_API_KEY:
        try:
            resp = httpx.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                json={
                    "from": settings.EMAIL_FROM or "BrandGuard <onboarding@resend.dev>",
                    "to": [email],
                    "subject": message["subject"],
                    "text": message["text"],
                    "html": message["html"],
                },
                timeout=15.0,
            )
            if resp.status_code < 400:
                return True
            logger.error("Resend API error %s: %s", resp.status_code, resp.text)
        except httpx.HTTPError as exc:
            logger.error("Failed to send email via Resend: %s", exc)

    if not settings.BREVO_API_KEY and not settings.SMTP_HOST and not settings.RESEND_API_KEY:
        # Dev/test outbox: no provider configured, capture instead of failing
        outbox.append({**message, "purpose": purpose})
        logger.warning("No email provider configured – OTP for %s (%s): %s", email, purpose, code)
        print(f"[DEV-OTP] {purpose} -> {email}: {code}")
        return True

    return False

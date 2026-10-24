"""Application configuration loaded from environment variables."""

from pathlib import Path

from pydantic_settings import BaseSettings

# Resolve the SQLite database against the backend directory so the app
# uses the same file regardless of the process working directory
# (running uvicorn from the repo root vs. backend/ previously created
# two divergent databases).
_BACKEND_DIR = Path(__file__).resolve().parents[2]
_DEFAULT_SQLITE_URL = f"sqlite:///{_BACKEND_DIR / 'brandguard.db'}"


class Settings(BaseSettings):
    """Application settings with env-var loading."""

    DATABASE_URL: str = _DEFAULT_SQLITE_URL
    SECRET_KEY: str = "dev-secret-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    AI_PROVIDER: str = "none"
    AI_API_KEY: str = ""
    AI_MODEL: str = ""
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    ENVIRONMENT: str = "development"
    # Email delivery: Brevo API (443, works on Render free tier) is checked
    # first, then SMTP (local), then Resend, then dev outbox.
    # SMTP example (Gmail app password, no domain needed):
    #   SMTP_HOST=smtp.gmail.com  SMTP_PORT=587
    #   SMTP_USER=you@gmail.com   SMTP_PASSWORD=<16-char app password>
    BREVO_API_KEY: str = ""
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = ""
    OTP_EXPIRE_MINUTES: int = 10
    OTP_MAX_ATTEMPTS: int = 5
    OTP_RESEND_COOLDOWN_SECONDS: int = 60

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()

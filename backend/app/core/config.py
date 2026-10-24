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
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "BrandGuard <onboarding@resend.dev>"
    OTP_EXPIRE_MINUTES: int = 10
    OTP_MAX_ATTEMPTS: int = 5
    OTP_RESEND_COOLDOWN_SECONDS: int = 60

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()

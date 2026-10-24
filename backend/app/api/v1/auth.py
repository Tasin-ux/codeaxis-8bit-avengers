"""Auth endpoints – register (OTP verify), login, OTP, password reset/change."""

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.otp import EmailOtp
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    OtpPurposeRequest,
    OtpRequest,
    OtpVerifyRequest,
    RegisterResponse,
    ResetPasswordRequest,
    TokenRefresh,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.services import email_service

router = APIRouter(prefix="/auth", tags=["auth"])

MAX_OTP_ATTEMPTS = settings.OTP_MAX_ATTEMPTS
RESEND_COOLDOWN = timedelta(seconds=settings.OTP_RESEND_COOLDOWN_SECONDS)


def _hash_otp(email: str, purpose: str, code: str) -> str:
    msg = f"{email.lower()}:{purpose}:{code}".encode()
    return hmac.new(settings.SECRET_KEY.encode(), msg, hashlib.sha256).hexdigest()


def _consume_previous(db: Session, email: str, purpose: str) -> None:
    """Mark any outstanding OTPs for this email+purpose as consumed."""
    db.query(EmailOtp).filter(
        EmailOtp.email == email,
        EmailOtp.purpose == purpose,
        EmailOtp.consumed_at.is_(None),
    ).update({"consumed_at": datetime.utcnow()})
    db.flush()


def _create_and_send_otp(db: Session, email: str, purpose: str) -> None:
    """Generate a 6-digit OTP, store its hash, and email it. Raises 502 on send failure."""
    # Rate-limit: enforce resend cooldown
    latest = (
        db.query(EmailOtp)
        .filter(EmailOtp.email == email, EmailOtp.purpose == purpose)
        .order_by(EmailOtp.created_at.desc())
        .first()
    )
    if latest and datetime.utcnow() - latest.created_at < RESEND_COOLDOWN:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Please wait before requesting another code",
        )

    _consume_previous(db, email, purpose)
    code = f"{secrets.randbelow(10**6):06d}"
    otp = EmailOtp(
        email=email,
        purpose=purpose,
        code_hash=_hash_otp(email, purpose, code),
        expires_at=datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES),
    )
    db.add(otp)
    db.commit()

    if not email_service.send_otp_email(email, code, purpose):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to send verification email. Please try again.",
        )


def _verify_otp(db: Session, email: str, code: str, purpose: str) -> None:
    """Validate an OTP code. Raises 400/429 on invalid/expired/locked codes."""
    otp = (
        db.query(EmailOtp)
        .filter(
            EmailOtp.email == email,
            EmailOtp.purpose == purpose,
            EmailOtp.consumed_at.is_(None),
        )
        .order_by(EmailOtp.created_at.desc())
        .first()
    )
    if otp is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active verification code found. Please request a new one.",
        )
    if otp.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new one.",
        )
    if otp.attempts >= MAX_OTP_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many invalid attempts. Please request a new code.",
        )

    expected = _hash_otp(email, purpose, code)
    if not hmac.compare_digest(otp.code_hash, expected):
        otp.attempts += 1
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code.",
        )

    otp.consumed_at = datetime.utcnow()
    db.commit()


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> dict:
    """Register a new user. Account stays inactive until the emailed OTP is verified."""
    email = payload.email.strip().lower()
    if (
        db.query(User)
        .filter(func.lower(User.email) == email)
        .first()
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken",
        )

    user = User(
        email=email,
        username=payload.username,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        is_active=False,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or username already registered",
        )
    db.refresh(user)

    _create_and_send_otp(db, email, "register")

    return {
        "message": "Account created. Check your email for a verification code.",
        "email": email,
    }


@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp(payload: OtpVerifyRequest, db: Session = Depends(get_db)) -> dict:
    """Verify the registration OTP, activate the account, and return JWT tokens."""
    email = payload.email
    user = (
        db.query(User)
        .filter(func.lower(User.email) == email)
        .first()
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found for this email",
        )

    _verify_otp(db, email, payload.code, "register")

    user.is_active = True
    db.commit()
    db.refresh(user)

    return {
        "access_token": create_access_token(user.id),
        "refresh_token": create_refresh_token(user.id),
        "token_type": "bearer",
    }


@router.post("/resend-otp")
def resend_otp(payload: OtpPurposeRequest, db: Session = Depends(get_db)) -> dict:
    """Resend the OTP for registration or forgot-password flows."""
    email = payload.email
    if payload.purpose == "register":
        user = db.query(User).filter(func.lower(User.email) == email).first()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found for this email",
            )
        if user.is_active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Account is already verified. Please log in.",
            )
    _create_and_send_otp(db, email, payload.purpose)
    return {"detail": "Verification code sent"}


@router.post("/forgot-password")
def forgot_password(payload: OtpRequest, db: Session = Depends(get_db)) -> dict:
    """Send a password-reset OTP. Always returns success to avoid account enumeration."""
    email = payload.email
    user = db.query(User).filter(func.lower(User.email) == email).first()
    if user is not None and user.is_active:
        _create_and_send_otp(db, email, "forgot_password")
    return {
        "detail": "If an account exists for this email, a password reset code has been sent."
    }


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> dict:
    """Reset a password using the emailed forgot-password OTP."""
    email = payload.email
    user = db.query(User).filter(func.lower(User.email) == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found for this email",
        )

    _verify_otp(db, email, payload.code, "forgot_password")

    user.hashed_password = hash_password(payload.password)
    user.is_active = True
    db.commit()
    return {"detail": "Password updated successfully. You can now log in."}


@router.post("/change-password/request")
def request_change_password(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict:
    """Send an OTP to the logged-in user's email to confirm a password change."""
    _create_and_send_otp(db, current_user.email, "change_password")
    return {"detail": "Verification code sent to your email"}


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict:
    """Change password: requires current password + emailed OTP confirmation."""
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    _verify_otp(db, current_user.email, payload.code, "change_password")
    current_user.hashed_password = hash_password(payload.password)
    db.commit()
    return {"detail": "Password changed successfully"}


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> dict:
    """Authenticate and return JWT tokens. Supports login via email or username."""
    identifier = payload.identifier
    user = (
        db.query(User)
        .filter(
            or_(
                func.lower(User.email) == identifier.lower(),
                User.username == identifier,
            )
        )
        .first()
    )
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not verified. Check your email for the verification code, or resend it.",
        )

    return {
        "access_token": create_access_token(user.id),
        "refresh_token": create_refresh_token(user.id),
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=TokenResponse)
def refresh_tokens(payload: TokenRefresh, db: Session = Depends(get_db)) -> dict:
    """Exchange a valid refresh token for a new token pair."""
    claims = decode_token(payload.refresh_token)
    if claims is None or claims.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    user_id: str | None = claims.get("sub")
    user = db.query(User).filter(User.id == user_id).first() if user_id else None
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    return {
        "access_token": create_access_token(user.id),
        "refresh_token": create_refresh_token(user.id),
        "token_type": "bearer",
    }


@router.post("/logout")
def logout() -> dict:
    """Logout (stateless – client discards the token)."""
    return {"detail": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_active_user)) -> User:
    """Return the currently authenticated user."""
    return current_user

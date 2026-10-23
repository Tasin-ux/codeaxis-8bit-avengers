"""Security utilities: password hashing (Argon2id) and JWT token management."""

from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt

from app.core.config import settings

# Use argon2-cffi directly for robust Argon2id hashing
try:
    from argon2 import PasswordHasher
    from argon2.exceptions import VerifyMismatchError

    _hasher = PasswordHasher()

    def hash_password(password: str) -> str:
        """Hash a plain-text password using Argon2id."""
        return _hasher.hash(password)

    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a plain-text password against its Argon2id hash."""
        try:
            return _hasher.verify(hashed_password, plain_password)
        except (VerifyMismatchError, Exception):
            return False

except ImportError:
    import hashlib
    import hmac

    def hash_password(password: str) -> str:
        salt = settings.SECRET_KEY[:16].encode()
        h = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000)
        return f"pbkdf2:{salt.hex()}:{h.hex()}"

    def verify_password(plain_password: str, hashed_password: str) -> bool:
        if not hashed_password.startswith("pbkdf2:"):
            return False
        parts = hashed_password.split(":")
        if len(parts) != 3:
            return False
        salt = bytes.fromhex(parts[1])
        expected = bytes.fromhex(parts[2])
        computed = hashlib.pbkdf2_hmac("sha256", plain_password.encode(), salt, 100000)
        return hmac.compare_digest(computed, expected)


ALGORITHM = "HS256"


def create_access_token(subject: str, extra_claims: Optional[dict] = None) -> str:
    """Create a short-lived JWT access token."""
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode = {"sub": subject, "exp": expire, "type": "access"}
    if extra_claims:
        to_encode.update(extra_claims)
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(subject: str) -> str:
    """Create a long-lived JWT refresh token."""
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    to_encode = {"sub": subject, "exp": expire, "type": "refresh"}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token. Returns claims dict or None."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

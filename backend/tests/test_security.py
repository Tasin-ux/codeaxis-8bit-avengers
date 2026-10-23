"""Unit tests for security utilities."""

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_hashing_and_verification():
    plain = "SuperSecureP@ss123!"
    hashed = hash_password(plain)

    assert hashed != plain
    assert verify_password(plain, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_token_creation_and_decoding():
    user_id = "user-12345"
    access_token = create_access_token(user_id, {"role": "admin"})

    payload = decode_token(access_token)
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["type"] == "access"
    assert payload["role"] == "admin"

    refresh_token = create_refresh_token(user_id)
    refresh_payload = decode_token(refresh_token)
    assert refresh_payload is not None
    assert refresh_payload["sub"] == user_id
    assert refresh_payload["type"] == "refresh"

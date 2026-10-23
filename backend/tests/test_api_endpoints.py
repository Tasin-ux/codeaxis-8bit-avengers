"""Integration tests for BrandGuard API endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.security import hash_password
from app.db.base import Base
from app.main import app
from app.models.prohibited_phrase import ProhibitedPhrase
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMembership


@pytest.fixture
def client_and_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)

    def override_get_db():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db

    # Seed initial test user and workspace
    db = TestingSession()
    user = User(
        id="usr-1",
        email="test@brandguard.ai",
        username="testuser",
        full_name="Test User",
        hashed_password=hash_password("Pass123!"),
    )
    ws = Workspace(
        id="ws-1",
        name="Test Workspace",
        slug="test-ws",
        created_by="usr-1",
    )
    membership = WorkspaceMembership(
        id="mem-1",
        workspace_id="ws-1",
        user_id="usr-1",
        role="admin",
    )
    phrase = ProhibitedPhrase(
        id="pp-1",
        workspace_id="ws-1",
        phrase="guarantees results",
        reason="Unsupported absolute claim",
        severity="high",
        suggested_alternative="helps achieve results",
        is_active=True,
    )
    db.add_all([user, ws, membership, phrase])
    db.commit()
    db.close()

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()


def test_auth_login_and_me(client_and_db):
    client = client_and_db

    # Login
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "test@brandguard.ai", "password": "Pass123!"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    token = data["access_token"]

    # Get /auth/me
    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "test@brandguard.ai"


def test_submission_lifecycle_and_review(client_and_db):
    client = client_and_db

    # Login
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "test@brandguard.ai", "password": "Pass123!"},
    )
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create submission with prohibited phrase
    sub_res = client.post(
        "/api/v1/submissions",
        headers=headers,
        json={
            "workspace_id": "ws-1",
            "title": "Marketing Launch",
            "content": "Our solution guarantees results for all users.",
            "content_type": "marketing_copy",
        },
    )
    assert sub_res.status_code == 201
    sub_data = sub_res.json()
    sub_id = sub_data["id"]

    # 2. Run review
    review_res = client.post(
        f"/api/v1/submissions/{sub_id}/review", headers=headers
    )
    assert review_res.status_code == 200
    findings = review_res.json()
    assert len(findings) >= 1
    assert any(f["matched_text"] == "guarantees results" for f in findings)

    # 3. Submit for review
    submit_res = client.post(
        f"/api/v1/submissions/{sub_id}/submit", headers=headers
    )
    assert submit_res.status_code == 200
    assert submit_res.json()["status"] == "in_review"

    # 4. Analytics
    analytics_res = client.get(
        "/api/v1/analytics/overview?workspace_id=ws-1", headers=headers
    )
    assert analytics_res.status_code == 200
    assert analytics_res.json()["total_submissions"] >= 1


def test_cross_workspace_isolation(client_and_db):
    client = client_and_db

    # Register user 2
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "user2@brandguard.ai",
            "username": "user2",
            "full_name": "User Two",
            "password": "Password123!",
        },
    )
    assert reg_res.status_code == 201

    # Login as user 2
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "user2@brandguard.ai", "password": "Password123!"},
    )
    assert login_res.status_code == 200
    token2 = login_res.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # Attempt to list submissions from ws-1 (which user 2 is NOT a member of)
    sub_res = client.get("/api/v1/submissions?workspace_id=ws-1", headers=headers2)
    assert sub_res.status_code == 403

    # Attempt to list guidelines from ws-1
    gl_res = client.get("/api/v1/guidelines?workspace_id=ws-1", headers=headers2)
    assert gl_res.status_code == 403

    # Attempt to access analytics for ws-1
    an_res = client.get("/api/v1/analytics/overview?workspace_id=ws-1", headers=headers2)
    assert an_res.status_code == 403

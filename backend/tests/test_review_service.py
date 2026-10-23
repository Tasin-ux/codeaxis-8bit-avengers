"""Unit tests for the ReviewService state machine."""

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models.submission import ContentSubmission
from app.models.user import User
from app.models.workspace import Workspace
from app.services.review_service import ReviewService


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)
    session = TestingSession()

    user_creator = User(
        id="user-creator",
        email="creator@test.com",
        username="creator",
        full_name="Creator User",
        hashed_password="pw",
    )
    user_reviewer = User(
        id="user-reviewer",
        email="reviewer@test.com",
        username="reviewer",
        full_name="Reviewer User",
        hashed_password="pw",
    )
    ws = Workspace(
        id="ws-1",
        name="Workspace 1",
        slug="ws-1",
        created_by="user-reviewer",
    )
    session.add_all([user_creator, user_reviewer, ws])
    session.commit()

    yield session
    session.close()


def test_review_lifecycle_workflow(db_session):
    sub = ContentSubmission(
        id="sub-1",
        workspace_id="ws-1",
        author_id="user-creator",
        title="Test Submission",
        content="Testing content here.",
        status="draft",
        current_revision_number=1,
    )
    db_session.add(sub)
    db_session.commit()

    service = ReviewService(db_session)

    # 1. Non-author cannot submit
    with pytest.raises(HTTPException) as exc:
        service.submit_for_review(sub, "user-reviewer")
    assert exc.value.status_code == 403

    # 2. Author submits: draft -> in_review
    service.submit_for_review(sub, "user-creator")
    assert sub.status == "in_review"

    # 3. Author cannot approve own submission
    with pytest.raises(HTTPException) as exc:
        service.approve(sub, "user-creator")
    assert exc.value.status_code == 403

    # 4. Reviewer requests changes: in_review -> changes_requested
    service.request_changes(sub, "user-reviewer", "Please revise the intro")
    assert sub.status == "changes_requested"

    # 5. Author resubmits: changes_requested -> in_review
    service.submit_for_review(sub, "user-creator")
    assert sub.status == "in_review"

    # 6. Reviewer approves: in_review -> approved
    service.approve(sub, "user-reviewer", "Looks great!")
    assert sub.status == "approved"

    # 7. Terminal state: cannot request changes after approved
    with pytest.raises(HTTPException) as exc:
        service.request_changes(sub, "user-reviewer")
    assert exc.value.status_code == 409

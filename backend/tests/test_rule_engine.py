"""Unit tests for the deterministic RuleEngine."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models.disclaimer import RequiredDisclaimer
from app.models.prohibited_phrase import ProhibitedPhrase
from app.models.terminology import ApprovedTerminology
from app.models.workspace import Workspace
from app.services.rule_engine import RuleEngine


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

    # Create dummy workspace
    ws = Workspace(
        id="ws-test-1",
        name="Test Workspace",
        slug="test-ws",
        created_by="user-1",
    )
    session.add(ws)
    session.commit()

    yield session
    session.close()


def test_prohibited_phrase_detection(db_session):
    phrase = ProhibitedPhrase(
        id="pp-1",
        workspace_id="ws-test-1",
        phrase="guarantees results",
        reason="Unsupported absolute claim",
        severity="high",
        suggested_alternative="designed to help achieve measurable results",
        case_sensitive=False,
        whole_word=True,
        is_active=True,
    )
    db_session.add(phrase)
    db_session.commit()

    engine = RuleEngine(db_session, "ws-test-1")
    content = "Our software guarantees results for every customer."
    findings = engine.check_prohibited_phrases(content)

    assert len(findings) == 1
    f = findings[0]
    assert f.category == "prohibited_phrase"
    assert f.matched_text == "guarantees results"
    assert f.char_start == 13
    assert f.char_end == 31
    assert content[f.char_start : f.char_end] == "guarantees results"
    assert f.severity == "high"
    assert f.confidence == "rule_violation"


def test_terminology_consistency(db_session):
    term = ApprovedTerminology(
        id="term-1",
        workspace_id="ws-test-1",
        preferred_term="customer",
        disallowed_term="consumer",
        explanation="Use customer instead of consumer",
        case_sensitive=False,
        is_active=True,
    )
    db_session.add(term)
    db_session.commit()

    engine = RuleEngine(db_session, "ws-test-1")
    content = "Every consumer should sign up today."
    findings = engine.check_terminology(content)

    assert len(findings) == 1
    f = findings[0]
    assert f.category == "terminology"
    assert f.matched_text == "consumer"
    assert f.char_start == 6
    assert f.char_end == 14
    assert content[f.char_start : f.char_end] == "consumer"
    assert "customer" in f.suggestion


def test_missing_disclaimer_detection(db_session):
    disclaimer = RequiredDisclaimer(
        id="disc-1",
        workspace_id="ws-test-1",
        text="Results may vary based on configuration.",
        content_category="marketing_copy",
        severity="medium",
        is_active=True,
    )
    db_session.add(disclaimer)
    db_session.commit()

    engine = RuleEngine(db_session, "ws-test-1")

    # Missing disclaimer
    content = "Check out our new solution for high-growth enterprises."
    findings = engine.check_disclaimers(content, "marketing_copy")
    assert len(findings) == 1
    assert findings[0].category == "disclaimer"
    assert findings[0].severity == "medium"

    # Present disclaimer
    content_with = "Check out our solution. Results may vary based on configuration."
    findings_present = engine.check_disclaimers(content_with, "marketing_copy")
    assert len(findings_present) == 0


def test_clean_content_no_findings(db_session):
    phrase = ProhibitedPhrase(
        id="pp-1",
        workspace_id="ws-test-1",
        phrase="guarantees results",
        reason="Unsupported absolute claim",
        severity="high",
        is_active=True,
    )
    db_session.add(phrase)
    db_session.commit()

    engine = RuleEngine(db_session, "ws-test-1")
    clean_text = "Our application helps teams organise their daily work and manage project updates."
    findings = engine.run_all_checks(clean_text)
    assert len(findings) == 0

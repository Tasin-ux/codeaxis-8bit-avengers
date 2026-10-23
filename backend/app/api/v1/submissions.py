"""Submissions API endpoints."""

import asyncio
from collections import defaultdict
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.core.config import settings
from app.models.brand import Brand
from app.models.fact import ApprovedFact
from app.models.finding import ReviewFinding
from app.models.guideline import BrandGuideline
from app.models.review import ReviewComment, RuleFeedback
from app.models.submission import ContentSubmission, SubmissionRevision
from app.models.user import User
from app.models.workspace import WorkspaceMembership
from app.schemas.finding import FindingResponse
from app.schemas.review import ReviewDecisionCreate
from app.schemas.submission import (
    RevisionResponse,
    SubmissionCreate,
    SubmissionResponse,
    SubmissionUpdate,
)
from app.services.ai_service import AIService
from app.services.review_service import ReviewService
from app.services.rule_engine import RuleEngine

router = APIRouter(prefix="/submissions", tags=["submissions"])


def _check_membership(
    db: Session, workspace_id: str, user_id: str
) -> WorkspaceMembership:
    membership = (
        db.query(WorkspaceMembership)
        .filter(
            WorkspaceMembership.workspace_id == workspace_id,
            WorkspaceMembership.user_id == user_id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this workspace",
        )
    return membership


def _validate_brand(db: Session, workspace_id: str, brand_id: str) -> None:
    """Ensure the brand exists and belongs to the same workspace (tenant scoping)."""
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Brand not found",
        )
    if brand.workspace_id != workspace_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Brand does not belong to this workspace",
        )


def _finding_key(
    rule_id: Optional[str],
    category: str,
    title: str,
    matched_text: Optional[str],
    char_start: Optional[int],
    char_end: Optional[int],
) -> tuple:
    """Stable identity for a finding, used to preserve reviewer state on re-audit."""
    return (rule_id, category, title, matched_text, char_start, char_end)


@router.get("", response_model=List[SubmissionResponse])
def list_submissions(
    workspace_id: str = Query(...),
    brand_id: Optional[str] = Query(None),
    author_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _check_membership(db, workspace_id, current_user.id)

    query = db.query(ContentSubmission).filter(
        ContentSubmission.workspace_id == workspace_id
    )
    if brand_id:
        query = query.filter(ContentSubmission.brand_id == brand_id)
    if author_id:
        query = query.filter(ContentSubmission.author_id == author_id)
    if status_filter:
        query = query.filter(ContentSubmission.status == status_filter)

    return query.order_by(ContentSubmission.updated_at.desc()).all()


@router.post("", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
def create_submission(
    payload: SubmissionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _check_membership(db, payload.workspace_id, current_user.id)
    if payload.brand_id is not None:
        _validate_brand(db, payload.workspace_id, payload.brand_id)

    submission = ContentSubmission(
        workspace_id=payload.workspace_id,
        brand_id=payload.brand_id,
        author_id=current_user.id,
        title=payload.title,
        content=payload.content,
        content_type=payload.content_type,
        status="draft",
        current_revision_number=1,
    )
    db.add(submission)
    db.flush()

    # Initial revision snapshot
    initial_revision = SubmissionRevision(
        submission_id=submission.id,
        revision_number=1,
        content=submission.content,
        summary="Initial draft created",
        author_id=current_user.id,
        status_at_creation="draft",
    )
    db.add(initial_revision)
    db.commit()
    db.refresh(submission)
    return submission


@router.get("/{submission_id}", response_model=SubmissionResponse)
def get_submission(
    submission_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    submission = (
        db.query(ContentSubmission)
        .filter(ContentSubmission.id == submission_id)
        .first()
    )
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found"
        )
    _check_membership(db, submission.workspace_id, current_user.id)
    return submission


@router.patch("/{submission_id}", response_model=SubmissionResponse)
def update_submission(
    submission_id: str,
    payload: SubmissionUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    submission = (
        db.query(ContentSubmission)
        .filter(ContentSubmission.id == submission_id)
        .first()
    )
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found"
        )
    membership = _check_membership(db, submission.workspace_id, current_user.id)

    # Only author or managers/admins can update
    if submission.author_id != current_user.id and membership.role not in [
        "admin",
        "manager",
    ]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the author or a manager can edit this submission",
        )

    if submission.status not in ["draft", "changes_requested"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot edit submission in '{submission.status}' status",
        )

    content_changed = payload.content is not None and payload.content != submission.content

    if payload.brand_id is not None:
        _validate_brand(db, submission.workspace_id, payload.brand_id)
    if payload.title is not None:
        submission.title = payload.title
    if payload.brand_id is not None:
        submission.brand_id = payload.brand_id
    if payload.content_type is not None:
        submission.content_type = payload.content_type

    if content_changed:
        submission.content = payload.content
        submission.current_revision_number += 1

        revision = SubmissionRevision(
            submission_id=submission.id,
            revision_number=submission.current_revision_number,
            content=submission.content,
            summary="Content updated",
            author_id=current_user.id,
            status_at_creation=submission.status,
        )
        db.add(revision)

    db.commit()
    db.refresh(submission)
    return submission


@router.delete("/{submission_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_submission(
    submission_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    submission = (
        db.query(ContentSubmission)
        .filter(ContentSubmission.id == submission_id)
        .first()
    )
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found"
        )
    membership = _check_membership(db, submission.workspace_id, current_user.id)

    if submission.author_id != current_user.id and membership.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the author or an admin can delete this submission",
        )

    if submission.status not in ["draft"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only draft submissions can be deleted",
        )

    db.delete(submission)
    db.commit()
    return None


@router.post("/{submission_id}/review", response_model=List[FindingResponse])
def run_review(
    submission_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Run deterministic rule engine and optional AI analysis on the submission.

    Synchronous on purpose: all ORM work runs in FastAPI's worker threadpool
    instead of blocking the event loop, and the optional AI call is executed
    in its own event loop.
    """
    submission = (
        db.query(ContentSubmission)
        .filter(ContentSubmission.id == submission_id)
        .first()
    )
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found"
        )
    _check_membership(db, submission.workspace_id, current_user.id)

    # 1. Deterministic checks
    engine = RuleEngine(db, submission.workspace_id)
    det_findings = engine.run_all_checks(
        content=submission.content, content_type=submission.content_type
    )

    # 2. Check for unsupported factual claims deterministically if facts exist
    # Verify claims: if approved facts exist, check if text contradicts or claims unverified stats
    facts = (
        db.query(ApprovedFact)
        .filter(
            ApprovedFact.workspace_id == submission.workspace_id,
            ApprovedFact.is_active == True,
        )
        .all()
    )

    # 3. Optional AI analysis
    guidelines = (
        db.query(BrandGuideline)
        .filter(
            BrandGuideline.workspace_id == submission.workspace_id,
            BrandGuideline.is_active == True,
        )
        .all()
    )

    ai_service = AIService(settings)
    if ai_service.available:
        ai_findings = asyncio.run(
            ai_service.analyze_content(
                content=submission.content,
                guidelines=guidelines,
                facts=facts,
            )
        )
    else:
        ai_findings = None

    # 4. Capture reviewer state attached to previous findings so that
    #    re-running an audit does not destroy resolved flags, rule feedback,
    #    or comment-to-finding links.
    old_findings = (
        db.query(ReviewFinding)
        .filter(ReviewFinding.submission_id == submission.id)
        .all()
    )
    old_ids = [f.id for f in old_findings]
    old_by_key = {
        _finding_key(
            f.rule_id, f.category, f.title, f.matched_text, f.char_start, f.char_end
        ): f.id
        for f in old_findings
    }
    resolved_keys = {
        _finding_key(
            f.rule_id, f.category, f.title, f.matched_text, f.char_start, f.char_end
        )
        for f in old_findings
        if f.is_resolved
    }
    feedback_by_old: dict = defaultdict(list)
    if old_ids:
        for row in (
            db.query(RuleFeedback).filter(RuleFeedback.finding_id.in_(old_ids)).all()
        ):
            feedback_by_old[row.finding_id].append(row)
    comments_by_old: dict = defaultdict(list)
    if old_ids:
        for row in (
            db.query(ReviewComment).filter(ReviewComment.finding_id.in_(old_ids)).all()
        ):
            comments_by_old[row.finding_id].append(row)

    created_findings = []

    # Store deterministic findings
    for f in det_findings:
        key = _finding_key(
            f.rule_id, f.category, f.title, f.matched_text, f.char_start, f.char_end
        )
        finding = ReviewFinding(
            submission_id=submission.id,
            revision_number=submission.current_revision_number,
            category=f.category,
            title=f.title,
            description=f.description,
            matched_text=f.matched_text,
            char_start=f.char_start,
            char_end=f.char_end,
            severity=f.severity,
            confidence=f.confidence,
            explanation=f.explanation,
            suggestion=f.suggestion,
            rule_id=f.rule_id,
            rule_type=f.rule_type,
            evidence_status=f.evidence_status,
            source=f.source,
            is_resolved=key in resolved_keys,
        )
        db.add(finding)
        created_findings.append(finding)

    # Store AI findings if any
    if ai_findings:
        for aif in ai_findings:
            key = _finding_key(
                None,
                aif.category,
                aif.title,
                aif.matched_text,
                aif.char_start,
                aif.char_end,
            )
            finding = ReviewFinding(
                submission_id=submission.id,
                revision_number=submission.current_revision_number,
                category=aif.category,
                title=aif.title,
                description=aif.description,
                matched_text=aif.matched_text,
                char_start=aif.char_start,
                char_end=aif.char_end,
                severity=aif.severity,
                confidence=aif.confidence,
                explanation=aif.explanation,
                suggestion=aif.suggestion,
                evidence_status=aif.evidence_status,
                source="ai",
                is_resolved=key in resolved_keys,
            )
            db.add(finding)
            created_findings.append(finding)

    # Assign ids to the regenerated findings
    db.flush()

    # Re-link reviewer state from the old findings onto regenerated equivalents
    for new_f in created_findings:
        key = _finding_key(
            new_f.rule_id,
            new_f.category,
            new_f.title,
            new_f.matched_text,
            new_f.char_start,
            new_f.char_end,
        )
        old_id = old_by_key.get(key)
        if old_id is None:
            continue
        for row in feedback_by_old.pop(old_id, []):
            row.finding_id = new_f.id
        for row in comments_by_old.pop(old_id, []):
            row.finding_id = new_f.id

    # Persist the re-links before removing the superseded findings
    db.flush()

    if old_ids:
        db.query(ReviewFinding).filter(ReviewFinding.id.in_(old_ids)).delete(
            synchronize_session=False
        )

    db.commit()

    # Re-fetch persisted findings
    return (
        db.query(ReviewFinding)
        .filter(ReviewFinding.submission_id == submission.id)
        .all()
    )


@router.post("/{submission_id}/submit", response_model=SubmissionResponse)
def submit_submission_for_review(
    submission_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    submission = (
        db.query(ContentSubmission)
        .filter(ContentSubmission.id == submission_id)
        .first()
    )
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found"
        )
    membership = _check_membership(db, submission.workspace_id, current_user.id)

    review_service = ReviewService(db)
    return review_service.submit_for_review(
        submission, current_user.id, role=membership.role
    )


@router.post("/{submission_id}/approve", response_model=SubmissionResponse)
def approve_submission(
    submission_id: str,
    payload: Optional[ReviewDecisionCreate] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    submission = (
        db.query(ContentSubmission)
        .filter(ContentSubmission.id == submission_id)
        .first()
    )
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found"
        )
    membership = _check_membership(db, submission.workspace_id, current_user.id)

    if membership.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers or admins can approve submissions",
        )

    if payload is not None and payload.decision != "approved":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="decision must be 'approved' for this endpoint",
        )

    comment = payload.comment if payload else None
    review_service = ReviewService(db)
    return review_service.approve(submission, current_user.id, comment)


@router.post("/{submission_id}/request-changes", response_model=SubmissionResponse)
def request_submission_changes(
    submission_id: str,
    payload: ReviewDecisionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    submission = (
        db.query(ContentSubmission)
        .filter(ContentSubmission.id == submission_id)
        .first()
    )
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found"
        )
    membership = _check_membership(db, submission.workspace_id, current_user.id)

    if membership.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers or admins can request changes",
        )

    if payload.decision != "changes_requested":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="decision must be 'changes_requested' for this endpoint",
        )

    review_service = ReviewService(db)
    return review_service.request_changes(submission, current_user.id, payload.comment)


@router.get("/{submission_id}/findings", response_model=List[FindingResponse])
def get_submission_findings(
    submission_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    submission = (
        db.query(ContentSubmission)
        .filter(ContentSubmission.id == submission_id)
        .first()
    )
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found"
        )
    _check_membership(db, submission.workspace_id, current_user.id)

    return (
        db.query(ReviewFinding)
        .filter(ReviewFinding.submission_id == submission_id)
        .all()
    )


@router.get("/{submission_id}/revisions", response_model=List[RevisionResponse])
def get_submission_revisions(
    submission_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    submission = (
        db.query(ContentSubmission)
        .filter(ContentSubmission.id == submission_id)
        .first()
    )
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found"
        )
    _check_membership(db, submission.workspace_id, current_user.id)

    return (
        db.query(SubmissionRevision)
        .filter(SubmissionRevision.submission_id == submission_id)
        .order_by(SubmissionRevision.revision_number.desc())
        .all()
    )

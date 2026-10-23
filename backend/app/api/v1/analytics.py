"""Governance analytics API endpoints."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.finding import ReviewFinding
from app.models.review import RuleFeedback
from app.models.submission import ContentSubmission
from app.models.user import User
from app.models.workspace import WorkspaceMembership
from app.schemas.analytics import (
    AnalyticsOverview,
    CategoryCount,
    FindingAnalytics,
    RuleAnalytics,
    RuleHit,
    SeverityCount,
    StatusCount,
)
from app.schemas.review import FeedbackCreate

router = APIRouter(prefix="/analytics", tags=["analytics"])


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


@router.get("/overview", response_model=AnalyticsOverview)
def get_overview(
    workspace_id: str = Query(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _check_membership(db, workspace_id, current_user.id)

    # Submissions by status
    status_rows = (
        db.query(ContentSubmission.status, func.count(ContentSubmission.id))
        .filter(ContentSubmission.workspace_id == workspace_id)
        .group_by(ContentSubmission.status)
        .all()
    )
    submissions_by_status = [
        StatusCount(status=row[0], count=row[1]) for row in status_rows
    ]

    total_submissions = sum(s.count for s in submissions_by_status)

    # Findings across submissions in this workspace
    sub_ids = (
        db.query(ContentSubmission.id)
        .filter(ContentSubmission.workspace_id == workspace_id)
        .scalar_subquery()
    )

    total_findings = (
        db.query(func.count(ReviewFinding.id))
        .filter(ReviewFinding.submission_id.in_(sub_ids))
        .scalar()
        or 0
    )

    total_resolved = (
        db.query(func.count(ReviewFinding.id))
        .filter(
            ReviewFinding.submission_id.in_(sub_ids),
            ReviewFinding.is_resolved == True,
        )
        .scalar()
        or 0
    )

    return AnalyticsOverview(
        total_submissions=total_submissions,
        submissions_by_status=submissions_by_status,
        total_findings=total_findings,
        total_resolved_findings=total_resolved,
    )


@router.get("/findings", response_model=FindingAnalytics)
def get_findings_analytics(
    workspace_id: str = Query(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _check_membership(db, workspace_id, current_user.id)

    sub_ids = (
        db.query(ContentSubmission.id)
        .filter(ContentSubmission.workspace_id == workspace_id)
        .scalar_subquery()
    )

    # By category
    cat_rows = (
        db.query(ReviewFinding.category, func.count(ReviewFinding.id))
        .filter(ReviewFinding.submission_id.in_(sub_ids))
        .group_by(ReviewFinding.category)
        .all()
    )
    by_category = [CategoryCount(category=row[0], count=row[1]) for row in cat_rows]

    # By severity
    sev_rows = (
        db.query(ReviewFinding.severity, func.count(ReviewFinding.id))
        .filter(ReviewFinding.submission_id.in_(sub_ids))
        .group_by(ReviewFinding.severity)
        .all()
    )
    by_severity = [SeverityCount(severity=row[0], count=row[1]) for row in sev_rows]

    total_findings = sum(c.count for c in by_category)

    return FindingAnalytics(
        total_findings=total_findings,
        by_category=by_category,
        by_severity=by_severity,
    )


@router.get("/rules", response_model=RuleAnalytics)
def get_rule_analytics(
    workspace_id: str = Query(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _check_membership(db, workspace_id, current_user.id)

    sub_ids = (
        db.query(ContentSubmission.id)
        .filter(ContentSubmission.workspace_id == workspace_id)
        .scalar_subquery()
    )

    # Frequently triggered rules
    rule_rows = (
        db.query(
            ReviewFinding.rule_id,
            ReviewFinding.rule_type,
            ReviewFinding.title,
            func.count(ReviewFinding.id).label("hits"),
        )
        .filter(
            ReviewFinding.submission_id.in_(sub_ids),
            ReviewFinding.rule_id != None,
        )
        .group_by(
            ReviewFinding.rule_id, ReviewFinding.rule_type, ReviewFinding.title
        )
        .order_by(func.count(ReviewFinding.id).desc())
        .limit(10)
        .all()
    )

    hits = [
        RuleHit(
            rule_id=row[0],
            rule_type=row[1],
            title=row[2],
            hit_count=row[3],
        )
        for row in rule_rows
    ]

    return RuleAnalytics(most_triggered=hits)


@router.post("/findings/{finding_id}/flag-unclear", status_code=status.HTTP_201_CREATED)
def flag_finding_unclear(
    finding_id: str,
    payload: FeedbackCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    finding = db.query(ReviewFinding).filter(ReviewFinding.id == finding_id).first()
    if not finding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found"
        )

    # Enforce workspace isolation: the finding must belong to a submission
    # in a workspace the current user is a member of.
    submission = (
        db.query(ContentSubmission)
        .filter(ContentSubmission.id == finding.submission_id)
        .first()
    )
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found"
        )
    _check_membership(db, submission.workspace_id, current_user.id)

    feedback = RuleFeedback(
        finding_id=finding_id,
        user_id=current_user.id,
        rule_id=payload.rule_id,
        rule_type=payload.rule_type,
        feedback_type=payload.feedback_type,
        comment=payload.comment,
    )
    db.add(feedback)
    db.commit()
    return {"status": "feedback_recorded", "id": feedback.id}

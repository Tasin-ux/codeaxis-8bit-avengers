"""Review comments API endpoints."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.finding import ReviewFinding
from app.models.review import ReviewComment
from app.models.submission import ContentSubmission
from app.models.user import User
from app.models.workspace import WorkspaceMembership
from app.schemas.review import CommentCreate, CommentResponse

router = APIRouter(tags=["comments"])


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


@router.get(
    "/submissions/{submission_id}/comments", response_model=List[CommentResponse]
)
def list_comments(
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
        db.query(ReviewComment)
        .filter(ReviewComment.submission_id == submission_id)
        .order_by(ReviewComment.created_at.asc())
        .all()
    )


@router.post(
    "/submissions/{submission_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    submission_id: str,
    payload: CommentCreate,
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

    if payload.finding_id is not None:
        finding = (
            db.query(ReviewFinding).filter(ReviewFinding.id == payload.finding_id).first()
        )
        if not finding or finding.submission_id != submission_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="finding_id does not belong to this submission",
            )

    comment = ReviewComment(
        submission_id=submission_id,
        author_id=current_user.id,
        text=payload.text,
        revision_number=payload.revision_number or submission.current_revision_number,
        finding_id=payload.finding_id,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment

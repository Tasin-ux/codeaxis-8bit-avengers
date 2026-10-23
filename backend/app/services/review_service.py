"""Review service – state machine for content submission workflow.

Valid state transitions:
    draft              -> in_review  (author submits)
    in_review          -> approved   (manager/admin approves)
    in_review          -> changes_requested (manager/admin requests changes)
    changes_requested  -> in_review  (author re-submits)
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.review import ReviewDecision
from app.models.submission import ContentSubmission, SubmissionRevision

# Allowed transitions: current_status -> {allowed_next_statuses}
_TRANSITIONS = {
    "draft": {"in_review"},
    "in_review": {"approved", "changes_requested"},
    "changes_requested": {"in_review"},
    "approved": set(),  # terminal state
}


class ReviewService:
    """Manage content submission lifecycle and review decisions."""

    def __init__(self, db: Session) -> None:
        self.db = db

    # ------------------------------------------------------------------
    # State transitions
    # ------------------------------------------------------------------

    def submit_for_review(
        self,
        submission: ContentSubmission,
        author_id: str,
        role: str | None = None,
    ) -> ContentSubmission:
        """Move submission from draft/changes_requested -> in_review.

        The author may always submit; managers/admins may also submit on
        the author's behalf (matching the edit permission rules).
        """
        if submission.author_id != author_id and role not in ("admin", "manager"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the author or a manager can submit for review",
            )
        self._transition(submission, "in_review")

        # Only snapshot when this revision number has not been recorded yet.
        # create_submission / update_submission already snapshot the content,
        # so a duplicate row with the same revision_number must not be added.
        already_snapshotted = (
            self.db.query(SubmissionRevision.id)
            .filter(
                SubmissionRevision.submission_id == submission.id,
                SubmissionRevision.revision_number == submission.current_revision_number,
            )
            .first()
        )
        if not already_snapshotted:
            revision = SubmissionRevision(
                submission_id=submission.id,
                revision_number=submission.current_revision_number,
                content=submission.content,
                summary="Submitted for review",
                author_id=author_id,
                status_at_creation="in_review",
            )
            self.db.add(revision)
        self.db.commit()
        self.db.refresh(submission)
        return submission

    def approve(
        self, submission: ContentSubmission, reviewer_id: str, comment: str | None = None
    ) -> ContentSubmission:
        """Approve a submission (manager/admin, not self)."""
        if submission.author_id == reviewer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Authors cannot approve their own submissions",
            )
        self._transition(submission, "approved")

        decision = ReviewDecision(
            submission_id=submission.id,
            reviewer_id=reviewer_id,
            decision="approved",
            comment=comment,
            revision_number=submission.current_revision_number,
        )
        self.db.add(decision)
        self.db.commit()
        self.db.refresh(submission)
        return submission

    def request_changes(
        self, submission: ContentSubmission, reviewer_id: str, comment: str | None = None
    ) -> ContentSubmission:
        """Request changes on a submission (manager/admin, not self)."""
        if submission.author_id == reviewer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Authors cannot request changes on their own submissions",
            )
        self._transition(submission, "changes_requested")

        decision = ReviewDecision(
            submission_id=submission.id,
            reviewer_id=reviewer_id,
            decision="changes_requested",
            comment=comment,
            revision_number=submission.current_revision_number,
        )
        self.db.add(decision)
        self.db.commit()
        self.db.refresh(submission)
        return submission

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _transition(self, submission: ContentSubmission, target: str) -> None:
        """Validate and execute a state transition."""
        allowed = _TRANSITIONS.get(submission.status, set())
        if target not in allowed:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot transition from '{submission.status}' to '{target}'. "
                f"Allowed: {sorted(allowed) if allowed else 'none (terminal state)'}",
            )
        submission.status = target

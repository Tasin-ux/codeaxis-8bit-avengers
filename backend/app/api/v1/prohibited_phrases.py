"""Prohibited phrases CRUD endpoints."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.prohibited_phrase import ProhibitedPhrase
from app.models.user import User
from app.models.workspace import WorkspaceMembership
from app.schemas.prohibited_phrase import (
    ProhibitedPhraseCreate,
    ProhibitedPhraseResponse,
    ProhibitedPhraseUpdate,
)

router = APIRouter()


def _check_membership(db: Session, workspace_id: str, user_id: str) -> WorkspaceMembership:
    m = (
        db.query(WorkspaceMembership)
        .filter(
            WorkspaceMembership.workspace_id == workspace_id,
            WorkspaceMembership.user_id == user_id,
        )
        .first()
    )
    if not m:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this workspace")
    return m


def _check_manager(db: Session, workspace_id: str, user_id: str) -> None:
    """Only managers and admins may create/update/delete brand rules."""
    m = _check_membership(db, workspace_id, user_id)
    if m.role not in ("admin", "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only brand managers or admins can manage brand rules",
        )


@router.get("", response_model=List[ProhibitedPhraseResponse], include_in_schema=False)
@router.get("/", response_model=List[ProhibitedPhraseResponse])
def list_prohibited_phrases(
    workspace_id: str = Query(...),
    severity: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list:
    """List prohibited phrases."""
    _check_membership(db, workspace_id, current_user.id)

    query = db.query(ProhibitedPhrase).filter(ProhibitedPhrase.workspace_id == workspace_id)
    if severity is not None:
        query = query.filter(ProhibitedPhrase.severity == severity)
    if is_active is not None:
        query = query.filter(ProhibitedPhrase.is_active == is_active)
    return query.order_by(ProhibitedPhrase.phrase).all()


@router.post("", response_model=ProhibitedPhraseResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
@router.post("/", response_model=ProhibitedPhraseResponse, status_code=status.HTTP_201_CREATED)
def create_prohibited_phrase(
    payload: ProhibitedPhraseCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ProhibitedPhrase:
    """Create a prohibited phrase."""
    workspace_id = payload.workspace_id
    _check_manager(db, workspace_id, current_user.id)

    phrase = ProhibitedPhrase(
        workspace_id=workspace_id,
        phrase=payload.phrase,
        reason=payload.reason,
        severity=payload.severity,
        suggested_alternative=payload.suggested_alternative,
        case_sensitive=payload.case_sensitive,
        whole_word=payload.whole_word,
        is_active=payload.is_active,
    )
    db.add(phrase)
    db.commit()
    db.refresh(phrase)
    return phrase


@router.get("/{phrase_id}", response_model=ProhibitedPhraseResponse)
def get_prohibited_phrase(
    phrase_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ProhibitedPhrase:
    """Get a single prohibited phrase."""
    phrase = db.query(ProhibitedPhrase).filter(ProhibitedPhrase.id == phrase_id).first()
    if not phrase:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prohibited phrase not found")
    _check_membership(db, phrase.workspace_id, current_user.id)
    return phrase


@router.patch("/{phrase_id}", response_model=ProhibitedPhraseResponse)
def update_prohibited_phrase(
    phrase_id: str,
    payload: ProhibitedPhraseUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ProhibitedPhrase:
    """Update a prohibited phrase."""
    phrase = db.query(ProhibitedPhrase).filter(ProhibitedPhrase.id == phrase_id).first()
    if not phrase:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prohibited phrase not found")
    _check_manager(db, phrase.workspace_id, current_user.id)

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(phrase, key, value)
    db.commit()
    db.refresh(phrase)
    return phrase


@router.delete("/{phrase_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_prohibited_phrase(
    phrase_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> None:
    """Delete a prohibited phrase."""
    phrase = db.query(ProhibitedPhrase).filter(ProhibitedPhrase.id == phrase_id).first()
    if not phrase:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prohibited phrase not found")
    _check_manager(db, phrase.workspace_id, current_user.id)
    db.delete(phrase)
    db.commit()

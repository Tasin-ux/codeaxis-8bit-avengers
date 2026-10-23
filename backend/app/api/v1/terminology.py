"""Approved terminology CRUD endpoints."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.terminology import ApprovedTerminology
from app.models.user import User
from app.models.workspace import WorkspaceMembership
from app.schemas.terminology import TerminologyCreate, TerminologyResponse, TerminologyUpdate

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


@router.get("", response_model=List[TerminologyResponse], include_in_schema=False)
@router.get("/", response_model=List[TerminologyResponse])
def list_terminology(
    workspace_id: str = Query(...),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list:
    """List terminology entries."""
    _check_membership(db, workspace_id, current_user.id)

    query = db.query(ApprovedTerminology).filter(ApprovedTerminology.workspace_id == workspace_id)
    if is_active is not None:
        query = query.filter(ApprovedTerminology.is_active == is_active)
    return query.order_by(ApprovedTerminology.preferred_term).all()


@router.post("", response_model=TerminologyResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
@router.post("/", response_model=TerminologyResponse, status_code=status.HTTP_201_CREATED)
def create_terminology(
    payload: TerminologyCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ApprovedTerminology:
    """Create a terminology entry."""
    workspace_id = payload.workspace_id
    _check_manager(db, workspace_id, current_user.id)

    term = ApprovedTerminology(
        workspace_id=workspace_id,
        preferred_term=payload.preferred_term,
        disallowed_term=payload.disallowed_term,
        explanation=payload.explanation,
        case_sensitive=payload.case_sensitive,
        is_active=payload.is_active,
    )
    db.add(term)
    db.commit()
    db.refresh(term)
    return term


@router.get("/{term_id}", response_model=TerminologyResponse)
def get_terminology(
    term_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ApprovedTerminology:
    """Get a single terminology entry."""
    term = db.query(ApprovedTerminology).filter(ApprovedTerminology.id == term_id).first()
    if not term:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Terminology not found")
    _check_membership(db, term.workspace_id, current_user.id)
    return term


@router.patch("/{term_id}", response_model=TerminologyResponse)
def update_terminology(
    term_id: str,
    payload: TerminologyUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ApprovedTerminology:
    """Update a terminology entry."""
    term = db.query(ApprovedTerminology).filter(ApprovedTerminology.id == term_id).first()
    if not term:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Terminology not found")
    _check_manager(db, term.workspace_id, current_user.id)

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(term, key, value)
    db.commit()
    db.refresh(term)
    return term


@router.delete("/{term_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_terminology(
    term_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> None:
    """Delete a terminology entry."""
    term = db.query(ApprovedTerminology).filter(ApprovedTerminology.id == term_id).first()
    if not term:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Terminology not found")
    _check_manager(db, term.workspace_id, current_user.id)
    db.delete(term)
    db.commit()

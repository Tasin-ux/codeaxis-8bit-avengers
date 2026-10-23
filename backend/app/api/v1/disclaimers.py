"""Required disclaimers CRUD endpoints."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.disclaimer import RequiredDisclaimer
from app.models.user import User
from app.models.workspace import WorkspaceMembership
from app.schemas.disclaimer import DisclaimerCreate, DisclaimerResponse, DisclaimerUpdate

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


@router.get("", response_model=List[DisclaimerResponse], include_in_schema=False)
@router.get("/", response_model=List[DisclaimerResponse])
def list_disclaimers(
    workspace_id: str = Query(...),
    content_category: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list:
    """List disclaimers with optional filters."""
    _check_membership(db, workspace_id, current_user.id)

    query = db.query(RequiredDisclaimer).filter(RequiredDisclaimer.workspace_id == workspace_id)
    if content_category is not None:
        query = query.filter(RequiredDisclaimer.content_category == content_category)
    if is_active is not None:
        query = query.filter(RequiredDisclaimer.is_active == is_active)
    return query.order_by(RequiredDisclaimer.content_category).all()


@router.post("", response_model=DisclaimerResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
@router.post("/", response_model=DisclaimerResponse, status_code=status.HTTP_201_CREATED)
def create_disclaimer(
    payload: DisclaimerCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> RequiredDisclaimer:
    """Create a disclaimer."""
    workspace_id = payload.workspace_id
    _check_manager(db, workspace_id, current_user.id)

    disclaimer = RequiredDisclaimer(
        workspace_id=workspace_id,
        text=payload.text,
        content_category=payload.content_category,
        severity=payload.severity,
        is_active=payload.is_active,
    )
    db.add(disclaimer)
    db.commit()
    db.refresh(disclaimer)
    return disclaimer


@router.get("/{disclaimer_id}", response_model=DisclaimerResponse)
def get_disclaimer(
    disclaimer_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> RequiredDisclaimer:
    """Get a single disclaimer."""
    disclaimer = db.query(RequiredDisclaimer).filter(RequiredDisclaimer.id == disclaimer_id).first()
    if not disclaimer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Disclaimer not found")
    _check_membership(db, disclaimer.workspace_id, current_user.id)
    return disclaimer


@router.patch("/{disclaimer_id}", response_model=DisclaimerResponse)
def update_disclaimer(
    disclaimer_id: str,
    payload: DisclaimerUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> RequiredDisclaimer:
    """Update a disclaimer."""
    disclaimer = db.query(RequiredDisclaimer).filter(RequiredDisclaimer.id == disclaimer_id).first()
    if not disclaimer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Disclaimer not found")
    _check_manager(db, disclaimer.workspace_id, current_user.id)

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(disclaimer, key, value)
    db.commit()
    db.refresh(disclaimer)
    return disclaimer


@router.delete("/{disclaimer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_disclaimer(
    disclaimer_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> None:
    """Delete a disclaimer."""
    disclaimer = db.query(RequiredDisclaimer).filter(RequiredDisclaimer.id == disclaimer_id).first()
    if not disclaimer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Disclaimer not found")
    _check_manager(db, disclaimer.workspace_id, current_user.id)
    db.delete(disclaimer)
    db.commit()

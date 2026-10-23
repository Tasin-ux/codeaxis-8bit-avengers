"""Approved facts CRUD endpoints."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.fact import ApprovedFact
from app.models.user import User
from app.models.workspace import WorkspaceMembership
from app.schemas.fact import FactCreate, FactResponse, FactUpdate

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


@router.get("", response_model=List[FactResponse], include_in_schema=False)
@router.get("/", response_model=List[FactResponse])
def list_facts(
    workspace_id: str = Query(...),
    verification_status: Optional[str] = Query(None),
    product_or_campaign: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list:
    """List approved facts with optional filters."""
    _check_membership(db, workspace_id, current_user.id)

    query = db.query(ApprovedFact).filter(ApprovedFact.workspace_id == workspace_id)
    if verification_status is not None:
        query = query.filter(ApprovedFact.verification_status == verification_status)
    if product_or_campaign is not None:
        query = query.filter(ApprovedFact.product_or_campaign == product_or_campaign)
    if is_active is not None:
        query = query.filter(ApprovedFact.is_active == is_active)
    return query.order_by(ApprovedFact.title).all()


@router.post("", response_model=FactResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
@router.post("/", response_model=FactResponse, status_code=status.HTTP_201_CREATED)
def create_fact(
    payload: FactCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ApprovedFact:
    """Create an approved fact."""
    workspace_id = payload.workspace_id
    _check_manager(db, workspace_id, current_user.id)

    fact = ApprovedFact(
        workspace_id=workspace_id,
        title=payload.title,
        statement=payload.statement,
        source_reference=payload.source_reference,
        source_type=payload.source_type,
        source_url=payload.source_url,
        verification_status=payload.verification_status,
        product_or_campaign=payload.product_or_campaign,
        last_verified_date=payload.last_verified_date,
        expiration_date=payload.expiration_date,
        is_active=payload.is_active,
    )
    db.add(fact)
    db.commit()
    db.refresh(fact)
    return fact


@router.get("/{fact_id}", response_model=FactResponse)
def get_fact(
    fact_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ApprovedFact:
    """Get a single fact."""
    fact = db.query(ApprovedFact).filter(ApprovedFact.id == fact_id).first()
    if not fact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fact not found")
    _check_membership(db, fact.workspace_id, current_user.id)
    return fact


@router.patch("/{fact_id}", response_model=FactResponse)
def update_fact(
    fact_id: str,
    payload: FactUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ApprovedFact:
    """Update an approved fact."""
    fact = db.query(ApprovedFact).filter(ApprovedFact.id == fact_id).first()
    if not fact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fact not found")
    _check_manager(db, fact.workspace_id, current_user.id)

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(fact, key, value)
    db.commit()
    db.refresh(fact)
    return fact


@router.delete("/{fact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fact(
    fact_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> None:
    """Delete an approved fact."""
    fact = db.query(ApprovedFact).filter(ApprovedFact.id == fact_id).first()
    if not fact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fact not found")
    _check_manager(db, fact.workspace_id, current_user.id)
    db.delete(fact)
    db.commit()

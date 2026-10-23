"""Brand guideline CRUD endpoints."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.brand import Brand
from app.models.guideline import BrandGuideline
from app.models.user import User
from app.models.workspace import WorkspaceMembership
from app.schemas.guideline import GuidelineCreate, GuidelineResponse, GuidelineUpdate

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


@router.get("", response_model=List[GuidelineResponse], include_in_schema=False)
@router.get("/", response_model=List[GuidelineResponse])
def list_guidelines(
    workspace_id: str = Query(...),
    brand_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list:
    """List guidelines with optional filters."""
    _check_membership(db, workspace_id, current_user.id)

    query = db.query(BrandGuideline).filter(BrandGuideline.workspace_id == workspace_id)
    if brand_id is not None:
        query = query.filter(BrandGuideline.brand_id == brand_id)
    if category is not None:
        query = query.filter(BrandGuideline.category == category)
    if severity is not None:
        query = query.filter(BrandGuideline.severity == severity)
    if is_active is not None:
        query = query.filter(BrandGuideline.is_active == is_active)
    return query.order_by(BrandGuideline.title).all()


@router.post("", response_model=GuidelineResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
@router.post("/", response_model=GuidelineResponse, status_code=status.HTTP_201_CREATED)
def create_guideline(
    payload: GuidelineCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> BrandGuideline:
    """Create a guideline."""
    workspace_id = payload.workspace_id
    _check_manager(db, workspace_id, current_user.id)
    if payload.brand_id is not None:
        _validate_brand(db, workspace_id, payload.brand_id)

    guideline = BrandGuideline(
        workspace_id=workspace_id,
        brand_id=payload.brand_id,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        severity=payload.severity,
        is_active=payload.is_active,
    )
    db.add(guideline)
    db.commit()
    db.refresh(guideline)
    return guideline


@router.get("/{guideline_id}", response_model=GuidelineResponse)
def get_guideline(
    guideline_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> BrandGuideline:
    """Get a single guideline."""
    guideline = db.query(BrandGuideline).filter(BrandGuideline.id == guideline_id).first()
    if not guideline:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guideline not found")
    _check_membership(db, guideline.workspace_id, current_user.id)
    return guideline


@router.patch("/{guideline_id}", response_model=GuidelineResponse)
def update_guideline(
    guideline_id: str,
    payload: GuidelineUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> BrandGuideline:
    """Update a guideline."""
    guideline = db.query(BrandGuideline).filter(BrandGuideline.id == guideline_id).first()
    if not guideline:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guideline not found")
    _check_manager(db, guideline.workspace_id, current_user.id)
    if payload.brand_id is not None:
        _validate_brand(db, guideline.workspace_id, payload.brand_id)

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(guideline, key, value)
    db.commit()
    db.refresh(guideline)
    return guideline


@router.delete("/{guideline_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_guideline(
    guideline_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> None:
    """Delete a guideline."""
    guideline = db.query(BrandGuideline).filter(BrandGuideline.id == guideline_id).first()
    if not guideline:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guideline not found")
    _check_manager(db, guideline.workspace_id, current_user.id)
    db.delete(guideline)
    db.commit()

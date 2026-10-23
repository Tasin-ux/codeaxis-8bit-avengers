"""Brand CRUD endpoints."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, require_workspace_member
from app.db.session import get_db
from app.models.brand import Brand
from app.models.user import User
from app.models.workspace import WorkspaceMembership
from app.schemas.brand import BrandCreate, BrandResponse, BrandUpdate

router = APIRouter()


@router.get("", response_model=List[BrandResponse], include_in_schema=False)
@router.get("/", response_model=List[BrandResponse])
def list_brands(
    workspace_id: str = Query(...),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list:
    """List brands for a workspace."""
    # Check membership
    _check_membership(db, workspace_id, current_user.id)

    query = db.query(Brand).filter(Brand.workspace_id == workspace_id)
    if is_active is not None:
        query = query.filter(Brand.is_active == is_active)
    return query.order_by(Brand.name).all()


@router.post("", response_model=BrandResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
@router.post("/", response_model=BrandResponse, status_code=status.HTTP_201_CREATED)
def create_brand(
    payload: BrandCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Brand:
    """Create a brand within a workspace."""
    workspace_id = payload.workspace_id
    _check_membership(db, workspace_id, current_user.id)

    brand = Brand(
        workspace_id=workspace_id,
        name=payload.name,
        description=payload.description,
        is_active=payload.is_active,
    )
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return brand


@router.get("/{brand_id}", response_model=BrandResponse)
def get_brand(
    brand_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Brand:
    """Get a brand by ID."""
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
    _check_membership(db, brand.workspace_id, current_user.id)
    return brand


@router.patch("/{brand_id}", response_model=BrandResponse)
def update_brand(
    brand_id: str,
    payload: BrandUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Brand:
    """Update a brand."""
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
    _check_membership(db, brand.workspace_id, current_user.id)

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(brand, key, value)
    db.commit()
    db.refresh(brand)
    return brand


@router.delete("/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_brand(
    brand_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> None:
    """Delete a brand."""
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
    _check_membership(db, brand.workspace_id, current_user.id)

    db.delete(brand)
    db.commit()


def _check_membership(db: Session, workspace_id: str, user_id: str) -> None:
    """Raise 403 if user is not a workspace member."""
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
            detail="Not a member of this workspace",
        )

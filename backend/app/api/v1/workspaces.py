"""Workspace CRUD and membership management."""

import re
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import (
    get_current_active_user,
    require_workspace_member,
    require_workspace_role,
)
from app.db.session import get_db
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMembership
from app.schemas.workspace import (
    MembershipCreate,
    MembershipResponse,
    MembershipUpdate,
    UserSummary,
    WorkspaceCreate,
    WorkspaceResponse,
    WorkspaceUpdate,
)

router = APIRouter()


@router.get("", response_model=List[WorkspaceResponse], include_in_schema=False)
@router.get("/", response_model=List[WorkspaceResponse])
def list_workspaces(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list:
    """List all workspaces the current user is a member of."""
    membership_ids = (
        db.query(WorkspaceMembership.workspace_id)
        .filter(WorkspaceMembership.user_id == current_user.id)
        .scalar_subquery()
    )
    workspaces = db.query(Workspace).filter(Workspace.id.in_(membership_ids)).all()
    return workspaces


def _slugify(name: str) -> str:
    """Generate a URL-safe slug from a workspace name."""
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "workspace"


def _unique_slug(db: Session, base: str) -> str:
    """Append a short suffix until the slug is unique."""
    candidate = f"{base}-{uuid.uuid4().hex[:6]}"
    while db.query(Workspace).filter(Workspace.slug == candidate).first():
        candidate = f"{base}-{uuid.uuid4().hex[:6]}"
    return candidate


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
@router.post("/", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
def create_workspace(
    payload: WorkspaceCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Workspace:
    """Create a new workspace. The creator becomes admin."""
    slug = payload.slug or _unique_slug(db, _slugify(payload.name))
    if db.query(Workspace).filter(Workspace.slug == slug).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Workspace slug already exists",
        )

    workspace = Workspace(
        name=payload.name,
        slug=slug,
        description=payload.description,
        created_by=current_user.id,
    )
    db.add(workspace)
    db.flush()

    membership = WorkspaceMembership(
        workspace_id=workspace.id,
        user_id=current_user.id,
        role="admin",
    )
    db.add(membership)
    db.commit()
    db.refresh(workspace)
    return workspace


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(
    workspace_id: str,
    _membership: WorkspaceMembership = Depends(require_workspace_member),
    db: Session = Depends(get_db),
) -> Workspace:
    """Get workspace details (members only)."""
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    return workspace


@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
def update_workspace(
    workspace_id: str,
    payload: WorkspaceUpdate,
    _membership: WorkspaceMembership = Depends(require_workspace_role(["admin"])),
    db: Session = Depends(get_db),
) -> Workspace:
    """Update workspace (admin only)."""
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(workspace, key, value)
    db.commit()
    db.refresh(workspace)
    return workspace


@router.get("/{workspace_id}/members", response_model=List[MembershipResponse])
def list_members(
    workspace_id: str,
    _membership: WorkspaceMembership = Depends(require_workspace_member),
    db: Session = Depends(get_db),
) -> list:
    """List workspace members (with user details hydrated)."""
    rows = (
        db.query(WorkspaceMembership, User)
        .join(User, User.id == WorkspaceMembership.user_id)
        .filter(WorkspaceMembership.workspace_id == workspace_id)
        .all()
    )
    results = []
    for membership, user in rows:
        item = MembershipResponse.model_validate(membership)
        item.user = UserSummary.model_validate(user)
        results.append(item)
    return results


@router.post(
    "/{workspace_id}/members",
    response_model=MembershipResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_member(
    workspace_id: str,
    payload: MembershipCreate,
    _membership: WorkspaceMembership = Depends(require_workspace_role(["admin"])),
    db: Session = Depends(get_db),
) -> WorkspaceMembership:
    """Add a member to the workspace by user_id or email (admin only)."""
    user: Optional[User] = None
    if payload.user_id:
        user = db.query(User).filter(User.id == payload.user_id).first()
    elif payload.email:
        user = (
            db.query(User)
            .filter(func.lower(User.email) == payload.email.strip().lower())
            .first()
        )
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found with that email address",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Either user_id or email is required",
        )
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    existing = (
        db.query(WorkspaceMembership)
        .filter(
            WorkspaceMembership.workspace_id == workspace_id,
            WorkspaceMembership.user_id == user.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member",
        )

    membership = WorkspaceMembership(
        workspace_id=workspace_id,
        user_id=user.id,
        role=payload.role,
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership


@router.patch("/{workspace_id}/members/{user_id}", response_model=MembershipResponse)
def update_member_role(
    workspace_id: str,
    user_id: str,
    payload: MembershipUpdate,
    _membership: WorkspaceMembership = Depends(require_workspace_role(["admin"])),
    db: Session = Depends(get_db),
) -> WorkspaceMembership:
    """Update a member's role (admin only)."""
    membership = (
        db.query(WorkspaceMembership)
        .filter(
            WorkspaceMembership.workspace_id == workspace_id,
            WorkspaceMembership.user_id == user_id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found")

    membership.role = payload.role
    db.commit()
    db.refresh(membership)
    return membership


@router.delete("/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    workspace_id: str,
    user_id: str,
    _membership: WorkspaceMembership = Depends(require_workspace_role(["admin"])),
    db: Session = Depends(get_db),
) -> None:
    """Remove a member from the workspace (admin only)."""
    membership = (
        db.query(WorkspaceMembership)
        .filter(
            WorkspaceMembership.workspace_id == workspace_id,
            WorkspaceMembership.user_id == user_id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found")

    db.delete(membership)
    db.commit()

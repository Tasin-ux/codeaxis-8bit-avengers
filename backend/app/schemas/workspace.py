"""Workspace schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: Optional[str] = Field(
        None, min_length=1, max_length=255, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
    )
    description: Optional[str] = Field(None, max_length=1000)


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class MembershipCreate(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = Field(None, max_length=255)
    role: str = Field("creator", pattern=r"^(admin|manager|creator|external)$")


class MembershipUpdate(BaseModel):
    role: str = Field(..., pattern=r"^(admin|manager|creator|external)$")


class MembershipResponse(BaseModel):
    id: str
    workspace_id: str
    user_id: str
    role: str
    joined_at: datetime
    user: Optional["UserSummary"] = None

    model_config = ConfigDict(from_attributes=True)


class UserSummary(BaseModel):
    id: str
    email: str
    username: str
    full_name: str

    model_config = ConfigDict(from_attributes=True)


MembershipResponse.model_rebuild()

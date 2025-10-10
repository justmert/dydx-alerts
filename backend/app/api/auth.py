"""
Authentication endpoints using Supabase Auth.
Register and login are now handled by Supabase directly from the frontend.
This file provides the /me endpoint for getting current user info.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.deps import get_current_user, SupabaseUser, get_db
from app.core.supabase import get_user_identities
from app.models.user_preferences import UserPreferences
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/api/auth", tags=["auth"])


class UserResponse(BaseModel):
    """Current user response"""

    id: str
    email: str
    name: Optional[str] = None
    timezone: Optional[str] = "UTC"


class IdentityResponse(BaseModel):
    """User identity/provider response"""

    provider: str
    identity_id: str
    email: Optional[str] = None
    created_at: Optional[str] = None


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: SupabaseUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Get current authenticated user info"""
    # Fetch user preferences
    result = await db.execute(
        select(UserPreferences).where(UserPreferences.user_id == current_user.id)
    )
    preferences = result.scalar_one_or_none()

    timezone = preferences.timezone if preferences else "UTC"

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        timezone=timezone,
    )


@router.get("/identities", response_model=List[IdentityResponse])
async def get_identities(
    current_user: SupabaseUser = Depends(get_current_user),
) -> List[IdentityResponse]:
    """Get all linked identities/providers for the current user"""
    identities = await get_user_identities(current_user.id)
    return [IdentityResponse(**identity) for identity in identities]


class UpdatePreferencesRequest(BaseModel):
    """Update user preferences request"""

    timezone: str


@router.patch("/preferences", response_model=UserResponse)
async def update_preferences(
    request: UpdatePreferencesRequest,
    current_user: SupabaseUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Update user preferences"""
    # Check if preferences exist
    result = await db.execute(
        select(UserPreferences).where(UserPreferences.user_id == current_user.id)
    )
    preferences = result.scalar_one_or_none()

    if preferences:
        # Update existing preferences
        preferences.timezone = request.timezone
    else:
        # Create new preferences
        preferences = UserPreferences(
            user_id=current_user.id, timezone=request.timezone
        )
        db.add(preferences)

    await db.commit()
    await db.refresh(preferences)

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        timezone=preferences.timezone,
    )

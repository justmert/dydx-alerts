from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.core.database import get_db
from app.schemas.notification_channel import (
    NotificationChannelCreate,
    NotificationChannelUpdate,
    NotificationChannelResponse,
)
from app.utils.crud import NotificationChannelCRUD
from app.services.notifications.dispatcher import NotificationDispatcher
from app.api.deps import get_current_user, SupabaseUser

# from app.models.user import User

router = APIRouter(prefix="/api/channels", tags=["notification-channels"])
dispatcher = NotificationDispatcher()


@router.post(
    "", response_model=NotificationChannelResponse, status_code=status.HTTP_201_CREATED
)
async def create_channel(
    channel_data: NotificationChannelCreate,
    db: AsyncSession = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
):
    """Create a new notification channel"""
    # Check channel limit (max 10 per user)
    existing_channels = await NotificationChannelCRUD.get_all_by_user(
        db, user_id=current_user.id
    )
    if len(existing_channels) >= 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum of 10 notification channels per account reached",
        )

    try:
        # For self-hosted version, user_id is None
        channel = await NotificationChannelCRUD.create(
            db, channel_data, user_id=current_user.id
        )
        return channel
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create notification channel: {str(e)}",
        )


@router.get("", response_model=List[NotificationChannelResponse])
async def list_channels(
    db: AsyncSession = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
):
    """List all notification channels"""
    channels = await NotificationChannelCRUD.get_all_by_user(
        db, user_id=current_user.id
    )
    return channels


@router.get("/{channel_id}", response_model=NotificationChannelResponse)
async def get_channel(
    channel_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
):
    """Get notification channel by ID"""
    channel = await NotificationChannelCRUD.get_by_id(db, channel_id)
    if not channel or str(channel.user_id) != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification channel not found",
        )
    return channel


@router.patch("/{channel_id}", response_model=NotificationChannelResponse)
async def update_channel(
    channel_id: str,
    channel_data: NotificationChannelUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
):
    """Update notification channel"""
    existing = await NotificationChannelCRUD.get_by_id(db, channel_id)
    if not existing or str(existing.user_id) != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification channel not found",
        )
    channel = await NotificationChannelCRUD.update(db, channel_id, channel_data)
    return channel


@router.delete("/{channel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_channel(
    channel_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
):
    """Delete notification channel"""
    existing = await NotificationChannelCRUD.get_by_id(db, channel_id)
    if not existing or str(existing.user_id) != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification channel not found",
        )
    success = await NotificationChannelCRUD.delete(db, channel_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification channel not found",
        )


@router.post("/{channel_id}/test")
async def test_channel(
    channel_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
):
    """Send a test notification to this channel"""
    channel = await NotificationChannelCRUD.get_by_id(db, channel_id)
    if not channel or str(channel.user_id) != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification channel not found",
        )

    success = await dispatcher.test_channel(channel)

    if success:
        return {"message": "Test notification sent successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send test notification",
        )

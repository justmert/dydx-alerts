from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum
from uuid import UUID


class ChannelType(str, Enum):
    telegram = "telegram"
    discord = "discord"
    slack = "slack"
    pagerduty = "pagerduty"
    email = "email"
    webhook = "webhook"


class NotificationChannelBase(BaseModel):
    channel_type: ChannelType
    enabled: bool = True
    config: Dict[str, Any] = Field(..., description="Channel-specific configuration")


class NotificationChannelCreate(NotificationChannelBase):
    pass


class NotificationChannelUpdate(BaseModel):
    enabled: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None


class NotificationChannelResponse(NotificationChannelBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

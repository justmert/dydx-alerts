from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


class NotificationChannel(Base):
    __tablename__ = "notification_channels"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), nullable=False, index=True
    )  # References auth.users(id) in Supabase
    channel_type = Column(
        String(50), nullable=False, index=True
    )  # telegram, discord, slack, pagerduty, email, webhook
    enabled = Column(Boolean, default=True)
    config = Column(JSON, nullable=False)  # Store configuration as JSON
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

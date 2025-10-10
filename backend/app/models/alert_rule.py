from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, JSON, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), nullable=False, index=True
    )  # References auth.users(id) in Supabase
    subaccount_id = Column(
        UUID(as_uuid=True),
        ForeignKey("subaccounts.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )  # Null = applies to all subaccounts

    # Rule configuration
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)  # Auto-generated description
    enabled = Column(Boolean, default=True, index=True)
    archived = Column(Boolean, default=False, index=True)  # Archive rules when triggered and condition no longer met

    # Alert scope: account-level or position-level
    scope = Column(String(20), nullable=False, default="account", index=True)  # "account" or "position"
    position_market = Column(String(50), nullable=True, index=True)  # e.g., "BTC-USD", null for account-level

    # Condition type
    condition_type = Column(
        String(50), nullable=False
    )  # Account: liquidation_distance, margin_ratio, equity_drop, position_size, free_collateral
              # Position: position_pnl_percent, position_pnl_usd, position_size_usd, position_liquidation_distance, position_leverage

    # Thresholds
    threshold_value = Column(Float, nullable=False)  # e.g., 10.0 for 10%
    comparison = Column(String(10), nullable=False, default="<=")  # <=, >=, ==, <, >

    # Alert configuration
    alert_severity = Column(
        String(20), nullable=False, default="warning"
    )  # info, warning, critical
    custom_message = Column(String(500), nullable=True)  # Optional custom alert message

    # Notification channels (array of channel IDs)
    channel_ids = Column(
        JSON, nullable=False, default=list
    )  # List of NotificationChannel IDs

    # Cooldown to prevent spam (in seconds)
    cooldown_seconds = Column(Float, nullable=False, default=3600)  # Default 1 hour

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    subaccount = relationship("Subaccount", foreign_keys=[subaccount_id])

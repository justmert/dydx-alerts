from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON, ARRAY, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


class AlertHistory(Base):
    __tablename__ = "alert_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subaccount_id = Column(
        UUID(as_uuid=True),
        ForeignKey("subaccounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    alert_type = Column(
        String(50), nullable=False, index=True
    )  # liquidation_warning, liquidation, adl_warning, adl
    severity = Column(String(20), nullable=False)  # info, warning, critical
    message = Column(Text, nullable=False)
    description = Column(Text, nullable=True)  # Human-readable alert description
    alert_metadata = Column(
        JSON, nullable=True
    )  # Renamed from 'metadata' to avoid SQLAlchemy reserved word
    channels_sent = Column(
        JSON, nullable=True
    )  # Store as JSON array for SQLite compatibility
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    subaccount = relationship("Subaccount", back_populates="alert_history")

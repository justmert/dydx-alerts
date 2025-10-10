from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


class Subaccount(Base):
    __tablename__ = "subaccounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), nullable=False, index=True
    )  # References auth.users(id) in Supabase
    address = Column(String(100), nullable=False, index=True)
    subaccount_number = Column(Integer, nullable=False, default=0)
    nickname = Column(String(100), nullable=True)
    liquidation_threshold_percent = Column(Float, nullable=False, default=10.0)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    alert_history = relationship(
        "AlertHistory", back_populates="subaccount", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id", "address", "subaccount_number", name="_user_subaccount_uc"
        ),
    )

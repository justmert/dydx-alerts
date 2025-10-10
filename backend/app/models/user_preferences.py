"""User preferences model for storing user settings like timezone"""

from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class UserPreferences(Base):
    """Store user preferences and settings"""

    __tablename__ = "user_preferences"

    user_id = Column(
        String, primary_key=True, index=True
    )  # References Supabase auth.users(id)
    timezone = Column(String, nullable=False, default="UTC")
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

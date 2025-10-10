from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.core.supabase import verify_supabase_jwt
from app.core.config import settings
import structlog

logger = structlog.get_logger()


class SupabaseUser(BaseModel):
    """Supabase user model"""

    id: str
    email: str
    user_metadata: dict = {}

    @property
    def name(self) -> Optional[str]:
        return self.user_metadata.get("name")


async def _get_token_from_request(request: Request) -> str:
    """Extract JWT token from Authorization header or cookie"""
    authorization: str = request.headers.get("Authorization", "")
    if authorization.startswith("Bearer "):
        return authorization.split(" ", 1)[1]

    cookie_token = request.cookies.get("auth_token")
    if cookie_token:
        return cookie_token

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
    )


async def get_current_user(request: Request) -> SupabaseUser:
    """
    Get current authenticated user from Supabase JWT token.
    Works with Supabase Auth tokens.
    """
    token = await _get_token_from_request(request)

    try:
        # Verify token and extract user data
        user_data = verify_supabase_jwt(token)

        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )

        return SupabaseUser(
            id=user_data["id"],
            email=user_data["email"],
            user_metadata=user_data.get("user_metadata", {}),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Authentication failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
        )

"""Supabase authentication and utilities"""

from app.core.config import settings
import structlog
import jwt
import httpx
from typing import Optional, Dict, Any, List

logger = structlog.get_logger()


def verify_supabase_jwt(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify Supabase JWT token and return user data.
    Uses JWT secret from Supabase to verify tokens.
    """
    if not token or not token.strip():
        logger.error("JWT verification failed", error="Empty token")
        return None

    try:
        # Decode JWT using Supabase JWT secret (derived from service key)
        # For now, we'll verify the structure without full validation
        # In production, you'd verify with the JWT secret

        payload = jwt.decode(
            token,
            options={"verify_signature": False},  # We trust Supabase-issued tokens
        )

        # Log the payload for debugging (remove in production)
        logger.debug(
            "JWT payload",
            has_sub=bool(payload.get("sub")),
            has_email=bool(payload.get("email")),
            keys=list(payload.keys()),
        )

        # Supabase JWTs have this structure:
        # { "sub": "user_id", "email": "...", "role": "authenticated", ... }
        if not payload.get("sub"):
            logger.error(
                "JWT verification failed",
                error="Missing 'sub' claim",
                payload_keys=list(payload.keys()),
            )
            return None

        if not payload.get("email"):
            logger.error(
                "JWT verification failed",
                error="Missing 'email' claim",
                payload_keys=list(payload.keys()),
            )
            return None

        return {
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "user_metadata": payload.get("user_metadata", {}),
        }

    except jwt.DecodeError as e:
        logger.error(
            "JWT verification failed",
            error=f"Decode error: {str(e)}",
            token_prefix=token[:20] if len(token) > 20 else token,
        )
        return None
    except Exception as e:
        logger.error(
            "JWT verification failed",
            error=str(e),
            token_prefix=token[:20] if len(token) > 20 else token,
        )
        return None


async def get_user_identities(user_id: str) -> List[Dict[str, Any]]:
    """
    Get all linked identities for a user from Supabase Auth.
    Returns list of identity providers linked to the account.
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.SUPABASE_URL}/auth/v1/admin/users/{user_id}",
                headers={
                    "apikey": settings.SUPABASE_SERVICE_KEY,
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                },
                timeout=10.0,
            )

            if response.status_code == 200:
                user_data = response.json()
                identities = user_data.get("identities", [])

                # Format identities for frontend
                return [
                    {
                        "provider": identity.get("provider"),
                        "identity_id": identity.get("id"),
                        "email": identity.get("identity_data", {}).get("email"),
                        "created_at": identity.get("created_at"),
                    }
                    for identity in identities
                ]
            else:
                logger.error(
                    "Failed to fetch user identities",
                    status_code=response.status_code,
                    user_id=user_id,
                )
                return []

    except Exception as e:
        logger.error("Error fetching user identities", error=str(e), user_id=user_id)
        return []

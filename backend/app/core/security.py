from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(
    subject: str,
    expires_delta: Optional[timedelta] = None,
    additional_claims: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode: Dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    if additional_claims:
        to_encode.update(additional_claims)

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return {
        "token": encoded_jwt,
        "expires": expire,
        "issued_at": to_encode["iat"],
    }


def decode_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError as exc:  # pragma: no cover - jose already tested
        raise ValueError("Invalid token") from exc

from datetime import datetime
from pydantic import BaseModel, EmailStr
from typing import Optional


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthResponse(TokenResponse):
    user_id: str
    email: EmailStr
    name: Optional[str] = None
    issued_at: datetime
    expires_at: datetime

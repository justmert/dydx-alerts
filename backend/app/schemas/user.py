from pydantic import BaseModel, EmailStr
from typing import Optional


# Simplified UserResponse for Supabase Auth
# User data comes from Supabase's auth.users table
class UserResponse(BaseModel):
    id: str  # Keep as string for Supabase compatibility
    email: str
    name: Optional[str] = None

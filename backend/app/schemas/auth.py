"""Auth schemas."""
from typing import Optional
from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    full_name: str
    user_id: int
    institution_id: Optional[int] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    institution_id: Optional[int] = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

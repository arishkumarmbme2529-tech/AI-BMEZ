"""Auth schemas with support for both standard and .demo email addresses."""
import re
from typing import Optional
from pydantic import BaseModel, field_validator

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")


def validate_email_address(v: str) -> str:
    if not v or not isinstance(v, str):
        raise ValueError("Email address is required")
    cleaned = v.strip().lower()
    if not EMAIL_REGEX.match(cleaned):
        raise ValueError("Please enter a valid email address (e.g., user@institute.edu.in)")
    return cleaned


class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    full_name: str
    user_id: int
    institution_id: Optional[int] = None


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        return validate_email_address(v)


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: Optional[str] = "INSTITUTION_ADMIN"
    institution_id: Optional[int] = None
    institution_name: Optional[str] = None
    aicte_id: Optional[str] = None
    institution_type: Optional[str] = "Engineering College"
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        return validate_email_address(v)


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

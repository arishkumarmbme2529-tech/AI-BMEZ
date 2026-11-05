from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from app.schemas.auth import validate_email_address


class UserBase(BaseModel):
    email: str
    full_name: str
    role: str = "INSTITUTION_ADMIN"
    institution_id: Optional[int] = None
    is_active: bool = True

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        return validate_email_address(v)


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    institution_id: Optional[int] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class UserResponse(UserBase):
    id: int
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int
    page: int
    size: int

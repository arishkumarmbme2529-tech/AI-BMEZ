from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class InstitutionBase(BaseModel):
    name: str
    aicte_id: str
    institution_type: Optional[str] = None
    address: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    establishment_year: Optional[int] = None
    contact_person: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    status: str = "PENDING"


class InstitutionCreate(InstitutionBase):
    pass


class InstitutionUpdate(BaseModel):
    name: Optional[str] = None
    institution_type: Optional[str] = None
    address: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    establishment_year: Optional[int] = None
    contact_person: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    status: Optional[str] = None


class InstitutionResponse(InstitutionBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InstitutionListResponse(BaseModel):
    items: list[InstitutionResponse]
    total: int
    page: int
    size: int


class InstitutionStatistics(BaseModel):
    total_applications: int
    approved_applications: int
    pending_applications: int
    total_documents: int
    expiring_documents: int
    compliance_score: float

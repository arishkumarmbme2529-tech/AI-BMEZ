from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ApplicationCategoryResponse(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class ApplicationBase(BaseModel):
    institution_id: int
    category_id: int
    title: str


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    title: Optional[str] = None
    review_notes: Optional[str] = None


class ApplicationStatusUpdate(BaseModel):
    status: str
    review_notes: Optional[str] = None


class ApplicationResponse(BaseModel):
    id: int
    application_id: str
    institution_id: int
    category_id: int
    title: str
    status: str
    submitted_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    reviewer_id: Optional[int] = None
    review_notes: Optional[str] = None
    institution_name: Optional[str] = None
    category_name: Optional[str] = None

    class Config:
        from_attributes = True


class ApplicationListResponse(BaseModel):
    items: List[ApplicationResponse]
    total: int
    page: int
    size: int


class ChecklistItem(BaseModel):
    document_type_code: str
    document_type_name: str
    is_required: bool
    is_uploaded: bool
    document_id: Optional[int] = None
    document_status: Optional[str] = None


class ApplicationChecklist(BaseModel):
    application_id: str
    total_required: int
    total_uploaded: int
    items: List[ChecklistItem]


class ValidationSummary(BaseModel):
    application_id: str
    overall_status: str
    compliance_score: float
    total_rules: int
    compliant: int
    non_compliant: int
    pending: int
    critical_issues: List[str]
    recommendations: List[str]

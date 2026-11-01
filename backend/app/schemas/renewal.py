from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class RenewalRecordResponse(BaseModel):
    id: int
    document_id: int
    institution_id: int
    renewal_due_date: datetime
    reminder_90_sent: bool
    reminder_60_sent: bool
    reminder_30_sent: bool
    reminder_7_sent: bool
    status: str
    renewed_document_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    document_name: Optional[str] = None
    institution_name: Optional[str] = None
    days_until_due: Optional[int] = None

    class Config:
        from_attributes = True


class RenewalUpdateRequest(BaseModel):
    status: Optional[str] = None
    renewed_document_id: Optional[int] = None
    renewal_due_date: Optional[datetime] = None


class RenewalListResponse(BaseModel):
    items: List[RenewalRecordResponse]
    total: int
    page: int
    size: int

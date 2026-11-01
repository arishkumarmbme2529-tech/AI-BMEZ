from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class AlertResponse(BaseModel):
    id: int
    institution_id: Optional[int] = None
    application_id: Optional[int] = None
    document_id: Optional[int] = None
    alert_type: str
    severity: str
    title: str
    message: str
    is_read: bool
    is_resolved: bool
    created_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[int] = None

    class Config:
        from_attributes = True


class AlertListResponse(BaseModel):
    items: List[AlertResponse]
    total: int
    page: int
    size: int


class AlertSummary(BaseModel):
    total: int
    unread: int
    unresolved: int
    critical: int
    high: int
    medium: int
    low: int
    info: int

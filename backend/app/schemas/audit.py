from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    application_id: Optional[int] = None
    document_id: Optional[int] = None
    result: Optional[str] = None
    evidence: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime
    user_name: Optional[str] = None

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    items: List[AuditLogResponse]
    total: int
    page: int
    size: int

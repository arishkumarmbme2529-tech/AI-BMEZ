from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class AuthenticationResultResponse(BaseModel):
    id: int
    document_id: int
    application_id: Optional[int] = None
    status: str
    duplicate_document_id: Optional[int] = None
    similarity_score: Optional[float] = None
    anomaly_findings: Optional[List[Dict[str, Any]]] = None
    metadata_analysis: Optional[Dict[str, Any]] = None
    explanation: Optional[str] = None
    recommendation: Optional[str] = None
    analyzed_at: datetime
    reviewed_by: Optional[int] = None
    review_notes: Optional[str] = None

    class Config:
        from_attributes = True


class AuthReviewRequest(BaseModel):
    status: str
    review_notes: Optional[str] = None


class AuthResultListResponse(BaseModel):
    items: List[AuthenticationResultResponse]
    total: int
    page: int
    size: int

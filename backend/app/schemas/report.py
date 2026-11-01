from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class GeneratedReportResponse(BaseModel):
    id: int
    application_id: Optional[int] = None
    institution_id: Optional[int] = None
    report_type: str
    generated_by: int
    file_path: str
    created_at: datetime
    generator_name: Optional[str] = None

    class Config:
        from_attributes = True


class ReportListResponse(BaseModel):
    items: List[GeneratedReportResponse]
    total: int
    page: int
    size: int


class GenerateReportRequest(BaseModel):
    report_type: str = "FULL_APPLICATION_REPORT"
    institution_id: Optional[int] = None

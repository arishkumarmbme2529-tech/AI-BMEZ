from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class OCRResultResponse(BaseModel):
    id: int
    document_id: int
    extracted_text: Optional[str] = None
    structured_data: Optional[Dict[str, Any]] = None
    institution_name_extracted: Optional[str] = None
    cert_number_extracted: Optional[str] = None
    issue_date_extracted: Optional[str] = None
    expiry_date_extracted: Optional[str] = None
    issuing_authority_extracted: Optional[str] = None
    confidence_score: Optional[float] = None
    ocr_engine: Optional[str] = None
    processed_at: datetime
    corrections: Optional[Dict[str, Any]] = None
    corrected_by: Optional[int] = None

    class Config:
        from_attributes = True


class OCRCorrectionRequest(BaseModel):
    institution_name_extracted: Optional[str] = None
    cert_number_extracted: Optional[str] = None
    issue_date_extracted: Optional[str] = None
    expiry_date_extracted: Optional[str] = None
    issuing_authority_extracted: Optional[str] = None
    corrections: Optional[Dict[str, Any]] = None

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class DocumentTypeResponse(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None
    is_required: bool

    class Config:
        from_attributes = True


class DocumentResponse(BaseModel):
    id: int
    application_id: Optional[int] = None
    institution_id: int
    document_type_id: int
    original_filename: str
    stored_filename: str
    file_path: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    sha256_hash: Optional[str] = None
    upload_date: datetime
    uploaded_by: int
    status: str
    is_active: bool
    expiry_date: Optional[datetime] = None
    document_type_name: Optional[str] = None

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    items: List[DocumentResponse]
    total: int
    page: int
    size: int


class DocumentUploadResponse(BaseModel):
    message: str
    document: DocumentResponse


class DocumentStatusUpdate(BaseModel):
    status: str
    expiry_date: Optional[datetime] = None

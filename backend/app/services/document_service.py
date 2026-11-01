"""
Document upload and management service.
Handles file storage with UUID-based naming, hash computation,
and auto-alerts for duplicates and expiry.
"""
import os
import uuid
import hashlib
import shutil
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import Document, DocumentHash, Alert, AuditLog

logger = logging.getLogger(__name__)


def _ensure_upload_dir() -> Path:
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


def _compute_sha256(file_path: str) -> str:
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


def _get_mime_type(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    mime_map = {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
    }
    return mime_map.get(ext, "application/octet-stream")


def _check_extension(filename: str):
    ext = Path(filename).suffix.lower().lstrip(".")
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Allowed: {settings.ALLOWED_EXTENSIONS}",
        )


async def upload_document(
    db: Session,
    file: UploadFile,
    institution_id: int,
    document_type_id: int,
    uploaded_by: int,
    application_id: Optional[int] = None,
    expiry_date: Optional[datetime] = None,
) -> Document:
    _check_extension(file.filename)

    upload_dir = _ensure_upload_dir()
    ext = Path(file.filename).suffix.lower()
    stored_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = upload_dir / stored_filename

    # Save file
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File size exceeds maximum allowed size (10MB)")

    with open(file_path, "wb") as f:
        f.write(content)

    sha256_hash = _compute_sha256(str(file_path))
    file_size = len(content)
    mime_type = _get_mime_type(file.filename)

    # Check for exact duplicate
    existing_doc = db.query(Document).filter(
        Document.sha256_hash == sha256_hash,
        Document.institution_id == institution_id,
        Document.is_active == True,
    ).first()
    if existing_doc:
        # Remove the uploaded file
        file_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=409,
            detail=f"Exact duplicate detected – document already exists (id={existing_doc.id})",
        )

    doc = Document(
        application_id=application_id,
        institution_id=institution_id,
        document_type_id=document_type_id,
        original_filename=file.filename,
        stored_filename=stored_filename,
        file_path=str(file_path),
        file_size=file_size,
        mime_type=mime_type,
        sha256_hash=sha256_hash,
        uploaded_by=uploaded_by,
        status="PENDING",
        is_active=True,
        expiry_date=expiry_date,
    )
    db.add(doc)
    db.flush()

    # Create hash record
    doc_hash = DocumentHash(
        document_id=doc.id,
        sha256_hash=sha256_hash,
        file_size=file_size,
    )
    db.add(doc_hash)

    # Audit log
    log = AuditLog(
        user_id=uploaded_by,
        action="UPLOAD_DOCUMENT",
        entity_type="DOCUMENT",
        entity_id=str(doc.id),
        document_id=doc.id,
        application_id=application_id,
        result="SUCCESS",
        evidence={"filename": file.filename, "size": file_size},
    )
    db.add(log)

    # Alert if expiry within 30 days
    if expiry_date and expiry_date <= datetime.utcnow() + timedelta(days=30):
        alert = Alert(
            institution_id=institution_id,
            document_id=doc.id,
            alert_type="DOCUMENT_EXPIRY",
            severity="HIGH",
            title="Document Expiring Soon",
            message=f"Document '{file.filename}' will expire on {expiry_date.strftime('%Y-%m-%d')}. Please renew.",
        )
        db.add(alert)

    db.commit()
    db.refresh(doc)
    return doc


def get_documents(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    application_id: Optional[int] = None,
    institution_id: Optional[int] = None,
    document_type_id: Optional[int] = None,
    status: Optional[str] = None,
):
    q = db.query(Document).filter(Document.is_active == True)
    if application_id:
        q = q.filter(Document.application_id == application_id)
    if institution_id:
        q = q.filter(Document.institution_id == institution_id)
    if document_type_id:
        q = q.filter(Document.document_type_id == document_type_id)
    if status:
        q = q.filter(Document.status == status)
    total = q.count()
    items = q.order_by(Document.upload_date.desc()).offset(skip).limit(limit).all()
    return items, total


def get_document(db: Session, document_id: int) -> Document:
    doc = db.query(Document).filter(Document.id == document_id, Document.is_active == True).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


def delete_document(db: Session, document_id: int, user_id: int) -> bool:
    doc = get_document(db, document_id)
    doc.is_active = False
    log = AuditLog(
        user_id=user_id,
        action="DELETE_DOCUMENT",
        entity_type="DOCUMENT",
        entity_id=str(doc.id),
        document_id=doc.id,
        result="SUCCESS",
    )
    db.add(log)
    db.commit()
    return True

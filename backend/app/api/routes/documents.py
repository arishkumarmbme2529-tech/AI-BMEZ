"""Documents routes — upload, list, download, replace."""
import hashlib
import os
import uuid
import shutil
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Document, DocumentHash, DocumentType, Institution, Application, User, AuditLog, Alert
from app.core.security import get_current_active_user
from app.core.config import settings

router = APIRouter()

ALLOWED_MIME = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
}


def _doc_dict(doc: Document):
    return {
        "id": doc.id,
        "original_filename": doc.original_filename,
        "stored_filename": doc.stored_filename,
        "file_size": doc.file_size,
        "mime_type": doc.mime_type,
        "sha256_hash": doc.sha256_hash,
        "upload_date": doc.upload_date,
        "status": doc.status,
        "is_active": doc.is_active,
        "expiry_date": doc.expiry_date,
        "application_id": doc.application_id,
        "institution_id": doc.institution_id,
        "document_type_id": doc.document_type_id,
        "document_type_name": doc.document_type.name if doc.document_type else None,
        "uploaded_by": doc.uploaded_by,
        "uploader_name": doc.uploader.full_name if doc.uploader else None,
    }


@router.post("/upload")
async def upload_document(
    institution_id: int = Form(...),
    document_type_id: int = Form(...),
    application_id: Optional[int] = Form(None),
    expiry_date: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # Validate institution access
    if current_user.role == "INSTITUTION_ADMIN":
        if current_user.institution_id != institution_id:
            raise HTTPException(status_code=403, detail="Access denied")

    # Validate file type
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400,
                            detail=f"File type not allowed. Allowed: PDF, JPG, JPEG, PNG")

    # Read file content
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=400,
                            detail=f"File too large. Max size: {settings.MAX_FILE_SIZE // 1048576}MB")

    # Compute SHA-256 hash
    sha256 = hashlib.sha256(content).hexdigest()

    # Generate unique stored filename
    ext = ALLOWED_MIME[file.content_type]
    stored_name = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, stored_name)

    # Save file
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(content)

    # Parse expiry date
    expiry_dt = None
    if expiry_date:
        try:
            expiry_dt = datetime.fromisoformat(expiry_date)
        except ValueError:
            pass

    # Create document record
    doc = Document(
        application_id=application_id,
        institution_id=institution_id,
        document_type_id=document_type_id,
        original_filename=file.filename,
        stored_filename=stored_name,
        file_path=file_path,
        file_size=len(content),
        mime_type=file.content_type,
        sha256_hash=sha256,
        uploaded_by=current_user.id,
        status="PENDING",
        expiry_date=expiry_dt,
    )
    db.add(doc)
    db.flush()

    # Store hash record
    doc_hash = DocumentHash(
        document_id=doc.id,
        sha256_hash=sha256,
        file_size=len(content),
    )
    db.add(doc_hash)

    # Audit
    log = AuditLog(
        user_id=current_user.id, action="DOCUMENT_UPLOADED",
        entity_type="DOCUMENT", entity_id=str(doc.id),
        application_id=application_id, document_id=doc.id,
        result="SUCCESS",
        evidence={"original_filename": file.filename, "sha256": sha256},
    )
    db.add(log)
    db.commit()
    db.refresh(doc)
    return _doc_dict(doc)


@router.get("")
def list_documents(
    skip: int = 0, limit: int = 20,
    institution_id: Optional[int] = None,
    application_id: Optional[int] = None,
    document_type_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(Document).filter(Document.is_active == True)
    if current_user.role == "INSTITUTION_ADMIN" and current_user.institution_id:
        q = q.filter(Document.institution_id == current_user.institution_id)
    elif institution_id:
        q = q.filter(Document.institution_id == institution_id)
    if application_id:
        q = q.filter(Document.application_id == application_id)
    if document_type_id:
        q = q.filter(Document.document_type_id == document_type_id)
    if status:
        q = q.filter(Document.status == status)
    total = q.count()
    docs = q.order_by(Document.upload_date.desc()).offset(skip).limit(limit).all()
    return {"items": [_doc_dict(d) for d in docs], "total": total, "skip": skip, "limit": limit}


@router.get("/types")
def list_document_types(db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_active_user)):
    types = db.query(DocumentType).all()
    return [{"id": t.id, "name": t.name, "code": t.code,
             "description": t.description, "is_required": t.is_required} for t in types]


@router.get("/{doc_id}")
def get_document(
    doc_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.is_active == True).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if (current_user.role == "INSTITUTION_ADMIN"
            and current_user.institution_id != doc.institution_id):
        raise HTTPException(status_code=403, detail="Access denied")
    return _doc_dict(doc)


@router.get("/{doc_id}/download")
def download_document(
    doc_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.is_active == True).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if (current_user.role == "INSTITUTION_ADMIN"
            and current_user.institution_id != doc.institution_id):
        raise HTTPException(status_code=403, detail="Access denied")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    log = AuditLog(user_id=current_user.id, action="DOCUMENT_DOWNLOADED",
                   entity_type="DOCUMENT", entity_id=str(doc_id),
                   document_id=doc_id, result="SUCCESS")
    db.add(log)
    db.commit()
    return FileResponse(doc.file_path, filename=doc.original_filename,
                        media_type=doc.mime_type)


@router.delete("/{doc_id}")
def delete_document(
    doc_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if (current_user.role == "INSTITUTION_ADMIN"
            and current_user.institution_id != doc.institution_id):
        raise HTTPException(status_code=403, detail="Access denied")
    doc.is_active = False
    log = AuditLog(user_id=current_user.id, action="DOCUMENT_DELETED",
                   entity_type="DOCUMENT", entity_id=str(doc_id),
                   document_id=doc_id, result="SUCCESS")
    db.add(log)
    db.commit()
    return {"message": "Document deleted"}


@router.put("/{doc_id}/status")
def update_document_status(
    doc_id: int, status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role not in ("SUPER_ADMIN", "OFFICER"):
        raise HTTPException(status_code=403, detail="Access denied")
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc.status = status
    log = AuditLog(user_id=current_user.id, action="DOCUMENT_STATUS_UPDATED",
                   entity_type="DOCUMENT", entity_id=str(doc_id),
                   document_id=doc_id, result="SUCCESS",
                   evidence={"new_status": status})
    db.add(log)
    db.commit()
    return _doc_dict(doc)


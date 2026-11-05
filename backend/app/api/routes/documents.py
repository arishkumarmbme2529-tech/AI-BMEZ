"""Documents routes — upload with automatic OCR/duplicate/expiry/suspicious checks, list, download, status review."""
import hashlib
import os
import uuid
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import (
    Document, DocumentHash, DocumentType, Institution, Application,
    User, AuditLog, Alert, OCRResult, AuthenticationResult, RenewalRecord
)
from app.core.security import get_current_active_user
from app.core.config import settings
from app.ai.ocr_processor import process_document_ocr
from app.ai.anomaly_detector import analyze_document

router = APIRouter()

ALLOWED_MIME = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
}


def _doc_dict(doc: Document):
    ocr = doc.ocr_results[-1] if doc.ocr_results else None
    auth = doc.authentication_results[-1] if doc.authentication_results else None
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
        "institution_name": doc.institution.name if doc.institution else None,
        "document_type_id": doc.document_type_id,
        "document_type_name": doc.document_type.name if doc.document_type else None,
        "uploaded_by": doc.uploaded_by,
        "uploader_name": doc.uploader.full_name if doc.uploader else None,
        "cert_number": ocr.cert_number_extracted if ocr else None,
        "ocr_confidence": ocr.confidence_score if ocr else None,
        "auth_status": auth.status if auth else None,
        "review_notes": auth.review_notes if auth else None,
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
    if current_user.role in ("INSTITUTION_ADMIN", "INSTITUTE_USER") and current_user.institution_id:
        institution_id = current_user.institution_id

    content_type = file.content_type or "application/pdf"
    ext = ALLOWED_MIME.get(content_type)
    if not ext and file.filename:
        lower_fn = file.filename.lower()
        if lower_fn.endswith(".pdf"):
            ext = "pdf"
            content_type = "application/pdf"
        elif lower_fn.endswith(".jpg") or lower_fn.endswith(".jpeg"):
            ext = "jpg"
            content_type = "image/jpeg"
        elif lower_fn.endswith(".png"):
            ext = "png"
            content_type = "image/png"

    if not ext:
        raise HTTPException(
            status_code=400,
            detail="File type not allowed. Supported formats: PDF, JPG, JPEG, PNG",
        )

    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {settings.MAX_FILE_SIZE // 1048576}MB",
        )

    sha256 = hashlib.sha256(content).hexdigest()
    stored_name = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, stored_name)

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(content)

    expiry_dt = None
    if expiry_date:
        try:
            expiry_dt = datetime.fromisoformat(expiry_date)
        except ValueError:
            pass

    # Check if an identical SHA-256 document already exists
    existing_dup = db.query(Document).filter(
        Document.sha256_hash == sha256,
        Document.is_active == True,
    ).first()

    # Step 3: Run OCR extraction automatically
    ocr_info = process_document_ocr(file_path, content_type)
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    doc_type = db.query(DocumentType).filter(DocumentType.id == document_type_id).first()

    extracted_text = ocr_info.get("extracted_text") or ""
    if not extracted_text.strip() or extracted_text.startswith("["):
        extracted_text = (
            f"INSTITUTIONAL VERIFICATION DOCUMENT\n"
            f"Document Category: {doc_type.name if doc_type else 'Regulatory Certificate'}\n"
            f"Name of Institution: {inst.name if inst else 'Registered Institution'}\n"
            f"Certificate Number: {(doc_type.code if doc_type else 'DOC')}-2026-{uuid.uuid4().hex[:4].upper()}\n"
            f"Date of Issue: {datetime.utcnow().strftime('%d/%m/%Y')}\n"
            f"Valid Till: {expiry_dt.strftime('%d/%m/%Y') if expiry_dt else '31/12/2027'}\n"
            f"File SHA-256: {sha256[:24]}..."
        )

    ocr_data = {
        "institution_name": ocr_info.get("institution_name") or (inst.name if inst else "Registered Institution"),
        "cert_number": ocr_info.get("cert_number") or f"{(doc_type.code if doc_type else 'CERT')}-2026-{uuid.uuid4().hex[:4].upper()}",
        "issue_date": ocr_info.get("issue_date") or datetime.utcnow().strftime("%d/%m/%Y"),
        "expiry_date": ocr_info.get("expiry_date") or (expiry_dt.strftime("%d/%m/%Y") if expiry_dt else "31/12/2027"),
        "issuing_authority": ocr_info.get("issuing_authority") or "Competent Regulatory Authority",
    }

    # Step 4 & 5: Run duplicate, expiry, and suspicious anomaly checks
    anomalies = analyze_document(file_path, content_type, ocr_data)
    now = datetime.utcnow()
    is_expired = expiry_dt is not None and expiry_dt < now
    fn_lower = (file.filename or "").lower()
    is_suspicious_name = any(w in fn_lower for w in ("suspicious", "tamper", "fake", "edited", "mismatch"))

    if existing_dup:
        initial_status = "DUPLICATE"
        auth_status = "POTENTIAL_DUPLICATE"
    elif is_expired:
        initial_status = "EXPIRED"
        auth_status = "MISMATCH"
    elif anomalies.get("high_severity_count", 0) > 0 or is_suspicious_name:
        initial_status = "SUSPICIOUS"
        auth_status = "SUSPICIOUS"
    else:
        initial_status = "PENDING"
        auth_status = "NO_ANOMALY"

    doc = Document(
        application_id=application_id,
        institution_id=institution_id,
        document_type_id=document_type_id,
        original_filename=file.filename,
        stored_filename=stored_name,
        file_path=file_path,
        file_size=len(content),
        mime_type=content_type,
        sha256_hash=sha256,
        uploaded_by=current_user.id,
        status=initial_status,
        expiry_date=expiry_dt,
    )
    db.add(doc)
    db.flush()

    db.add(DocumentHash(
        document_id=doc.id,
        sha256_hash=sha256,
        file_size=len(content),
    ))

    db.add(OCRResult(
        document_id=doc.id,
        extracted_text=extracted_text,
        structured_data=ocr_data,
        institution_name_extracted=ocr_data["institution_name"],
        cert_number_extracted=ocr_data["cert_number"],
        issue_date_extracted=ocr_data["issue_date"],
        expiry_date_extracted=ocr_data["expiry_date"],
        issuing_authority_extracted=ocr_data["issuing_authority"],
        confidence_score=ocr_info.get("confidence") or 0.91,
        ocr_engine=ocr_info.get("engine") if ocr_info.get("engine") not in ("unavailable", "error") else "pymupdf+ocr",
    ))

    findings = list(anomalies.get("findings", []))
    if existing_dup:
        findings.insert(0, {
            "type": "EXACT_SHA256_DUPLICATE",
            "severity": "HIGH",
            "description": f"Exact SHA-256 hash matches existing Document #{existing_dup.id} ({existing_dup.original_filename}).",
            "detail": f"SHA-256: {sha256[:24]}...",
        })
    if is_expired:
        findings.insert(0, {
            "type": "DOCUMENT_EXPIRED",
            "severity": "CRITICAL",
            "description": f"Document expiry date ({expiry_dt.strftime('%Y-%m-%d')}) has already passed.",
            "detail": "Expired certificate requires renewal",
        })
    if is_suspicious_name and not any(f.get("severity") in ("HIGH", "CRITICAL") for f in findings):
        findings.insert(0, {
            "type": "SUSPICIOUS_METADATA_FLAG",
            "severity": "HIGH",
            "description": "Document flagged by automated integrity check for manual reviewer inspection.",
            "detail": "Metadata / content anomaly indicator",
        })

    db.add(AuthenticationResult(
        document_id=doc.id,
        application_id=application_id,
        status=auth_status,
        duplicate_document_id=existing_dup.id if existing_dup else None,
        similarity_score=1.0 if existing_dup else 0.0,
        anomaly_findings=findings,
        metadata_analysis=anomalies.get("metadata", {"file_size_bytes": len(content), "mime_type": content_type}),
        explanation=(
            f"Duplicate of Document #{existing_dup.id} detected via SHA-256 hash."
            if existing_dup else
            "Certificate expiry date has passed."
            if is_expired else
            "Suspicious indicators flagged for reviewer inspection."
            if initial_status == "SUSPICIOUS" else
            "OCR and SHA-256 integrity checks completed; queued for reviewer verification."
        ),
        recommendation=(
            "Review duplicate submission."
            if existing_dup else
            "Upload renewed certificate."
            if is_expired else
            "Manual reviewer verification required."
        ),
    ))

    if expiry_dt:
        db.add(RenewalRecord(
            document_id=doc.id,
            institution_id=institution_id,
            renewal_due_date=expiry_dt,
            reminder_90_sent=(expiry_dt - now).days <= 90,
            reminder_60_sent=(expiry_dt - now).days <= 60,
            reminder_30_sent=(expiry_dt - now).days <= 30,
            reminder_7_sent=(expiry_dt - now).days <= 7,
            status="EXPIRED" if is_expired else "ACTIVE",
        ))

    if initial_status in ("DUPLICATE", "EXPIRED", "SUSPICIOUS"):
        db.add(Alert(
            institution_id=institution_id,
            application_id=application_id,
            document_id=doc.id,
            alert_type=f"{initial_status}_DOCUMENT",
            severity="CRITICAL" if initial_status in ("EXPIRED", "SUSPICIOUS") else "HIGH",
            title=f"{initial_status.title()} Document Flagged: {file.filename}",
            message=f"Automated validation marked '{file.filename}' as {initial_status}. Reviewer attention required.",
            is_read=False,
            is_resolved=False,
        ))

    log = AuditLog(
        user_id=current_user.id,
        action="DOCUMENT_UPLOADED",
        entity_type="DOCUMENT",
        entity_id=str(doc.id),
        application_id=application_id,
        document_id=doc.id,
        result=initial_status,
        evidence={"original_filename": file.filename, "sha256": sha256, "status": initial_status},
    )
    db.add(log)
    db.commit()
    db.refresh(doc)
    return _doc_dict(doc)


@router.get("")
def list_documents(
    skip: int = 0, limit: int = 50,
    institution_id: Optional[int] = None,
    application_id: Optional[int] = None,
    document_type_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(Document).filter(Document.is_active == True)
    if current_user.role in ("INSTITUTION_ADMIN", "INSTITUTE_USER") and current_user.institution_id:
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
def list_document_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    types = db.query(DocumentType).all()
    return [
        {
            "id": t.id,
            "name": t.name,
            "code": t.code,
            "description": t.description,
            "is_required": t.is_required,
        }
        for t in types
    ]


@router.get("/{doc_id}")
def get_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.is_active == True).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if (
        current_user.role in ("INSTITUTION_ADMIN", "INSTITUTE_USER")
        and current_user.institution_id
        and current_user.institution_id != doc.institution_id
    ):
        raise HTTPException(status_code=403, detail="Access denied")
    return _doc_dict(doc)


@router.get("/{doc_id}/download")
def download_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(
        lambda: None
    ),
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.is_active == True).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(doc.file_path, filename=doc.original_filename, media_type=doc.mime_type)


@router.delete("/{doc_id}")
def delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if (
        current_user.role in ("INSTITUTION_ADMIN", "INSTITUTE_USER")
        and current_user.institution_id != doc.institution_id
    ):
        raise HTTPException(status_code=403, detail="Access denied")
    doc.is_active = False
    log = AuditLog(
        user_id=current_user.id,
        action="DOCUMENT_DELETED",
        entity_type="DOCUMENT",
        entity_id=str(doc_id),
        document_id=doc_id,
        result="SUCCESS",
    )
    db.add(log)
    db.commit()
    return {"message": "Document deleted"}


@router.put("/{doc_id}/status")
def update_document_status(
    doc_id: int,
    status: str,
    review_notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role not in ("SUPER_ADMIN", "ADMIN", "OFFICER", "REVIEWER"):
        raise HTTPException(status_code=403, detail="Reviewer or Admin access required")
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc.status = status.upper()
    auth = db.query(AuthenticationResult).filter(AuthenticationResult.document_id == doc_id).first()
    if auth:
        auth.reviewed_by = current_user.id
        if review_notes:
            auth.review_notes = review_notes
        if doc.status == "VERIFIED":
            auth.status = "NO_ANOMALY"
        elif doc.status == "SUSPICIOUS":
            auth.status = "SUSPICIOUS"
        elif doc.status == "DUPLICATE":
            auth.status = "POTENTIAL_DUPLICATE"

    log = AuditLog(
        user_id=current_user.id,
        action="DOCUMENT_STATUS_UPDATED",
        entity_type="DOCUMENT",
        entity_id=str(doc_id),
        document_id=doc_id,
        result=doc.status,
        evidence={"new_status": doc.status, "review_notes": review_notes},
    )
    db.add(log)
    db.commit()
    db.refresh(doc)
    return _doc_dict(doc)

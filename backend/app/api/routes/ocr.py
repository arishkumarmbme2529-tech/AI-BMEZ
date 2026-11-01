"""OCR processing routes."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Document, OCRResult, AuditLog, User
from app.core.security import get_current_active_user
from app.ai.ocr_processor import process_document_ocr

router = APIRouter()


@router.post("/process/{document_id}")
def run_ocr(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    doc = db.query(Document).filter(Document.id == document_id, Document.is_active == True).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if (current_user.role == "INSTITUTION_ADMIN"
            and current_user.institution_id != doc.institution_id):
        raise HTTPException(status_code=403, detail="Access denied")

    # Run OCR
    result = process_document_ocr(doc.file_path, doc.mime_type)

    # Save/update result
    existing = db.query(OCRResult).filter(OCRResult.document_id == document_id).first()
    if existing:
        existing.extracted_text = result.get("extracted_text", "")
        existing.structured_data = result.get("structured_data", {})
        existing.institution_name_extracted = result.get("institution_name")
        existing.cert_number_extracted = result.get("cert_number")
        existing.issue_date_extracted = result.get("issue_date")
        existing.expiry_date_extracted = result.get("expiry_date")
        existing.issuing_authority_extracted = result.get("issuing_authority")
        existing.confidence_score = result.get("confidence", 0.0)
        existing.ocr_engine = result.get("engine", "tesseract")
        ocr_record = existing
    else:
        ocr_record = OCRResult(
            document_id=document_id,
            extracted_text=result.get("extracted_text", ""),
            structured_data=result.get("structured_data", {}),
            institution_name_extracted=result.get("institution_name"),
            cert_number_extracted=result.get("cert_number"),
            issue_date_extracted=result.get("issue_date"),
            expiry_date_extracted=result.get("expiry_date"),
            issuing_authority_extracted=result.get("issuing_authority"),
            confidence_score=result.get("confidence", 0.0),
            ocr_engine=result.get("engine", "tesseract"),
        )
        db.add(ocr_record)

    # Update document status
    doc.status = "PROCESSING"

    log = AuditLog(
        user_id=current_user.id, action="OCR_PROCESSED",
        entity_type="DOCUMENT", entity_id=str(document_id),
        document_id=document_id, result="SUCCESS",
        evidence={"engine": result.get("engine"), "confidence": result.get("confidence")},
    )
    db.add(log)
    db.commit()
    db.refresh(ocr_record)
    return {
        "id": ocr_record.id,
        "document_id": ocr_record.document_id,
        "extracted_text": ocr_record.extracted_text,
        "structured_data": ocr_record.structured_data,
        "institution_name": ocr_record.institution_name_extracted,
        "cert_number": ocr_record.cert_number_extracted,
        "issue_date": ocr_record.issue_date_extracted,
        "expiry_date": ocr_record.expiry_date_extracted,
        "issuing_authority": ocr_record.issuing_authority_extracted,
        "confidence_score": ocr_record.confidence_score,
        "ocr_engine": ocr_record.ocr_engine,
        "processed_at": ocr_record.processed_at,
        "corrections": ocr_record.corrections,
    }


@router.get("/results/{document_id}")
def get_ocr_result(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = db.query(OCRResult).filter(OCRResult.document_id == document_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="No OCR result found. Run OCR processing first.")
    return {
        "id": result.id,
        "document_id": result.document_id,
        "extracted_text": result.extracted_text,
        "structured_data": result.structured_data,
        "institution_name": result.institution_name_extracted,
        "cert_number": result.cert_number_extracted,
        "issue_date": result.issue_date_extracted,
        "expiry_date": result.expiry_date_extracted,
        "issuing_authority": result.issuing_authority_extracted,
        "confidence_score": result.confidence_score,
        "ocr_engine": result.ocr_engine,
        "processed_at": result.processed_at,
        "corrections": result.corrections,
        "corrected_by": result.corrected_by,
    }


@router.put("/correct/{result_id}")
def correct_ocr(
    result_id: int,
    institution_name: Optional[str] = None,
    cert_number: Optional[str] = None,
    issue_date: Optional[str] = None,
    expiry_date: Optional[str] = None,
    issuing_authority: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Allow authorized users to correct OCR mistakes while retaining original."""
    result = db.query(OCRResult).filter(OCRResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="OCR result not found")

    # Store corrections with original values
    corrections = result.corrections or []
    from datetime import datetime as dt
    if institution_name and institution_name != result.institution_name_extracted:
        corrections.append({"field": "institution_name",
                             "original": result.institution_name_extracted,
                             "corrected": institution_name,
                             "corrected_at": dt.utcnow().isoformat(),
                             "corrected_by": current_user.id})
        result.institution_name_extracted = institution_name
    if cert_number and cert_number != result.cert_number_extracted:
        corrections.append({"field": "cert_number",
                             "original": result.cert_number_extracted,
                             "corrected": cert_number,
                             "corrected_at": dt.utcnow().isoformat(),
                             "corrected_by": current_user.id})
        result.cert_number_extracted = cert_number
    if issue_date and issue_date != result.issue_date_extracted:
        corrections.append({"field": "issue_date",
                             "original": result.issue_date_extracted,
                             "corrected": issue_date,
                             "corrected_at": dt.utcnow().isoformat(),
                             "corrected_by": current_user.id})
        result.issue_date_extracted = issue_date
    if expiry_date and expiry_date != result.expiry_date_extracted:
        corrections.append({"field": "expiry_date",
                             "original": result.expiry_date_extracted,
                             "corrected": expiry_date,
                             "corrected_at": dt.utcnow().isoformat(),
                             "corrected_by": current_user.id})
        result.expiry_date_extracted = expiry_date
    if issuing_authority and issuing_authority != result.issuing_authority_extracted:
        corrections.append({"field": "issuing_authority",
                             "original": result.issuing_authority_extracted,
                             "corrected": issuing_authority,
                             "corrected_at": dt.utcnow().isoformat(),
                             "corrected_by": current_user.id})
        result.issuing_authority_extracted = issuing_authority

    result.corrections = corrections
    result.corrected_by = current_user.id

    log = AuditLog(user_id=current_user.id, action="OCR_CORRECTED",
                   entity_type="OCR_RESULT", entity_id=str(result_id),
                   result="SUCCESS", evidence={"correction_count": len(corrections)})
    db.add(log)
    db.commit()
    return {"message": "OCR corrections saved", "corrections": corrections}


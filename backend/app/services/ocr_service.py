"""OCR service – triggers OCR processing and stores results."""
import logging
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import Document, OCRResult, AuditLog
from app.ai import ocr_processor

logger = logging.getLogger(__name__)


def process_document_ocr(db: Session, document_id: int, user_id: int) -> OCRResult:
    doc = db.query(Document).filter(Document.id == document_id, Document.is_active == True).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Update status to PROCESSING
    doc.status = "PROCESSING"
    db.commit()

    try:
        result_data = ocr_processor.process_document(doc.file_path)
    except Exception as e:
        logger.error(f"OCR processing failed for document {document_id}: {e}")
        doc.status = "PENDING"
        db.commit()
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")

    # Remove existing OCR result if any
    db.query(OCRResult).filter(OCRResult.document_id == document_id).delete()

    ocr = OCRResult(
        document_id=document_id,
        extracted_text=result_data["extracted_text"],
        structured_data=result_data["structured_data"],
        institution_name_extracted=result_data["institution_name_extracted"],
        cert_number_extracted=result_data["cert_number_extracted"],
        issue_date_extracted=result_data["issue_date_extracted"],
        expiry_date_extracted=result_data["expiry_date_extracted"],
        issuing_authority_extracted=result_data["issuing_authority_extracted"],
        confidence_score=result_data["confidence_score"],
        ocr_engine=result_data["ocr_engine"],
        processed_at=datetime.utcnow(),
    )
    db.add(ocr)
    doc.status = "VERIFIED"

    log = AuditLog(
        user_id=user_id,
        action="OCR_PROCESS",
        entity_type="DOCUMENT",
        entity_id=str(document_id),
        document_id=document_id,
        result="SUCCESS",
        evidence={"engine": result_data["ocr_engine"], "confidence": result_data["confidence_score"]},
    )
    db.add(log)
    db.commit()
    db.refresh(ocr)
    return ocr


def get_ocr_result(db: Session, document_id: int) -> OCRResult:
    ocr = db.query(OCRResult).filter(OCRResult.document_id == document_id).first()
    if not ocr:
        raise HTTPException(status_code=404, detail="OCR result not found. Run OCR processing first.")
    return ocr


def correct_ocr_result(db: Session, result_id: int, corrections: dict, user_id: int) -> OCRResult:
    ocr = db.query(OCRResult).filter(OCRResult.id == result_id).first()
    if not ocr:
        raise HTTPException(status_code=404, detail="OCR result not found")

    if corrections.get("institution_name_extracted") is not None:
        ocr.institution_name_extracted = corrections["institution_name_extracted"]
    if corrections.get("cert_number_extracted") is not None:
        ocr.cert_number_extracted = corrections["cert_number_extracted"]
    if corrections.get("issue_date_extracted") is not None:
        ocr.issue_date_extracted = corrections["issue_date_extracted"]
    if corrections.get("expiry_date_extracted") is not None:
        ocr.expiry_date_extracted = corrections["expiry_date_extracted"]
    if corrections.get("issuing_authority_extracted") is not None:
        ocr.issuing_authority_extracted = corrections["issuing_authority_extracted"]

    ocr.corrections = corrections.get("corrections") or corrections
    ocr.corrected_by = user_id

    log = AuditLog(
        user_id=user_id,
        action="OCR_CORRECT",
        entity_type="OCR_RESULT",
        entity_id=str(result_id),
        document_id=ocr.document_id,
        result="SUCCESS",
    )
    db.add(log)
    db.commit()
    db.refresh(ocr)
    return ocr

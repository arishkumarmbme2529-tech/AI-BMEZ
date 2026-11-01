"""Document authentication & duplicate detection routes."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Document, AuthenticationResult, DocumentHash, AuditLog, User, Alert
from app.core.security import get_current_active_user
from app.ai.hash_engine import compute_hashes, find_duplicates
from app.ai.anomaly_detector import analyze_document

router = APIRouter()


@router.post("/analyze/{document_id}")
def analyze_document_auth(
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

    # Compute/update hashes
    hashes = compute_hashes(doc.file_path, doc.mime_type)
    doc_hash = db.query(DocumentHash).filter(DocumentHash.document_id == document_id).first()
    if doc_hash:
        doc_hash.sha256_hash = hashes.get("sha256")
        doc_hash.perceptual_hash = hashes.get("phash")
    else:
        doc_hash = DocumentHash(
            document_id=document_id,
            sha256_hash=hashes.get("sha256"),
            perceptual_hash=hashes.get("phash"),
            file_size=hashes.get("file_size"),
        )
        db.add(doc_hash)
    db.flush()

    # Find duplicates across all docs (excluding self)
    all_hashes = db.query(DocumentHash).filter(
        DocumentHash.document_id != document_id
    ).all()
    duplicate_result = find_duplicates(hashes, [
        {"document_id": h.document_id, "sha256": h.sha256_hash, "phash": h.perceptual_hash}
        for h in all_hashes
    ])

    # Run anomaly detection
    ocr_result = doc.ocr_results[-1] if doc.ocr_results else None
    ocr_data = {}
    if ocr_result:
        ocr_data = {
            "institution_name": ocr_result.institution_name_extracted,
            "cert_number": ocr_result.cert_number_extracted,
            "issue_date": ocr_result.issue_date_extracted,
            "expiry_date": ocr_result.expiry_date_extracted,
        }
    anomalies = analyze_document(doc.file_path, doc.mime_type, ocr_data)

    # Determine status
    status = "NO_ANOMALY"
    if duplicate_result.get("match_type") == "EXACT":
        status = "POTENTIAL_DUPLICATE"
    elif duplicate_result.get("match_type") == "NEAR_DUPLICATE":
        status = "POTENTIAL_DUPLICATE"
    elif anomalies.get("high_severity_count", 0) > 0:
        status = "SUSPICIOUS"
    elif anomalies.get("findings"):
        status = "MANUAL_REVIEW"

    explanation = anomalies.get("summary", "Analysis completed.")
    recommendation = "No action required."
    if status == "POTENTIAL_DUPLICATE":
        recommendation = "A similar or identical document was found. Manual review required to confirm duplication."
    elif status == "SUSPICIOUS":
        recommendation = "Potential anomalies detected. Manual review and official verification strongly recommended."
    elif status == "MANUAL_REVIEW":
        recommendation = "Minor inconsistencies detected. Manual review recommended before approval."

    # Create/update authentication result
    existing = db.query(AuthenticationResult).filter(
        AuthenticationResult.document_id == document_id
    ).first()
    if existing:
        existing.status = status
        existing.duplicate_document_id = duplicate_result.get("duplicate_doc_id")
        existing.similarity_score = duplicate_result.get("similarity_score")
        existing.anomaly_findings = anomalies.get("findings", [])
        existing.metadata_analysis = anomalies.get("metadata", {})
        existing.explanation = explanation
        existing.recommendation = recommendation
        auth_result = existing
    else:
        auth_result = AuthenticationResult(
            document_id=document_id,
            application_id=doc.application_id,
            status=status,
            duplicate_document_id=duplicate_result.get("duplicate_doc_id"),
            similarity_score=duplicate_result.get("similarity_score"),
            anomaly_findings=anomalies.get("findings", []),
            metadata_analysis=anomalies.get("metadata", {}),
            explanation=explanation,
            recommendation=recommendation,
        )
        db.add(auth_result)

    # Create alert if issues found
    if status in ("POTENTIAL_DUPLICATE", "SUSPICIOUS"):
        alert = Alert(
            institution_id=doc.institution_id,
            application_id=doc.application_id,
            document_id=document_id,
            alert_type="POTENTIAL_DUPLICATE" if status == "POTENTIAL_DUPLICATE" else "SUSPICIOUS_ALTERATION",
            severity="HIGH" if status == "SUSPICIOUS" else "MEDIUM",
            title=f"Authentication Issue: {doc.original_filename}",
            message=f"Document authentication analysis found: {status}. {recommendation}",
        )
        db.add(alert)

    log = AuditLog(
        user_id=current_user.id, action="DOCUMENT_AUTH_ANALYZED",
        entity_type="DOCUMENT", entity_id=str(document_id),
        document_id=document_id, result=status,
        evidence={"anomaly_count": len(anomalies.get("findings", []))},
    )
    db.add(log)
    db.commit()

    return {
        "document_id": document_id,
        "document_name": doc.original_filename,
        "status": auth_result.status,
        "duplicate_document_id": auth_result.duplicate_document_id,
        "similarity_score": auth_result.similarity_score,
        "anomaly_findings": auth_result.anomaly_findings,
        "metadata_analysis": auth_result.metadata_analysis,
        "explanation": auth_result.explanation,
        "recommendation": auth_result.recommendation,
        "analyzed_at": auth_result.analyzed_at,
        "note": "AI-generated findings are preliminary indicators only. They do not constitute a final determination of forgery or authenticity.",
    }


@router.get("/results/{document_id}")
def get_auth_result(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = db.query(AuthenticationResult).filter(
        AuthenticationResult.document_id == document_id
    ).first()
    if not result:
        raise HTTPException(status_code=404, detail="No authentication result found. Run analysis first.")
    return {
        "id": result.id,
        "document_id": result.document_id,
        "status": result.status,
        "duplicate_document_id": result.duplicate_document_id,
        "similarity_score": result.similarity_score,
        "anomaly_findings": result.anomaly_findings,
        "metadata_analysis": result.metadata_analysis,
        "explanation": result.explanation,
        "recommendation": result.recommendation,
        "analyzed_at": result.analyzed_at,
        "reviewed_by": result.reviewed_by,
        "review_notes": result.review_notes,
    }


@router.get("/results/application/{application_id}")
def get_auth_results_for_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    results = db.query(AuthenticationResult).filter(
        AuthenticationResult.application_id == application_id
    ).all()
    return [
        {
            "id": r.id, "document_id": r.document_id, "status": r.status,
            "similarity_score": r.similarity_score,
            "anomaly_count": len(r.anomaly_findings or []),
            "explanation": r.explanation, "analyzed_at": r.analyzed_at,
        }
        for r in results
    ]


@router.put("/review/{result_id}")
def review_auth_result(
    result_id: int,
    status: str,
    review_notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role not in ("SUPER_ADMIN", "OFFICER"):
        raise HTTPException(status_code=403, detail="Access denied")
    result = db.query(AuthenticationResult).filter(AuthenticationResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    result.status = status
    result.reviewed_by = current_user.id
    if review_notes:
        result.review_notes = review_notes
    log = AuditLog(user_id=current_user.id, action="AUTH_RESULT_REVIEWED",
                   entity_type="AUTH_RESULT", entity_id=str(result_id),
                   result="SUCCESS", evidence={"new_status": status})
    db.add(log)
    db.commit()
    return {"message": "Review recorded", "new_status": status}


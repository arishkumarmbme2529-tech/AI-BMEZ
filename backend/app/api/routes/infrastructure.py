"""Infrastructure evidence routes."""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import InfrastructureEvidence, User, AuditLog
from app.core.security import get_current_active_user
from app.ai.image_classifier import classify_image

router = APIRouter()

VALID_CATEGORIES = ("BUILDING", "CLASSROOM", "LAB", "LIBRARY", "EQUIPMENT", "FLOORPLAN", "OTHER")


@router.post("")
def add_evidence(
    application_id: int,
    institution_id: int,
    category: str,
    document_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Invalid category. Must be one of: {VALID_CATEGORIES}")
    if (current_user.role == "INSTITUTION_ADMIN"
            and current_user.institution_id != institution_id):
        raise HTTPException(status_code=403, detail="Access denied")

    ai_obs = {}
    quality_score = None
    if document_id:
        from app.db.models import Document
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc and doc.mime_type and doc.mime_type.startswith("image/"):
            result = classify_image(doc.file_path)
            ai_obs = result.get("observations", {})
            quality_score = result.get("quality_score")

    ev = InfrastructureEvidence(
        application_id=application_id,
        institution_id=institution_id,
        category=category,
        document_id=document_id,
        ai_observations=ai_obs,
        quality_score=quality_score,
        status="PENDING",
    )
    db.add(ev)
    log = AuditLog(user_id=current_user.id, action="INFRASTRUCTURE_EVIDENCE_ADDED",
                   entity_type="INFRA_EVIDENCE", result="SUCCESS",
                   evidence={"category": category, "application_id": application_id})
    db.add(log)
    db.commit()
    db.refresh(ev)
    return {
        "id": ev.id, "application_id": ev.application_id,
        "institution_id": ev.institution_id, "category": ev.category,
        "document_id": ev.document_id, "ai_observations": ev.ai_observations,
        "quality_score": ev.quality_score, "status": ev.status,
        "uploaded_at": ev.uploaded_at,
        "note": "AI observations are advisory and do not establish actual infrastructure compliance.",
    }


@router.get("/{application_id}")
def get_evidence(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    evidences = db.query(InfrastructureEvidence).filter(
        InfrastructureEvidence.application_id == application_id
    ).all()
    return [
        {
            "id": e.id, "category": e.category, "document_id": e.document_id,
            "ai_observations": e.ai_observations, "quality_score": e.quality_score,
            "status": e.status, "uploaded_at": e.uploaded_at, "reviewed_at": e.reviewed_at,
        }
        for e in evidences
    ]


@router.put("/{evidence_id}/review")
def review_evidence(
    evidence_id: int, status: str, notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role not in ("SUPER_ADMIN", "OFFICER"):
        raise HTTPException(status_code=403, detail="Officer or admin access required")
    ev = db.query(InfrastructureEvidence).filter(InfrastructureEvidence.id == evidence_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence not found")
    ev.status = status
    ev.reviewed_at = datetime.utcnow()
    if notes:
        obs = ev.ai_observations or {}
        obs["review_notes"] = notes
        ev.ai_observations = obs
    log = AuditLog(user_id=current_user.id, action="INFRA_EVIDENCE_REVIEWED",
                   entity_type="INFRA_EVIDENCE", entity_id=str(evidence_id),
                   result=status)
    db.add(log)
    db.commit()
    return {"message": "Review recorded", "status": ev.status}


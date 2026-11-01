"""Official verification routes (adapter-based, demo mode)."""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import VerificationRequest, Document, AuditLog, User
from app.core.security import get_current_active_user

router = APIRouter()

# Demo adapter — clearly labelled synthetic verification
def _demo_verify(doc: Document, verification_type: str) -> dict:
    """Synthetic verification adapter for hackathon demonstration.
    
    NOTE: This is a demonstration adapter. It does NOT connect to any real
    external authority or government system. Results are simulated for demo purposes.
    """
    import random
    outcomes = ["VERIFIED", "VERIFIED", "VERIFIED", "MISMATCH", "PENDING", "UNAVAILABLE"]
    status = random.choice(outcomes)
    return {
        "status": status,
        "source": f"DEMO_ADAPTER_{verification_type}",
        "reference": f"DEMO-{datetime.utcnow().strftime('%Y%m%d')}-{doc.id:04d}",
        "message": f"[DEMO MODE] Synthetic verification result for {verification_type}. "
                   "This is not a real external verification.",
        "responded_at": datetime.utcnow().isoformat(),
    }


@router.post("/request/{document_id}")
def request_verification(
    document_id: int,
    verification_type: str = "DOCUMENT_AUTHENTICITY",
    external_ref: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role not in ("SUPER_ADMIN", "OFFICER"):
        raise HTTPException(status_code=403, detail="Officer or admin access required")
    doc = db.query(Document).filter(Document.id == document_id, Document.is_active == True).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Call demo adapter
    adapter_result = _demo_verify(doc, verification_type)

    vr = VerificationRequest(
        document_id=document_id,
        verification_type=verification_type,
        external_ref=external_ref or adapter_result.get("reference"),
        request_payload={"document_id": document_id, "type": verification_type},
        response_payload=adapter_result,
        status=adapter_result["status"],
        source=adapter_result["source"],
        responded_at=datetime.utcnow(),
        notes=adapter_result.get("message"),
    )
    db.add(vr)
    log = AuditLog(user_id=current_user.id, action="VERIFICATION_REQUESTED",
                   entity_type="DOCUMENT", entity_id=str(document_id),
                   document_id=document_id, result=adapter_result["status"])
    db.add(log)
    db.commit()
    db.refresh(vr)
    return {
        "id": vr.id, "document_id": document_id,
        "verification_type": vr.verification_type,
        "status": vr.status, "source": vr.source,
        "external_ref": vr.external_ref,
        "requested_at": vr.requested_at,
        "responded_at": vr.responded_at,
        "notes": vr.notes,
        "disclaimer": "This is a DEMO MODE verification. Results are synthetic and do not represent actual external authority verification.",
    }


@router.get("/results/{document_id}")
def get_verification_results(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    results = db.query(VerificationRequest).filter(
        VerificationRequest.document_id == document_id
    ).order_by(VerificationRequest.requested_at.desc()).all()
    return [
        {
            "id": r.id, "verification_type": r.verification_type,
            "status": r.status, "source": r.source,
            "external_ref": r.external_ref,
            "requested_at": r.requested_at,
            "responded_at": r.responded_at,
            "notes": r.notes,
        }
        for r in results
    ]


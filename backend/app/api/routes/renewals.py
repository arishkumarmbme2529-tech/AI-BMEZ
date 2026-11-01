"""Document renewal management routes."""
from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import RenewalRecord, Document, User, Alert, AuditLog
from app.core.security import get_current_active_user

router = APIRouter()


@router.get("")
def list_renewals(
    skip: int = 0, limit: int = 20,
    status: Optional[str] = None,
    days_until_expiry: Optional[int] = None,
    institution_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(RenewalRecord)
    if current_user.role == "INSTITUTION_ADMIN" and current_user.institution_id:
        q = q.filter(RenewalRecord.institution_id == current_user.institution_id)
    elif institution_id:
        q = q.filter(RenewalRecord.institution_id == institution_id)
    if status:
        q = q.filter(RenewalRecord.status == status)
    if days_until_expiry:
        cutoff = datetime.utcnow() + timedelta(days=days_until_expiry)
        q = q.filter(RenewalRecord.renewal_due_date <= cutoff)

    total = q.count()
    records = q.order_by(RenewalRecord.renewal_due_date.asc()).offset(skip).limit(limit).all()

    items = []
    now = datetime.utcnow()
    for r in records:
        days_remaining = (r.renewal_due_date - now).days if r.renewal_due_date else None
        items.append({
            "id": r.id,
            "document_id": r.document_id,
            "document_name": r.document.original_filename if r.document else None,
            "institution_id": r.institution_id,
            "institution_name": r.institution.name if r.institution else None,
            "renewal_due_date": r.renewal_due_date,
            "days_remaining": days_remaining,
            "status": r.status,
            "reminder_90_sent": r.reminder_90_sent,
            "reminder_60_sent": r.reminder_60_sent,
            "reminder_30_sent": r.reminder_30_sent,
            "reminder_7_sent": r.reminder_7_sent,
            "renewed_document_id": r.renewed_document_id,
        })
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.post("")
def create_renewal_record(
    document_id: int,
    renewal_due_date: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        due_date = datetime.fromisoformat(renewal_due_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format: YYYY-MM-DD")

    record = RenewalRecord(
        document_id=document_id,
        institution_id=doc.institution_id,
        renewal_due_date=due_date,
        status="ACTIVE",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id, "renewal_due_date": record.renewal_due_date, "status": record.status}


@router.put("/{renewal_id}/update")
def update_renewal(
    renewal_id: int,
    new_status: Optional[str] = None,
    renewed_document_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    record = db.query(RenewalRecord).filter(RenewalRecord.id == renewal_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Renewal record not found")
    if new_status:
        record.status = new_status
    if renewed_document_id:
        record.renewed_document_id = renewed_document_id
        record.status = "RENEWED"
    record.updated_at = datetime.utcnow()
    log = AuditLog(user_id=current_user.id, action="RENEWAL_UPDATED",
                   entity_type="RENEWAL", entity_id=str(renewal_id), result="SUCCESS")
    db.add(log)
    db.commit()
    return {"message": "Renewal record updated", "status": record.status}


@router.get("/expiring")
def get_expiring_documents(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get documents expiring within `days` days."""
    cutoff = datetime.utcnow() + timedelta(days=days)
    now = datetime.utcnow()
    q = db.query(Document).filter(
        Document.expiry_date != None,
        Document.expiry_date >= now,
        Document.expiry_date <= cutoff,
        Document.is_active == True,
    )
    if current_user.role == "INSTITUTION_ADMIN" and current_user.institution_id:
        q = q.filter(Document.institution_id == current_user.institution_id)
    docs = q.order_by(Document.expiry_date.asc()).limit(50).all()
    return [
        {
            "id": d.id,
            "filename": d.original_filename,
            "institution_id": d.institution_id,
            "institution_name": d.institution.name if d.institution else None,
            "expiry_date": d.expiry_date,
            "days_remaining": (d.expiry_date - now).days,
            "document_type": d.document_type.name if d.document_type else None,
        }
        for d in docs
    ]


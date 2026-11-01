"""Institution CRUD service."""
from typing import Optional, List
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.models import Institution, Application, Document


def get_institutions(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    state: Optional[str] = None,
    status: Optional[str] = None,
):
    q = db.query(Institution)
    if search:
        q = q.filter(Institution.name.ilike(f"%{search}%"))
    if state:
        q = q.filter(Institution.state == state)
    if status:
        q = q.filter(Institution.status == status)
    total = q.count()
    items = q.offset(skip).limit(limit).all()
    return items, total


def get_institution(db: Session, institution_id: int) -> Institution:
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
    return inst


def create_institution(db: Session, data: dict) -> Institution:
    existing = db.query(Institution).filter(Institution.aicte_id == data.get("aicte_id")).first()
    if existing:
        raise HTTPException(status_code=400, detail="Institution with this AICTE ID already exists")
    inst = Institution(**data)
    db.add(inst)
    db.commit()
    db.refresh(inst)
    return inst


def update_institution(db: Session, institution_id: int, data: dict) -> Institution:
    inst = get_institution(db, institution_id)
    for key, value in data.items():
        if value is not None:
            setattr(inst, key, value)
    inst.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(inst)
    return inst


def get_institution_statistics(db: Session, institution_id: int) -> dict:
    get_institution(db, institution_id)  # verify exists
    total_apps = db.query(Application).filter(Application.institution_id == institution_id).count()
    approved_apps = db.query(Application).filter(
        Application.institution_id == institution_id,
        Application.status == "APPROVED"
    ).count()
    pending_apps = db.query(Application).filter(
        Application.institution_id == institution_id,
        Application.status.in_(["DRAFT", "SUBMITTED", "UNDER_REVIEW"])
    ).count()
    total_docs = db.query(Document).filter(
        Document.institution_id == institution_id,
        Document.is_active == True
    ).count()
    expiry_threshold = datetime.utcnow() + timedelta(days=30)
    expiring_docs = db.query(Document).filter(
        Document.institution_id == institution_id,
        Document.is_active == True,
        Document.expiry_date != None,
        Document.expiry_date <= expiry_threshold,
    ).count()
    compliance_score = (approved_apps / total_apps * 100) if total_apps > 0 else 0.0
    return {
        "total_applications": total_apps,
        "approved_applications": approved_apps,
        "pending_applications": pending_apps,
        "total_documents": total_docs,
        "expiring_documents": expiring_docs,
        "compliance_score": round(compliance_score, 2),
    }

"""Institutions routes."""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Institution, User, AuditLog, Application, Document
from app.core.security import get_current_active_user, require_officer_or_above

router = APIRouter()


def _inst_dict(inst: Institution, include_counts: bool = False):
    d = {
        "id": inst.id, "name": inst.name, "aicte_id": inst.aicte_id,
        "institution_type": inst.institution_type, "address": inst.address,
        "state": inst.state, "district": inst.district, "city": inst.city,
        "pincode": inst.pincode, "establishment_year": inst.establishment_year,
        "contact_person": inst.contact_person, "email": inst.email,
        "phone": inst.phone, "status": inst.status,
        "created_at": inst.created_at, "updated_at": inst.updated_at,
    }
    if include_counts:
        d["application_count"] = len(inst.applications)
        d["document_count"] = len(inst.documents)
    return d


@router.get("")
def list_institutions(
    skip: int = 0, limit: int = 20,
    search: Optional[str] = None,
    state: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(Institution)
    # Institution admins only see their own institution
    if current_user.role == "INSTITUTION_ADMIN" and current_user.institution_id:
        q = q.filter(Institution.id == current_user.institution_id)
    else:
        if search:
            q = q.filter(
                Institution.name.ilike(f"%{search}%") |
                Institution.aicte_id.ilike(f"%{search}%")
            )
        if state:
            q = q.filter(Institution.state == state)
        if status:
            q = q.filter(Institution.status == status)
    total = q.count()
    institutions = q.offset(skip).limit(limit).all()
    return {
        "items": [_inst_dict(i, include_counts=True) for i in institutions],
        "total": total, "skip": skip, "limit": limit,
    }


@router.post("")
def create_institution(
    name: str, aicte_id: str, institution_type: Optional[str] = None,
    address: Optional[str] = None, state: Optional[str] = None,
    district: Optional[str] = None, city: Optional[str] = None,
    pincode: Optional[str] = None, establishment_year: Optional[int] = None,
    contact_person: Optional[str] = None, email: Optional[str] = None,
    phone: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_above),
):
    if db.query(Institution).filter(Institution.aicte_id == aicte_id).first():
        raise HTTPException(status_code=400, detail="AICTE ID already registered")
    inst = Institution(
        name=name, aicte_id=aicte_id, institution_type=institution_type,
        address=address, state=state, district=district, city=city,
        pincode=pincode, establishment_year=establishment_year,
        contact_person=contact_person, email=email, phone=phone,
        status="PENDING",
    )
    db.add(inst)
    log = AuditLog(user_id=current_user.id, action="INSTITUTION_CREATED",
                   entity_type="INSTITUTION", result="SUCCESS",
                   evidence={"name": name, "aicte_id": aicte_id})
    db.add(log)
    db.commit()
    db.refresh(inst)
    return _inst_dict(inst)


@router.get("/{institution_id}")
def get_institution(
    institution_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if (current_user.role == "INSTITUTION_ADMIN"
            and current_user.institution_id != institution_id):
        raise HTTPException(status_code=403, detail="Access denied")
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
    return _inst_dict(inst, include_counts=True)


@router.put("/{institution_id}")
def update_institution(
    institution_id: int,
    name: Optional[str] = None, institution_type: Optional[str] = None,
    address: Optional[str] = None, state: Optional[str] = None,
    district: Optional[str] = None, city: Optional[str] = None,
    pincode: Optional[str] = None, establishment_year: Optional[int] = None,
    contact_person: Optional[str] = None, email: Optional[str] = None,
    phone: Optional[str] = None, status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if (current_user.role == "INSTITUTION_ADMIN"
            and current_user.institution_id != institution_id):
        raise HTTPException(status_code=403, detail="Access denied")
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    if name: inst.name = name
    if institution_type: inst.institution_type = institution_type
    if address: inst.address = address
    if state: inst.state = state
    if district: inst.district = district
    if city: inst.city = city
    if pincode: inst.pincode = pincode
    if establishment_year: inst.establishment_year = establishment_year
    if contact_person: inst.contact_person = contact_person
    if email: inst.email = email
    if phone: inst.phone = phone
    if status and current_user.role in ("SUPER_ADMIN", "OFFICER"):
        inst.status = status
    inst.updated_at = datetime.utcnow()

    log = AuditLog(user_id=current_user.id, action="INSTITUTION_UPDATED",
                   entity_type="INSTITUTION", entity_id=str(institution_id), result="SUCCESS")
    db.add(log)
    db.commit()
    return _inst_dict(inst)


@router.get("/{institution_id}/applications")
def get_institution_applications(
    institution_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if (current_user.role == "INSTITUTION_ADMIN"
            and current_user.institution_id != institution_id):
        raise HTTPException(status_code=403, detail="Access denied")
    apps = db.query(Application).filter(
        Application.institution_id == institution_id
    ).order_by(Application.created_at.desc()).all()
    return [{"id": a.id, "application_id": a.application_id, "title": a.title,
             "status": a.status, "created_at": a.created_at,
             "category": a.category.name if a.category else None} for a in apps]


@router.get("/{institution_id}/statistics")
def get_institution_stats(
    institution_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if (current_user.role == "INSTITUTION_ADMIN"
            and current_user.institution_id != institution_id):
        raise HTTPException(status_code=403, detail="Access denied")
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
    total_apps = len(inst.applications)
    total_docs = len(inst.documents)
    approved = sum(1 for a in inst.applications if a.status == "APPROVED")
    pending = sum(1 for a in inst.applications if a.status in ("SUBMITTED", "UNDER_REVIEW"))
    return {
        "total_applications": total_apps, "total_documents": total_docs,
        "approved_applications": approved, "pending_applications": pending,
        "institution_name": inst.name,
    }


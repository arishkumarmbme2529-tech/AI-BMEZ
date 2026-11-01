"""Applications routes."""
import uuid
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import (
    Application, ApplicationCategory, Institution, User,
    AuditLog, Document, DocumentType, Alert
)
from app.core.security import get_current_active_user

router = APIRouter()


def _app_dict(app: Application):
    return {
        "id": app.id,
        "application_id": app.application_id,
        "title": app.title,
        "status": app.status,
        "institution_id": app.institution_id,
        "institution_name": app.institution.name if app.institution else None,
        "category_id": app.category_id,
        "category_name": app.category.name if app.category else None,
        "category_code": app.category.code if app.category else None,
        "submitted_by": app.submitted_by,
        "submitter_name": app.submitter.full_name if app.submitter else None,
        "reviewer_id": app.reviewer_id,
        "reviewer_name": app.reviewer.full_name if app.reviewer else None,
        "review_notes": app.review_notes,
        "created_at": app.created_at,
        "updated_at": app.updated_at,
        "submitted_at": app.submitted_at,
        "document_count": len(app.documents),
    }


@router.get("")
def list_applications(
    skip: int = 0, limit: int = 20,
    status: Optional[str] = None,
    category_id: Optional[int] = None,
    institution_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(Application)
    if current_user.role == "INSTITUTION_ADMIN" and current_user.institution_id:
        q = q.filter(Application.institution_id == current_user.institution_id)
    elif institution_id:
        q = q.filter(Application.institution_id == institution_id)
    if status:
        q = q.filter(Application.status == status)
    if category_id:
        q = q.filter(Application.category_id == category_id)
    if search:
        q = q.filter(
            Application.application_id.ilike(f"%{search}%") |
            Application.title.ilike(f"%{search}%")
        )
    total = q.count()
    apps = q.order_by(Application.created_at.desc()).offset(skip).limit(limit).all()
    return {"items": [_app_dict(a) for a in apps], "total": total, "skip": skip, "limit": limit}


@router.post("")
def create_application(
    institution_id: int,
    category_id: int,
    title: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role == "INSTITUTION_ADMIN":
        if current_user.institution_id != institution_id:
            raise HTTPException(status_code=403, detail="Access denied")
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
    cat = db.query(ApplicationCategory).filter(ApplicationCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    # Generate unique application ID
    year = datetime.utcnow().year
    count = db.query(Application).count() + 1
    app_id = f"AICTE-{year}-{cat.code}-{count:05d}"

    app = Application(
        application_id=app_id,
        institution_id=institution_id,
        category_id=category_id,
        title=title,
        status="DRAFT",
        submitted_by=current_user.id,
    )
    db.add(app)
    log = AuditLog(user_id=current_user.id, action="APPLICATION_CREATED",
                   entity_type="APPLICATION", result="SUCCESS",
                   evidence={"application_id": app_id})
    db.add(log)
    db.commit()
    db.refresh(app)
    return _app_dict(app)


@router.get("/categories")
def list_categories(db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_active_user)):
    cats = db.query(ApplicationCategory).filter(ApplicationCategory.is_active == True).all()
    return [{"id": c.id, "name": c.name, "code": c.code, "description": c.description} for c in cats]


@router.get("/{app_id}")
def get_application(
    app_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if (current_user.role == "INSTITUTION_ADMIN"
            and current_user.institution_id != app.institution_id):
        raise HTTPException(status_code=403, detail="Access denied")
    return _app_dict(app)


@router.put("/{app_id}")
def update_application(
    app_id: int, title: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if (current_user.role == "INSTITUTION_ADMIN"
            and current_user.institution_id != app.institution_id):
        raise HTTPException(status_code=403, detail="Access denied")
    if app.status not in ("DRAFT", "RETURNED"):
        raise HTTPException(status_code=400, detail="Can only edit DRAFT or RETURNED applications")
    if title:
        app.title = title
    app.updated_at = datetime.utcnow()
    log = AuditLog(user_id=current_user.id, action="APPLICATION_UPDATED",
                   entity_type="APPLICATION", entity_id=str(app_id),
                   application_id=app.id, result="SUCCESS")
    db.add(log)
    db.commit()
    return _app_dict(app)


@router.put("/{app_id}/submit")
def submit_application(
    app_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if (current_user.role == "INSTITUTION_ADMIN"
            and current_user.institution_id != app.institution_id):
        raise HTTPException(status_code=403, detail="Access denied")
    if app.status not in ("DRAFT", "RETURNED"):
        raise HTTPException(status_code=400, detail="Can only submit DRAFT or RETURNED applications")
    app.status = "SUBMITTED"
    app.submitted_at = datetime.utcnow()
    app.updated_at = datetime.utcnow()
    log = AuditLog(user_id=current_user.id, action="APPLICATION_SUBMITTED",
                   entity_type="APPLICATION", entity_id=str(app_id),
                   application_id=app.id, result="SUCCESS")
    db.add(log)
    db.commit()
    return _app_dict(app)


@router.put("/{app_id}/status")
def update_application_status(
    app_id: int, new_status: str, review_notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role not in ("SUPER_ADMIN", "OFFICER"):
        raise HTTPException(status_code=403, detail="Officer or admin access required")
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    valid_statuses = ("SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "RETURNED")
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    old_status = app.status
    app.status = new_status
    app.reviewer_id = current_user.id
    if review_notes:
        app.review_notes = review_notes
    app.updated_at = datetime.utcnow()
    log = AuditLog(user_id=current_user.id, action="APPLICATION_STATUS_CHANGED",
                   entity_type="APPLICATION", entity_id=str(app_id),
                   application_id=app.id, result="SUCCESS",
                   evidence={"old_status": old_status, "new_status": new_status})
    db.add(log)
    db.commit()
    return _app_dict(app)


@router.get("/{app_id}/checklist")
def get_application_checklist(
    app_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Return a document checklist for this application."""
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    all_types = db.query(DocumentType).all()
    uploaded = {d.document_type_id for d in app.documents if d.is_active}
    checklist = []
    for dt in all_types:
        checklist.append({
            "document_type_id": dt.id,
            "document_type_name": dt.name,
            "code": dt.code,
            "is_required": dt.is_required,
            "is_uploaded": dt.id in uploaded,
            "status": "UPLOADED" if dt.id in uploaded else ("MISSING" if dt.is_required else "OPTIONAL"),
        })
    missing_required = sum(1 for c in checklist if c["is_required"] and not c["is_uploaded"])
    return {
        "application_id": app.application_id,
        "checklist": checklist,
        "missing_required": missing_required,
        "total_required": sum(1 for c in checklist if c["is_required"]),
        "total_uploaded": len(uploaded),
    }


@router.get("/{app_id}/validation-summary")
def get_validation_summary(
    app_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Full validation summary for an application."""
    from app.db.models import ComplianceResult, AuthenticationResult, Alert as AlertModel
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    compliance_results = db.query(ComplianceResult).filter(
        ComplianceResult.application_id == app_id
    ).all()
    auth_results = db.query(AuthenticationResult).filter(
        AuthenticationResult.application_id == app_id
    ).all()
    open_alerts = db.query(AlertModel).filter(
        AlertModel.application_id == app_id,
        AlertModel.is_resolved == False
    ).all()

    return {
        "application_id": app.application_id,
        "status": app.status,
        "institution": app.institution.name if app.institution else None,
        "category": app.category.name if app.category else None,
        "total_documents": len(app.documents),
        "compliance_checked": len(compliance_results),
        "compliant_rules": sum(1 for r in compliance_results if r.status == "COMPLIANT"),
        "non_compliant_rules": sum(1 for r in compliance_results if r.status == "NON_COMPLIANT"),
        "auth_issues": sum(1 for r in auth_results if r.status not in ("NO_ANOMALY", "PENDING")),
        "open_alerts": len(open_alerts),
        "overall_readiness": "READY" if (
            len(open_alerts) == 0 and
            sum(1 for r in compliance_results if r.status == "NON_COMPLIANT") == 0
        ) else "NEEDS_ATTENTION",
    }


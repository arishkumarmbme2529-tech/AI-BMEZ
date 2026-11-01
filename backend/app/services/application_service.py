"""Application CRUD and workflow service."""
import uuid
from datetime import datetime
from typing import Optional, List

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import Application, ApplicationCategory, DocumentType, Document, AuditLog


def _generate_application_id(category_code: str) -> str:
    year = datetime.utcnow().year
    unique = uuid.uuid4().hex[:5].upper()
    return f"AICTE-{year}-{category_code}-{unique}"


def get_applications(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    category_id: Optional[int] = None,
    institution_id: Optional[int] = None,
):
    q = db.query(Application)
    if status:
        q = q.filter(Application.status == status)
    if category_id:
        q = q.filter(Application.category_id == category_id)
    if institution_id:
        q = q.filter(Application.institution_id == institution_id)
    total = q.count()
    items = q.order_by(Application.created_at.desc()).offset(skip).limit(limit).all()
    return items, total


def get_application(db: Session, application_id: int) -> Application:
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


def create_application(db: Session, data: dict, submitted_by: int) -> Application:
    category = db.query(ApplicationCategory).filter(
        ApplicationCategory.id == data["category_id"]
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Application category not found")
    app_id = _generate_application_id(category.code)
    application = Application(
        application_id=app_id,
        institution_id=data["institution_id"],
        category_id=data["category_id"],
        title=data["title"],
        status="DRAFT",
        submitted_by=submitted_by,
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


def update_application(db: Session, application_id: int, data: dict) -> Application:
    app = get_application(db, application_id)
    if app.status not in ("DRAFT", "RETURNED"):
        raise HTTPException(status_code=400, detail="Only DRAFT or RETURNED applications can be edited")
    for key, value in data.items():
        if value is not None:
            setattr(app, key, value)
    app.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(app)
    return app


def submit_application(db: Session, application_id: int, user_id: int) -> Application:
    app = get_application(db, application_id)
    if app.status not in ("DRAFT", "RETURNED"):
        raise HTTPException(status_code=400, detail="Application cannot be submitted in current status")
    app.status = "SUBMITTED"
    app.submitted_at = datetime.utcnow()
    app.updated_at = datetime.utcnow()

    log = AuditLog(
        user_id=user_id,
        action="SUBMIT_APPLICATION",
        entity_type="APPLICATION",
        entity_id=str(app.id),
        application_id=app.id,
        result="SUCCESS",
    )
    db.add(log)
    db.commit()
    db.refresh(app)
    return app


def update_application_status(
    db: Session,
    application_id: int,
    new_status: str,
    reviewer_id: int,
    review_notes: Optional[str] = None,
) -> Application:
    app = get_application(db, application_id)
    valid_statuses = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "RETURNED"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status: {new_status}")
    app.status = new_status
    app.reviewer_id = reviewer_id
    app.review_notes = review_notes
    app.updated_at = datetime.utcnow()

    log = AuditLog(
        user_id=reviewer_id,
        action=f"STATUS_CHANGE_{new_status}",
        entity_type="APPLICATION",
        entity_id=str(app.id),
        application_id=app.id,
        result="SUCCESS",
        evidence={"new_status": new_status, "notes": review_notes},
    )
    db.add(log)
    db.commit()
    db.refresh(app)
    return app


def get_application_checklist(db: Session, application_id: int) -> dict:
    app = get_application(db, application_id)
    doc_types = db.query(DocumentType).all()
    uploaded_docs = db.query(Document).filter(
        Document.application_id == application_id,
        Document.is_active == True,
    ).all()
    uploaded_map = {d.document_type_id: d for d in uploaded_docs}

    items = []
    required_count = 0
    uploaded_count = 0
    for dt in doc_types:
        doc = uploaded_map.get(dt.id)
        if dt.is_required:
            required_count += 1
        if doc:
            uploaded_count += 1
        items.append({
            "document_type_code": dt.code,
            "document_type_name": dt.name,
            "is_required": dt.is_required,
            "is_uploaded": doc is not None,
            "document_id": doc.id if doc else None,
            "document_status": doc.status if doc else None,
        })

    return {
        "application_id": app.application_id,
        "total_required": required_count,
        "total_uploaded": uploaded_count,
        "items": items,
    }


def get_validation_summary(db: Session, application_id: int) -> dict:
    from app.db.models import ComplianceResult, ComplianceRule
    app = get_application(db, application_id)
    results = db.query(ComplianceResult).filter(
        ComplianceResult.application_id == application_id
    ).all()

    total = len(results)
    compliant = sum(1 for r in results if r.status == "COMPLIANT")
    non_compliant = sum(1 for r in results if r.status == "NON_COMPLIANT")
    pending = sum(1 for r in results if r.status == "PENDING")

    critical_issues = []
    recommendations = []
    for r in results:
        if r.status == "NON_COMPLIANT":
            rule = db.query(ComplianceRule).filter(ComplianceRule.id == r.rule_id).first()
            if rule and rule.severity in ("CRITICAL", "HIGH"):
                critical_issues.append(f"{rule.name}: {r.notes or 'Not compliant'}")
            if rule and rule.requirement:
                recommendations.append(rule.requirement)

    score = (compliant / total * 100) if total > 0 else 0.0
    overall = "COMPLIANT" if non_compliant == 0 and pending == 0 else (
        "NON_COMPLIANT" if non_compliant > 0 else "PENDING"
    )

    return {
        "application_id": app.application_id,
        "overall_status": overall,
        "compliance_score": round(score, 2),
        "total_rules": total,
        "compliant": compliant,
        "non_compliant": non_compliant,
        "pending": pending,
        "critical_issues": critical_issues,
        "recommendations": list(set(recommendations))[:10],
    }

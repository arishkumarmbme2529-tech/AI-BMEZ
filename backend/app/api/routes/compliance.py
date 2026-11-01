"""Compliance verification engine routes."""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import (
    Application, ComplianceRule, ComplianceResult, DocumentType,
    Document, AuditLog, User
)
from app.core.security import get_current_active_user, require_officer_or_above

router = APIRouter()


def _run_compliance_check(app: Application, rule: ComplianceRule, db: Session) -> str:
    """Execute a compliance rule check. Returns status string."""
    if rule.validation_type == "DOCUMENT_PRESENT":
        # Check if any document of required type is uploaded
        docs = [d for d in app.documents if d.is_active]
        if docs:
            return "COMPLIANT"
        return "NON_COMPLIANT"

    elif rule.validation_type == "EXPIRY_CHECK":
        # Check for expired documents
        now = datetime.utcnow()
        expired = [d for d in app.documents if d.expiry_date and d.expiry_date < now and d.is_active]
        if expired:
            return "NON_COMPLIANT"
        return "COMPLIANT"

    elif rule.validation_type == "FIELD_CHECK":
        # Check OCR-extracted fields
        ocr_docs = []
        for d in app.documents:
            if d.ocr_results:
                ocr_docs.extend(d.ocr_results)
        if ocr_docs:
            return "COMPLIANT"
        return "PENDING"

    return "PENDING"


@router.post("/check/{application_id}")
def check_compliance(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if (current_user.role == "INSTITUTION_ADMIN"
            and current_user.institution_id != app.institution_id):
        raise HTTPException(status_code=403, detail="Access denied")

    # Get applicable rules (global + category-specific)
    rules = db.query(ComplianceRule).filter(
        ComplianceRule.is_active == True,
        (ComplianceRule.category_id == None) | (ComplianceRule.category_id == app.category_id)
    ).all()

    results = []
    for rule in rules:
        status = _run_compliance_check(app, rule, db)

        # Check if result already exists
        existing = db.query(ComplianceResult).filter(
            ComplianceResult.application_id == application_id,
            ComplianceResult.rule_id == rule.id,
        ).first()
        if existing:
            existing.status = status
            existing.checked_at = datetime.utcnow()
            results.append(existing)
        else:
            cr = ComplianceResult(
                application_id=application_id,
                rule_id=rule.id,
                status=status,
                evidence=f"Auto-checked on {datetime.utcnow().isoformat()}",
            )
            db.add(cr)
            results.append(cr)

    log = AuditLog(
        user_id=current_user.id, action="COMPLIANCE_CHECKED",
        entity_type="APPLICATION", entity_id=str(application_id),
        application_id=application_id, result="SUCCESS",
        evidence={"rules_checked": len(rules)},
    )
    db.add(log)
    db.commit()

    compliant = sum(1 for r in results if r.status == "COMPLIANT")
    non_compliant = sum(1 for r in results if r.status == "NON_COMPLIANT")
    partial = sum(1 for r in results if r.status == "PARTIAL")
    total = len(results)
    score = round((compliant / total * 100) if total > 0 else 0, 1)

    return {
        "application_id": application_id,
        "rules_checked": total,
        "compliant": compliant,
        "non_compliant": non_compliant,
        "partial": partial,
        "pending": total - compliant - non_compliant - partial,
        "compliance_score": score,
        "overall_status": "COMPLIANT" if non_compliant == 0 else "NON_COMPLIANT",
        "note": "Compliance rules are sample rules for demonstration purposes.",
    }


@router.get("/results/{application_id}")
def get_compliance_results(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    results = db.query(ComplianceResult).filter(
        ComplianceResult.application_id == application_id
    ).all()
    if not results:
        raise HTTPException(status_code=404, detail="No compliance results. Run compliance check first.")

    items = []
    for r in results:
        items.append({
            "id": r.id,
            "rule_id": r.rule.rule_id if r.rule else None,
            "rule_name": r.rule.name if r.rule else None,
            "severity": r.rule.severity if r.rule else None,
            "description": r.rule.description if r.rule else None,
            "status": r.status,
            "evidence": r.evidence,
            "notes": r.notes,
            "checked_at": r.checked_at,
            "is_sample": r.rule.is_sample if r.rule else False,
        })

    compliant = sum(1 for i in items if i["status"] == "COMPLIANT")
    non_compliant = sum(1 for i in items if i["status"] == "NON_COMPLIANT")
    total = len(items)
    score = round((compliant / total * 100) if total > 0 else 0, 1)

    return {
        "application_id": application_id,
        "items": items,
        "summary": {
            "total": total, "compliant": compliant,
            "non_compliant": non_compliant,
            "compliance_score": score,
        },
    }


@router.get("/rules")
def list_rules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    rules = db.query(ComplianceRule).filter(ComplianceRule.is_active == True).all()
    return [
        {
            "id": r.id, "rule_id": r.rule_id, "name": r.name,
            "category_id": r.category_id,
            "category_name": r.category.name if r.category else "All Categories",
            "description": r.description, "requirement": r.requirement,
            "validation_type": r.validation_type, "severity": r.severity,
            "version": r.version, "is_sample": r.is_sample,
        }
        for r in rules
    ]


@router.post("/rules")
def create_rule(
    rule_id: str, name: str, description: str,
    requirement: str, validation_type: str, severity: str,
    category_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_above),
):
    if db.query(ComplianceRule).filter(ComplianceRule.rule_id == rule_id).first():
        raise HTTPException(status_code=400, detail="Rule ID already exists")
    rule = ComplianceRule(
        rule_id=rule_id, name=name, description=description,
        requirement=requirement, validation_type=validation_type,
        severity=severity, category_id=category_id, is_sample=True,
    )
    db.add(rule)
    db.commit()
    return {"message": "Rule created", "id": rule.id}


@router.put("/rules/{rule_id}")
def update_rule(
    rule_id: int,
    name: Optional[str] = None,
    is_active: Optional[bool] = None,
    severity: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_above),
):
    rule = db.query(ComplianceRule).filter(ComplianceRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    if name: rule.name = name
    if is_active is not None: rule.is_active = is_active
    if severity: rule.severity = severity
    db.commit()
    return {"message": "Rule updated"}


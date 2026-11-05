"""Dashboard analytics routes."""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import (
    Institution, Application, Document, DocumentType, Alert,
    ComplianceResult, AuthenticationResult, User
)
from app.core.security import get_current_active_user

router = APIRouter()


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Core dashboard statistics — all database-driven and role-scoped."""
    inst_q = db.query(Institution)
    app_q = db.query(Application)
    doc_q = db.query(Document).filter(Document.is_active == True)
    alert_q = db.query(Alert)
    auth_q = db.query(AuthenticationResult)
    comp_q = db.query(ComplianceResult)

    is_inst_user = current_user.role in ("INSTITUTION_ADMIN", "INSTITUTE_USER") and current_user.institution_id
    if is_inst_user:
        iid = current_user.institution_id
        inst_q = inst_q.filter(Institution.id == iid)
        app_q = app_q.filter(Application.institution_id == iid)
        doc_q = doc_q.filter(Document.institution_id == iid)
        alert_q = alert_q.filter(Alert.institution_id == iid)
        inst_doc_ids = [d.id for d in doc_q.all()]
        inst_app_ids = [a.id for a in app_q.all()]
        if inst_doc_ids:
            auth_q = auth_q.filter(AuthenticationResult.document_id.in_(inst_doc_ids))
        else:
            auth_q = auth_q.filter(AuthenticationResult.id == -1)
        if inst_app_ids:
            comp_q = comp_q.filter(ComplianceResult.application_id.in_(inst_app_ids))
        else:
            comp_q = comp_q.filter(ComplianceResult.id == -1)

    now = datetime.utcnow()
    all_docs = doc_q.all()

    total_institutions = inst_q.count()
    total_applications = app_q.count()
    total_documents = len(all_docs)
    verified_documents = sum(1 for d in all_docs if d.status == "VERIFIED")
    pending_documents = sum(1 for d in all_docs if d.status in ("PENDING", "PROCESSING"))
    pending_applications = app_q.filter(
        Application.status.in_(["SUBMITTED", "UNDER_REVIEW"])
    ).count()

    expired_documents = sum(
        1 for d in all_docs
        if d.status == "EXPIRED" or (d.expiry_date is not None and d.expiry_date < now)
    )

    auth_results = auth_q.all()
    dup_from_status = sum(1 for d in all_docs if d.status == "DUPLICATE")
    dup_from_auth = sum(1 for r in auth_results if r.status == "POTENTIAL_DUPLICATE")
    duplicate_documents = max(dup_from_status, dup_from_auth)

    susp_from_status = sum(1 for d in all_docs if d.status == "SUSPICIOUS")
    susp_from_auth = sum(1 for r in auth_results if r.status in ("SUSPICIOUS", "MANUAL_REVIEW"))
    suspicious_documents = max(susp_from_status, susp_from_auth)

    anomaly_alerts = alert_q.filter(Alert.is_resolved == False).count()

    # Missing required documents calculation
    required_types = db.query(DocumentType).filter(DocumentType.is_required == True).all()
    required_type_ids = {t.id for t in required_types}
    uploaded_type_ids = {d.document_type_id for d in all_docs}
    missing_count = len(required_type_ids - uploaded_type_ids)

    # Compliance rate
    comp_results = comp_q.all()
    total_comp = len(comp_results)
    if total_comp > 0:
        compliant_comp = sum(1 for r in comp_results if r.status == "COMPLIANT")
        partial_comp = sum(1 for r in comp_results if r.status == "PARTIAL")
        compliance_rate = round(((compliant_comp + 0.5 * partial_comp) / total_comp * 100), 1)
    else:
        total_req = len(required_type_ids)
        compliance_rate = round(((total_req - missing_count) / total_req * 100) if total_req > 0 else 0.0, 1)

    return {
        "total_institutions": total_institutions,
        "total_applications": total_applications,
        "total_documents": total_documents,
        "verified_documents": verified_documents,
        "pending_documents": pending_documents,
        "pending_applications": pending_applications,
        "missing_documents": missing_count,
        "duplicate_documents": duplicate_documents,
        "suspicious_documents": suspicious_documents,
        "expired_documents": expired_documents,
        "anomaly_alerts": anomaly_alerts,
        "compliance_rate": compliance_rate,
        "generated_at": now.isoformat(),
    }


@router.get("/monthly-trends")
def get_monthly_trends(
    months: int = 6,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Monthly application and document submission trends."""
    now = datetime.utcnow()
    result = []
    for i in range(months - 1, -1, -1):
        start = (now - timedelta(days=30 * (i + 1))).replace(hour=0, minute=0, second=0)
        end = (now - timedelta(days=30 * i)).replace(hour=23, minute=59, second=59)
        month_label = start.strftime("%b %Y")

        app_count = db.query(Application).filter(
            Application.created_at >= start,
            Application.created_at <= end,
        ).count()
        doc_count = db.query(Document).filter(
            Document.upload_date >= start,
            Document.upload_date <= end,
            Document.is_active == True,
        ).count()
        approved_count = db.query(Application).filter(
            Application.updated_at >= start,
            Application.updated_at <= end,
            Application.status == "APPROVED",
        ).count()

        result.append({
            "month": month_label,
            "applications": app_count,
            "documents": doc_count,
            "approved": approved_count,
        })
    return result


@router.get("/recent-activity")
def get_recent_activity(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Recent audit log activity."""
    from app.db.models import AuditLog
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "action": l.action,
            "user_name": l.user.full_name if l.user else "System",
            "entity_type": l.entity_type,
            "result": l.result,
            "timestamp": l.timestamp,
        }
        for l in logs
    ]


@router.get("/alerts-summary")
def get_alerts_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(Alert).filter(Alert.is_resolved == False)
    if current_user.role in ("INSTITUTION_ADMIN", "INSTITUTE_USER") and current_user.institution_id:
        q = q.filter(Alert.institution_id == current_user.institution_id)
    alerts = q.order_by(Alert.created_at.desc()).limit(6).all()
    return [
        {
            "id": a.id,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "title": a.title,
            "message": a.message[:140] + "..." if len(a.message) > 140 else a.message,
            "created_at": a.created_at,
            "is_read": a.is_read,
        }
        for a in alerts
    ]


@router.get("/compliance-overview")
def get_compliance_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    results = db.query(ComplianceResult).all()
    compliant = sum(1 for r in results if r.status == "COMPLIANT")
    non_compliant = sum(1 for r in results if r.status == "NON_COMPLIANT")
    partial = sum(1 for r in results if r.status == "PARTIAL")
    pending = sum(1 for r in results if r.status == "PENDING")
    return [
        {"name": "Compliant", "value": compliant, "color": "#16a34a"},
        {"name": "Non-Compliant", "value": non_compliant, "color": "#dc2626"},
        {"name": "Partial", "value": partial, "color": "#d97706"},
        {"name": "Pending", "value": pending, "color": "#64748b"},
    ]


@router.get("/application-status-distribution")
def get_app_status_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(Application)
    if current_user.role in ("INSTITUTION_ADMIN", "INSTITUTE_USER") and current_user.institution_id:
        q = q.filter(Application.institution_id == current_user.institution_id)
    apps = q.all()
    statuses = {}
    for a in apps:
        statuses[a.status] = statuses.get(a.status, 0) + 1
    colors = {
        "DRAFT": "#64748b", "SUBMITTED": "#2563eb", "UNDER_REVIEW": "#d97706",
        "APPROVED": "#16a34a", "REJECTED": "#dc2626", "RETURNED": "#ea580c",
    }
    return [
        {"name": k, "value": v, "color": colors.get(k, "#64748b")}
        for k, v in statuses.items()
    ]


@router.get("/document-status-breakdown")
def get_doc_status_breakdown(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(Document).filter(Document.is_active == True)
    if current_user.role in ("INSTITUTION_ADMIN", "INSTITUTE_USER") and current_user.institution_id:
        q = q.filter(Document.institution_id == current_user.institution_id)
    docs = q.all()
    statuses = {}
    for d in docs:
        statuses[d.status] = statuses.get(d.status, 0) + 1
    return [{"status": k, "count": v} for k, v in statuses.items()]

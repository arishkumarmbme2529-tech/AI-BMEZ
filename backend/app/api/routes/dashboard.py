"""Dashboard analytics routes."""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.db.models import (
    Institution, Application, Document, Alert,
    ComplianceResult, AuthenticationResult, User
)
from app.core.security import get_current_active_user

router = APIRouter()


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Core dashboard statistics — all database-driven."""
    # Base queries scoped by role
    inst_q = db.query(Institution)
    app_q = db.query(Application)
    doc_q = db.query(Document).filter(Document.is_active == True)
    alert_q = db.query(Alert)

    if current_user.role == "INSTITUTION_ADMIN" and current_user.institution_id:
        iid = current_user.institution_id
        inst_q = inst_q.filter(Institution.id == iid)
        app_q = app_q.filter(Application.institution_id == iid)
        doc_q = doc_q.filter(Document.institution_id == iid)
        alert_q = alert_q.filter(Alert.institution_id == iid)

    total_institutions = inst_q.count()
    total_applications = app_q.count()
    total_documents = doc_q.count()
    verified_documents = doc_q.filter(Document.status == "VERIFIED").count()
    pending_applications = app_q.filter(
        Application.status.in_(["SUBMITTED", "UNDER_REVIEW"])
    ).count()
    now = datetime.utcnow()
    expired_documents = doc_q.filter(
        Document.expiry_date != None,
        Document.expiry_date < now,
    ).count()

    # Auth-related
    auth_results = db.query(AuthenticationResult)
    duplicate_documents = auth_results.filter(
        AuthenticationResult.status == "POTENTIAL_DUPLICATE"
    ).count()
    anomaly_alerts = alert_q.filter(Alert.is_resolved == False).count()

    # Compliance rate
    comp_results = db.query(ComplianceResult).all()
    total_comp = len(comp_results)
    compliant_comp = sum(1 for r in comp_results if r.status == "COMPLIANT")
    compliance_rate = round((compliant_comp / total_comp * 100) if total_comp > 0 else 0, 1)

    # Missing documents estimate: pending apps with 0 docs
    missing_count = 0
    for app in app_q.filter(Application.status.in_(["SUBMITTED", "UNDER_REVIEW", "DRAFT"])).all():
        if len(app.documents) == 0:
            missing_count += 1

    return {
        "total_institutions": total_institutions,
        "total_applications": total_applications,
        "total_documents": total_documents,
        "verified_documents": verified_documents,
        "pending_applications": pending_applications,
        "missing_documents": missing_count,
        "expired_documents": expired_documents,
        "duplicate_documents": duplicate_documents,
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
    if current_user.role == "INSTITUTION_ADMIN" and current_user.institution_id:
        q = q.filter(Alert.institution_id == current_user.institution_id)
    alerts = q.order_by(Alert.created_at.desc()).limit(5).all()
    return [
        {
            "id": a.id, "alert_type": a.alert_type, "severity": a.severity,
            "title": a.title, "message": a.message[:120] + "..." if len(a.message) > 120 else a.message,
            "created_at": a.created_at, "is_read": a.is_read,
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
        {"name": "Compliant", "value": compliant, "color": "#22c55e"},
        {"name": "Non-Compliant", "value": non_compliant, "color": "#ef4444"},
        {"name": "Partial", "value": partial, "color": "#f59e0b"},
        {"name": "Pending", "value": pending, "color": "#94a3b8"},
    ]


@router.get("/application-status-distribution")
def get_app_status_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(Application)
    if current_user.role == "INSTITUTION_ADMIN" and current_user.institution_id:
        q = q.filter(Application.institution_id == current_user.institution_id)
    apps = q.all()
    statuses = {}
    for a in apps:
        statuses[a.status] = statuses.get(a.status, 0) + 1
    colors = {
        "DRAFT": "#94a3b8", "SUBMITTED": "#3b82f6", "UNDER_REVIEW": "#f59e0b",
        "APPROVED": "#22c55e", "REJECTED": "#ef4444", "RETURNED": "#f97316",
    }
    return [
        {"name": k, "value": v, "color": colors.get(k, "#94a3b8")}
        for k, v in statuses.items()
    ]


@router.get("/document-status-breakdown")
def get_doc_status_breakdown(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(Document).filter(Document.is_active == True)
    if current_user.role == "INSTITUTION_ADMIN" and current_user.institution_id:
        q = q.filter(Document.institution_id == current_user.institution_id)
    docs = q.all()
    statuses = {}
    for d in docs:
        statuses[d.status] = statuses.get(d.status, 0) + 1
    return [{"status": k, "count": v} for k, v in statuses.items()]


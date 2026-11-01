"""Alerts & notifications routes."""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Alert, User, AuditLog
from app.core.security import get_current_active_user

router = APIRouter()


def _alert_dict(a: Alert):
    return {
        "id": a.id, "alert_type": a.alert_type, "severity": a.severity,
        "title": a.title, "message": a.message,
        "is_read": a.is_read, "is_resolved": a.is_resolved,
        "institution_id": a.institution_id,
        "application_id": a.application_id,
        "document_id": a.document_id,
        "created_at": a.created_at,
        "resolved_at": a.resolved_at,
    }


@router.get("")
def list_alerts(
    skip: int = 0, limit: int = 20,
    severity: Optional[str] = None,
    alert_type: Optional[str] = None,
    is_read: Optional[bool] = None,
    is_resolved: Optional[bool] = None,
    institution_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(Alert)
    if current_user.role == "INSTITUTION_ADMIN" and current_user.institution_id:
        q = q.filter(Alert.institution_id == current_user.institution_id)
    elif institution_id:
        q = q.filter(Alert.institution_id == institution_id)
    if severity:
        q = q.filter(Alert.severity == severity)
    if alert_type:
        q = q.filter(Alert.alert_type == alert_type)
    if is_read is not None:
        q = q.filter(Alert.is_read == is_read)
    if is_resolved is not None:
        q = q.filter(Alert.is_resolved == is_resolved)

    total = q.count()
    alerts = q.order_by(Alert.created_at.desc()).offset(skip).limit(limit).all()
    return {
        "items": [_alert_dict(a) for a in alerts],
        "total": total, "skip": skip, "limit": limit,
    }


@router.get("/summary")
def get_alerts_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(Alert)
    if current_user.role == "INSTITUTION_ADMIN" and current_user.institution_id:
        q = q.filter(Alert.institution_id == current_user.institution_id)
    all_alerts = q.all()
    return {
        "total": len(all_alerts),
        "unread": sum(1 for a in all_alerts if not a.is_read),
        "unresolved": sum(1 for a in all_alerts if not a.is_resolved),
        "critical": sum(1 for a in all_alerts if a.severity == "CRITICAL" and not a.is_resolved),
        "high": sum(1 for a in all_alerts if a.severity == "HIGH" and not a.is_resolved),
        "medium": sum(1 for a in all_alerts if a.severity == "MEDIUM" and not a.is_resolved),
    }


@router.put("/{alert_id}/read")
def mark_read(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_read = True
    db.commit()
    return {"message": "Marked as read"}


@router.put("/{alert_id}/resolve")
def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_resolved = True
    alert.is_read = True
    alert.resolved_at = datetime.utcnow()
    alert.resolved_by = current_user.id
    log = AuditLog(user_id=current_user.id, action="ALERT_RESOLVED",
                   entity_type="ALERT", entity_id=str(alert_id), result="SUCCESS")
    db.add(log)
    db.commit()
    return {"message": "Alert resolved"}


@router.post("")
def create_alert(
    alert_type: str, title: str, message: str, severity: str = "INFO",
    institution_id: Optional[int] = None,
    application_id: Optional[int] = None,
    document_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role not in ("SUPER_ADMIN", "OFFICER"):
        raise HTTPException(status_code=403, detail="Access denied")
    alert = Alert(
        alert_type=alert_type, title=title, message=message, severity=severity,
        institution_id=institution_id, application_id=application_id, document_id=document_id,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return _alert_dict(alert)


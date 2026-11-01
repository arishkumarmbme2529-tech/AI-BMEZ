"""Audit trail routes."""
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import AuditLog, User
from app.core.security import get_current_active_user, require_officer_or_above

router = APIRouter()


@router.get("/logs")
def get_audit_logs(
    skip: int = 0, limit: int = 50,
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    application_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_above),
):
    q = db.query(AuditLog)
    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    if action:
        q = q.filter(AuditLog.action.ilike(f"%{action}%"))
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if application_id:
        q = q.filter(AuditLog.application_id == application_id)
    total = q.count()
    logs = q.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    return {
        "items": [
            {
                "id": l.id,
                "user_id": l.user_id,
                "user_name": l.user.full_name if l.user else None,
                "action": l.action,
                "entity_type": l.entity_type,
                "entity_id": l.entity_id,
                "application_id": l.application_id,
                "document_id": l.document_id,
                "result": l.result,
                "evidence": l.evidence,
                "timestamp": l.timestamp,
            }
            for l in logs
        ],
        "total": total, "skip": skip, "limit": limit,
    }


@router.get("/actions")
def get_audit_action_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_above),
):
    from sqlalchemy import distinct
    actions = db.query(distinct(AuditLog.action)).all()
    return [a[0] for a in actions if a[0]]


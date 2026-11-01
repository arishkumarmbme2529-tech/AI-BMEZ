"""Users management routes."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User, AuditLog
from app.core.security import (
    get_current_active_user, require_super_admin, get_password_hash
)

router = APIRouter()


def _user_dict(u: User):
    return {
        "id": u.id, "email": u.email, "full_name": u.full_name,
        "role": u.role, "institution_id": u.institution_id,
        "is_active": u.is_active, "created_at": u.created_at,
        "last_login": u.last_login,
    }


@router.get("")
def list_users(
    skip: int = 0, limit: int = 20,
    role: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    if search:
        q = q.filter(User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%"))
    total = q.count()
    users = q.offset(skip).limit(limit).all()
    return {"items": [_user_dict(u) for u in users], "total": total, "skip": skip, "limit": limit}


@router.get("/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db),
             current_user: User = Depends(get_current_active_user)):
    if current_user.role not in ("SUPER_ADMIN", "OFFICER") and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_dict(user)


@router.post("")
def create_user(
    email: str, full_name: str, password: str, role: str,
    institution_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=email, full_name=full_name,
        hashed_password=get_password_hash(password),
        role=role, institution_id=institution_id, is_active=True,
    )
    db.add(user)
    log = AuditLog(user_id=current_user.id, action="USER_CREATED", entity_type="USER",
                   evidence={"email": email, "role": role}, result="SUCCESS")
    db.add(log)
    db.commit()
    db.refresh(user)
    return _user_dict(user)


@router.put("/{user_id}")
def update_user(
    user_id: int, full_name: Optional[str] = None,
    role: Optional[str] = None, is_active: Optional[bool] = None,
    institution_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role != "SUPER_ADMIN" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if full_name:
        user.full_name = full_name
    if role and current_user.role == "SUPER_ADMIN":
        user.role = role
    if is_active is not None and current_user.role == "SUPER_ADMIN":
        user.is_active = is_active
    if institution_id is not None and current_user.role == "SUPER_ADMIN":
        user.institution_id = institution_id
    log = AuditLog(user_id=current_user.id, action="USER_UPDATED", entity_type="USER",
                   entity_id=str(user_id), result="SUCCESS")
    db.add(log)
    db.commit()
    return _user_dict(user)


@router.delete("/{user_id}")
def delete_user(
    user_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    log = AuditLog(user_id=current_user.id, action="USER_DEACTIVATED", entity_type="USER",
                   entity_id=str(user_id), result="SUCCESS")
    db.add(log)
    db.commit()
    return {"message": "User deactivated"}


@router.get("/{user_id}/activity")
def get_user_activity(
    user_id: int, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role not in ("SUPER_ADMIN", "OFFICER") and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    logs = db.query(AuditLog).filter(AuditLog.user_id == user_id)\
              .order_by(AuditLog.timestamp.desc()).limit(50).all()
    return [{"id": l.id, "action": l.action, "entity_type": l.entity_type,
             "result": l.result, "timestamp": l.timestamp} for l in logs]


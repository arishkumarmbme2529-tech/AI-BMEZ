"""
Authentication service – login, register, token helpers.
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models import User, AuditLog
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def login_user(db: Session, email: str, password: str, ip_address: str = "", user_agent: str = "") -> dict:
    user = authenticate_user(db, email, password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account")

    # Update last login
    user.last_login = datetime.utcnow()

    # Audit log
    log = AuditLog(
        user_id=user.id,
        action="LOGIN",
        entity_type="USER",
        entity_id=str(user.id),
        result="SUCCESS",
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(log)
    db.commit()

    token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "full_name": user.full_name,
        "user_id": user.id,
        "institution_id": user.institution_id,
    }


def register_user(
    db: Session,
    email: str,
    password: str,
    full_name: str,
    role: str = "INSTITUTION_ADMIN",
    institution_id: Optional[int] = None,
) -> User:
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = get_password_hash(password)
    user = User(
        email=email,
        hashed_password=hashed,
        full_name=full_name,
        role=role,
        institution_id=institution_id,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

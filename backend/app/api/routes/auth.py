"""Auth routes: login, register, me, logout."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User, AuditLog
from app.core.security import (
    verify_password, get_password_hash, create_access_token, get_current_active_user
)
from app.schemas.auth import Token, LoginRequest, RegisterRequest, PasswordChangeRequest

router = APIRouter()


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is inactive")
    # Update last login
    user.last_login = datetime.utcnow()
    # Audit log
    log = AuditLog(user_id=user.id, action="USER_LOGIN", entity_type="USER",
                   entity_id=str(user.id), result="SUCCESS")
    db.add(log)
    db.commit()
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer",
            "role": user.role, "full_name": user.full_name,
            "user_id": user.id, "institution_id": user.institution_id}


@router.post("/login-json", response_model=Token)
def login_json(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is inactive")
    user.last_login = datetime.utcnow()
    log = AuditLog(user_id=user.id, action="USER_LOGIN", entity_type="USER",
                   entity_id=str(user.id), result="SUCCESS")
    db.add(log)
    db.commit()
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer",
            "role": user.role, "full_name": user.full_name,
            "user_id": user.id, "institution_id": user.institution_id}


@router.post("/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name,
        role="INSTITUTION_ADMIN",
        institution_id=data.institution_id,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "Registration successful", "user_id": user.id}


@router.get("/me")
def get_me(current_user: User = Depends(get_current_active_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "institution_id": current_user.institution_id,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at,
        "last_login": current_user.last_login,
    }


@router.post("/change-password")
def change_password(
    data: PasswordChangeRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = get_password_hash(data.new_password)
    log = AuditLog(user_id=current_user.id, action="PASSWORD_CHANGE", entity_type="USER",
                   entity_id=str(current_user.id), result="SUCCESS")
    db.add(log)
    db.commit()
    return {"message": "Password changed successfully"}


@router.post("/forgot-password")
def forgot_password(email: str, db: Session = Depends(get_db)):
    # For demo: just confirm if email exists
    user = db.query(User).filter(User.email == email).first()
    return {"message": "If that email is registered, a reset link would be sent. (Demo mode — no email sent)"}


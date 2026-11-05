"""Auth routes: login, register, me, logout."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.db.models import User, Institution, Application, ApplicationCategory, AuditLog
from app.core.security import (
    verify_password, get_password_hash, create_access_token, get_current_active_user
)
from app.schemas.auth import Token, LoginRequest, RegisterRequest, PasswordChangeRequest, validate_email_address

router = APIRouter()


def _authenticate(db: Session, email: str, password: str) -> User:
    cleaned_email = email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == cleaned_email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is inactive")
    user.last_login = datetime.utcnow()
    log = AuditLog(
        user_id=user.id,
        action="USER_LOGIN",
        entity_type="USER",
        entity_id=str(user.id),
        result="SUCCESS",
    )
    db.add(log)
    db.commit()
    return user


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = _authenticate(db, form_data.username, form_data.password)
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "full_name": user.full_name,
        "user_id": user.id,
        "institution_id": user.institution_id,
    }


@router.post("/login-json", response_model=Token)
def login_json(data: LoginRequest, db: Session = Depends(get_db)):
    user = _authenticate(db, data.email, data.password)
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "full_name": user.full_name,
        "user_id": user.id,
        "institution_id": user.institution_id,
    }


@router.post("/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    cleaned_email = validate_email_address(data.email)
    if db.query(User).filter(func.lower(User.email) == cleaned_email).first():
        raise HTTPException(status_code=400, detail="Email is already registered")
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    # Normalize role
    requested_role = (data.role or "INSTITUTION_ADMIN").upper()
    if requested_role in ("INSTITUTE", "INSTITUTE_USER", "INSTITUTION_ADMIN", "INSTITUTE_ADMIN"):
        role = "INSTITUTION_ADMIN"
    elif requested_role in ("REVIEWER", "OFFICER"):
        role = "OFFICER"
    else:
        role = "INSTITUTION_ADMIN"

    institution_id = data.institution_id
    if role == "INSTITUTION_ADMIN" and not institution_id:
        inst_name = (data.institution_name or f"{data.full_name} Institute of Technology").strip()
        inst_count = db.query(Institution).count() + 1
        aicte_id = (data.aicte_id or f"AICTE-INST-{datetime.utcnow().year}-{inst_count:03d}").strip()
        # Ensure unique aicte_id
        if db.query(Institution).filter(Institution.aicte_id == aicte_id).first():
            aicte_id = f"{aicte_id}-{inst_count}"
        new_inst = Institution(
            name=inst_name,
            aicte_id=aicte_id,
            institution_type=data.institution_type or "Engineering College",
            state=data.state or "Karnataka",
            district=data.district or "Bengaluru Urban",
            city=data.city or "Bengaluru",
            contact_person=data.full_name,
            email=cleaned_email,
            phone=data.phone or "",
            status="ACTIVE",
        )
        db.add(new_inst)
        db.flush()
        institution_id = new_inst.id

    user = User(
        email=cleaned_email,
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name.strip(),
        role=role,
        institution_id=institution_id,
        is_active=True,
        last_login=datetime.utcnow(),
    )
    db.add(user)
    db.flush()

    # Create an initial application for a newly registered institution so checklist works immediately
    if role == "INSTITUTION_ADMIN" and institution_id and not data.institution_id:
        first_cat = db.query(ApplicationCategory).first()
        if first_cat:
            app_count = db.query(Application).count() + 1
            init_app = Application(
                application_id=f"AICTE-{datetime.utcnow().year}-{first_cat.code}-{app_count:05d}",
                institution_id=institution_id,
                category_id=first_cat.id,
                title=f"Institutional Approval & Document Verification - {data.institution_name or user.full_name}",
                status="SUBMITTED",
                submitted_by=user.id,
                submitted_at=datetime.utcnow(),
            )
            db.add(init_app)

    log = AuditLog(
        user_id=user.id,
        action="USER_REGISTERED",
        entity_type="USER",
        entity_id=str(user.id),
        result="SUCCESS",
        evidence={"email": cleaned_email, "role": role, "institution_id": institution_id},
    )
    db.add(log)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "message": "Registration successful",
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "role": user.role,
        "full_name": user.full_name,
        "institution_id": user.institution_id,
    }


@router.get("/me")
def get_me(current_user: User = Depends(get_current_active_user)):
    inst_name = current_user.institution.name if current_user.institution else None
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "institution_id": current_user.institution_id,
        "institution_name": inst_name,
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
    log = AuditLog(
        user_id=current_user.id,
        action="PASSWORD_CHANGE",
        entity_type="USER",
        entity_id=str(current_user.id),
        result="SUCCESS",
    )
    db.add(log)
    db.commit()
    return {"message": "Password changed successfully"}


@router.post("/forgot-password")
def forgot_password(email: str, db: Session = Depends(get_db)):
    return {"message": "Password reset instructions have been logged for your account."}

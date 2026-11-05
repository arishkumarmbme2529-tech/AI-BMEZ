"""PDF report generation routes."""
import os
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import GeneratedReport, Application, User, AuditLog
from app.core.security import get_current_active_user
from app.services.report_service import generate_application_report

router = APIRouter()

REPORTS_DIR = "reports"


@router.post("/generate/{application_id}")
def generate_report(
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

    os.makedirs(REPORTS_DIR, exist_ok=True)
    filename = f"report_{app.application_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"
    file_path = os.path.join(REPORTS_DIR, filename)

    generate_application_report(app, file_path, db)

    report = GeneratedReport(
        application_id=application_id,
        institution_id=app.institution_id,
        report_type="APPLICATION_VALIDATION",
        generated_by=current_user.id,
        file_path=file_path,
    )
    db.add(report)
    log = AuditLog(
        user_id=current_user.id, action="REPORT_GENERATED",
        entity_type="APPLICATION", entity_id=str(application_id),
        application_id=application_id, result="SUCCESS",
        evidence={"filename": filename},
    )
    db.add(log)
    db.commit()
    db.refresh(report)
    return {
        "id": report.id,
        "filename": filename,
        "file_path": file_path,
        "created_at": report.created_at,
        "download_url": f"/reports-files/{filename}",
    }


@router.get("")
def list_reports(
    skip: int = 0, limit: int = 20,
    institution_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(GeneratedReport)
    if current_user.role == "INSTITUTION_ADMIN" and current_user.institution_id:
        q = q.filter(GeneratedReport.institution_id == current_user.institution_id)
    elif institution_id:
        q = q.filter(GeneratedReport.institution_id == institution_id)
    total = q.count()
    reports = q.order_by(GeneratedReport.created_at.desc()).offset(skip).limit(limit).all()
    return {
        "items": [
            {
                "id": r.id,
                "application_id": r.application_id,
                "report_type": r.report_type,
                "generated_by": r.generated_by,
                "generator_name": r.generator.full_name if r.generator else None,
                "created_at": r.created_at,
                "download_url": f"/reports-files/{os.path.basename(r.file_path)}",
            }
            for r in reports
        ],
        "total": total, "skip": skip, "limit": limit,
    }


@router.get("/{report_id}/download")
def download_report(
    report_id: int,
    db: Session = Depends(get_db),
):
    report = db.query(GeneratedReport).filter(GeneratedReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="Report file not found on disk")
    return FileResponse(
        report.file_path,
        filename=os.path.basename(report.file_path),
        media_type="application/pdf",
    )


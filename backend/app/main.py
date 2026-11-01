"""
AICTE Smart Document Management & Regulatory Compliance Platform
FastAPI Application Entry Point
SIH 2026 | Problem Statement 26261
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.db.database import engine, Base
from app.db.init_db import init_db
from app.db.database import SessionLocal

# Import all route modules
from app.api.routes import (
    auth, users, institutions, applications,
    documents, ocr, authentication, compliance,
    infrastructure, verification, alerts,
    audit, renewals, reports, dashboard
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Create all tables
    Base.metadata.create_all(bind=engine)
    # Ensure uploads directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs("reports", exist_ok=True)
    # Seed initial data
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered Smart Institute Document Management, Authentication and Regulatory Compliance Verification System — SIH 2026",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files
if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
if os.path.exists("reports"):
    app.mount("/reports-files", StaticFiles(directory="reports"), name="reports")

# Register all routers
PREFIX = "/api/v1"
app.include_router(auth.router,           prefix=PREFIX + "/auth",           tags=["Authentication"])
app.include_router(users.router,          prefix=PREFIX + "/users",          tags=["Users"])
app.include_router(institutions.router,   prefix=PREFIX + "/institutions",   tags=["Institutions"])
app.include_router(applications.router,   prefix=PREFIX + "/applications",   tags=["Applications"])
app.include_router(documents.router,      prefix=PREFIX + "/documents",      tags=["Documents"])
app.include_router(ocr.router,            prefix=PREFIX + "/ocr",            tags=["OCR"])
app.include_router(authentication.router, prefix=PREFIX + "/auth-engine",    tags=["Authentication Engine"])
app.include_router(compliance.router,     prefix=PREFIX + "/compliance",     tags=["Compliance"])
app.include_router(infrastructure.router, prefix=PREFIX + "/infrastructure", tags=["Infrastructure"])
app.include_router(verification.router,   prefix=PREFIX + "/verification",   tags=["Verification"])
app.include_router(alerts.router,         prefix=PREFIX + "/alerts",         tags=["Alerts"])
app.include_router(audit.router,          prefix=PREFIX + "/audit",          tags=["Audit"])
app.include_router(renewals.router,       prefix=PREFIX + "/renewals",       tags=["Renewals"])
app.include_router(reports.router,        prefix=PREFIX + "/reports",        tags=["Reports"])
app.include_router(dashboard.router,      prefix=PREFIX + "/dashboard",      tags=["Dashboard"])


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "AICTE Smart Document Management Platform API",
        "docs": "/docs",
        "version": settings.APP_VERSION,
    }


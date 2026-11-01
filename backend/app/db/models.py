"""
SQLAlchemy 2.0-style ORM models for the AICTE Document Management Platform.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    JSON,
    BigInteger,
)
from sqlalchemy.orm import relationship

from app.db.database import Base


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    # SUPER_ADMIN | OFFICER | INSTITUTION_ADMIN
    role = Column(String(50), nullable=False, default="INSTITUTION_ADMIN")
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    # Relationships
    institution = relationship("Institution", back_populates="users", foreign_keys=[institution_id])
    uploaded_documents = relationship("Document", back_populates="uploader", foreign_keys="Document.uploaded_by")
    submitted_applications = relationship("Application", back_populates="submitter", foreign_keys="Application.submitted_by")
    reviewed_applications = relationship("Application", back_populates="reviewer", foreign_keys="Application.reviewer_id")
    audit_logs = relationship("AuditLog", back_populates="user", foreign_keys="AuditLog.user_id")
    ocr_corrections = relationship("OCRResult", back_populates="corrector", foreign_keys="OCRResult.corrected_by")
    auth_reviews = relationship("AuthenticationResult", back_populates="reviewer", foreign_keys="AuthenticationResult.reviewed_by")
    alert_resolutions = relationship("Alert", back_populates="resolver", foreign_keys="Alert.resolved_by")
    generated_reports = relationship("GeneratedReport", back_populates="generator")


# ---------------------------------------------------------------------------
# Institution
# ---------------------------------------------------------------------------

class Institution(Base):
    __tablename__ = "institutions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(500), nullable=False)
    aicte_id = Column(String(100), unique=True, index=True, nullable=False)
    institution_type = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    state = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    pincode = Column(String(10), nullable=True)
    establishment_year = Column(Integer, nullable=True)
    contact_person = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    # ACTIVE | PENDING | SUSPENDED
    status = Column(String(50), default="PENDING")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    users = relationship("User", back_populates="institution", foreign_keys="User.institution_id")
    applications = relationship("Application", back_populates="institution")
    documents = relationship("Document", back_populates="institution")
    infrastructure_evidences = relationship("InfrastructureEvidence", back_populates="institution")
    renewal_records = relationship("RenewalRecord", back_populates="institution")
    alerts = relationship("Alert", back_populates="institution", foreign_keys="Alert.institution_id")
    generated_reports = relationship("GeneratedReport", back_populates="institution")


# ---------------------------------------------------------------------------
# ApplicationCategory
# ---------------------------------------------------------------------------

class ApplicationCategory(Base):
    __tablename__ = "application_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    # Relationships
    applications = relationship("Application", back_populates="category")
    compliance_rules = relationship("ComplianceRule", back_populates="category")


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(String(50), unique=True, index=True, nullable=False)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("application_categories.id"), nullable=False)
    title = Column(String(500), nullable=False)
    # DRAFT | SUBMITTED | UNDER_REVIEW | APPROVED | REJECTED | RETURNED
    status = Column(String(50), default="DRAFT")
    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    submitted_at = Column(DateTime, nullable=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_notes = Column(Text, nullable=True)

    # Relationships
    institution = relationship("Institution", back_populates="applications")
    category = relationship("ApplicationCategory", back_populates="applications")
    submitter = relationship("User", back_populates="submitted_applications", foreign_keys=[submitted_by])
    reviewer = relationship("User", back_populates="reviewed_applications", foreign_keys=[reviewer_id])
    documents = relationship("Document", back_populates="application")
    compliance_results = relationship("ComplianceResult", back_populates="application")
    infrastructure_evidences = relationship("InfrastructureEvidence", back_populates="application")
    alerts = relationship("Alert", back_populates="application", foreign_keys="Alert.application_id")
    audit_logs = relationship("AuditLog", back_populates="application", foreign_keys="AuditLog.application_id")
    generated_reports = relationship("GeneratedReport", back_populates="application")
    authentication_results = relationship("AuthenticationResult", back_populates="application", foreign_keys="AuthenticationResult.application_id")


# ---------------------------------------------------------------------------
# DocumentType
# ---------------------------------------------------------------------------

class DocumentType(Base):
    __tablename__ = "document_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    is_required = Column(Boolean, default=True)

    # Relationships
    documents = relationship("Document", back_populates="document_type")


# ---------------------------------------------------------------------------
# Document
# ---------------------------------------------------------------------------

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False)
    document_type_id = Column(Integer, ForeignKey("document_types.id"), nullable=False)
    original_filename = Column(String(500), nullable=False)
    stored_filename = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    file_size = Column(BigInteger, nullable=True)
    mime_type = Column(String(100), nullable=True)
    sha256_hash = Column(String(64), nullable=True, index=True)
    upload_date = Column(DateTime, default=datetime.utcnow)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    # PENDING | PROCESSING | VERIFIED | REJECTED | EXPIRED
    status = Column(String(50), default="PENDING")
    is_active = Column(Boolean, default=True)
    expiry_date = Column(DateTime, nullable=True)

    # Relationships
    application = relationship("Application", back_populates="documents")
    institution = relationship("Institution", back_populates="documents")
    document_type = relationship("DocumentType", back_populates="documents")
    uploader = relationship("User", back_populates="uploaded_documents", foreign_keys=[uploaded_by])
    ocr_results = relationship("OCRResult", back_populates="document")
    document_hash = relationship("DocumentHash", back_populates="document", uselist=False)
    authentication_results = relationship("AuthenticationResult", back_populates="document", foreign_keys="AuthenticationResult.document_id")
    verification_requests = relationship("VerificationRequest", back_populates="document")
    alerts = relationship("Alert", back_populates="document", foreign_keys="Alert.document_id")
    audit_logs = relationship("AuditLog", back_populates="document", foreign_keys="AuditLog.document_id")
    renewal_records = relationship("RenewalRecord", back_populates="document", foreign_keys="RenewalRecord.document_id")
    infrastructure_evidences = relationship("InfrastructureEvidence", back_populates="document")


# ---------------------------------------------------------------------------
# OCRResult
# ---------------------------------------------------------------------------

class OCRResult(Base):
    __tablename__ = "ocr_results"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    extracted_text = Column(Text, nullable=True)
    structured_data = Column(JSON, nullable=True)
    institution_name_extracted = Column(String(500), nullable=True)
    cert_number_extracted = Column(String(200), nullable=True)
    issue_date_extracted = Column(String(100), nullable=True)
    expiry_date_extracted = Column(String(100), nullable=True)
    issuing_authority_extracted = Column(String(500), nullable=True)
    confidence_score = Column(Float, nullable=True)
    ocr_engine = Column(String(100), nullable=True)
    processed_at = Column(DateTime, default=datetime.utcnow)
    corrections = Column(JSON, nullable=True)
    corrected_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    document = relationship("Document", back_populates="ocr_results")
    corrector = relationship("User", back_populates="ocr_corrections", foreign_keys=[corrected_by])


# ---------------------------------------------------------------------------
# DocumentHash
# ---------------------------------------------------------------------------

class DocumentHash(Base):
    __tablename__ = "document_hashes"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), unique=True, nullable=False)
    sha256_hash = Column(String(64), nullable=True, index=True)
    perceptual_hash = Column(String(64), nullable=True)
    file_size = Column(BigInteger, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    document = relationship("Document", back_populates="document_hash")


# ---------------------------------------------------------------------------
# AuthenticationResult
# ---------------------------------------------------------------------------

class AuthenticationResult(Base):
    __tablename__ = "authentication_results"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=True)
    # NO_ANOMALY | POTENTIAL_DUPLICATE | SUSPICIOUS | MISMATCH | PENDING | MANUAL_REVIEW
    status = Column(String(50), default="PENDING")
    duplicate_document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    similarity_score = Column(Float, nullable=True)
    anomaly_findings = Column(JSON, nullable=True)
    metadata_analysis = Column(JSON, nullable=True)
    explanation = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=True)
    analyzed_at = Column(DateTime, default=datetime.utcnow)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_notes = Column(Text, nullable=True)

    # Relationships
    document = relationship("Document", back_populates="authentication_results", foreign_keys=[document_id])
    duplicate_document = relationship("Document", foreign_keys=[duplicate_document_id])
    application = relationship("Application", back_populates="authentication_results", foreign_keys=[application_id])
    reviewer = relationship("User", back_populates="auth_reviews", foreign_keys=[reviewed_by])


# ---------------------------------------------------------------------------
# ComplianceRule
# ---------------------------------------------------------------------------

class ComplianceRule(Base):
    __tablename__ = "compliance_rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(String(50), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    category_id = Column(Integer, ForeignKey("application_categories.id"), nullable=True)
    description = Column(Text, nullable=True)
    requirement = Column(Text, nullable=True)
    validation_type = Column(String(100), nullable=True)
    # CRITICAL | HIGH | MEDIUM | LOW
    severity = Column(String(50), default="MEDIUM")
    is_active = Column(Boolean, default=True)
    version = Column(String(20), default="1.0")
    is_sample = Column(Boolean, default=False)

    # Relationships
    category = relationship("ApplicationCategory", back_populates="compliance_rules")
    compliance_results = relationship("ComplianceResult", back_populates="rule")


# ---------------------------------------------------------------------------
# ComplianceResult
# ---------------------------------------------------------------------------

class ComplianceResult(Base):
    __tablename__ = "compliance_results"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    rule_id = Column(Integer, ForeignKey("compliance_rules.id"), nullable=False)
    # COMPLIANT | PARTIAL | NON_COMPLIANT | PENDING
    status = Column(String(50), default="PENDING")
    evidence = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    checked_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    application = relationship("Application", back_populates="compliance_results")
    rule = relationship("ComplianceRule", back_populates="compliance_results")


# ---------------------------------------------------------------------------
# InfrastructureEvidence
# ---------------------------------------------------------------------------

class InfrastructureEvidence(Base):
    __tablename__ = "infrastructure_evidences"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False)
    # BUILDING | CLASSROOM | LAB | LIBRARY | EQUIPMENT | FLOORPLAN | OTHER
    category = Column(String(50), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    ai_observations = Column(JSON, nullable=True)
    quality_score = Column(Float, nullable=True)
    # PENDING | REVIEWED | APPROVED | REJECTED
    status = Column(String(50), default="PENDING")
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)

    # Relationships
    application = relationship("Application", back_populates="infrastructure_evidences")
    institution = relationship("Institution", back_populates="infrastructure_evidences")
    document = relationship("Document", back_populates="infrastructure_evidences")


# ---------------------------------------------------------------------------
# VerificationRequest
# ---------------------------------------------------------------------------

class VerificationRequest(Base):
    __tablename__ = "verification_requests"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    verification_type = Column(String(100), nullable=False)
    external_ref = Column(String(255), nullable=True)
    request_payload = Column(JSON, nullable=True)
    response_payload = Column(JSON, nullable=True)
    # PENDING | VERIFIED | MISMATCH | EXPIRED | UNAVAILABLE | MANUAL_REVIEW
    status = Column(String(50), default="PENDING")
    requested_at = Column(DateTime, default=datetime.utcnow)
    responded_at = Column(DateTime, nullable=True)
    source = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships
    document = relationship("Document", back_populates="verification_requests")


# ---------------------------------------------------------------------------
# Alert
# ---------------------------------------------------------------------------

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    alert_type = Column(String(100), nullable=False)
    # CRITICAL | HIGH | MEDIUM | LOW | INFO
    severity = Column(String(50), default="INFO")
    title = Column(String(500), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    institution = relationship("Institution", back_populates="alerts", foreign_keys=[institution_id])
    application = relationship("Application", back_populates="alerts", foreign_keys=[application_id])
    document = relationship("Document", back_populates="alerts", foreign_keys=[document_id])
    resolver = relationship("User", back_populates="alert_resolutions", foreign_keys=[resolved_by])


# ---------------------------------------------------------------------------
# AuditLog
# ---------------------------------------------------------------------------

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(255), nullable=False)
    entity_type = Column(String(100), nullable=True)
    entity_id = Column(String(100), nullable=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    result = Column(String(50), nullable=True)
    evidence = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="audit_logs", foreign_keys=[user_id])
    application = relationship("Application", back_populates="audit_logs", foreign_keys=[application_id])
    document = relationship("Document", back_populates="audit_logs", foreign_keys=[document_id])


# ---------------------------------------------------------------------------
# RenewalRecord
# ---------------------------------------------------------------------------

class RenewalRecord(Base):
    __tablename__ = "renewal_records"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False)
    renewal_due_date = Column(DateTime, nullable=False)
    reminder_90_sent = Column(Boolean, default=False)
    reminder_60_sent = Column(Boolean, default=False)
    reminder_30_sent = Column(Boolean, default=False)
    reminder_7_sent = Column(Boolean, default=False)
    # ACTIVE | RENEWED | EXPIRED | CANCELLED
    status = Column(String(50), default="ACTIVE")
    renewed_document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    document = relationship("Document", back_populates="renewal_records", foreign_keys=[document_id])
    renewed_document = relationship("Document", foreign_keys=[renewed_document_id])
    institution = relationship("Institution", back_populates="renewal_records")


# ---------------------------------------------------------------------------
# GeneratedReport
# ---------------------------------------------------------------------------

class GeneratedReport(Base):
    __tablename__ = "generated_reports"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=True)
    report_type = Column(String(100), nullable=False)
    generated_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_path = Column(String(1000), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    application = relationship("Application", back_populates="generated_reports")
    institution = relationship("Institution", back_populates="generated_reports")
    generator = relationship("User", back_populates="generated_reports")

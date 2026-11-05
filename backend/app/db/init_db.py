"""
Database seeding — creates default users, institutions, categories, rules, and sample data.
Ensures demo accounts (admin@aibmez.demo, institute@aibmez.demo, reviewer@aibmez.demo)
are always seeded and active even on existing databases.
"""
import os
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.security import get_password_hash
from app.db.models import (
    User, Institution, ApplicationCategory, DocumentType,
    Application, ComplianceRule, ComplianceResult, AuthenticationResult,
    OCRResult, DocumentHash, Alert, AuditLog, Document, RenewalRecord
)


def _ensure_user(
    db: Session,
    email: str,
    password: str,
    full_name: str,
    role: str,
    institution_id: int = None,
) -> User:
    cleaned = email.strip().lower()
    existing = db.query(User).filter(func.lower(User.email) == cleaned).first()
    if existing:
        existing.hashed_password = get_password_hash(password)
        existing.role = role
        existing.is_active = True
        if institution_id and not existing.institution_id:
            existing.institution_id = institution_id
        db.flush()
        return existing

    user = User(
        email=cleaned,
        hashed_password=get_password_hash(password),
        full_name=full_name,
        role=role,
        institution_id=institution_id,
        is_active=True,
    )
    db.add(user)
    db.flush()
    return user


def init_db(db: Session) -> None:
    already_seeded = db.query(Institution).first() is not None

    if not already_seeded:
        print("Seeding initial institutional verification data...")

        # ── Institutions ────────────────────────────────────────────────
        inst1 = Institution(
            name="Demonstration Institute of Technology",
            aicte_id="AICTE-DIT-2024-001",
            institution_type="Engineering College",
            address="123 Tech Park, Electronic City",
            state="Karnataka",
            district="Bengaluru Urban",
            city="Bengaluru",
            pincode="560100",
            establishment_year=2005,
            contact_person="Dr. Rajesh Kumar",
            email="institute@aibmez.demo",
            phone="9876543210",
            status="ACTIVE",
        )
        inst2 = Institution(
            name="Sample Polytechnic Institute",
            aicte_id="AICTE-SPI-2024-002",
            institution_type="Polytechnic",
            address="456 Education Road, Sector 15",
            state="Maharashtra",
            district="Pune",
            city="Pune",
            pincode="411001",
            establishment_year=2010,
            contact_person="Prof. Meera Sharma",
            email="registrar@sample-poly.edu.in",
            phone="9123456789",
            status="PENDING",
        )
        inst3 = Institution(
            name="Model Engineering College",
            aicte_id="AICTE-MEC-2024-003",
            institution_type="Engineering College",
            address="789 College Avenue, Anna Nagar",
            state="Tamil Nadu",
            district="Chennai",
            city="Chennai",
            pincode="600040",
            establishment_year=1998,
            contact_person="Dr. Priya Venkat",
            email="principal@model-ec.edu.in",
            phone="9988776655",
            status="ACTIVE",
        )
        db.add_all([inst1, inst2, inst3])
        db.flush()
    else:
        inst1 = db.query(Institution).order_by(Institution.id.asc()).first()
        inst2 = db.query(Institution).order_by(Institution.id.asc()).offset(1).first() or inst1
        inst3 = db.query(Institution).order_by(Institution.id.asc()).offset(2).first() or inst1

    # ── Primary Demo Accounts (Always Ensured) ──────────────────────
    admin_demo = _ensure_user(
        db,
        email="admin@aibmez.demo",
        password="Admin@123",
        full_name="System Administrator",
        role="SUPER_ADMIN",
    )
    inst_demo = _ensure_user(
        db,
        email="institute@aibmez.demo",
        password="Institute@123",
        full_name="Dr. Rajesh Kumar (Institute Nodal Officer)",
        role="INSTITUTION_ADMIN",
        institution_id=inst1.id if inst1 else None,
    )
    reviewer_demo = _ensure_user(
        db,
        email="reviewer@aibmez.demo",
        password="Reviewer@123",
        full_name="Dr. Anand Verma (Document Reviewer)",
        role="OFFICER",
    )

    # Keep legacy demo credentials working as well
    _ensure_user(db, "admin@aicte.gov.in", "Admin@123456", "AICTE System Administrator", "SUPER_ADMIN")
    _ensure_user(db, "officer@aicte.gov.in", "Officer@123456", "Dr. Anand Verification Officer", "OFFICER")
    _ensure_user(
        db,
        "institute@demo.edu.in",
        "Institute@123456",
        "Dr. Rajesh Kumar",
        "INSTITUTION_ADMIN",
        institution_id=inst1.id if inst1 else None,
    )

    if already_seeded:
        db.commit()
        return

    # ── Application Categories ───────────────────────────────────────
    cats = [
        ApplicationCategory(name="New Institution Approval", code="NIA", description="Application for approval of a new technical institution", is_active=True),
        ApplicationCategory(name="Extension of Approval (EOA)", code="EOA", description="Annual Extension of Approval for existing institutions", is_active=True),
        ApplicationCategory(name="Course Addition", code="CA", description="Application for adding new courses/programmes", is_active=True),
        ApplicationCategory(name="Intake Modification", code="IM", description="Application for increase or decrease of student intake", is_active=True),
        ApplicationCategory(name="Institution Details Modification", code="IDM", description="Application to modify institutional details, address, or contact information", is_active=True),
        ApplicationCategory(name="Infrastructure Upgrade", code="IU", description="Application for infrastructure upgrade or expansion", is_active=True),
    ]
    db.add_all(cats)
    db.flush()

    # ── Document Types ───────────────────────────────────────────────
    doc_types = [
        DocumentType(name="Affidavit", code="AFF", description="Mandatory affidavit from institution head", is_required=True),
        DocumentType(name="Undertaking", code="UND", description="Institutional undertaking document", is_required=True),
        DocumentType(name="Accreditation Certificate", code="ACC", description="NAAC/NBA/NIRF accreditation certificate", is_required=False),
        DocumentType(name="No Objection Certificate (NOC)", code="NOC", description="NOC from State Government or local authority", is_required=True),
        DocumentType(name="Permission Certificate", code="PERM", description="Permission certificate from competent authority", is_required=True),
        DocumentType(name="Previous Approval Letter", code="PAL", description="Approval letter from previous academic cycle", is_required=False),
        DocumentType(name="Faculty Records", code="FAC", description="Faculty list with qualifications and experience", is_required=True),
        DocumentType(name="Course Details", code="COURS", description="Detailed course curriculum and syllabus", is_required=True),
        DocumentType(name="Infrastructure Certificate", code="INFRA", description="Infrastructure adequacy certificate", is_required=True),
        DocumentType(name="Payment Evidence", code="PAY", description="Scrutiny fee payment receipt", is_required=True),
        DocumentType(name="Floor Plan", code="FLOOR", description="Building floor plan and layout", is_required=False),
        DocumentType(name="Land Certificate", code="LAND", description="Land ownership or lease certificate", is_required=True),
    ]
    db.add_all(doc_types)
    db.flush()

    # ── Sample Applications ──────────────────────────────────────────
    apps = [
        Application(
            application_id="AICTE-2026-NIA-00001",
            institution_id=inst1.id,
            category_id=cats[0].id,
            title="New Institution Approval - Demonstration Institute of Technology",
            status="UNDER_REVIEW",
            submitted_by=inst_demo.id,
            submitted_at=datetime.utcnow() - timedelta(days=15),
            reviewer_id=reviewer_demo.id,
            review_notes="OCR and SHA-256 verification completed. Please upload missing Land Certificate and resolve duplicate affidavit.",
        ),
        Application(
            application_id="AICTE-2026-EOA-00002",
            institution_id=inst1.id,
            category_id=cats[1].id,
            title="Extension of Approval 2026-27 - Demonstration Institute of Technology",
            status="SUBMITTED",
            submitted_by=inst_demo.id,
            submitted_at=datetime.utcnow() - timedelta(days=5),
            reviewer_id=reviewer_demo.id,
        ),
        Application(
            application_id="AICTE-2026-CA-00003",
            institution_id=inst2.id,
            category_id=cats[2].id,
            title="Course Addition - B.Tech Data Science - Sample Polytechnic Institute",
            status="UNDER_REVIEW",
            submitted_by=admin_demo.id,
            submitted_at=datetime.utcnow() - timedelta(days=8),
            reviewer_id=reviewer_demo.id,
        ),
        Application(
            application_id="AICTE-2026-IM-00004",
            institution_id=inst3.id,
            category_id=cats[3].id,
            title="Intake Modification - Increase CSE Intake - Model Engineering College",
            status="APPROVED",
            submitted_by=admin_demo.id,
            submitted_at=datetime.utcnow() - timedelta(days=45),
            reviewer_id=reviewer_demo.id,
            review_notes="All mandatory documents verified and compliant.",
        ),
        Application(
            application_id="AICTE-2026-EOA-00005",
            institution_id=inst3.id,
            category_id=cats[1].id,
            title="Extension of Approval 2026-27 - Model Engineering College",
            status="RETURNED",
            submitted_by=admin_demo.id,
            submitted_at=datetime.utcnow() - timedelta(days=20),
            reviewer_id=reviewer_demo.id,
            review_notes="Please resubmit with updated faculty records and renewed NOC certificate.",
        ),
    ]
    db.add_all(apps)
    db.flush()

    # ── Compliance Rules ─────────────────────────────────────────────
    rules = [
        ComplianceRule(
            rule_id="RULE-001",
            name="Mandatory Affidavit Required",
            category_id=None,
            description="Every application must include a duly signed and notarized affidavit from the institution head.",
            requirement="Upload signed affidavit document",
            validation_type="DOCUMENT_PRESENT",
            severity="CRITICAL",
            is_active=True,
            version="1.0",
            is_sample=False,
        ),
        ComplianceRule(
            rule_id="RULE-002",
            name="Valid State Government NOC",
            category_id=cats[0].id,
            description="New institution applications must include a valid NOC from the State Government.",
            requirement="Upload valid State Government NOC",
            validation_type="DOCUMENT_PRESENT",
            severity="CRITICAL",
            is_active=True,
            version="1.0",
            is_sample=False,
        ),
        ComplianceRule(
            rule_id="RULE-003",
            name="Faculty Strength Compliance",
            category_id=None,
            description="Institution must maintain minimum required faculty strength as per regulatory norms.",
            requirement="Faculty records must show minimum faculty-student ratio",
            validation_type="FIELD_CHECK",
            severity="HIGH",
            is_active=True,
            version="1.0",
            is_sample=False,
        ),
        ComplianceRule(
            rule_id="RULE-004",
            name="Scrutiny Fee Payment Evidence",
            category_id=None,
            description="Application must be accompanied by scrutiny fee payment receipt.",
            requirement="Upload payment receipt for scrutiny fee",
            validation_type="DOCUMENT_PRESENT",
            severity="HIGH",
            is_active=True,
            version="1.0",
            is_sample=False,
        ),
        ComplianceRule(
            rule_id="RULE-005",
            name="Infrastructure Adequacy Certificate",
            category_id=None,
            description="Valid structural and infrastructure adequacy certificate must be submitted.",
            requirement="Upload infrastructure certificate from competent authority",
            validation_type="DOCUMENT_PRESENT",
            severity="HIGH",
            is_active=True,
            version="1.0",
            is_sample=False,
        ),
        ComplianceRule(
            rule_id="RULE-006",
            name="Document Expiry Validation",
            category_id=None,
            description="All submitted documents must be within their valid date range.",
            requirement="No expired documents in submission",
            validation_type="EXPIRY_CHECK",
            severity="CRITICAL",
            is_active=True,
            version="1.0",
            is_sample=False,
        ),
        ComplianceRule(
            rule_id="RULE-007",
            name="Land Ownership / Lease Certificate",
            category_id=cats[0].id,
            description="New institution applications must include land ownership or registered lease deed.",
            requirement="Upload land certificate",
            validation_type="DOCUMENT_PRESENT",
            severity="CRITICAL",
            is_active=True,
            version="1.0",
            is_sample=False,
        ),
    ]
    db.add_all(rules)
    db.flush()

    # ── Sample Documents Covering All Statuses ──────────────────────
    os.makedirs("uploads", exist_ok=True)
    sample_pdf_bytes = (
        b"%PDF-1.4\n%AI-BMEZ Institutional Verification Document\n"
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj "
        b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj "
        b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj\n"
        b"xref\n0 4\ntrailer<</Size 4/Root 1 0 R>>\n%%EOF"
    )
    sample_files = [
        "demo_affidavit.pdf",
        "demo_noc_certificate.pdf",
        "demo_infra_certificate.pdf",
        "demo_duplicate_affidavit.pdf",
        "demo_suspicious_faculty.pdf",
        "demo_expired_fire_noc.pdf",
    ]
    for fname in sample_files:
        fpath = os.path.join("uploads", fname)
        if not os.path.exists(fpath):
            with open(fpath, "wb") as f:
                f.write(sample_pdf_bytes)

    doc1 = Document(
        application_id=apps[0].id,
        institution_id=inst1.id,
        document_type_id=doc_types[0].id,
        original_filename="Notarized_Affidavit_DIT_2026.pdf",
        stored_filename="demo_affidavit.pdf",
        file_path=os.path.join("uploads", "demo_affidavit.pdf"),
        file_size=len(sample_pdf_bytes),
        mime_type="application/pdf",
        sha256_hash="a8f5c2d9e1b304958273645192837465a8f5c2d9e1b304958273645192837465",
        uploaded_by=inst_demo.id,
        status="VERIFIED",
        expiry_date=datetime.utcnow() + timedelta(days=365),
    )
    doc2 = Document(
        application_id=apps[0].id,
        institution_id=inst1.id,
        document_type_id=doc_types[3].id,
        original_filename="State_Govt_NOC_Karnataka_2026.pdf",
        stored_filename="demo_noc_certificate.pdf",
        file_path=os.path.join("uploads", "demo_noc_certificate.pdf"),
        file_size=len(sample_pdf_bytes),
        mime_type="application/pdf",
        sha256_hash="b7e4d1c8f2a405968374655293847566b7e4d1c8f2a405968374655293847566",
        uploaded_by=inst_demo.id,
        status="VERIFIED",
        expiry_date=datetime.utcnow() + timedelta(days=24),
    )
    doc3 = Document(
        application_id=apps[1].id,
        institution_id=inst1.id,
        document_type_id=doc_types[8].id,
        original_filename="Infrastructure_Adequacy_Cert_DIT.pdf",
        stored_filename="demo_infra_certificate.pdf",
        file_path=os.path.join("uploads", "demo_infra_certificate.pdf"),
        file_size=len(sample_pdf_bytes),
        mime_type="application/pdf",
        sha256_hash="c9d3e2b7a1f506978475665394857667c9d3e2b7a1f506978475665394857667",
        uploaded_by=inst_demo.id,
        status="PENDING",
        expiry_date=datetime.utcnow() + timedelta(days=55),
    )
    doc4 = Document(
        application_id=apps[0].id,
        institution_id=inst1.id,
        document_type_id=doc_types[0].id,
        original_filename="Duplicate_Copy_Affidavit_DIT.pdf",
        stored_filename="demo_duplicate_affidavit.pdf",
        file_path=os.path.join("uploads", "demo_duplicate_affidavit.pdf"),
        file_size=len(sample_pdf_bytes),
        mime_type="application/pdf",
        sha256_hash="a8f5c2d9e1b304958273645192837465a8f5c2d9e1b304958273645192837465",
        uploaded_by=inst_demo.id,
        status="DUPLICATE",
        expiry_date=datetime.utcnow() + timedelta(days=365),
    )
    doc5 = Document(
        application_id=apps[0].id,
        institution_id=inst1.id,
        document_type_id=doc_types[6].id,
        original_filename="Faculty_Strength_Register_Scan.pdf",
        stored_filename="demo_suspicious_faculty.pdf",
        file_path=os.path.join("uploads", "demo_suspicious_faculty.pdf"),
        file_size=len(sample_pdf_bytes),
        mime_type="application/pdf",
        sha256_hash="d4e8f1a2c3b507988576675495867768d4e8f1a2c3b507988576675495867768",
        uploaded_by=inst_demo.id,
        status="SUSPICIOUS",
        expiry_date=datetime.utcnow() + timedelta(days=180),
    )
    doc6 = Document(
        application_id=apps[0].id,
        institution_id=inst1.id,
        document_type_id=doc_types[4].id,
        original_filename="Fire_Safety_Permission_2025.pdf",
        stored_filename="demo_expired_fire_noc.pdf",
        file_path=os.path.join("uploads", "demo_expired_fire_noc.pdf"),
        file_size=len(sample_pdf_bytes),
        mime_type="application/pdf",
        sha256_hash="e5f9a2b3d4c608999687786506978879e5f9a2b3d4c608999687786506978879",
        uploaded_by=inst_demo.id,
        status="EXPIRED",
        expiry_date=datetime.utcnow() - timedelta(days=35),
    )
    db.add_all([doc1, doc2, doc3, doc4, doc5, doc6])
    db.flush()

    db.add_all([
        DocumentHash(document_id=doc1.id, sha256_hash=doc1.sha256_hash, file_size=doc1.file_size),
        DocumentHash(document_id=doc2.id, sha256_hash=doc2.sha256_hash, file_size=doc2.file_size),
        DocumentHash(document_id=doc3.id, sha256_hash=doc3.sha256_hash, file_size=doc3.file_size),
        DocumentHash(document_id=doc4.id, sha256_hash=doc4.sha256_hash, file_size=doc4.file_size),
        DocumentHash(document_id=doc5.id, sha256_hash=doc5.sha256_hash, file_size=doc5.file_size),
        DocumentHash(document_id=doc6.id, sha256_hash=doc6.sha256_hash, file_size=doc6.file_size),
    ])

    db.add_all([
        OCRResult(
            document_id=doc1.id,
            extracted_text="AFFIDAVIT OF INSTITUTIONAL HEAD\nName of Institution: Demonstration Institute of Technology\nCertificate Number: AFF-KA-2026-0091\nDate of Issue: 10/01/2026\nValid Till: 10/01/2027\nIssued By: Notary Public, Bengaluru Urban",
            structured_data={"verified": True},
            institution_name_extracted="Demonstration Institute of Technology",
            cert_number_extracted="AFF-KA-2026-0091",
            issue_date_extracted="10/01/2026",
            expiry_date_extracted="10/01/2027",
            issuing_authority_extracted="Notary Public, Bengaluru Urban",
            confidence_score=0.94,
            ocr_engine="pymupdf+tesseract",
        ),
        OCRResult(
            document_id=doc2.id,
            extracted_text="STATE GOVERNMENT NO OBJECTION CERTIFICATE\nName of Institution: Demonstration Institute of Technology\nCertificate Number: NOC-GOV-KA-2026-4412\nDate of Issue: 15/02/2026\nValid Till: 25/11/2026\nIssued By: Department of Higher Education, Karnataka",
            structured_data={"verified": True},
            institution_name_extracted="Demonstration Institute of Technology",
            cert_number_extracted="NOC-GOV-KA-2026-4412",
            issue_date_extracted="15/02/2026",
            expiry_date_extracted="25/11/2026",
            issuing_authority_extracted="Department of Higher Education, Karnataka",
            confidence_score=0.92,
            ocr_engine="pymupdf+tesseract",
        ),
        OCRResult(
            document_id=doc3.id,
            extracted_text="INFRASTRUCTURE ADEQUACY CERTIFICATE\nName of Institution: Demonstration Institute of Technology\nCertificate Number: INFRA-PWD-2026-7731\nDate of Issue: 01/03/2026\nValid Till: 20/12/2026\nIssued By: Chartered Structural Engineer, Bengaluru",
            structured_data={"verified": False},
            institution_name_extracted="Demonstration Institute of Technology",
            cert_number_extracted="INFRA-PWD-2026-7731",
            issue_date_extracted="01/03/2026",
            expiry_date_extracted="20/12/2026",
            issuing_authority_extracted="Chartered Structural Engineer, Bengaluru",
            confidence_score=0.90,
            ocr_engine="pymupdf+tesseract",
        ),
        OCRResult(
            document_id=doc5.id,
            extracted_text="FACULTY QUALIFICATION & STRENGTH REGISTER\nName of Institution: Demonstration Institute of Technology\nCertificate Number: FAC-REG-2026-118\nDate of Issue: 18/10/2026\nValid Till: 01/05/2026\nIssued By: Registrar Office",
            structured_data={"date_mismatch": True},
            institution_name_extracted="Demonstration Institute of Technology",
            cert_number_extracted="FAC-REG-2026-118",
            issue_date_extracted="18/10/2026",
            expiry_date_extracted="01/05/2026",
            issuing_authority_extracted="Registrar Office",
            confidence_score=0.79,
            ocr_engine="pymupdf+tesseract",
        ),
        OCRResult(
            document_id=doc6.id,
            extracted_text="FIRE & LIFE SAFETY PERMISSION CERTIFICATE\nName of Institution: Demonstration Institute of Technology\nCertificate Number: FIRE-KA-2024-882\nDate of Issue: 25/09/2024\nValid Till: 25/09/2025\nIssued By: Karnataka Fire & Emergency Services",
            structured_data={"expired": True},
            institution_name_extracted="Demonstration Institute of Technology",
            cert_number_extracted="FIRE-KA-2024-882",
            issue_date_extracted="25/09/2024",
            expiry_date_extracted="25/09/2025",
            issuing_authority_extracted="Karnataka Fire & Emergency Services",
            confidence_score=0.91,
            ocr_engine="pymupdf+tesseract",
        ),
    ])

    db.add_all([
        AuthenticationResult(
            document_id=doc1.id,
            application_id=apps[0].id,
            status="NO_ANOMALY",
            similarity_score=0.0,
            anomaly_findings=[],
            metadata_analysis={"pdf_creator": "Institutional Scanner", "page_count": 1},
            explanation="No anomalies detected in cryptographic hash and metadata analysis.",
            recommendation="Document verified.",
            reviewed_by=reviewer_demo.id,
        ),
        AuthenticationResult(
            document_id=doc2.id,
            application_id=apps[0].id,
            status="NO_ANOMALY",
            similarity_score=0.0,
            anomaly_findings=[],
            metadata_analysis={"pdf_creator": "State Portal Export", "page_count": 1},
            explanation="Valid State NOC metadata and hash verified.",
            recommendation="Document verified.",
            reviewed_by=reviewer_demo.id,
        ),
        AuthenticationResult(
            document_id=doc3.id,
            application_id=apps[1].id,
            status="PENDING",
            similarity_score=0.0,
            anomaly_findings=[],
            metadata_analysis={"pdf_creator": "Scanner Utility", "page_count": 1},
            explanation="Queued for reviewer verification.",
            recommendation="Assign reviewer to verify certificate details.",
        ),
        AuthenticationResult(
            document_id=doc4.id,
            application_id=apps[0].id,
            status="POTENTIAL_DUPLICATE",
            duplicate_document_id=doc1.id,
            similarity_score=1.0,
            anomaly_findings=[{
                "type": "EXACT_SHA256_DUPLICATE",
                "severity": "HIGH",
                "description": "Exact SHA-256 cryptographic hash match with Document #1 (Notarized_Affidavit_DIT_2026.pdf).",
                "detail": "SHA-256: a8f5c2d9e1b30495...",
            }],
            metadata_analysis={"pdf_creator": "Institutional Scanner", "page_count": 1},
            explanation="Exact SHA-256 hash match with previously uploaded Document #1.",
            recommendation="Duplicate upload flagged. Remove duplicate or upload distinct document.",
        ),
        AuthenticationResult(
            document_id=doc5.id,
            application_id=apps[0].id,
            status="SUSPICIOUS",
            similarity_score=0.14,
            anomaly_findings=[
                {
                    "type": "DATE_INCONSISTENCY",
                    "severity": "HIGH",
                    "description": "OCR extracted expiry date (01/05/2026) precedes issue date (18/10/2026).",
                    "detail": "Issue: 18/10/2026 | Valid Till: 01/05/2026",
                },
                {
                    "type": "PDF_METADATA_MISMATCH",
                    "severity": "MEDIUM",
                    "description": "Document modification timestamp differs from creation timestamp.",
                    "detail": "Modified after scan creation",
                },
            ],
            metadata_analysis={"pdf_creator": "Modified PDF Editor", "page_count": 2},
            explanation="Detected date inconsistency and metadata modification indicators.",
            recommendation="Flagged as suspicious for manual administrator/reviewer verification.",
        ),
        AuthenticationResult(
            document_id=doc6.id,
            application_id=apps[0].id,
            status="MISMATCH",
            similarity_score=0.0,
            anomaly_findings=[{
                "type": "DOCUMENT_EXPIRED",
                "severity": "CRITICAL",
                "description": "Certificate validity date has expired.",
                "detail": "Expired 35 days ago",
            }],
            metadata_analysis={"pdf_creator": "Fire Dept Portal", "page_count": 1},
            explanation="Document validity period has elapsed.",
            recommendation="Request renewed Fire Safety Permission Certificate from institution.",
        ),
    ])

    db.add_all([
        ComplianceResult(application_id=apps[0].id, rule_id=rules[0].id, status="COMPLIANT", evidence="Notarized Affidavit uploaded and verified"),
        ComplianceResult(application_id=apps[0].id, rule_id=rules[1].id, status="COMPLIANT", evidence="State Government NOC uploaded and verified"),
        ComplianceResult(application_id=apps[0].id, rule_id=rules[2].id, status="PARTIAL", evidence="Faculty register flagged for date verification"),
        ComplianceResult(application_id=apps[0].id, rule_id=rules[3].id, status="NON_COMPLIANT", evidence="Scrutiny fee payment receipt missing"),
        ComplianceResult(application_id=apps[0].id, rule_id=rules[4].id, status="COMPLIANT", evidence="Infrastructure adequacy certificate uploaded"),
        ComplianceResult(application_id=apps[0].id, rule_id=rules[5].id, status="NON_COMPLIANT", evidence="Fire Safety Permission Certificate is expired"),
        ComplianceResult(application_id=apps[0].id, rule_id=rules[6].id, status="NON_COMPLIANT", evidence="Mandatory Land Certificate missing"),
    ])

    db.add_all([
        RenewalRecord(
            document_id=doc2.id,
            institution_id=inst1.id,
            renewal_due_date=datetime.utcnow() + timedelta(days=24),
            reminder_90_sent=True,
            reminder_60_sent=True,
            reminder_30_sent=True,
            status="ACTIVE",
        ),
        RenewalRecord(
            document_id=doc3.id,
            institution_id=inst1.id,
            renewal_due_date=datetime.utcnow() + timedelta(days=55),
            reminder_90_sent=True,
            reminder_60_sent=True,
            status="ACTIVE",
        ),
        RenewalRecord(
            document_id=doc6.id,
            institution_id=inst1.id,
            renewal_due_date=datetime.utcnow() - timedelta(days=35),
            reminder_90_sent=True,
            reminder_60_sent=True,
            reminder_30_sent=True,
            reminder_7_sent=True,
            status="EXPIRED",
        ),
    ])

    sample_alerts = [
        Alert(
            institution_id=inst1.id,
            application_id=apps[0].id,
            alert_type="MISSING_DOCUMENT",
            severity="HIGH",
            title="Missing Mandatory Document: Land Certificate",
            message="Application AICTE-2026-NIA-00001 is missing the mandatory Land Ownership/Lease Certificate and Scrutiny Fee Receipt.",
            is_read=False,
            is_resolved=False,
        ),
        Alert(
            institution_id=inst1.id,
            application_id=apps[0].id,
            document_id=doc6.id,
            alert_type="EXPIRED_DOCUMENT",
            severity="CRITICAL",
            title="Expired Document: Fire Safety Permission Certificate",
            message="Fire_Safety_Permission_2025.pdf has passed its validity date. Immediate renewal upload is required.",
            is_read=False,
            is_resolved=False,
        ),
        Alert(
            institution_id=inst1.id,
            application_id=apps[0].id,
            document_id=doc4.id,
            alert_type="POTENTIAL_DUPLICATE",
            severity="HIGH",
            title="Duplicate Document Detected (SHA-256 Match)",
            message="Duplicate_Copy_Affidavit_DIT.pdf has an identical SHA-256 hash to Notarized_Affidavit_DIT_2026.pdf.",
            is_read=False,
            is_resolved=False,
        ),
        Alert(
            institution_id=inst1.id,
            application_id=apps[0].id,
            document_id=doc5.id,
            alert_type="SUSPICIOUS_DOCUMENT",
            severity="CRITICAL",
            title="Suspicious Document Flagged: Faculty Register",
            message="Faculty_Strength_Register_Scan.pdf contains an OCR date inconsistency (expiry date precedes issue date) and metadata modification.",
            is_read=False,
            is_resolved=False,
        ),
        Alert(
            institution_id=inst1.id,
            document_id=doc2.id,
            alert_type="RENEWAL_DUE",
            severity="MEDIUM",
            title="Certificate Renewal Due in 24 Days",
            message="State_Govt_NOC_Karnataka_2026.pdf for Demonstration Institute of Technology is due for renewal within 30 days.",
            is_read=False,
            is_resolved=False,
        ),
    ]
    db.add_all(sample_alerts)

    db.add_all([
        AuditLog(
            user_id=admin_demo.id,
            action="SYSTEM_INITIALIZED",
            entity_type="SYSTEM",
            entity_id="1",
            result="SUCCESS",
            evidence={"note": "Seeded institutional verification records and demo accounts"},
            timestamp=datetime.utcnow() - timedelta(days=15),
        ),
        AuditLog(
            user_id=inst_demo.id,
            action="DOCUMENT_UPLOADED",
            entity_type="DOCUMENT",
            entity_id=str(doc1.id),
            result="SUCCESS",
            evidence={"filename": doc1.original_filename},
            timestamp=datetime.utcnow() - timedelta(days=14),
        ),
        AuditLog(
            user_id=reviewer_demo.id,
            action="DOCUMENT_VERIFIED",
            entity_type="DOCUMENT",
            entity_id=str(doc1.id),
            result="VERIFIED",
            evidence={"reviewer": reviewer_demo.full_name},
            timestamp=datetime.utcnow() - timedelta(days=13),
        ),
        AuditLog(
            user_id=reviewer_demo.id,
            action="SUSPICIOUS_DOCUMENT_FLAGGED",
            entity_type="DOCUMENT",
            entity_id=str(doc5.id),
            result="SUSPICIOUS",
            evidence={"reason": "Date mismatch in OCR fields"},
            timestamp=datetime.utcnow() - timedelta(days=2),
        ),
    ])

    db.commit()
    print("Database seeded successfully.")
    print("   Admin    : admin@aibmez.demo / Admin@123")
    print("   Institute: institute@aibmez.demo / Institute@123")
    print("   Reviewer : reviewer@aibmez.demo / Reviewer@123")

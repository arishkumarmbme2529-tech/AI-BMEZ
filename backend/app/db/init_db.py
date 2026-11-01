"""
Database seeding — creates default users, institutions, categories, rules, and sample data.
Idempotent: only seeds if tables are empty.
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.models import (
    User, Institution, ApplicationCategory, DocumentType,
    Application, ComplianceRule, ComplianceResult, AuthenticationResult,
    OCRResult, DocumentHash, Alert, AuditLog, Document, RenewalRecord
)


def init_db(db: Session) -> None:
    # Only seed if no users exist
    if db.query(User).first():
        return

    print("🌱 Seeding initial data...")

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
        email="admin@demo-dit.edu.in",
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
        email="admin@sample-poly.edu.in",
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
        email="admin@model-ec.edu.in",
        phone="9988776655",
        status="ACTIVE",
    )
    db.add_all([inst1, inst2, inst3])
    db.flush()

    # ── Users ────────────────────────────────────────────────────────
    super_admin = User(
        email="admin@aicte.gov.in",
        hashed_password=get_password_hash("Admin@123456"),
        full_name="AICTE System Administrator",
        role="SUPER_ADMIN",
        is_active=True,
    )
    officer = User(
        email="officer@aicte.gov.in",
        hashed_password=get_password_hash("Officer@123456"),
        full_name="Dr. Anand Verification Officer",
        role="OFFICER",
        is_active=True,
    )
    inst_admin = User(
        email="institute@demo.edu.in",
        hashed_password=get_password_hash("Institute@123456"),
        full_name="Dr. Rajesh Kumar",
        role="INSTITUTION_ADMIN",
        institution_id=inst1.id,
        is_active=True,
    )
    db.add_all([super_admin, officer, inst_admin])
    db.flush()

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
        DocumentType(name="Previous Approval Letter", code="PAL", description="AICTE approval letter from previous cycle", is_required=False),
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
            application_id="AICTE-2024-NIA-00001",
            institution_id=inst1.id,
            category_id=cats[0].id,
            title="New Institution Approval - Demonstration Institute of Technology",
            status="UNDER_REVIEW",
            submitted_by=inst_admin.id,
            submitted_at=datetime.utcnow() - timedelta(days=15),
            reviewer_id=officer.id,
        ),
        Application(
            application_id="AICTE-2024-EOA-00002",
            institution_id=inst1.id,
            category_id=cats[1].id,
            title="Extension of Approval 2024-25 - Demonstration Institute of Technology",
            status="SUBMITTED",
            submitted_by=inst_admin.id,
            submitted_at=datetime.utcnow() - timedelta(days=5),
        ),
        Application(
            application_id="AICTE-2024-CA-00003",
            institution_id=inst2.id,
            category_id=cats[2].id,
            title="Course Addition - B.Tech Data Science - Sample Polytechnic Institute",
            status="DRAFT",
            submitted_by=super_admin.id,
        ),
        Application(
            application_id="AICTE-2024-IM-00004",
            institution_id=inst3.id,
            category_id=cats[3].id,
            title="Intake Modification - Increase CSE Intake - Model Engineering College",
            status="APPROVED",
            submitted_by=super_admin.id,
            submitted_at=datetime.utcnow() - timedelta(days=45),
            reviewer_id=officer.id,
        ),
        Application(
            application_id="AICTE-2024-EOA-00005",
            institution_id=inst3.id,
            category_id=cats[1].id,
            title="Extension of Approval 2024-25 - Model Engineering College",
            status="RETURNED",
            submitted_by=super_admin.id,
            submitted_at=datetime.utcnow() - timedelta(days=20),
            reviewer_id=officer.id,
            review_notes="Please resubmit with updated faculty records and infrastructure certificate.",
        ),
    ]
    db.add_all(apps)
    db.flush()

    # ── Compliance Rules (marked is_sample=True) ─────────────────────
    rules = [
        ComplianceRule(
            rule_id="RULE-001",
            name="Mandatory Affidavit Required",
            category_id=None,
            description="[SAMPLE RULE] Every application must include a duly signed and notarized affidavit from the institution head.",
            requirement="Upload signed affidavit document",
            validation_type="DOCUMENT_PRESENT",
            severity="CRITICAL",
            is_active=True,
            version="1.0",
            is_sample=True,
        ),
        ComplianceRule(
            rule_id="RULE-002",
            name="Valid NOC Required",
            category_id=cats[0].id,
            description="[SAMPLE RULE] New institution applications must include a valid NOC from the State Government.",
            requirement="Upload valid State Government NOC",
            validation_type="DOCUMENT_PRESENT",
            severity="CRITICAL",
            is_active=True,
            version="1.0",
            is_sample=True,
        ),
        ComplianceRule(
            rule_id="RULE-003",
            name="Faculty Strength Compliance",
            category_id=None,
            description="[SAMPLE RULE] Institution must have minimum required faculty as per AICTE norms.",
            requirement="Faculty records must show minimum faculty-student ratio",
            validation_type="FIELD_CHECK",
            severity="HIGH",
            is_active=True,
            version="1.0",
            is_sample=True,
        ),
        ComplianceRule(
            rule_id="RULE-004",
            name="Scrutiny Fee Payment",
            category_id=None,
            description="[SAMPLE RULE] Application must be accompanied by scrutiny fee payment evidence.",
            requirement="Upload payment receipt for scrutiny fee",
            validation_type="DOCUMENT_PRESENT",
            severity="HIGH",
            is_active=True,
            version="1.0",
            is_sample=True,
        ),
        ComplianceRule(
            rule_id="RULE-005",
            name="Infrastructure Adequacy Certificate",
            category_id=None,
            description="[SAMPLE RULE] Valid infrastructure certificate must be submitted.",
            requirement="Upload infrastructure certificate from competent authority",
            validation_type="DOCUMENT_PRESENT",
            severity="HIGH",
            is_active=True,
            version="1.0",
            is_sample=True,
        ),
        ComplianceRule(
            rule_id="RULE-006",
            name="Document Expiry Validation",
            category_id=None,
            description="[SAMPLE RULE] All submitted documents must be within their valid date range.",
            requirement="No expired documents in submission",
            validation_type="EXPIRY_CHECK",
            severity="CRITICAL",
            is_active=True,
            version="1.0",
            is_sample=True,
        ),
        ComplianceRule(
            rule_id="RULE-007",
            name="EOA Previous Approval Letter",
            category_id=cats[1].id,
            description="[SAMPLE RULE] Extension of Approval applications must include the previous AICTE approval letter.",
            requirement="Upload previous cycle AICTE approval letter",
            validation_type="DOCUMENT_PRESENT",
            severity="HIGH",
            is_active=True,
            version="1.0",
            is_sample=True,
        ),
        ComplianceRule(
            rule_id="RULE-008",
            name="Land Certificate Required",
            category_id=cats[0].id,
            description="[SAMPLE RULE] New institution applications must include land ownership or lease certificate.",
            requirement="Upload land certificate",
            validation_type="DOCUMENT_PRESENT",
            severity="CRITICAL",
            is_active=True,
            version="1.0",
            is_sample=True,
        ),
    ]
    db.add_all(rules)
    db.flush()

    # ── Sample Alerts ────────────────────────────────────────────────
    sample_alerts = [
        Alert(
            institution_id=inst1.id,
            application_id=apps[0].id,
            alert_type="MISSING_DOCUMENT",
            severity="HIGH",
            title="Missing Document: Land Certificate",
            message="Application AICTE-2024-NIA-00001 is missing the mandatory Land Certificate. Please upload the document to proceed.",
            is_read=False,
            is_resolved=False,
        ),
        Alert(
            institution_id=inst2.id,
            alert_type="EXPIRED_DOCUMENT",
            severity="CRITICAL",
            title="Expired Document Detected",
            message="NOC document for Sample Polytechnic Institute has expired. Renewal is required immediately.",
            is_read=False,
            is_resolved=False,
        ),
        Alert(
            institution_id=inst3.id,
            application_id=apps[4].id,
            alert_type="COMPLIANCE_DEFICIENCY",
            severity="HIGH",
            title="Compliance Gap: Faculty Records Incomplete",
            message="Application AICTE-2024-EOA-00005 has incomplete faculty records. Minimum faculty strength requirements not met.",
            is_read=True,
            is_resolved=False,
        ),
        Alert(
            institution_id=inst1.id,
            application_id=apps[0].id,
            alert_type="POTENTIAL_DUPLICATE",
            severity="MEDIUM",
            title="Potential Duplicate Document Detected",
            message="Affidavit document shows similarity with a previously submitted document. Manual review recommended.",
            is_read=False,
            is_resolved=False,
        ),
        Alert(
            institution_id=inst1.id,
            alert_type="RENEWAL_DUE",
            severity="MEDIUM",
            title="Document Renewal Due in 30 Days",
            message="Infrastructure Certificate for Demonstration Institute of Technology is due for renewal in 30 days.",
            is_read=False,
            is_resolved=False,
        ),
    ]
    db.add_all(sample_alerts)

    # ── Sample Demonstration Documents, OCR, Auth & Compliance ──────
    import os
    os.makedirs("uploads", exist_ok=True)
    sample_pdf_bytes = b"%PDF-1.4\n%Sample AICTE Demonstration Document\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\ntrailer<</Size 4/Root 1 0 R>>\n%%EOF"
    for fname in ["demo_affidavit.pdf", "demo_noc_certificate.pdf", "demo_infra_certificate.pdf"]:
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
        uploaded_by=inst_admin.id,
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
        uploaded_by=inst_admin.id,
        status="VERIFIED",
        expiry_date=datetime.utcnow() + timedelta(days=25),
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
        uploaded_by=inst_admin.id,
        status="PENDING",
        expiry_date=datetime.utcnow() + timedelta(days=55),
    )
    db.add_all([doc1, doc2, doc3])
    db.flush()

    db.add_all([
        DocumentHash(document_id=doc1.id, sha256_hash=doc1.sha256_hash, file_size=doc1.file_size),
        DocumentHash(document_id=doc2.id, sha256_hash=doc2.sha256_hash, file_size=doc2.file_size),
        DocumentHash(document_id=doc3.id, sha256_hash=doc3.sha256_hash, file_size=doc3.file_size),
    ])

    db.add(OCRResult(
        document_id=doc1.id,
        extracted_text="AFFIDAVIT OF INSTITUTIONAL HEAD\nName of Institution: Demonstration Institute of Technology\nCertificate Number: AFF-KA-2026-0091\nDate of Issue: 10/01/2026\nValid Till: 10/01/2027\nIssued By: Notary Public, Bengaluru Urban",
        structured_data={"sample": True},
        institution_name_extracted="Demonstration Institute of Technology",
        cert_number_extracted="AFF-KA-2026-0091",
        issue_date_extracted="10/01/2026",
        expiry_date_extracted="10/01/2027",
        issuing_authority_extracted="Notary Public, Bengaluru Urban",
        confidence_score=0.92,
        ocr_engine="pymupdf",
    ))

    db.add_all([
        AuthenticationResult(
            document_id=doc1.id,
            application_id=apps[0].id,
            status="NO_ANOMALY",
            similarity_score=0.0,
            anomaly_findings=[],
            metadata_analysis={"pdf_creator": "AICTE Demo Scanner", "page_count": 1},
            explanation="No anomalies detected in preliminary analysis.",
            recommendation="No action required.",
        ),
        AuthenticationResult(
            document_id=doc3.id,
            application_id=apps[1].id,
            status="MANUAL_REVIEW",
            similarity_score=0.12,
            anomaly_findings=[{
                "type": "PDF_METADATA",
                "severity": "LOW",
                "description": "PDF creation and modification dates differ.",
                "detail": "Created vs Modified timestamp delta detected",
                "note": "Preliminary indicator only — manual officer verification advised.",
            }],
            metadata_analysis={"pdf_creator": "Scanner Utility", "page_count": 1},
            explanation="Preliminary analysis detected 1 minor indicator(s). Review at officer discretion.",
            recommendation="Minor inconsistencies detected. Manual review recommended before approval.",
        ),
    ])

    db.add_all([
        ComplianceResult(application_id=apps[0].id, rule_id=rules[0].id, status="COMPLIANT", evidence="Notarized Affidavit uploaded"),
        ComplianceResult(application_id=apps[0].id, rule_id=rules[1].id, status="COMPLIANT", evidence="State Government NOC uploaded"),
        ComplianceResult(application_id=apps[0].id, rule_id=rules[2].id, status="COMPLIANT", evidence="OCR fields verified"),
        ComplianceResult(application_id=apps[0].id, rule_id=rules[3].id, status="PARTIAL", evidence="Payment receipt under verification"),
        ComplianceResult(application_id=apps[0].id, rule_id=rules[7].id, status="NON_COMPLIANT", evidence="Land Certificate missing"),
    ])

    db.add_all([
        RenewalRecord(
            document_id=doc2.id,
            institution_id=inst1.id,
            renewal_due_date=datetime.utcnow() + timedelta(days=25),
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
    ])

    # ── Audit log for seeding ────────────────────────────────────────
    audit = AuditLog(
        user_id=super_admin.id,
        action="SYSTEM_INIT",
        entity_type="SYSTEM",
        entity_id="1",
        result="SUCCESS",
        evidence={"note": "Database seeded with initial demonstration data"},
        timestamp=datetime.utcnow(),
    )
    db.add(audit)

    db.commit()
    print("✅ Database seeded successfully!")
    print("   👤 admin@aicte.gov.in / Admin@123456  (Super Admin)")
    print("   👤 officer@aicte.gov.in / Officer@123456  (Officer)")
    print("   👤 institute@demo.edu.in / Institute@123456  (Institution Admin)")

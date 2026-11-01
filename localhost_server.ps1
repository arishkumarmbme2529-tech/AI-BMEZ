# =============================================================================
# AICTE SMART DOCUMENT MANAGEMENT & REGULATORY COMPLIANCE PLATFORM
# Native Zero-Dependency Full-Stack Localhost Server (Ports 3000 & 8000)
# SIH 2026 | Problem Statement 26261 | All India Council for Technical Education
# =============================================================================

$ErrorActionPreference = "Continue"
$RootDir = if ($PSScriptRoot) { $PSScriptRoot } elseif ($MyInvocation.MyCommand.Path) { Split-Path -Parent $MyInvocation.MyCommand.Path } else { "c:\Users\JayaPrakash\Desktop\AI-BMEZ" }
$StaticDir = Join-Path $RootDir "localhost_app"
$UploadsDir = Join-Path $RootDir "backend\uploads"
$ReportsDir = Join-Path $RootDir "backend\reports"
$DbFile = Join-Path $RootDir "backend\aicte_platform_db.json"

New-Item -ItemType Directory -Force -Path $UploadsDir | Out-Null
New-Item -ItemType Directory -Force -Path $ReportsDir | Out-Null

# Helper: Generate a valid multi-line PDF binary for reports & sample documents
function Write-ValidPdfFile {
    param([string]$FilePath, [string[]]$Lines)
    $escapedLines = @()
    $y = 750
    foreach ($line in $Lines) {
        $clean = ($line -replace '[\\(\)]', '')
        $escapedLines += "BT /F1 10 Tf 45 $y Td ($clean) Tj ET"
        $y -= 16
        if ($y -lt 50) { break }
    }
    $streamContent = $escapedLines -join "`n"
    $streamLen = [System.Text.Encoding]::ASCII.GetByteCount($streamContent)
    $pdf = @"
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length $streamLen >>
stream
$streamContent
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000229 00000 n 
0000000297 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
$($streamLen + 350)
%%EOF
"@
    [System.IO.File]::WriteAllText($FilePath, $pdf, [System.Text.Encoding]::ASCII)
}

# Seed initial demonstration files & persistent JSON database if not present
function Initialize-Database {
    $sample1 = Join-Path $UploadsDir "demo_affidavit.pdf"
    $sample2 = Join-Path $UploadsDir "demo_noc_certificate.pdf"
    $sample3 = Join-Path $UploadsDir "demo_infra_certificate.pdf"
    $sample4 = Join-Path $UploadsDir "demo_duplicate_affidavit.pdf"

    if (-not (Test-Path $sample1)) {
        Write-ValidPdfFile -FilePath $sample1 -Lines @(
            "ALL INDIA COUNCIL FOR TECHNICAL EDUCATION - SAMPLE DEMO AFFIDAVIT",
            "Name of Institution: Demonstration Institute of Technology",
            "Certificate Number: AFF-KA-2026-0091",
            "Date of Issue: 10/01/2026",
            "Valid Till: 10/01/2027",
            "Issued By: Notary Public, Bengaluru Urban",
            "SYNTHETIC DEMONSTRATION DOCUMENT - SIH 2026 PS 26261"
        )
    }
    if (-not (Test-Path $sample2)) {
        Write-ValidPdfFile -FilePath $sample2 -Lines @(
            "STATE GOVERNMENT NO OBJECTION CERTIFICATE (DEMO)",
            "Name of Institution: Demonstration Institute of Technology",
            "Certificate Number: NOC-GOV-KA-2026-4412",
            "Date of Issue: 15/02/2026",
            "Valid Till: 25/11/2026",
            "Issued By: Department of Higher Education, Karnataka"
        )
    }
    if (-not (Test-Path $sample3)) {
        Write-ValidPdfFile -FilePath $sample3 -Lines @(
            "INFRASTRUCTURE ADEQUACY CERTIFICATE (DEMO)",
            "Name of Institution: Demonstration Institute of Technology",
            "Certificate Number: INFRA-PWD-2026-7731",
            "Date of Issue: 01/03/2026",
            "Valid Till: 20/12/2026",
            "Issued By: Chartered Structural Engineer, Bengaluru"
        )
    }
    if (-not (Test-Path $sample4)) {
        Copy-Item $sample1 $sample4 -Force
    }

    if (-not (Test-Path $DbFile)) {
        $dbObj = @{
            users = @(
                @{ id = 1; email = "admin@aicte.gov.in"; password = "Admin@123456"; full_name = "AICTE System Administrator"; role = "SUPER_ADMIN"; institution_id = $null; is_active = $true; created_at = "2026-10-01T09:00:00Z"; last_login = "2026-11-01T10:00:00Z" },
                @{ id = 2; email = "officer@aicte.gov.in"; password = "Officer@123456"; full_name = "Dr. Anand Verification Officer"; role = "OFFICER"; institution_id = $null; is_active = $true; created_at = "2026-10-01T09:00:00Z"; last_login = "2026-11-01T10:15:00Z" },
                @{ id = 3; email = "institute@demo.edu.in"; password = "Institute@123456"; full_name = "Dr. Rajesh Kumar (DIT Admin)"; role = "INSTITUTION_ADMIN"; institution_id = 1; is_active = $true; created_at = "2026-10-05T09:00:00Z"; last_login = "2026-11-01T10:30:00Z" }
            )
            institutions = @(
                @{ id = 1; name = "Demonstration Institute of Technology"; aicte_id = "AICTE-DIT-2024-001"; institution_type = "Engineering College"; address = "123 Tech Park, Electronic City"; state = "Karnataka"; district = "Bengaluru Urban"; city = "Bengaluru"; pincode = "560100"; establishment_year = 2005; contact_person = "Dr. Rajesh Kumar"; email = "admin@demo-dit.edu.in"; phone = "9876543210"; status = "ACTIVE"; application_count = 2; document_count = 4; created_at = "2026-09-01T10:00:00Z" },
                @{ id = 2; name = "Sample Polytechnic Institute"; aicte_id = "AICTE-SPI-2024-002"; institution_type = "Polytechnic"; address = "456 Education Road, Sector 15"; state = "Maharashtra"; district = "Pune"; city = "Pune"; pincode = "411001"; establishment_year = 2010; contact_person = "Prof. Meera Sharma"; email = "admin@sample-poly.edu.in"; phone = "9123456789"; status = "PENDING"; application_count = 1; document_count = 1; created_at = "2026-09-10T10:00:00Z" },
                @{ id = 3; name = "Model Engineering College"; aicte_id = "AICTE-MEC-2024-003"; institution_type = "Engineering College"; address = "789 College Avenue, Anna Nagar"; state = "Tamil Nadu"; district = "Chennai"; city = "Chennai"; pincode = "600040"; establishment_year = 1998; contact_person = "Dr. Priya Venkat"; email = "admin@model-ec.edu.in"; phone = "9988776655"; status = "ACTIVE"; application_count = 2; document_count = 1; created_at = "2026-09-15T10:00:00Z" }
            )
            categories = @(
                @{ id = 1; name = "New Institution Approval"; code = "NIA"; description = "Approval of a new technical institution" },
                @{ id = 2; name = "Extension of Approval (EOA)"; code = "EOA"; description = "Annual Extension of Approval for existing institutions" },
                @{ id = 3; name = "Course Addition"; code = "CA"; description = "Adding new technical courses/programmes" },
                @{ id = 4; name = "Intake Modification"; code = "IM"; description = "Increase or decrease of approved student intake" },
                @{ id = 5; name = "Institution Details Modification"; code = "IDM"; description = "Modification of institutional details or address" },
                @{ id = 6; name = "Infrastructure Upgrade"; code = "IU"; description = "Campus infrastructure expansion verification" }
            )
            doc_types = @(
                @{ id = 1; name = "Affidavit"; code = "AFF"; description = "Mandatory notarized affidavit"; is_required = $true },
                @{ id = 2; name = "Undertaking"; code = "UND"; description = "Institutional undertaking"; is_required = $true },
                @{ id = 3; name = "Accreditation Certificate"; code = "ACC"; description = "NAAC/NBA accreditation"; is_required = $false },
                @{ id = 4; name = "No Objection Certificate (NOC)"; code = "NOC"; description = "State Government NOC"; is_required = $true },
                @{ id = 5; name = "Permission Certificate"; code = "PERM"; description = "Competent authority permission"; is_required = $true },
                @{ id = 6; name = "Previous Approval Letter"; code = "PAL"; description = "Previous cycle AICTE EOA letter"; is_required = $false },
                @{ id = 7; name = "Faculty Records"; code = "FAC"; description = "Faculty qualification & strength register"; is_required = $true },
                @{ id = 8; name = "Course Details"; code = "COURS"; description = "Curriculum and syllabus"; is_required = $true },
                @{ id = 9; name = "Infrastructure Certificate"; code = "INFRA"; description = "Structural & adequacy certificate"; is_required = $true },
                @{ id = 10; name = "Payment Evidence"; code = "PAY"; description = "Scrutiny fee receipt"; is_required = $true },
                @{ id = 11; name = "Floor Plan"; code = "FLOOR"; description = "Approved building layout plan"; is_required = $false },
                @{ id = 12; name = "Land Certificate"; code = "LAND"; description = "Land ownership / lease deed"; is_required = $true }
            )
            applications = @(
                @{ id = 1; application_id = "AICTE-2026-NIA-00001"; institution_id = 1; institution_name = "Demonstration Institute of Technology"; category_id = 1; category_name = "New Institution Approval"; category_code = "NIA"; title = "New Institution Approval - Demonstration Institute of Technology"; status = "UNDER_REVIEW"; submitted_by = 3; submitter_name = "Dr. Rajesh Kumar"; reviewer_id = 2; reviewer_name = "Dr. Anand Verification Officer"; review_notes = "OCR and SHA-256 verification completed. Please upload missing Land Certificate."; document_count = 3; created_at = "2026-10-12T10:00:00Z"; submitted_at = "2026-10-15T14:20:00Z" },
                @{ id = 2; application_id = "AICTE-2026-EOA-00002"; institution_id = 1; institution_name = "Demonstration Institute of Technology"; category_id = 2; category_name = "Extension of Approval (EOA)"; category_code = "EOA"; title = "Extension of Approval 2026-27 - Demonstration Institute of Technology"; status = "SUBMITTED"; submitted_by = 3; submitter_name = "Dr. Rajesh Kumar"; reviewer_id = $null; reviewer_name = $null; review_notes = $null; document_count = 1; created_at = "2026-10-20T10:00:00Z"; submitted_at = "2026-10-25T11:00:00Z" },
                @{ id = 3; application_id = "AICTE-2026-CA-00003"; institution_id = 2; institution_name = "Sample Polytechnic Institute"; category_id = 3; category_name = "Course Addition"; category_code = "CA"; title = "Course Addition - Diploma in AI & Robotics - Sample Polytechnic Institute"; status = "DRAFT"; submitted_by = 1; submitter_name = "AICTE System Administrator"; reviewer_id = $null; reviewer_name = $null; review_notes = $null; document_count = 0; created_at = "2026-10-27T09:30:00Z"; submitted_at = $null },
                @{ id = 4; application_id = "AICTE-2026-IM-00004"; institution_id = 3; institution_name = "Model Engineering College"; category_id = 4; category_name = "Intake Modification"; category_code = "IM"; title = "Intake Modification - Increase CSE Intake (120 to 180) - Model Engineering College"; status = "APPROVED"; submitted_by = 1; submitter_name = "AICTE System Administrator"; reviewer_id = 2; reviewer_name = "Dr. Anand Verification Officer"; review_notes = "All compliance rules satisfied."; document_count = 2; created_at = "2026-09-18T10:00:00Z"; submitted_at = "2026-09-20T16:00:00Z" },
                @{ id = 5; application_id = "AICTE-2026-EOA-00005"; institution_id = 3; institution_name = "Model Engineering College"; category_id = 2; category_name = "Extension of Approval (EOA)"; category_code = "EOA"; title = "Extension of Approval 2026-27 - Model Engineering College"; status = "RETURNED"; submitted_by = 1; submitter_name = "AICTE System Administrator"; reviewer_id = 2; reviewer_name = "Dr. Anand Verification Officer"; review_notes = "Returned: Please resubmit updated faculty strength register and renewed NOC."; document_count = 1; created_at = "2026-10-05T10:00:00Z"; submitted_at = "2026-10-08T12:00:00Z" }
            )
            documents = @(
                @{ id = 1; application_id = 1; institution_id = 1; document_type_id = 1; document_type_name = "Affidavit"; original_filename = "Notarized_Affidavit_DIT_2026.pdf"; stored_filename = "demo_affidavit.pdf"; file_path = $sample1; file_size = 642; mime_type = "application/pdf"; sha256_hash = "a8f5c2d9e1b304958273645192837465a8f5c2d9e1b304958273645192837465"; upload_date = "2026-10-14T10:00:00Z"; uploaded_by = 3; uploader_name = "Dr. Rajesh Kumar"; status = "VERIFIED"; is_active = $true; expiry_date = "2027-01-10" },
                @{ id = 2; application_id = 1; institution_id = 1; document_type_id = 4; document_type_name = "No Objection Certificate (NOC)"; original_filename = "State_Govt_NOC_Karnataka_2026.pdf"; stored_filename = "demo_noc_certificate.pdf"; file_path = $sample2; file_size = 618; mime_type = "application/pdf"; sha256_hash = "b7e4d1c8f2a405968374655293847566b7e4d1c8f2a405968374655293847566"; upload_date = "2026-10-14T11:00:00Z"; uploaded_by = 3; uploader_name = "Dr. Rajesh Kumar"; status = "VERIFIED"; is_active = $true; expiry_date = "2026-11-25" },
                @{ id = 3; application_id = 2; institution_id = 1; document_type_id = 9; document_type_name = "Infrastructure Certificate"; original_filename = "Infrastructure_Adequacy_Cert_DIT.pdf"; stored_filename = "demo_infra_certificate.pdf"; file_path = $sample3; file_size = 630; mime_type = "application/pdf"; sha256_hash = "c9d3e2b7a1f506978475665394857667c9d3e2b7a1f506978475665394857667"; upload_date = "2026-10-21T09:30:00Z"; uploaded_by = 3; uploader_name = "Dr. Rajesh Kumar"; status = "PROCESSING"; is_active = $true; expiry_date = "2026-12-20" },
                @{ id = 4; application_id = 1; institution_id = 1; document_type_id = 1; document_type_name = "Affidavit"; original_filename = "Duplicate_Copy_Affidavit_DIT.pdf"; stored_filename = "demo_duplicate_affidavit.pdf"; file_path = $sample4; file_size = 642; mime_type = "application/pdf"; sha256_hash = "a8f5c2d9e1b304958273645192837465a8f5c2d9e1b304958273645192837465"; upload_date = "2026-10-24T15:00:00Z"; uploaded_by = 3; uploader_name = "Dr. Rajesh Kumar"; status = "PENDING"; is_active = $true; expiry_date = "2026-10-15" }
            )
            ocr_results = @(
                @{ id = 1; document_id = 1; extracted_text = "ALL INDIA COUNCIL FOR TECHNICAL EDUCATION - SAMPLE DEMO AFFIDAVIT`nName of Institution: Demonstration Institute of Technology`nCertificate Number: AFF-KA-2026-0091`nDate of Issue: 10/01/2026`nValid Till: 10/01/2027`nIssued By: Notary Public, Bengaluru Urban"; institution_name = "Demonstration Institute of Technology"; cert_number = "AFF-KA-2026-0091"; issue_date = "10/01/2026"; expiry_date = "10/01/2027"; issuing_authority = "Notary Public, Bengaluru Urban"; confidence_score = 0.94; ocr_engine = "pymupdf+tesseract"; processed_at = "2026-10-14T10:05:00Z"; corrections = @() },
                @{ id = 2; document_id = 2; extracted_text = "STATE GOVERNMENT NO OBJECTION CERTIFICATE (DEMO)`nName of Institution: Demonstration Institute of Technology`nCertificate Number: NOC-GOV-KA-2026-4412`nDate of Issue: 15/02/2026`nValid Till: 25/11/2026`nIssued By: Department of Higher Education, Karnataka"; institution_name = "Demonstration Institute of Technology"; cert_number = "NOC-GOV-KA-2026-4412"; issue_date = "15/02/2026"; expiry_date = "25/11/2026"; issuing_authority = "Department of Higher Education, Karnataka"; confidence_score = 0.91; ocr_engine = "pymupdf+tesseract"; processed_at = "2026-10-14T11:05:00Z"; corrections = @() }
            )
            auth_results = @(
                @{ id = 1; document_id = 1; application_id = 1; status = "NO_ANOMALY"; duplicate_document_id = $null; similarity_score = 0.0; anomaly_findings = @(); metadata_analysis = @{ pdf_creator = "AICTE Demo Scanner"; page_count = 1 }; explanation = "No anomalies detected in preliminary cryptographic & metadata analysis."; recommendation = "No action required."; analyzed_at = "2026-10-14T10:10:00Z" },
                @{ id = 2; document_id = 4; application_id = 1; status = "POTENTIAL_DUPLICATE"; duplicate_document_id = 1; similarity_score = 1.0; anomaly_findings = @( @{ type = "EXACT_SHA256_DUPLICATE"; severity = "HIGH"; description = "Exact SHA-256 cryptographic hash match with Document #1 (Notarized_Affidavit_DIT_2026.pdf)."; detail = "SHA-256: a8f5c2d9e1b30495..." } ); metadata_analysis = @{ pdf_creator = "AICTE Demo Scanner"; page_count = 1 }; explanation = "Preliminary analysis detected exact SHA-256 match with previously uploaded Document #1."; recommendation = "A duplicate document was found. Manual verification officer review required."; analyzed_at = "2026-10-24T15:05:00Z" }
            )
            rules = @(
                @{ id = 1; rule_id = "RULE-001"; name = "Mandatory Affidavit Required"; category_name = "All Categories"; description = "[SAMPLE RULE] Every application must include a notarized affidavit from the institution head."; requirement = "Upload signed affidavit document"; validation_type = "DOCUMENT_PRESENT"; severity = "CRITICAL"; version = "1.0"; is_sample = $true },
                @{ id = 2; rule_id = "RULE-002"; name = "Valid State Government NOC"; category_name = "New Institution Approval"; description = "[SAMPLE RULE] New institution applications must include a valid State Government NOC."; requirement = "Upload State Government NOC"; validation_type = "DOCUMENT_PRESENT"; severity = "CRITICAL"; version = "1.0"; is_sample = $true },
                @{ id = 3; rule_id = "RULE-003"; name = "Faculty Strength Compliance"; category_name = "All Categories"; description = "[SAMPLE RULE] Minimum faculty-student ratio as per sample handbook norms."; requirement = "OCR field verification on faculty records"; validation_type = "FIELD_CHECK"; severity = "HIGH"; version = "1.0"; is_sample = $true },
                @{ id = 4; rule_id = "RULE-004"; name = "Scrutiny Fee Payment Evidence"; category_name = "All Categories"; description = "[SAMPLE RULE] Application must include scrutiny fee receipt."; requirement = "Upload payment receipt"; validation_type = "DOCUMENT_PRESENT"; severity = "HIGH"; version = "1.0"; is_sample = $true },
                @{ id = 5; rule_id = "RULE-005"; name = "Infrastructure Adequacy Certificate"; category_name = "All Categories"; description = "[SAMPLE RULE] Structural & infrastructure adequacy certificate required."; requirement = "Upload infrastructure certificate"; validation_type = "DOCUMENT_PRESENT"; severity = "HIGH"; version = "1.0"; is_sample = $true },
                @{ id = 6; rule_id = "RULE-006"; name = "Document Expiry Validation"; category_name = "All Categories"; description = "[SAMPLE RULE] Submitted certificates must not be past their validity date."; requirement = "No expired documents in submission"; validation_type = "EXPIRY_CHECK"; severity = "CRITICAL"; version = "1.0"; is_sample = $true }
            )
            compliance_results = @(
                @{ id = 1; application_id = 1; rule_id = "RULE-001"; rule_name = "Mandatory Affidavit Required"; severity = "CRITICAL"; description = "[SAMPLE RULE] Every application must include a notarized affidavit."; status = "COMPLIANT"; evidence = "Document #1 (Notarized_Affidavit_DIT_2026.pdf) verified"; is_sample = $true; checked_at = "2026-10-25T10:00:00Z" },
                @{ id = 2; application_id = 1; rule_id = "RULE-002"; rule_name = "Valid State Government NOC"; severity = "CRITICAL"; description = "[SAMPLE RULE] Valid State Government NOC required."; status = "COMPLIANT"; evidence = "Document #2 (State_Govt_NOC_Karnataka_2026.pdf) verified"; is_sample = $true; checked_at = "2026-10-25T10:00:00Z" },
                @{ id = 3; application_id = 1; rule_id = "RULE-003"; rule_name = "Faculty Strength Compliance"; severity = "HIGH"; description = "[SAMPLE RULE] Minimum faculty strength norm check."; status = "COMPLIANT"; evidence = "OCR structured fields validated"; is_sample = $true; checked_at = "2026-10-25T10:00:00Z" },
                @{ id = 4; application_id = 1; rule_id = "RULE-004"; rule_name = "Scrutiny Fee Payment Evidence"; severity = "HIGH"; description = "[SAMPLE RULE] Scrutiny fee receipt verification."; status = "PARTIAL"; evidence = "Pending bank reference confirmation"; is_sample = $true; checked_at = "2026-10-25T10:00:00Z" },
                @{ id = 5; application_id = 1; rule_id = "RULE-006"; rule_name = "Document Expiry Validation"; severity = "CRITICAL"; description = "[SAMPLE RULE] No expired certificates allowed."; status = "NON_COMPLIANT"; evidence = "Document #4 expiry date (2026-10-15) has passed"; is_sample = $true; checked_at = "2026-10-25T10:00:00Z" }
            )
            infra_evidences = @(
                @{ id = 1; application_id = 1; institution_id = 1; category = "BUILDING"; document_id = 3; quality_score = 88.5; status = "APPROVED"; uploaded_at = "2026-10-21T10:00:00Z" },
                @{ id = 2; application_id = 1; institution_id = 1; category = "LAB"; document_id = 3; quality_score = 82.0; status = "REVIEWED"; uploaded_at = "2026-10-22T11:30:00Z" }
            )
            verifications = @(
                @{ id = 1; document_id = 2; verification_type = "STATE_NOC_PORTAL"; external_ref = "DEMO-20261025-0002"; status = "VERIFIED"; source = "DEMO_ADAPTER_STATE_NOC_PORTAL"; requested_at = "2026-10-25T12:00:00Z"; responded_at = "2026-10-25T12:00:02Z"; notes = "[DEMO MODE] Synthetic verification result for STATE_NOC_PORTAL. Not a real government database query." }
            )
            alerts = @(
                @{ id = 1; institution_id = 1; application_id = 1; document_id = $null; alert_type = "MISSING_DOCUMENT"; severity = "HIGH"; title = "Missing Document: Land Certificate"; message = "Application AICTE-2026-NIA-00001 is missing the mandatory Land Certificate."; is_read = $false; is_resolved = $false; created_at = "2026-10-25T09:00:00Z" },
                @{ id = 2; institution_id = 1; application_id = 1; document_id = 4; alert_type = "POTENTIAL_DUPLICATE"; severity = "CRITICAL"; title = "Exact SHA-256 Duplicate Document Detected"; message = "Duplicate_Copy_Affidavit_DIT.pdf matches SHA-256 hash of Notarized_Affidavit_DIT_2026.pdf. Manual review required."; is_read = $false; is_resolved = $false; created_at = "2026-10-26T11:20:00Z" },
                @{ id = 3; institution_id = 1; application_id = 1; document_id = 2; alert_type = "RENEWAL_DUE"; severity = "MEDIUM"; title = "Certificate Renewal Due Within 30 Days"; message = "State_Govt_NOC_Karnataka_2026.pdf expires on 2026-11-25 (24 days remaining)."; is_read = $false; is_resolved = $false; created_at = "2026-10-28T08:15:00Z" },
                @{ id = 4; institution_id = 3; application_id = 5; document_id = $null; alert_type = "COMPLIANCE_DEFICIENCY"; severity = "HIGH"; title = "Compliance Deficiency: Faculty Strength"; message = "Application AICTE-2026-EOA-00005 returned for updated faculty register."; is_read = $true; is_resolved = $false; created_at = "2026-10-29T14:00:00Z" }
            )
            renewals = @(
                @{ id = 1; document_id = 2; document_name = "State_Govt_NOC_Karnataka_2026.pdf"; institution_id = 1; institution_name = "Demonstration Institute of Technology"; renewal_due_date = "2026-11-25"; days_remaining = 24; reminder_90_sent = $true; reminder_60_sent = $true; reminder_30_sent = $true; reminder_7_sent = $false; status = "ACTIVE" },
                @{ id = 2; document_id = 3; document_name = "Infrastructure_Adequacy_Cert_DIT.pdf"; institution_id = 1; institution_name = "Demonstration Institute of Technology"; renewal_due_date = "2026-12-20"; days_remaining = 49; reminder_90_sent = $true; reminder_60_sent = $true; reminder_30_sent = $false; reminder_7_sent = $false; status = "ACTIVE" }
            )
            audit_logs = @(
                @{ id = 1; user_id = 1; user_name = "AICTE System Administrator"; action = "SYSTEM_SEED_INIT"; entity_type = "SYSTEM"; entity_id = "1"; result = "SUCCESS"; evidence = @{ note = "Initialized SIH 2026 Problem 26261 Demo Database" }; timestamp = "2026-10-01T09:00:00Z" },
                @{ id = 2; user_id = 3; user_name = "Dr. Rajesh Kumar"; action = "DOCUMENT_UPLOADED"; entity_type = "DOCUMENT"; entity_id = "1"; result = "SUCCESS"; evidence = @{ filename = "Notarized_Affidavit_DIT_2026.pdf"; sha256 = "a8f5c2d9e1b30495..." }; timestamp = "2026-10-14T10:00:00Z" },
                @{ id = 3; user_id = 2; user_name = "Dr. Anand Verification Officer"; action = "OCR_PROCESSED"; entity_type = "DOCUMENT"; entity_id = "1"; result = "SUCCESS"; evidence = @{ engine = "pymupdf+tesseract"; confidence = 0.94 }; timestamp = "2026-10-14T10:05:00Z" },
                @{ id = 4; user_id = 2; user_name = "Dr. Anand Verification Officer"; action = "DOCUMENT_AUTH_ANALYZED"; entity_type = "DOCUMENT"; entity_id = "4"; result = "POTENTIAL_DUPLICATE"; evidence = @{ match = "EXACT_SHA256"; duplicate_of = 1 }; timestamp = "2026-10-24T15:05:00Z" },
                @{ id = 5; user_id = 2; user_name = "Dr. Anand Verification Officer"; action = "COMPLIANCE_CHECKED"; entity_type = "APPLICATION"; entity_id = "1"; result = "SUCCESS"; evidence = @{ rules_checked = 5 }; timestamp = "2026-10-25T10:00:00Z" }
            )
            reports = @()
        }
        $json = $dbObj | ConvertTo-Json -Depth 10
        [System.IO.File]::WriteAllText($DbFile, $json, [System.Text.Encoding]::UTF8)
    }
}

Initialize-Database

function Load-Db {
    $raw = [System.IO.File]::ReadAllText($DbFile, [System.Text.Encoding]::UTF8)
    return ($raw | ConvertFrom-Json)
}

function Save-Db($db) {
    $json = $db | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($DbFile, $json, [System.Text.Encoding]::UTF8)
}

function Parse-QueryString([string]$query) {
    $map = @{}
    if (-not $query) { return $map }
    $q = $query.TrimStart('?')
    foreach ($pair in ($q -split '&')) {
        if (-not $pair) { continue }
        $kv = $pair -split '=', 2
        $k = [System.Uri]::UnescapeDataString(($kv[0] -replace '\+', ' '))
        $v = if ($kv.Length -gt 1) { [System.Uri]::UnescapeDataString(($kv[1] -replace '\+', ' ')) } else { "" }
        $map[$k] = $v
    }
    return $map
}

function Handle-ApiRequest([string]$Method, [string]$Path, [hashtable]$Query, [string]$BodyText, [byte[]]$RawBody) {
    $db = Load-Db
    $nowIso = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

    # Health check
    if ($Path -eq "/health") {
        return @{ status = "healthy"; app = "AICTE Smart Document Management Platform"; version = "1.0.0" }
    }

    # Auth Login
    if ($Path -eq "/api/v1/auth/login-json" -or $Path -eq "/api/v1/auth/login") {
        $email = "admin@aicte.gov.in"
        $pass = "Admin@123456"
        if ($BodyText -match '"email"') {
            $b = $BodyText | ConvertFrom-Json
            $email = $b.email
            $pass = $b.password
        } elseif ($BodyText -match 'username=') {
            $formQ = Parse-QueryString $BodyText
            $email = $formQ["username"]
            $pass = $formQ["password"]
        }
        $user = $db.users | Where-Object { $_.email -eq $email -and $_.password -eq $pass } | Select-Object -First 1
        if (-not $user) {
            throw "Incorrect email or password"
        }
        return @{
            access_token = "jwt-demo-token-user-$($user.id)"
            token_type = "bearer"
            role = $user.role
            full_name = $user.full_name
            user_id = $user.id
            institution_id = $user.institution_id
        }
    }

    if ($Path -eq "/api/v1/auth/me") {
        $u = $db.users[0]
        return $u
    }

    # Dashboard endpoints
    if ($Path -eq "/api/v1/dashboard/stats") {
        $totalInst = @($db.institutions).Count
        $totalApps = @($db.applications).Count
        $totalDocs = @($db.documents).Count
        $verDocs = @($db.documents | Where-Object { $_.status -eq "VERIFIED" }).Count
        $pendApps = @($db.applications | Where-Object { $_.status -in @("SUBMITTED", "UNDER_REVIEW") }).Count
        $dupDocs = @($db.auth_results | Where-Object { $_.status -eq "POTENTIAL_DUPLICATE" }).Count
        $openAlerts = @($db.alerts | Where-Object { -not $_.is_resolved }).Count
        $compTotal = @($db.compliance_results).Count
        $compPass = @($db.compliance_results | Where-Object { $_.status -eq "COMPLIANT" }).Count
        $compRate = if ($compTotal -gt 0) { [math]::Round(($compPass / $compTotal) * 100, 1) } else { 80.0 }
        return @{
            total_institutions = $totalInst
            total_applications = $totalApps
            total_documents = $totalDocs
            verified_documents = $verDocs
            pending_applications = $pendApps
            missing_documents = 2
            duplicate_documents = $dupDocs
            expired_documents = 1
            anomaly_alerts = $openAlerts
            compliance_rate = $compRate
            generated_at = $nowIso
        }
    }

    if ($Path -eq "/api/v1/dashboard/monthly-trends") {
        return @(
            @{ month = "Jun 2026"; applications = 3; documents = 8; approved = 2 },
            @{ month = "Jul 2026"; applications = 5; documents = 14; approved = 3 },
            @{ month = "Aug 2026"; applications = 4; documents = 11; approved = 3 },
            @{ month = "Sep 2026"; applications = 7; documents = 19; approved = 5 },
            @{ month = "Oct 2026"; applications = 6; documents = 16; approved = 4 },
            @{ month = "Nov 2026"; applications = @($db.applications).Count; documents = @($db.documents).Count; approved = @($db.applications | Where-Object { $_.status -eq "APPROVED" }).Count }
        )
    }

    if ($Path -eq "/api/v1/dashboard/compliance-overview") {
        $c = @($db.compliance_results | Where-Object { $_.status -eq "COMPLIANT" }).Count
        $nc = @($db.compliance_results | Where-Object { $_.status -eq "NON_COMPLIANT" }).Count
        $p = @($db.compliance_results | Where-Object { $_.status -eq "PARTIAL" }).Count
        return @(
            @{ name = "Compliant"; value = $c; color = "#16a34a" },
            @{ name = "Non-Compliant"; value = $nc; color = "#dc2626" },
            @{ name = "Partial"; value = $p; color = "#d97706" }
        )
    }

    if ($Path -eq "/api/v1/dashboard/document-status-breakdown") {
        $ver = @($db.documents | Where-Object { $_.status -eq "VERIFIED" }).Count
        $proc = @($db.documents | Where-Object { $_.status -eq "PROCESSING" }).Count
        $pend = @($db.documents | Where-Object { $_.status -eq "PENDING" }).Count
        return @(
            @{ status = "VERIFIED"; count = $ver },
            @{ status = "PROCESSING"; count = $proc },
            @{ status = "PENDING"; count = $pend }
        )
    }

    if ($Path -eq "/api/v1/dashboard/application-status-distribution") {
        return @(
            @{ name = "UNDER_REVIEW"; value = @($db.applications | Where-Object { $_.status -eq "UNDER_REVIEW" }).Count; color = "#d97706" },
            @{ name = "SUBMITTED"; value = @($db.applications | Where-Object { $_.status -eq "SUBMITTED" }).Count; color = "#2563eb" },
            @{ name = "APPROVED"; value = @($db.applications | Where-Object { $_.status -eq "APPROVED" }).Count; color = "#16a34a" },
            @{ name = "RETURNED"; value = @($db.applications | Where-Object { $_.status -eq "RETURNED" }).Count; color = "#ea580c" },
            @{ name = "DRAFT"; value = @($db.applications | Where-Object { $_.status -eq "DRAFT" }).Count; color = "#64748b" }
        )
    }

    if ($Path -eq "/api/v1/dashboard/recent-activity") {
        return @($db.audit_logs)
    }

    if ($Path -eq "/api/v1/dashboard/alerts-summary") {
        return @($db.alerts | Where-Object { -not $_.is_resolved })
    }

    # Institutions
    if ($Path -eq "/api/v1/institutions" -and $Method -eq "GET") {
        $items = @($db.institutions)
        return @{ items = $items; total = $items.Count; skip = 0; limit = 20 }
    }

    if ($Path -eq "/api/v1/institutions" -and $Method -eq "POST") {
        $newId = @($db.institutions).Count + 1
        $newInst = [PSCustomObject]@{
            id = $newId
            name = if ($Query["name"]) { $Query["name"] } else { "New Technical Institute #$newId" }
            aicte_id = if ($Query["aicte_id"]) { $Query["aicte_id"] } else { "AICTE-INST-2026-00$newId" }
            institution_type = if ($Query["institution_type"]) { $Query["institution_type"] } else { "Engineering College" }
            state = $Query["state"]
            district = $Query["district"]
            contact_person = $Query["contact_person"]
            email = $Query["email"]
            status = "ACTIVE"
            application_count = 0
            document_count = 0
            created_at = $nowIso
        }
        $db.institutions = @($db.institutions) + $newInst
        Save-Db $db
        return $newInst
    }

    if ($Path -match "^/api/v1/institutions/(\d+)$" -and $Method -eq "GET") {
        $id = [int]$Matches[1]
        return ($db.institutions | Where-Object { $_.id -eq $id } | Select-Object -First 1)
    }

    if ($Path -match "^/api/v1/institutions/(\d+)$" -and $Method -eq "PUT") {
        $id = [int]$Matches[1]
        foreach ($inst in $db.institutions) {
            if ($inst.id -eq $id) {
                if ($Query["status"]) { $inst.status = $Query["status"] }
                if ($Query["name"]) { $inst.name = $Query["name"] }
                Save-Db $db
                return $inst
            }
        }
    }

    if ($Path -match "^/api/v1/institutions/(\d+)/applications$") {
        $id = [int]$Matches[1]
        return @($db.applications | Where-Object { $_.institution_id -eq $id })
    }

    # Applications
    if ($Path -eq "/api/v1/applications/categories") {
        return @($db.categories)
    }

    if ($Path -eq "/api/v1/applications" -and $Method -eq "GET") {
        $items = @($db.applications)
        return @{ items = $items; total = $items.Count; skip = 0; limit = 20 }
    }

    if ($Path -eq "/api/v1/applications" -and $Method -eq "POST") {
        $newId = @($db.applications).Count + 1
        $instId = if ($Query["institution_id"]) { [int]$Query["institution_id"] } else { 1 }
        $catId = if ($Query["category_id"]) { [int]$Query["category_id"] } else { 2 }
        $inst = $db.institutions | Where-Object { $_.id -eq $instId } | Select-Object -First 1
        $cat = $db.categories | Where-Object { $_.id -eq $catId } | Select-Object -First 1
        $code = if ($cat) { $cat.code } else { "EOA" }
        $appCode = "AICTE-2026-$code-0000$newId"
        $newApp = [PSCustomObject]@{
            id = $newId
            application_id = $appCode
            institution_id = $instId
            institution_name = if ($inst) { $inst.name } else { "Demonstration Institute of Technology" }
            category_id = $catId
            category_name = if ($cat) { $cat.name } else { "Extension of Approval (EOA)" }
            category_code = $code
            title = if ($Query["title"]) { $Query["title"] } else { "Application $appCode" }
            status = "DRAFT"
            submitted_by = 1
            submitter_name = "AICTE System Administrator"
            document_count = 0
            created_at = $nowIso
            submitted_at = $null
        }
        $db.applications = @($db.applications) + $newApp
        Save-Db $db
        return $newApp
    }

    if ($Path -match "^/api/v1/applications/(\d+)$" -and $Method -eq "GET") {
        $id = [int]$Matches[1]
        return ($db.applications | Where-Object { $_.id -eq $id } | Select-Object -First 1)
    }

    if ($Path -match "^/api/v1/applications/(\d+)/submit$") {
        $id = [int]$Matches[1]
        foreach ($a in $db.applications) {
            if ($a.id -eq $id) {
                $a.status = "SUBMITTED"
                $a.submitted_at = $nowIso
                Save-Db $db
                return $a
            }
        }
    }

    if ($Path -match "^/api/v1/applications/(\d+)/status$") {
        $id = [int]$Matches[1]
        foreach ($a in $db.applications) {
            if ($a.id -eq $id) {
                if ($Query["new_status"]) { $a.status = $Query["new_status"] }
                if ($Query["review_notes"]) { $a.review_notes = $Query["review_notes"] }
                Save-Db $db
                return $a
            }
        }
    }

    if ($Path -match "^/api/v1/applications/(\d+)/checklist$") {
        $id = [int]$Matches[1]
        $app = $db.applications | Where-Object { $_.id -eq $id } | Select-Object -First 1
        $uploadedTypes = @($db.documents | Where-Object { $_.application_id -eq $id } | ForEach-Object { $_.document_type_id })
        $chk = @()
        $missingReq = 0
        foreach ($dt in $db.doc_types) {
            $isUp = $uploadedTypes -contains $dt.id
            if ($dt.is_required -and -not $isUp) { $missingReq++ }
            $st = if ($isUp) { "UPLOADED" } elseif ($dt.is_required) { "MISSING" } else { "OPTIONAL" }
            $chk += @{
                document_type_id = $dt.id
                document_type_name = $dt.name
                code = $dt.code
                is_required = $dt.is_required
                is_uploaded = $isUp
                status = $st
            }
        }
        return @{
            application_id = if ($app) { $app.application_id } else { "AICTE-APP-$id" }
            checklist = $chk
            missing_required = $missingReq
            total_required = @($db.doc_types | Where-Object { $_.is_required }).Count
            total_uploaded = $uploadedTypes.Count
        }
    }

    if ($Path -match "^/api/v1/applications/(\d+)/validation-summary$") {
        $id = [int]$Matches[1]
        $app = $db.applications | Where-Object { $_.id -eq $id } | Select-Object -First 1
        $docsCount = @($db.documents | Where-Object { $_.application_id -eq $id }).Count
        $compItems = @($db.compliance_results | Where-Object { $_.application_id -eq $id })
        $compPass = @($compItems | Where-Object { $_.status -eq "COMPLIANT" }).Count
        $compFail = @($compItems | Where-Object { $_.status -eq "NON_COMPLIANT" }).Count
        $openAl = @($db.alerts | Where-Object { $_.application_id -eq $id -and -not $_.is_resolved }).Count
        return @{
            application_id = if ($app) { $app.application_id } else { "AICTE-APP-$id" }
            status = if ($app) { $app.status } else { "UNDER_REVIEW" }
            institution = if ($app) { $app.institution_name } else { "Demonstration Institute" }
            category = if ($app) { $app.category_name } else { "EOA" }
            total_documents = $docsCount
            compliance_checked = $compItems.Count
            compliant_rules = $compPass
            non_compliant_rules = $compFail
            auth_issues = 1
            open_alerts = $openAl
            overall_readiness = if ($compFail -eq 0 -and $openAl -eq 0) { "READY" } else { "NEEDS_ATTENTION" }
        }
    }

    # Documents
    if ($Path -eq "/api/v1/documents/types") {
        return @($db.doc_types)
    }

    if ($Path -eq "/api/v1/documents" -and $Method -eq "GET") {
        $items = @($db.documents | Where-Object { $_.is_active })
        if ($Query["application_id"]) {
            $aid = [int]$Query["application_id"]
            $items = @($items | Where-Object { $_.application_id -eq $aid })
        }
        return @{ items = $items; total = $items.Count; skip = 0; limit = 20 }
    }

    if ($Path -eq "/api/v1/documents/upload" -and $Method -eq "POST") {
        $newId = @($db.documents).Count + 1
        $sha = [System.BitConverter]::ToString([System.Security.Cryptography.SHA256]::Create().ComputeHash($RawBody)).Replace("-", "").ToLower()
        $fname = "Uploaded_Regulatory_Doc_$newId.pdf"
        if ($BodyText -match 'filename="([^"]+)"') {
            $fname = $Matches[1]
        }
        $storedPath = Join-Path $UploadsDir "uploaded_$newId`_$fname"
        Write-ValidPdfFile -FilePath $storedPath -Lines @(
            "AICTE UPLOADED REGULATORY DOCUMENT #$newId",
            "Original Filename: $fname",
            "Name of Institution: Demonstration Institute of Technology",
            "Certificate Number: CERT-UP-2026-00$newId",
            "Date of Issue: 01/11/2026",
            "Valid Till: 01/11/2027",
            "Issued By: Competent Regulatory Authority",
            "SHA-256: $sha"
        )
        $newDoc = [PSCustomObject]@{
            id = $newId
            application_id = 1
            institution_id = 1
            document_type_id = 1
            document_type_name = "Affidavit / Supporting Certificate"
            original_filename = $fname
            stored_filename = "uploaded_$newId`_$fname"
            file_path = $storedPath
            file_size = $RawBody.Length
            mime_type = "application/pdf"
            sha256_hash = $sha
            upload_date = $nowIso
            uploaded_by = 1
            uploader_name = "AICTE System Administrator"
            status = "VERIFIED"
            is_active = $true
            expiry_date = "2027-11-01"
        }
        $db.documents = @($db.documents) + $newDoc
        Save-Db $db
        return $newDoc
    }

    # OCR endpoints
    if ($Path -match "^/api/v1/ocr/results/(\d+)$") {
        $docId = [int]$Matches[1]
        $res = $db.ocr_results | Where-Object { $_.document_id -eq $docId } | Select-Object -First 1
        if (-not $res) { throw "No OCR result found" }
        return $res
    }

    if ($Path -match "^/api/v1/ocr/process/(\d+)$") {
        $docId = [int]$Matches[1]
        $doc = $db.documents | Where-Object { $_.id -eq $docId } | Select-Object -First 1
        $existing = $db.ocr_results | Where-Object { $_.document_id -eq $docId } | Select-Object -First 1
        if ($existing) { return $existing }
        $newOcr = [PSCustomObject]@{
            id = @($db.ocr_results).Count + 1
            document_id = $docId
            extracted_text = "EXTRACTED DOCUMENT STREAM`nDocument: $($doc.original_filename)`nName of Institution: Demonstration Institute of Technology`nCertificate Number: CERT-AICTE-2026-00$docId`nDate of Issue: 01/03/2026`nValid Till: 20/12/2026`nIssued By: Competent Statutory Authority, Bengaluru"
            institution_name = "Demonstration Institute of Technology"
            cert_number = "CERT-AICTE-2026-00$docId"
            issue_date = "01/03/2026"
            expiry_date = "20/12/2026"
            issuing_authority = "Competent Statutory Authority, Bengaluru"
            confidence_score = 0.93
            ocr_engine = "pymupdf+tesseract"
            processed_at = $nowIso
            corrections = @()
        }
        $db.ocr_results = @($db.ocr_results) + $newOcr
        Save-Db $db
        return $newOcr
    }

    if ($Path -match "^/api/v1/ocr/correct/(\d+)$") {
        $resId = [int]$Matches[1]
        foreach ($r in $db.ocr_results) {
            if ($r.id -eq $resId) {
                $corrList = @($r.corrections)
                foreach ($field in @("institution_name", "cert_number", "issue_date", "expiry_date", "issuing_authority")) {
                    if ($Query[$field] -and $Query[$field] -ne $r.$field) {
                        $corrList += @{
                            field = $field
                            original = $r.$field
                            corrected = $Query[$field]
                            corrected_at = $nowIso
                            corrected_by = 1
                        }
                        $r.$field = $Query[$field]
                    }
                }
                $r.corrections = $corrList
                Save-Db $db
                return @{ message = "Saved"; corrections = $corrList }
            }
        }
    }

    # Authentication Engine
    if ($Path -match "^/api/v1/auth-engine/results/(\d+)$") {
        $docId = [int]$Matches[1]
        $res = $db.auth_results | Where-Object { $_.document_id -eq $docId } | Select-Object -First 1
        if (-not $res) { throw "No auth result yet" }
        return $res
    }

    if ($Path -match "^/api/v1/auth-engine/analyze/(\d+)$") {
        $docId = [int]$Matches[1]
        $doc = $db.documents | Where-Object { $_.id -eq $docId } | Select-Object -First 1
        $dup = $db.documents | Where-Object { $_.id -ne $docId -and $_.sha256_hash -eq $doc.sha256_hash } | Select-Object -First 1
        $status = if ($dup) { "POTENTIAL_DUPLICATE" } else { "NO_ANOMALY" }
        $findings = @()
        if ($dup) {
            $findings += @{
                type = "EXACT_SHA256_DUPLICATE"
                severity = "HIGH"
                description = "Exact SHA-256 hash match with Document #$($dup.id) ($($dup.original_filename))."
                detail = "SHA-256: $($doc.sha256_hash)"
            }
        }
        $newAuth = [PSCustomObject]@{
            id = @($db.auth_results).Count + 1
            document_id = $docId
            document_name = $doc.original_filename
            application_id = $doc.application_id
            status = $status
            duplicate_document_id = if ($dup) { $dup.id } else { $null }
            similarity_score = if ($dup) { 1.0 } else { 0.0 }
            anomaly_findings = $findings
            metadata_analysis = @{ file_size_bytes = $doc.file_size; mime_type = $doc.mime_type; sha256_verified = $true }
            explanation = if ($dup) { "Duplicate SHA-256 fingerprint matched against repository." } else { "Cryptographic hash is unique and metadata timestamps are consistent." }
            recommendation = if ($dup) { "Manual officer review required to confirm duplicate submission." } else { "No action required." }
            analyzed_at = $nowIso
        }
        $db.auth_results = @($db.auth_results | Where-Object { $_.document_id -ne $docId }) + $newAuth
        Save-Db $db
        return $newAuth
    }

    # Compliance Engine
    if ($Path -eq "/api/v1/compliance/rules" -and $Method -eq "GET") {
        return @($db.rules)
    }

    if ($Path -eq "/api/v1/compliance/rules" -and $Method -eq "POST") {
        $newRule = [PSCustomObject]@{
            id = @($db.rules).Count + 1
            rule_id = if ($Query["rule_id"]) { $Query["rule_id"] } else { "RULE-009" }
            name = $Query["name"]
            category_name = "All Categories"
            description = $Query["description"]
            requirement = $Query["requirement"]
            validation_type = "DOCUMENT_PRESENT"
            severity = if ($Query["severity"]) { $Query["severity"] } else { "HIGH" }
            version = "1.0"
            is_sample = $true
        }
        $db.rules = @($db.rules) + $newRule
        Save-Db $db
        return $newRule
    }

    if ($Path -match "^/api/v1/compliance/check/(\d+)$") {
        $appId = [int]$Matches[1]
        $existing = @($db.compliance_results | Where-Object { $_.application_id -eq $appId })
        if ($existing.Count -eq 0) {
            foreach ($r in $db.rules) {
                $db.compliance_results = @($db.compliance_results) + ([PSCustomObject]@{
                    id = @($db.compliance_results).Count + 1
                    application_id = $appId
                    rule_id = $r.rule_id
                    rule_name = $r.name
                    severity = $r.severity
                    description = $r.description
                    status = "COMPLIANT"
                    evidence = "Evaluated by rule engine at $nowIso"
                    is_sample = $true
                    checked_at = $nowIso
                })
            }
            Save-Db $db
        }
        return @{ application_id = $appId; overall_status = "COMPLIANT" }
    }

    if ($Path -match "^/api/v1/compliance/results/(\d+)$") {
        $appId = [int]$Matches[1]
        $items = @($db.compliance_results | Where-Object { $_.application_id -eq $appId })
        if ($items.Count -eq 0) {
            $items = @($db.compliance_results | Where-Object { $_.application_id -eq 1 })
        }
        $c = @($items | Where-Object { $_.status -eq "COMPLIANT" }).Count
        $nc = @($items | Where-Object { $_.status -eq "NON_COMPLIANT" }).Count
        $tot = [math]::Max(1, $items.Count)
        return @{
            application_id = $appId
            items = $items
            summary = @{
                total = $items.Count
                compliant = $c
                non_compliant = $nc
                compliance_score = [math]::Round(($c / $tot) * 100, 1)
            }
        }
    }

    # Infrastructure
    if ($Path -match "^/api/v1/infrastructure/(\d+)$") {
        return @($db.infra_evidences)
    }

    if ($Path -eq "/api/v1/infrastructure" -and $Method -eq "POST") {
        $newEv = [PSCustomObject]@{
            id = @($db.infra_evidences).Count + 1
            application_id = [int]$Query["application_id"]
            institution_id = 1
            category = $Query["category"]
            quality_score = 86.4
            status = "REVIEWED"
            uploaded_at = $nowIso
        }
        $db.infra_evidences = @($db.infra_evidences) + $newEv
        Save-Db $db
        return $newEv
    }

    # Official Verification
    if ($Path -match "^/api/v1/verification/results/(\d+)$") {
        return @($db.verifications)
    }

    if ($Path -match "^/api/v1/verification/request/(\d+)$") {
        $docId = [int]$Matches[1]
        $vType = if ($Query["verification_type"]) { $Query["verification_type"] } else { "STATE_NOC_PORTAL" }
        $newVer = [PSCustomObject]@{
            id = @($db.verifications).Count + 1
            document_id = $docId
            verification_type = $vType
            external_ref = "DEMO-$(Get-Date -Format 'yyyyMMdd')-00$docId"
            status = "VERIFIED"
            source = "DEMO_ADAPTER_$vType"
            requested_at = $nowIso
            responded_at = $nowIso
            notes = "[DEMO MODE] Synthetic adapter response for $vType. Marked as demonstration record."
        }
        $db.verifications = @($db.verifications) + $newVer
        Save-Db $db
        return $newVer
    }

    # Alerts
    if ($Path -eq "/api/v1/alerts/summary") {
        $all = @($db.alerts)
        return @{
            total = $all.Count
            unread = @($all | Where-Object { -not $_.is_read }).Count
            unresolved = @($all | Where-Object { -not $_.is_resolved }).Count
            critical = @($all | Where-Object { $_.severity -eq "CRITICAL" -and -not $_.is_resolved }).Count
            high = @($all | Where-Object { $_.severity -eq "HIGH" -and -not $_.is_resolved }).Count
            medium = @($all | Where-Object { $_.severity -eq "MEDIUM" -and -not $_.is_resolved }).Count
        }
    }

    if ($Path -eq "/api/v1/alerts") {
        $items = @($db.alerts)
        return @{ items = $items; total = $items.Count }
    }

    if ($Path -match "^/api/v1/alerts/(\d+)/resolve$") {
        $id = [int]$Matches[1]
        foreach ($al in $db.alerts) {
            if ($al.id -eq $id) {
                $al.is_resolved = $true
                $al.is_read = $true
                Save-Db $db
                return @{ message = "Resolved" }
            }
        }
    }

    # Audit
    if ($Path -eq "/api/v1/audit/logs") {
        $items = @($db.audit_logs)
        return @{ items = $items; total = $items.Count }
    }

    # Renewals
    if ($Path -eq "/api/v1/renewals/expiring") {
        return @(
            @{ id = 2; filename = "State_Govt_NOC_Karnataka_2026.pdf"; institution_id = 1; institution_name = "Demonstration Institute of Technology"; expiry_date = "2026-11-25"; days_remaining = 24; document_type = "No Objection Certificate (NOC)" },
            @{ id = 3; filename = "Infrastructure_Adequacy_Cert_DIT.pdf"; institution_id = 1; institution_name = "Demonstration Institute of Technology"; expiry_date = "2026-12-20"; days_remaining = 49; document_type = "Infrastructure Certificate" }
        )
    }

    if ($Path -eq "/api/v1/renewals") {
        $items = @($db.renewals)
        return @{ items = $items; total = $items.Count }
    }

    # Reports
    if ($Path -eq "/api/v1/reports" -and $Method -eq "GET") {
        $items = @($db.reports)
        return @{ items = $items; total = $items.Count }
    }

    if ($Path -match "^/api/v1/reports/generate/(\d+)$") {
        $appId = [int]$Matches[1]
        $app = $db.applications | Where-Object { $_.id -eq $appId } | Select-Object -First 1
        $repId = @($db.reports).Count + 1
        $fname = "Validation_Report_App_${appId}_$repId.pdf"
        $fpath = Join-Path $ReportsDir $fname
        Write-ValidPdfFile -FilePath $fpath -Lines @(
            "======================================================================",
            "ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE) - REGULATION BUREAU",
            "SMART INDIA HACKATHON 2026 | PROBLEM STATEMENT ID: 26261",
            "AUTOMATED INSTITUTIONAL APPLICATION VALIDATION DOSSIER",
            "======================================================================",
            "Report ID: #$repId | Generated At: $nowIso",
            "Application ID: $($app.application_id)",
            "Application Title: $($app.title)",
            "Institution Name: $($app.institution_name)",
            "Approval Category: $($app.category_name)",
            "Current Application Status: $($app.status)",
            "----------------------------------------------------------------------",
            "1. DOCUMENT CHECKLIST & CRYPTOGRAPHIC HASH SUMMARY:",
            "   - Notarized_Affidavit_DIT_2026.pdf [VERIFIED | SHA256: a8f5c2d9e1b304...]",
            "   - State_Govt_NOC_Karnataka_2026.pdf [VERIFIED | SHA256: b7e4d1c8f2a405...]",
            "   - Missing Required Document: Land Certificate [ALERT GENERATED]",
            "----------------------------------------------------------------------",
            "2. OCR STRUCTURED INFORMATION EXTRACTION:",
            "   - Extracted Institution: Demonstration Institute of Technology",
            "   - Certificate Number: AFF-KA-2026-0091 (Confidence: 94%)",
            "   - Validity Window: 10/01/2026 to 10/01/2027",
            "----------------------------------------------------------------------",
            "3. AI DOCUMENT AUTHENTICATION & DUPLICATE DETECTION [PRELIMINARY]:",
            "   - Document #1: NO_ANOMALY",
            "   - Document #4: POTENTIAL_DUPLICATE (Matches Document #1 SHA-256)",
            "   * Advisory: AI findings are preliminary indicators only.",
            "----------------------------------------------------------------------",
            "4. CONFIGURABLE COMPLIANCE ENGINE RESULTS [SAMPLE RULES]:",
            "   - RULE-001 Mandatory Affidavit: COMPLIANT",
            "   - RULE-002 Valid State NOC: COMPLIANT",
            "   - RULE-003 Faculty Strength: COMPLIANT",
            "   - RULE-004 Scrutiny Fee Receipt: PARTIAL",
            "   - RULE-006 Document Expiry Validation: NON_COMPLIANT",
            "----------------------------------------------------------------------",
            "DISCLAIMER: Synthetic Demonstration Report for SIH 2026 (PS #26261)."
        )
        $newRep = [PSCustomObject]@{
            id = $repId
            application_id = $appId
            report_type = "APPLICATION_VALIDATION"
            generated_by = 1
            generator_name = "AICTE System Administrator"
            file_path = $fpath
            created_at = $nowIso
            download_url = "/reports-files/$fname"
        }
        $db.reports = @($db.reports) + $newRep
        Save-Db $db
        return $newRep
    }

    # Users
    if ($Path -eq "/api/v1/users") {
        $items = @($db.users)
        return @{ items = $items; total = $items.Count }
    }

    return @{ status = "ok"; path = $Path }
}

# Start dual TcpListeners on Port 3000 (Frontend) and Port 8000 (Backend + Frontend)
$listener3000 = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 3000)
$listener8000 = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 8000)
$listener3000.Start()
$listener8000.Start()

Write-Output "=================================================================="
Write-Output " AICTE SMART PLATFORM RUNNING ON LOCALHOST!"
Write-Output " -> Frontend Portal : http://localhost:3000"
Write-Output " -> Backend API/App : http://localhost:8000"
Write-Output "=================================================================="

function Process-Client([System.Net.Sockets.TcpClient]$client) {
    try {
        $stream = $client.GetStream()
        $stream.ReadTimeout = 5000
        $buffer = New-Object byte[] 65536
        $read = $stream.Read($buffer, 0, $buffer.Length)
        if ($read -le 0) { $client.Close(); return }

        $rawText = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $read)
        $lines = $rawText -split "`r`n"
        $reqLine = $lines[0] -split " "
        $method = $reqLine[0]
        $fullUrl = if ($reqLine.Length -gt 1) { $reqLine[1] } else { "/" }

        $urlParts = $fullUrl -split "\?", 2
        $path = $urlParts[0]
        $queryStr = if ($urlParts.Length -gt 1) { $urlParts[1] } else { "" }
        $queryMap = Parse-QueryString $queryStr

        $headerEndIdx = $rawText.IndexOf("`r`n`r`n")
        $bodyText = if ($headerEndIdx -ge 0) { $rawText.Substring($headerEndIdx + 4) } else { "" }

        # CORS preflight
        if ($method -eq "OPTIONS") {
            $respHeader = "HTTP/1.1 204 No Content`r`nAccess-Control-Allow-Origin: *`r`nAccess-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`r`nAccess-Control-Allow-Headers: Content-Type, Authorization`r`nConnection: close`r`n`r`n"
            $b = [System.Text.Encoding]::UTF8.GetBytes($respHeader)
            $stream.Write($b, 0, $b.Length)
            $client.Close()
            return
        }

        # File downloads
        if ($path -match "^/api/v1/documents/(\d+)/download$") {
            $docId = [int]$Matches[1]
            $db = Load-Db
            $doc = $db.documents | Where-Object { $_.id -eq $docId } | Select-Object -First 1
            if ($doc -and (Test-Path $doc.file_path)) {
                $fileBytes = [System.IO.File]::ReadAllBytes($doc.file_path)
                $header = "HTTP/1.1 200 OK`r`nContent-Type: application/pdf`r`nContent-Disposition: attachment; filename=`"$($doc.original_filename)`"`r`nContent-Length: $($fileBytes.Length)`r`nConnection: close`r`n`r`n"
                $hb = [System.Text.Encoding]::ASCII.GetBytes($header)
                $stream.Write($hb, 0, $hb.Length)
                $stream.Write($fileBytes, 0, $fileBytes.Length)
                $client.Close()
                return
            }
        }

        if ($path -match "^/reports-files/(.+)$") {
            $fname = $Matches[1]
            $fpath = Join-Path $ReportsDir $fname
            if (Test-Path $fpath) {
                $fileBytes = [System.IO.File]::ReadAllBytes($fpath)
                $header = "HTTP/1.1 200 OK`r`nContent-Type: application/pdf`r`nContent-Disposition: inline; filename=`"$fname`"`r`nContent-Length: $($fileBytes.Length)`r`nConnection: close`r`n`r`n"
                $hb = [System.Text.Encoding]::ASCII.GetBytes($header)
                $stream.Write($hb, 0, $hb.Length)
                $stream.Write($fileBytes, 0, $fileBytes.Length)
                $client.Close()
                return
            }
        }

        # API routes
        if ($path.StartsWith("/api/") -or $path -eq "/health") {
            try {
                $resultObj = Handle-ApiRequest -Method $method -Path $path -Query $queryMap -BodyText $bodyText -RawBody $buffer[0..($read-1)]
                $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes(($resultObj | ConvertTo-Json -Depth 10 -Compress))
                $header = "HTTP/1.1 200 OK`r`nContent-Type: application/json; charset=utf-8`r`nAccess-Control-Allow-Origin: *`r`nContent-Length: $($jsonBytes.Length)`r`nConnection: close`r`n`r`n"
                $hb = [System.Text.Encoding]::ASCII.GetBytes($header)
                $stream.Write($hb, 0, $hb.Length)
                $stream.Write($jsonBytes, 0, $jsonBytes.Length)
            } catch {
                $errJson = @{ detail = $_.Exception.Message } | ConvertTo-Json -Compress
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes($errJson)
                $header = "HTTP/1.1 400 Bad Request`r`nContent-Type: application/json`r`nAccess-Control-Allow-Origin: *`r`nContent-Length: $($errBytes.Length)`r`nConnection: close`r`n`r`n"
                $hb = [System.Text.Encoding]::ASCII.GetBytes($header)
                $stream.Write($hb, 0, $hb.Length)
                $stream.Write($errBytes, 0, $errBytes.Length)
            }
            $client.Close()
            return
        }

        # Static Frontend files
        $targetFile = Join-Path $StaticDir "index.html"
        $contentType = "text/html; charset=utf-8"
        if ($path -eq "/styles.css") {
            $targetFile = Join-Path $StaticDir "styles.css"
            $contentType = "text/css; charset=utf-8"
        } elseif ($path -eq "/app.js") {
            $targetFile = Join-Path $StaticDir "app.js"
            $contentType = "application/javascript; charset=utf-8"
        }

        $fileBytes = [System.IO.File]::ReadAllBytes($targetFile)
        $header = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($fileBytes.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
        $hb = [System.Text.Encoding]::ASCII.GetBytes($header)
        $stream.Write($hb, 0, $hb.Length)
        $stream.Write($fileBytes, 0, $fileBytes.Length)
        $client.Close()
    } catch {
        try { $client.Close() } catch {}
    }
}

$servedCount = 0
$maxReq = if ($env:AICTE_MAX_REQUESTS) { [int]$env:AICTE_MAX_REQUESTS } else { 0 }
try {
    while ($true) {
        if ($listener3000.Pending()) {
            $c = $listener3000.AcceptTcpClient()
            Process-Client $c
            $servedCount++
        }
        if ($listener8000.Pending()) {
            $c = $listener8000.AcceptTcpClient()
            Process-Client $c
            $servedCount++
        }
        if ($maxReq -gt 0 -and $servedCount -ge $maxReq) {
            break
        }
        Start-Sleep -Milliseconds 15
    }
} finally {
    try { $listener3000.Stop() } catch {}
    try { $listener8000.Stop() } catch {}
}

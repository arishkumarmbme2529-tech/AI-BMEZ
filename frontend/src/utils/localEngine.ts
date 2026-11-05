import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const DB_STORAGE_KEY = 'aibmez_embedded_db_v2';

export interface EmbeddedUser {
  id: number;
  email: string;
  full_name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'INSTITUTION_ADMIN' | 'INSTITUTE_USER' | 'OFFICER' | 'REVIEWER';
  institution_id: number | null;
  is_active: boolean;
  created_at: string;
  password_hash: string;
}

async function sha256Hex(input: string | ArrayBuffer): Promise<string> {
  const data = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback deterministic hash if crypto.subtle unavailable
  const str = typeof input === 'string' ? input : new TextDecoder().decode(input);
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

function createJwtToken(user: EmbeddedUser): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: String(user.id),
      email: user.email,
      role: user.role,
      institution_id: user.institution_id,
      exp: Math.floor(Date.now() / 1000) + 86400,
    })
  );
  const sig = btoa(`aibmez-sig-${user.id}-${user.role}`);
  return `${header}.${payload}.${sig}`;
}

function verifyJwtToken(token: string | null): { sub: string; email: string; role: string } | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      const decoded = JSON.parse(atob(parts[1]));
      if (decoded && decoded.sub) {
        return decoded;
      }
    }
  } catch {
    // Check if token is from localhost_server.ps1 format
  }
  return null;
}

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export function isValidEmailAddress(email: string): boolean {
  return EMAIL_REGEX.test((email || '').trim());
}

async function createInitialSeedDb() {
  const adminHash = await sha256Hex('Admin@123');
  const instituteHash = await sha256Hex('Institute@123');
  const reviewerHash = await sha256Hex('Reviewer@123');
  const officerHash = await sha256Hex('Officer@123');
  const instHash = await sha256Hex('Institution@123');

  const now = new Date().toISOString();

  const institutions = [
    {
      id: 1,
      name: 'National Institute of Engineering and Technology',
      aicte_id: 'AICTE-2026-NIET-001',
      type: 'PRIVATE',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      city: 'Bengaluru',
      address: 'Plot 14, Knowledge Park Road, Bengaluru',
      pincode: '560001',
      established_year: 2004,
      affiliated_university: 'Visvesvaraya Technological University',
      total_intake: 720,
      contact_email: 'institute@aibmez.demo',
      contact_phone: '9876543210',
      website: 'https://niet.edu.in',
      compliance_score: 82.0,
      created_at: now,
    },
    {
      id: 2,
      name: 'Apex College of Technology and Research',
      aicte_id: 'AICTE-2026-ACTR-002',
      type: 'AUTONOMOUS',
      state: 'Maharashtra',
      district: 'Pune',
      city: 'Pune',
      address: '45 Innovation Highway, Hinjewadi, Pune',
      pincode: '411057',
      established_year: 1999,
      affiliated_university: 'Savitribai Phule Pune University',
      total_intake: 900,
      contact_email: 'registrar@actr.edu.in',
      contact_phone: '9823011223',
      website: 'https://actr.edu.in',
      compliance_score: 68.5,
      created_at: now,
    },
    {
      id: 3,
      name: 'Delhi School of Pharmaceutical Sciences',
      aicte_id: 'AICTE-2026-DSPS-003',
      type: 'GOVERNMENT',
      state: 'Delhi',
      district: 'South Delhi',
      city: 'New Delhi',
      address: 'Sector 3, Pushp Vihar, New Delhi',
      pincode: '110017',
      established_year: 1995,
      affiliated_university: 'Delhi University',
      total_intake: 360,
      contact_email: 'director@dsps.ac.in',
      contact_phone: '9811223344',
      website: 'https://dsps.ac.in',
      compliance_score: 91.0,
      created_at: now,
    },
    {
      id: 4,
      name: 'Southern Regional Engineering College',
      aicte_id: 'AICTE-2026-SREC-004',
      type: 'DEEMED',
      state: 'Tamil Nadu',
      district: 'Coimbatore',
      city: 'Coimbatore',
      address: 'Avinashi Road, Peelamedu, Coimbatore',
      pincode: '641004',
      established_year: 2001,
      affiliated_university: 'Anna University',
      total_intake: 600,
      contact_email: 'principal@srec.edu.in',
      contact_phone: '9443322110',
      website: 'https://srec.edu.in',
      compliance_score: 54.0,
      created_at: now,
    },
  ];

  const users: EmbeddedUser[] = [
    {
      id: 1,
      email: 'admin@aibmez.demo',
      full_name: 'System Administrator',
      role: 'SUPER_ADMIN',
      institution_id: null,
      is_active: true,
      created_at: now,
      password_hash: adminHash,
    },
    {
      id: 2,
      email: 'institute@aibmez.demo',
      full_name: 'NIET Institute Coordinator',
      role: 'INSTITUTION_ADMIN',
      institution_id: 1,
      is_active: true,
      created_at: now,
      password_hash: instituteHash,
    },
    {
      id: 3,
      email: 'reviewer@aibmez.demo',
      full_name: 'Dr. Ramesh Kulkarni (Document Reviewer)',
      role: 'OFFICER',
      institution_id: null,
      is_active: true,
      created_at: now,
      password_hash: reviewerHash,
    },
    {
      id: 4,
      email: 'admin@aicte.gov.in',
      full_name: 'Dr. Rajesh Kumar (AICTE Director)',
      role: 'SUPER_ADMIN',
      institution_id: null,
      is_active: true,
      created_at: now,
      password_hash: adminHash,
    },
    {
      id: 5,
      email: 'officer@aicte.gov.in',
      full_name: 'Priya Sharma (Verification Officer)',
      role: 'OFFICER',
      institution_id: null,
      is_active: true,
      created_at: now,
      password_hash: officerHash,
    },
    {
      id: 6,
      email: 'inst1@example.edu.in',
      full_name: 'Prof. Suresh Nair',
      role: 'INSTITUTION_ADMIN',
      institution_id: 1,
      is_active: true,
      created_at: now,
      password_hash: instHash,
    },
  ];

  const applications = [
    {
      id: 1,
      application_number: 'APP-2026-1001',
      institution_id: 1,
      institution_name: 'National Institute of Engineering and Technology',
      academic_year: '2026-27',
      application_type: 'EXTENSION_OF_APPROVAL',
      status: 'UNDER_REVIEW',
      program_names: 'B.Tech CSE, B.Tech ECE, B.Tech AI & Data Science, M.Tech VLSI',
      proposed_intake: 720,
      Completeness_score: 80.0,
      risk_score: 22.0,
      assigned_officer_id: 3,
      reviewer_remarks: 'Affidavit, Fire NOC, Building Plan verified. Waiting for updated Faculty List.',
      submitted_at: '2026-02-14T10:30:00Z',
      reviewed_at: null,
      created_at: '2026-02-10T09:00:00Z',
    },
    {
      id: 2,
      application_number: 'APP-2026-1002',
      institution_id: 2,
      institution_name: 'Apex College of Technology and Research',
      academic_year: '2026-27',
      application_type: 'INCREASE_IN_INTAKE',
      status: 'DEFICIENCY_RAISED',
      program_names: 'B.Tech Computer Engineering, B.Tech Mechanical, MBA',
      proposed_intake: 900,
      Completeness_score: 70.0,
      risk_score: 48.0,
      assigned_officer_id: 3,
      reviewer_remarks: 'Fire Safety Certificate expired and duplicate Land Ownership hash flagged.',
      submitted_at: '2026-02-16T11:15:00Z',
      reviewed_at: '2026-02-20T14:20:00Z',
      created_at: '2026-02-12T08:30:00Z',
    },
    {
      id: 3,
      application_number: 'APP-2026-1003',
      institution_id: 3,
      institution_name: 'Delhi School of Pharmaceutical Sciences',
      academic_year: '2026-27',
      application_type: 'EXTENSION_OF_APPROVAL',
      status: 'APPROVED',
      program_names: 'B.Pharm, M.Pharm Pharmaceutics, Pharm.D',
      proposed_intake: 360,
      Completeness_score: 100.0,
      risk_score: 8.0,
      assigned_officer_id: 3,
      reviewer_remarks: 'All mandatory regulatory documents authenticated and verified.',
      submitted_at: '2026-02-05T09:45:00Z',
      reviewed_at: '2026-02-18T16:00:00Z',
      created_at: '2026-02-01T10:00:00Z',
    },
    {
      id: 4,
      application_number: 'APP-2026-1004',
      institution_id: 4,
      institution_name: 'Southern Regional Engineering College',
      academic_year: '2026-27',
      application_type: 'NEW_INSTITUTION',
      status: 'SUBMITTED',
      program_names: 'B.E. Civil Engineering, B.E. Electrical Engineering',
      proposed_intake: 600,
      Completeness_score: 60.0,
      risk_score: 64.0,
      assigned_officer_id: 3,
      reviewer_remarks: null,
      submitted_at: '2026-02-22T15:10:00Z',
      reviewed_at: null,
      created_at: '2026-02-19T12:00:00Z',
    },
  ];

  const documents = [
    {
      id: 1,
      institution_id: 1,
      application_id: 1,
      document_type: 'AFFIDAVIT',
      filename: 'NIET_Notarized_Affidavit_2026.pdf',
      file_path: '/uploads/NIET_Notarized_Affidavit_2026.pdf',
      file_size: 412800,
      mime_type: 'application/pdf',
      file_hash: '8f14e45fceea167a5a36dedd4bea25438f14e45fceea167a5a36dedd4bea2543',
      status: 'VERIFIED',
      extracted_text:
        'AFFIDAVIT ON RS 100 NON-JUDICIAL STAMP PAPER\nInstitution: National Institute of Engineering and Technology\nAICTE ID: AICTE-2026-NIET-001\nIssued Date: 2026-01-15\nValid Until: 2027-06-30\nNotary Registration No: KAR-BLR-8821\nSigned by Chairman and Principal.',
      extracted_metadata: {
        word_count: 34,
        has_dates: true,
        has_signatures: true,
        has_stamp_keywords: true,
        detected_dates: ['2026-01-15', '2027-06-30'],
      },
      authenticity_score: 96.0,
      fraud_Auto_flags: [],
      is_duplicate: false,
      duplicate_of_id: null,
      issue_date: '2026-01-15T00:00:00Z',
      expiry_date: '2027-06-30T00:00:00Z',
      is_expired: false,
      uploaded_by: 2,
      verified_by: 3,
      verified_at: '2026-02-15T11:20:00Z',
      created_at: '2026-02-14T10:00:00Z',
    },
    {
      id: 2,
      institution_id: 1,
      application_id: 1,
      document_type: 'BUILDING_PLAN',
      filename: 'NIET_Approved_Building_Plan_2026.pdf',
      file_path: '/uploads/NIET_Approved_Building_Plan_2026.pdf',
      file_size: 1245184,
      mime_type: 'application/pdf',
      file_hash: 'c9f0f895fb98ab9159f51fd0297e236dc9f0f895fb98ab9159f51fd0297e236d',
      status: 'VERIFIED',
      extracted_text:
        'DIRECTORATE OF TOWN AND COUNTRY PLANNING - APPROVED BUILDING PLAN\nInstitution: National Institute of Engineering and Technology\nTotal Built-up Area: 18,450 Sq.m\nApproval Ref: DTCP/BLR/2024/119\nIssued: 2024-05-10\nValid Through: 2029-05-09\nAuthorized Seal & Signature Verified.',
      extracted_metadata: {
        word_count: 36,
        has_dates: true,
        has_signatures: true,
        has_stamp_keywords: true,
        detected_dates: ['2024-05-10', '2029-05-09'],
      },
      authenticity_score: 94.5,
      fraud_Auto_flags: [],
      is_duplicate: false,
      duplicate_of_id: null,
      issue_date: '2024-05-10T00:00:00Z',
      expiry_date: '2029-05-09T00:00:00Z',
      is_expired: false,
      uploaded_by: 2,
      verified_by: 3,
      verified_at: '2026-02-15T11:35:00Z',
      created_at: '2026-02-14T10:05:00Z',
    },
    {
      id: 3,
      institution_id: 1,
      application_id: 1,
      document_type: 'FIRE_NOC',
      filename: 'NIET_Fire_Safety_NOC_2026.pdf',
      file_path: '/uploads/NIET_Fire_Safety_NOC_2026.pdf',
      file_size: 524288,
      mime_type: 'application/pdf',
      file_hash: '45c48cce2e2d7fbdea1afc51c7c6ad2645c48cce2e2d7fbdea1afc51c7c6ad26',
      status: 'VERIFIED',
      extracted_text:
        'KARNATAKA STATE FIRE AND EMERGENCY SERVICES\nNO OBJECTION CERTIFICATE (RENEWAL)\nCertifies that National Institute of Engineering and Technology complies with NBC Part-4 fire safety norms.\nCertificate No: KSFES/NOC/2026/408\nIssue Date: 2026-01-20\nExpiry Date: 2026-05-15\nChief Fire Officer Signature & Official Seal.',
      extracted_metadata: {
        word_count: 42,
        has_dates: true,
        has_signatures: true,
        has_stamp_keywords: true,
        detected_dates: ['2026-01-20', '2026-05-15'],
      },
      authenticity_score: 92.0,
      fraud_Auto_flags: ['Renewal reminder: Certificate expires within 60 days'],
      is_duplicate: false,
      duplicate_of_id: null,
      issue_date: '2026-01-20T00:00:00Z',
      expiry_date: new Date(Date.now() + 28 * 86400000).toISOString(),
      is_expired: false,
      uploaded_by: 2,
      verified_by: 3,
      verified_at: '2026-02-15T11:45:00Z',
      created_at: '2026-02-14T10:12:00Z',
    },
    {
      id: 4,
      institution_id: 1,
      application_id: 1,
      document_type: 'FACULTY_LIST',
      filename: 'NIET_Faculty_Roster_2026_27.pdf',
      file_path: '/uploads/NIET_Faculty_Roster_2026_27.pdf',
      file_size: 318400,
      mime_type: 'application/pdf',
      file_hash: 'd3d9446802a44259755d38e6d163e820d3d9446802a44259755d38e6d163e820',
      status: 'PENDING',
      extracted_text:
        'FACULTY ROSTER ACADEMIC YEAR 2026-27\nNational Institute of Engineering and Technology\nTotal Sanctioned Intake: 720 | Total Faculty: 48 (Professors: 6, Associate Professors: 14, Assistant Professors: 28)\nFaculty Student Ratio: 1:15\nSubmitted for verification.',
      extracted_metadata: {
        word_count: 35,
        has_dates: true,
        has_signatures: true,
        has_stamp_keywords: false,
        detected_dates: ['2026-02-14'],
      },
      authenticity_score: 86.0,
      fraud_Auto_flags: [],
      is_duplicate: false,
      duplicate_of_id: null,
      issue_date: '2026-02-14T00:00:00Z',
      expiry_date: '2027-05-31T00:00:00Z',
      is_expired: false,
      uploaded_by: 2,
      verified_by: null,
      verified_at: null,
      created_at: '2026-02-14T10:18:00Z',
    },
    {
      id: 5,
      institution_id: 1,
      application_id: 1,
      document_type: 'AUDIT_STATEMENT',
      filename: 'NIET_Audited_Financial_Statement_FY25.pdf',
      file_path: '/uploads/NIET_Audited_Financial_Statement_FY25.pdf',
      file_size: 689120,
      mime_type: 'application/pdf',
      file_hash: '6512bd43d9caa6e02c990b0a82652dca6512bd43d9caa6e02c990b0a82652dca',
      status: 'PENDING',
      extracted_text:
        'CHARTERED ACCOUNTANT AUDIT REPORT FY 2024-25\nInstitution: National Institute of Engineering and Technology\nUDIN: 25041289BMK4421\nTotal Corpus Fund: INR 4.85 Crore\nSigned by Statutory Auditor with ICAI Membership Seal.',
      extracted_metadata: {
        word_count: 31,
        has_dates: true,
        has_signatures: true,
        has_stamp_keywords: true,
        detected_dates: ['2025-09-30'],
      },
      authenticity_score: 91.0,
      fraud_Auto_flags: [],
      is_duplicate: false,
      duplicate_of_id: null,
      issue_date: '2025-09-30T00:00:00Z',
      expiry_date: '2026-09-30T00:00:00Z',
      is_expired: false,
      uploaded_by: 2,
      verified_by: null,
      verified_at: null,
      created_at: '2026-02-14T10:22:00Z',
    },
    {
      id: 6,
      institution_id: 2,
      application_id: 2,
      document_type: 'FIRE_NOC',
      filename: 'ACTR_Fire_Safety_Certificate_2024.pdf',
      file_path: '/uploads/ACTR_Fire_Safety_Certificate_2024.pdf',
      file_size: 298100,
      mime_type: 'application/pdf',
      file_hash: 'aab3238922bcc25a6f606eb525ffdc56aab3238922bcc25a6f606eb525ffdc56',
      status: 'EXPIRED',
      extracted_text:
        'MAHARASHTRA FIRE SERVICES - PROVISIONAL FIRE NOC\nInstitution: Apex College of Technology and Research, Pune\nIssued Date: 2024-01-10\nExpiry Date: 2025-01-09\nStatus: Expired prior to 2026-27 academic session.',
      extracted_metadata: {
        word_count: 29,
        has_dates: true,
        has_signatures: true,
        has_stamp_keywords: true,
        detected_dates: ['2024-01-10', '2025-01-09'],
      },
      authenticity_score: 58.0,
      fraud_Auto_flags: ['Document validity period has expired (Expired on 2025-01-09)'],
      is_duplicate: false,
      duplicate_of_id: null,
      issue_date: '2024-01-10T00:00:00Z',
      expiry_date: '2025-01-09T00:00:00Z',
      is_expired: true,
      uploaded_by: 1,
      verified_by: 3,
      verified_at: '2026-02-19T15:10:00Z',
      created_at: '2026-02-16T11:00:00Z',
    },
    {
      id: 7,
      institution_id: 2,
      application_id: 2,
      document_type: 'AFFIDAVIT',
      filename: 'ACTR_Submitted_Affidavit_Copy.pdf',
      file_path: '/uploads/ACTR_Submitted_Affidavit_Copy.pdf',
      file_size: 412800,
      mime_type: 'application/pdf',
      file_hash: '8f14e45fceea167a5a36dedd4bea25438f14e45fceea167a5a36dedd4bea2543',
      status: 'DUPLICATE',
      extracted_text:
        'AFFIDAVIT ON RS 100 NON-JUDICIAL STAMP PAPER\nDuplicate SHA-256 hash match detected against Document #1 (NIET_Notarized_Affidavit_2026.pdf).',
      extracted_metadata: {
        word_count: 19,
        has_dates: false,
        has_signatures: true,
        has_stamp_keywords: true,
        detected_dates: [],
      },
      authenticity_score: 35.0,
      fraud_Auto_flags: [
        'Exact SHA-256 hash match with Document ID #1 (NIET_Notarized_Affidavit_2026.pdf)',
        'Cross-institution duplicate submission flagged',
      ],
      is_duplicate: true,
      duplicate_of_id: 1,
      issue_date: '2026-01-15T00:00:00Z',
      expiry_date: '2027-06-30T00:00:00Z',
      is_expired: false,
      uploaded_by: 1,
      verified_by: 3,
      verified_at: '2026-02-19T15:20:00Z',
      created_at: '2026-02-16T11:05:00Z',
    },
    {
      id: 8,
      institution_id: 4,
      application_id: 4,
      document_type: 'LAND_OWNERSHIP',
      filename: 'SREC_Land_Deed_Unverified_Scan.pdf',
      file_path: '/uploads/SREC_Land_Deed_Unverified_Scan.pdf',
      file_size: 195400,
      mime_type: 'application/pdf',
      file_hash: '9bf31c7ff062936a96d3c8bd1f8f2ff39bf31c7ff062936a96d3c8bd1f8f2ff3',
      status: 'SUSPICIOUS',
      extracted_text:
        'LAND REGISTRATION EXTRACT\nSurvey No: 412/B Coimbatore\nMissing official sub-registrar seal and signature block. Metadata shows image splicing modification.',
      extracted_metadata: {
        word_count: 20,
        has_dates: false,
        has_signatures: false,
        has_stamp_keywords: false,
        detected_dates: [],
      },
      authenticity_score: 41.0,
      fraud_Auto_flags: [
        'Missing authorized signature and official registrar stamp keywords',
        'Low OCR confidence and metadata editing software trace detected',
      ],
      is_duplicate: false,
      duplicate_of_id: null,
      issue_date: '2023-06-01T00:00:00Z',
      expiry_date: null,
      is_expired: false,
      uploaded_by: 1,
      verified_by: null,
      verified_at: null,
      created_at: '2026-02-22T14:50:00Z',
    },
    {
      id: 9,
      institution_id: 3,
      application_id: 3,
      document_type: 'EQUIPMENT_SPEC',
      filename: 'DSPS_Lab_Equipment_Inventory_2026.pdf',
      file_path: '/uploads/DSPS_Lab_Equipment_Inventory_2026.pdf',
      file_size: 482000,
      mime_type: 'application/pdf',
      file_hash: 'c20ad4d76fe97759aa27a0c99bff6710c20ad4d76fe97759aa27a0c99bff6710',
      status: 'VERIFIED',
      extracted_text:
        'DELHI SCHOOL OF PHARMACEUTICAL SCIENCES\nLABORATORY EQUIPMENT & INFRASTRUCTURE CERTIFICATE\nHPLC Systems, UV Spectrophotometers, Dissolution Testers verified as per PCI & AICTE norms.\nIssued: 2026-01-12 | Valid Until: 2027-06-30\nPrincipal Signature & Official Seal.',
      extracted_metadata: {
        word_count: 34,
        has_dates: true,
        has_signatures: true,
        has_stamp_keywords: true,
        detected_dates: ['2026-01-12', '2027-06-30'],
      },
      authenticity_score: 95.0,
      fraud_Auto_flags: [],
      is_duplicate: false,
      duplicate_of_id: null,
      issue_date: '2026-01-12T00:00:00Z',
      expiry_date: '2027-06-30T00:00:00Z',
      is_expired: false,
      uploaded_by: 1,
      verified_by: 3,
      verified_at: '2026-02-18T15:30:00Z',
      created_at: '2026-02-05T09:30:00Z',
    },
  ];

  const compliance_records = [
    {
      id: 1,
      institution_id: 1,
      academic_year: '2026-27',
      faculty_student_ratio: 15.0,
      total_faculty: 48,
      phd_faculty_count: 16,
      total_students: 720,
      land_area_acres: 10.5,
      built_up_area_sqm: 18450,
      classrooms_count: 24,
      labs_count: 14,
      library_books_count: 28500,
      library_journals_count: 68,
      computers_count: 310,
      internet_bandwidth_mbps: 500,
      annual_budget_lakhs: 1450,
      actual_utilization_lakhs: 1320,
      overall_compliance_score: 82.0,
      faculty_score: 85.0,
      infrastructure_score: 88.0,
      equipment_score: 80.0,
      financial_score: 84.0,
      document_compliance_score: 73.0,
      risk_level: 'LOW',
      deficiencies: [
        'Mandatory documents still pending upload: Land Ownership Deed, Lab Equipment Spec, Trust Deed',
        'Fire Safety NOC renewal due within 30 days',
      ],
      recommendations: [
        'Upload remaining mandatory documents to reach 100% document compliance',
        'Initiate Fire NOC renewal application before expiry date',
      ],
      evaluated_at: now,
    },
    {
      id: 2,
      institution_id: 2,
      academic_year: '2026-27',
      faculty_student_ratio: 18.5,
      total_faculty: 48,
      phd_faculty_count: 11,
      total_students: 890,
      land_area_acres: 8.2,
      built_up_area_sqm: 15200,
      classrooms_count: 20,
      labs_count: 11,
      library_books_count: 21000,
      library_journals_count: 42,
      computers_count: 240,
      internet_bandwidth_mbps: 300,
      annual_budget_lakhs: 1200,
      actual_utilization_lakhs: 980,
      overall_compliance_score: 68.5,
      faculty_score: 72.0,
      infrastructure_score: 74.0,
      equipment_score: 70.0,
      financial_score: 68.0,
      document_compliance_score: 58.5,
      risk_level: 'MEDIUM',
      deficiencies: [
        'Expired Fire Safety Certificate (expired 2025-01-09)',
        'Duplicate document hash detected on submitted Affidavit',
      ],
      recommendations: [
        'Submit renewed Fire NOC from Maharashtra Fire Services immediately',
        'Replace duplicate Affidavit with original institution-specific notarized affidavit',
      ],
      evaluated_at: now,
    },
    {
      id: 3,
      institution_id: 3,
      academic_year: '2026-27',
      faculty_student_ratio: 12.0,
      total_faculty: 30,
      phd_faculty_count: 18,
      total_students: 360,
      land_area_acres: 12.0,
      built_up_area_sqm: 14800,
      classrooms_count: 16,
      labs_count: 12,
      library_books_count: 32000,
      library_journals_count: 95,
      computers_count: 180,
      internet_bandwidth_mbps: 1000,
      annual_budget_lakhs: 1600,
      actual_utilization_lakhs: 1510,
      overall_compliance_score: 91.0,
      faculty_score: 94.0,
      infrastructure_score: 92.0,
      equipment_score: 90.0,
      financial_score: 89.0,
      document_compliance_score: 90.0,
      risk_level: 'LOW',
      deficiencies: [],
      recommendations: ['Maintain current faculty-student ratio and annual audit schedule'],
      evaluated_at: now,
    },
    {
      id: 4,
      institution_id: 4,
      academic_year: '2026-27',
      faculty_student_ratio: 22.0,
      total_faculty: 27,
      phd_faculty_count: 5,
      total_students: 594,
      land_area_acres: 5.5,
      built_up_area_sqm: 9800,
      classrooms_count: 12,
      labs_count: 7,
      library_books_count: 11500,
      library_journals_count: 24,
      computers_count: 140,
      internet_bandwidth_mbps: 150,
      annual_budget_lakhs: 820,
      actual_utilization_lakhs: 640,
      overall_compliance_score: 54.0,
      faculty_score: 52.0,
      infrastructure_score: 58.0,
      equipment_score: 55.0,
      financial_score: 60.0,
      document_compliance_score: 45.0,
      risk_level: 'HIGH',
      deficiencies: [
        'Suspicious Land Ownership document flagged for missing official registrar seal',
        'Faculty-student ratio (1:22) violates AICTE prescribed 1:15 norm',
      ],
      recommendations: [
        'Recruit minimum 13 additional full-time faculty members',
        'Provide certified Sub-Registrar copy of Land Ownership Deed',
      ],
      evaluated_at: now,
    },
  ];

  const reports = [
    {
      id: 1,
      institution_id: 1,
      application_id: 1,
      report_type: 'COMPLIANCE_SUMMARY',
      title: 'Compliance & Document Verification Report - National Institute of Engineering and Technology',
      file_path: '/reports-files/NIET_Compliance_Report_2026.pdf',
      summary_data: {
        institution_name: 'National Institute of Engineering and Technology',
        aicte_id: 'AICTE-2026-NIET-001',
        compliance_score: 82.0,
        verified_documents: 3,
        pending_documents: 2,
      },
      generated_by: 1,
      created_at: '2026-02-20T12:00:00Z',
    },
    {
      id: 2,
      institution_id: 2,
      application_id: 2,
      report_type: 'DEFICIENCY_REPORT',
      title: 'Deficiency & Document Audit Report - Apex College of Technology and Research',
      file_path: '/reports-files/ACTR_Deficiency_Report_2026.pdf',
      summary_data: {
        institution_name: 'Apex College of Technology and Research',
        aicte_id: 'AICTE-2026-ACTR-002',
        compliance_score: 68.5,
        expired_documents: 1,
        duplicate_documents: 1,
      },
      generated_by: 3,
      created_at: '2026-02-21T09:30:00Z',
    },
  ];

  const audit_logs = [
    {
      id: 1,
      user_id: 3,
      user_email: 'reviewer@aibmez.demo',
      action: 'DOCUMENT_VERIFIED',
      entity_type: 'Document',
      entity_id: 1,
      details: { filename: 'NIET_Notarized_Affidavit_2026.pdf', status: 'VERIFIED' },
      created_at: '2026-02-15T11:20:00Z',
    },
    {
      id: 2,
      user_id: 3,
      user_email: 'reviewer@aibmez.demo',
      action: 'DUPLICATE_DETECTED',
      entity_type: 'Document',
      entity_id: 7,
      details: { filename: 'ACTR_Submitted_Affidavit_Copy.pdf', duplicate_of: 1, status: 'DUPLICATE' },
      created_at: '2026-02-19T15:20:00Z',
    },
    {
      id: 3,
      user_id: 3,
      user_email: 'reviewer@aibmez.demo',
      action: 'EXPIRED_DOCUMENT_FLAGGED',
      entity_type: 'Document',
      entity_id: 6,
      details: { filename: 'ACTR_Fire_Safety_Certificate_2024.pdf', status: 'EXPIRED' },
      created_at: '2026-02-19T15:10:00Z',
    },
    {
      id: 4,
      user_id: 1,
      user_email: 'admin@aibmez.demo',
      action: 'SUSPICIOUS_DOCUMENT_FLAGGED',
      entity_type: 'Document',
      entity_id: 8,
      details: { filename: 'SREC_Land_Deed_Unverified_Scan.pdf', status: 'SUSPICIOUS' },
      created_at: '2026-02-22T14:55:00Z',
    },
    {
      id: 5,
      user_id: 1,
      user_email: 'admin@aibmez.demo',
      action: 'REPORT_GENERATED',
      entity_type: 'Report',
      entity_id: 1,
      details: { title: 'Compliance & Document Verification Report - NIET' },
      created_at: '2026-02-20T12:00:00Z',
    },
  ];

  return {
    users,
    institutions,
    applications,
    documents,
    compliance_records,
    reports,
    audit_logs,
  };
}

async function getDb() {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.users) && parsed.users.length >= 3) {
        return parsed;
      }
    }
  } catch {
    // Re-initialize on corrupt state
  }
  const initial = await createInitialSeedDb();
  localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function saveDb(db: any) {
  localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
}

function sanitizeUser(u: EmbeddedUser) {
  const { password_hash, ...rest } = u;
  return rest;
}

export function generatePdfBlobUrl(title: string, lines: string[]): string {
  const sanitizePdfText = (txt: string) =>
    txt.replace(/[()\\]/g, '').replace(/[^\x20-\x7E]/g, ' ').slice(0, 95);

  const contentLines: string[] = [
    'BT',
    '/F1 14 Tf',
    '50 790 Td',
    `(${sanitizePdfText('AI-BMEZ INSTITUTIONAL COMPLIANCE & DOCUMENT VERIFICATION REPORT')}) Tj`,
    '/F1 10 Tf',
    '0 -22 Td',
    `(${sanitizePdfText(title)}) Tj`,
    '0 -16 Td',
    `(${sanitizePdfText('Generated on: ' + new Date().toLocaleString())}) Tj`,
    '0 -20 Td',
    '(--------------------------------------------------------------------------------) Tj',
  ];

  for (const line of lines.slice(0, 34)) {
    contentLines.push('0 -16 Td');
    contentLines.push(`(${sanitizePdfText(line)}) Tj`);
  }
  contentLines.push('ET');
  const streamContent = contentLines.join('\n');

  const objects: string[] = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 595 842] /Contents 5 0 R >>\nendobj'
  );
  objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');
  objects.push(`5 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj`);

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj + '\n';
  }
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  const blob = new Blob([pdf], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}

const REQUIRED_DOC_TYPES = [
  'AFFIDAVIT',
  'BUILDING_PLAN',
  'FIRE_NOC',
  'LAND_OWNERSHIP',
  'FACULTY_LIST',
  'EQUIPMENT_SPEC',
  'AUDIT_STATEMENT',
  'TRUST_DEED',
];

export async function handleEmbeddedApiRequest(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  const db = await getDb();
  const method = (config.method || 'get').toUpperCase();
  const rawUrl = config.url || '';
  const urlObj = new URL(rawUrl.startsWith('http') ? rawUrl : `http://localhost${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`);
  const path = urlObj.pathname.replace(/^\/api\/v1/, '') || '/';
  const params = Object.fromEntries(urlObj.searchParams.entries());
  if (config.params) {
    Object.assign(params, config.params);
  }

  const authHeader = (config.headers?.Authorization as string) || localStorage.getItem('access_token') || '';
  const tokenStr = authHeader.replace(/^Bearer\s+/i, '');
  const decoded = verifyJwtToken(tokenStr);
  let currentUser: EmbeddedUser | null = null;
  if (decoded) {
    currentUser =
      db.users.find((u: EmbeddedUser) => String(u.id) === String(decoded.sub) || u.email.toLowerCase() === String(decoded.email).toLowerCase()) ||
      null;
  }
  if (!currentUser) {
    const savedUserRaw = localStorage.getItem('aibmez_user') || localStorage.getItem('user');
    if (savedUserRaw) {
      try {
        const parsed = JSON.parse(savedUserRaw);
        currentUser = db.users.find((u: EmbeddedUser) => u.email.toLowerCase() === String(parsed.email || '').toLowerCase()) || null;
      } catch {
        // ignore
      }
    }
  }

  const respond = (data: any, status = 200): AxiosResponse => ({
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {},
    config,
  });

  const reject = (status: number, detail: string) => {
    const err: any = new Error(detail);
    err.response = {
      status,
      data: { detail },
      headers: {},
      config,
    };
    throw err;
  };

  let body: any = config.data;
  if (typeof body === 'string') {
    if (body.includes('=') && !body.trim().startsWith('{')) {
      const sp = new URLSearchParams(body);
      body = Object.fromEntries(sp.entries());
    } else {
      try {
        body = JSON.parse(body);
      } catch {
        // ignore
      }
    }
  } else if (body instanceof URLSearchParams) {
    body = Object.fromEntries(body.entries());
  }

  // 1. AUTH ROUTES
  if (path === '/auth/login' || path === '/auth/login-json') {
    const emailInput = String(body?.email || body?.username || '').trim().toLowerCase();
    const passwordInput = String(body?.password || '');

    if (!isValidEmailAddress(emailInput)) {
      return reject(422, 'Please enter a valid email address.');
    }

    const user = db.users.find((u: EmbeddedUser) => u.email.toLowerCase() === emailInput);
    if (!user) {
      return reject(401, 'Invalid email or password.');
    }

    const inputHash = await sha256Hex(passwordInput);
    if (user.password_hash !== inputHash) {
      return reject(401, 'Invalid email or password.');
    }

    if (!user.is_active) {
      return reject(403, 'Account is disabled.');
    }

    const access_token = createJwtToken(user);
    return respond({
      access_token,
      token_type: 'bearer',
      user: sanitizeUser(user),
    });
  }

  if (path === '/auth/register' && method === 'POST') {
    const emailInput = String(body?.email || '').trim().toLowerCase();
    const passwordInput = String(body?.password || '');
    const fullName = String(body?.full_name || '').trim();
    const rawRole = String(body?.role || 'INSTITUTION_ADMIN').toUpperCase();

    if (!isValidEmailAddress(emailInput)) {
      return reject(400, 'Please enter a valid email address.');
    }
    if (passwordInput.length < 6) {
      return reject(400, 'Password must be at least 6 characters.');
    }
    if (!fullName) {
      return reject(400, 'Full name is required.');
    }

    const existing = db.users.find((u: EmbeddedUser) => u.email.toLowerCase() === emailInput);
    if (existing) {
      return reject(400, 'An account with this email is already registered.');
    }

    let normalizedRole: EmbeddedUser['role'] = 'INSTITUTION_ADMIN';
    if (rawRole === 'ADMIN' || rawRole === 'SUPER_ADMIN') {
      normalizedRole = 'SUPER_ADMIN';
    } else if (rawRole === 'REVIEWER' || rawRole === 'OFFICER') {
      normalizedRole = 'OFFICER';
    } else {
      normalizedRole = 'INSTITUTION_ADMIN';
    }

    let institutionId: number | null = body?.institution_id ? Number(body.institution_id) : null;
    const now = new Date().toISOString();

    if (normalizedRole === 'INSTITUTION_ADMIN' && !institutionId) {
      const nextInstId = db.institutions.reduce((max: number, i: any) => Math.max(max, i.id), 0) + 1;
      const instName = String(body?.institution_name || `${fullName} Institute of Technology`).trim();
      const aicteId = String(body?.aicte_id || `AICTE-2026-INST-${100 + nextInstId}`).trim();
      const newInst = {
        id: nextInstId,
        name: instName,
        aicte_id: aicteId,
        type: body?.institution_type || 'PRIVATE',
        state: body?.state || 'Karnataka',
        district: body?.district || 'Bengaluru Urban',
        city: body?.city || 'Bengaluru',
        address: `${body?.city || 'Bengaluru'}, ${body?.state || 'Karnataka'}`,
        pincode: '560001',
        established_year: 2020,
        affiliated_university: 'State Technical University',
        total_intake: 360,
        contact_email: emailInput,
        contact_phone: body?.phone || '9876543210',
        website: '',
        compliance_score: 65.0,
        created_at: now,
      };
      db.institutions.push(newInst);
      institutionId = nextInstId;

      const nextAppId = db.applications.reduce((max: number, a: any) => Math.max(max, a.id), 0) + 1;
      db.applications.push({
        id: nextAppId,
        application_number: `APP-2026-${1000 + nextAppId}`,
        institution_id: nextInstId,
        institution_name: instName,
        academic_year: '2026-27',
        application_type: 'EXTENSION_OF_APPROVAL',
        status: 'UNDER_REVIEW',
        program_names: 'B.Tech Computer Science & Engineering, B.Tech Electronics',
        proposed_intake: 360,
        Completeness_score: 25.0,
        risk_score: 30.0,
        assigned_officer_id: 3,
        reviewer_remarks: null,
        submitted_at: now,
        reviewed_at: null,
        created_at: now,
      });

      const nextCompId = db.compliance_records.reduce((max: number, c: any) => Math.max(max, c.id), 0) + 1;
      db.compliance_records.push({
        id: nextCompId,
        institution_id: nextInstId,
        academic_year: '2026-27',
        faculty_student_ratio: 15.0,
        total_faculty: 24,
        phd_faculty_count: 6,
        total_students: 360,
        land_area_acres: 7.5,
        built_up_area_sqm: 11200,
        classrooms_count: 14,
        labs_count: 8,
        library_books_count: 15000,
        library_journals_count: 36,
        computers_count: 180,
        internet_bandwidth_mbps: 250,
        annual_budget_lakhs: 750,
        actual_utilization_lakhs: 680,
        overall_compliance_score: 65.0,
        faculty_score: 75.0,
        infrastructure_score: 72.0,
        equipment_score: 70.0,
        financial_score: 74.0,
        document_compliance_score: 0.0,
        risk_level: 'MEDIUM',
        deficiencies: ['Upload mandatory regulatory documents to complete verification'],
        recommendations: ['Upload Affidavit, Fire NOC, Building Plan, and Faculty List'],
        evaluated_at: now,
      });
    }

    const nextUserId = db.users.reduce((max: number, u: EmbeddedUser) => Math.max(max, u.id), 0) + 1;
    const passwordHash = await sha256Hex(passwordInput);
    const newUser: EmbeddedUser = {
      id: nextUserId,
      email: emailInput,
      full_name: fullName,
      role: normalizedRole,
      institution_id: institutionId,
      is_active: true,
      created_at: now,
      password_hash: passwordHash,
    };
    db.users.push(newUser);
    db.audit_logs.unshift({
      id: db.audit_logs.length + 1,
      user_id: newUser.id,
      user_email: newUser.email,
      action: 'USER_REGISTERED',
      entity_type: 'User',
      entity_id: newUser.id,
      details: { role: newUser.role, institution_id: institutionId },
      created_at: now,
    });
    saveDb(db);

    const access_token = createJwtToken(newUser);
    return respond({
      access_token,
      token_type: 'bearer',
      user: sanitizeUser(newUser),
    });
  }

  if (path === '/auth/me') {
    if (!currentUser) {
      return reject(401, 'Not authenticated.');
    }
    return respond(sanitizeUser(currentUser));
  }

  if (!currentUser) {
    return reject(401, 'Authentication required.');
  }

  const isInstituteRole = currentUser.role === 'INSTITUTION_ADMIN' || currentUser.role === 'INSTITUTE_USER';
  const scopedInstId = isInstituteRole ? currentUser.institution_id : params.institution_id ? Number(params.institution_id) : null;

  // 2. DASHBOARD STATS
  if (path === '/dashboard/stats') {
    const insts = scopedInstId ? db.institutions.filter((i: any) => i.id === scopedInstId) : db.institutions;
    const apps = scopedInstId ? db.applications.filter((a: any) => a.institution_id === scopedInstId) : db.applications;
    const docs = scopedInstId ? db.documents.filter((d: any) => d.institution_id === scopedInstId) : db.documents;
    const comps = scopedInstId ? db.compliance_records.filter((c: any) => c.institution_id === scopedInstId) : db.compliance_records;

    const verifiedDocs = docs.filter((d: any) => d.status === 'VERIFIED').length;
    const pendingDocs = docs.filter((d: any) => d.status === 'PENDING' || d.status === 'PROCESSING').length;
    const duplicateDocs = docs.filter((d: any) => d.status === 'DUPLICATE' || d.is_duplicate).length;
    const suspiciousDocs = docs.filter(
      (d: any) => d.status === 'SUSPICIOUS' || d.status === 'FLAGGED' || d.status === 'REJECTED' || (d.fraud_Auto_flags && d.fraud_Auto_flags.length > 0 && d.status !== 'VERIFIED')
    ).length;
    const expiredDocs = docs.filter((d: any) => d.status === 'EXPIRED' || d.is_expired).length;

    let missingCount = 0;
    for (const inst of insts) {
      const uploadedTypes = new Set(
        docs
          .filter((d: any) => d.institution_id === inst.id && d.status !== 'REJECTED')
          .map((d: any) => d.document_type)
      );
      missingCount += REQUIRED_DOC_TYPES.filter((t) => !uploadedTypes.has(t)).length;
    }

    const avgComp =
      comps.length > 0
        ? Math.round((comps.reduce((acc: number, c: any) => acc + Number(c.overall_compliance_score || 0), 0) / comps.length) * 10) / 10
        : 75.0;

    const statusCounts: Record<string, number> = {};
    for (const a of apps) {
      statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
    }
    const docStatusCounts: Record<string, number> = {
      VERIFIED: verifiedDocs,
      PENDING: pendingDocs,
      MISSING: missingCount,
      DUPLICATE: duplicateDocs,
      SUSPICIOUS: suspiciousDocs,
      EXPIRED: expiredDocs,
    };

    const stateMap: Record<string, { count: number; totalScore: number }> = {};
    for (const inst of insts) {
      if (!stateMap[inst.state]) stateMap[inst.state] = { count: 0, totalScore: 0 };
      stateMap[inst.state].count += 1;
      stateMap[inst.state].totalScore += Number(inst.compliance_score || 75);
    }

    return respond({
      total_institutions: insts.length,
      total_applications: apps.length,
      pending_reviews: apps.filter((a: any) => ['SUBMITTED', 'UNDER_REVIEW', 'DEFICIENCY_RAISED'].includes(a.status)).length,
      approved_applications: apps.filter((a: any) => a.status === 'APPROVED').length,
      rejected_applications: apps.filter((a: any) => a.status === 'REJECTED').length,
      deficiency_raised: apps.filter((a: any) => a.status === 'DEFICIENCY_RAISED').length,
      total_documents: docs.length,
      verified_documents: verifiedDocs,
      pending_documents: pendingDocs,
      flagged_documents: suspiciousDocs,
      suspicious_documents: suspiciousDocs,
      duplicate_documents: duplicateDocs,
      expired_documents: expiredDocs,
      missing_documents_count: missingCount,
      average_compliance_score: avgComp,
      high_risk_institutions: comps.filter((c: any) => c.risk_level === 'HIGH' || c.risk_level === 'CRITICAL').length,
      recent_activities: db.audit_logs.slice(0, 12),
      application_status_distribution: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
      document_status_distribution: Object.entries(docStatusCounts).map(([status, count]) => ({ status, count })),
      monthly_submissions: [
        { month: 'Oct', count: 3 },
        { month: 'Nov', count: 5 },
        { month: 'Dec', count: 7 },
        { month: 'Jan', count: 9 },
        { month: 'Feb', count: apps.length },
      ],
      compliance_by_state: Object.entries(stateMap).map(([state, v]) => ({
        state,
        avg_score: Math.round((v.totalScore / v.count) * 10) / 10,
        count: v.count,
      })),
    });
  }

  // 3. INSTITUTIONS
  if (path === '/institutions' && method === 'GET') {
    let list = scopedInstId ? db.institutions.filter((i: any) => i.id === scopedInstId) : [...db.institutions];
    if (params.search) {
      const q = String(params.search).toLowerCase();
      list = list.filter((i: any) => i.name.toLowerCase().includes(q) || i.aicte_id.toLowerCase().includes(q));
    }
    return respond(list);
  }

  if (path === '/institutions' && method === 'POST') {
    const nextId = db.institutions.reduce((m: number, i: any) => Math.max(m, i.id), 0) + 1;
    const created = {
      id: nextId,
      ...body,
      compliance_score: 75.0,
      created_at: new Date().toISOString(),
    };
    db.institutions.push(created);
    saveDb(db);
    return respond(created);
  }

  // 4. APPLICATIONS
  if (path === '/applications' && method === 'GET') {
    let list = scopedInstId ? db.applications.filter((a: any) => a.institution_id === scopedInstId) : [...db.applications];
    if (params.status) list = list.filter((a: any) => a.status === params.status);
    return respond(list);
  }

  if (path === '/applications' && method === 'POST') {
    const nextId = db.applications.reduce((m: number, a: any) => Math.max(m, a.id), 0) + 1;
    const instId = isInstituteRole ? currentUser.institution_id || 1 : Number(body?.institution_id || 1);
    const inst = db.institutions.find((i: any) => i.id === instId);
    const now = new Date().toISOString();
    const newApp = {
      id: nextId,
      application_number: `APP-2026-${1000 + nextId}`,
      institution_id: instId,
      institution_name: inst?.name || 'Registered Institution',
      academic_year: body?.academic_year || '2026-27',
      application_type: body?.application_type || 'EXTENSION_OF_APPROVAL',
      status: 'SUBMITTED',
      program_names: body?.program_names || 'B.Tech CSE',
      proposed_intake: Number(body?.proposed_intake || 180),
      Completeness_score: 60.0,
      risk_score: 25.0,
      assigned_officer_id: 3,
      reviewer_remarks: null,
      submitted_at: now,
      reviewed_at: null,
      created_at: now,
    };
    db.applications.unshift(newApp);
    saveDb(db);
    return respond(newApp);
  }

  const appDetailMatch = path.match(/^\/applications\/(\d+)$/);
  if (appDetailMatch && method === 'GET') {
    const appId = Number(appDetailMatch[1]);
    const app = db.applications.find((a: any) => a.id === appId);
    if (!app) return reject(404, 'Application not found.');
    const inst = db.institutions.find((i: any) => i.id === app.institution_id);
    const docs = db.documents.filter((d: any) => d.application_id === appId || d.institution_id === app.institution_id);
    return respond({ ...app, institution_name: inst?.name, documents: docs });
  }

  const appSubmitMatch = path.match(/^\/applications\/(\d+)\/submit$/);
  if (appSubmitMatch && method === 'POST') {
    const appId = Number(appSubmitMatch[1]);
    const app = db.applications.find((a: any) => a.id === appId);
    if (!app) return reject(404, 'Application not found.');
    app.status = 'SUBMITTED';
    app.submitted_at = new Date().toISOString();
    saveDb(db);
    return respond(app);
  }

  const appReviewMatch = path.match(/^\/applications\/(\d+)\/review$/);
  if (appReviewMatch && method === 'PUT') {
    const appId = Number(appReviewMatch[1]);
    const app = db.applications.find((a: any) => a.id === appId);
    if (!app) return reject(404, 'Application not found.');
    if (body?.status) app.status = body.status;
    if (body?.reviewer_remarks !== undefined) app.reviewer_remarks = body.reviewer_remarks;
    app.reviewed_at = new Date().toISOString();
    db.audit_logs.unshift({
      id: db.audit_logs.length + 1,
      user_id: currentUser.id,
      user_email: currentUser.email,
      action: `APPLICATION_${app.status}`,
      entity_type: 'Application',
      entity_id: app.id,
      details: { application_number: app.application_number, remarks: app.reviewer_remarks },
      created_at: new Date().toISOString(),
    });
    saveDb(db);
    return respond(app);
  }

  const appValidateMatch = path.match(/^\/applications\/(\d+)\/validate$/);
  if (appValidateMatch && method === 'POST') {
    const appId = Number(appValidateMatch[1]);
    const app = db.applications.find((a: any) => a.id === appId) || db.applications[0];
    const instId = app.institution_id;
    const docs = db.documents.filter((d: any) => d.institution_id === instId);
    const uploadedTypes = new Set(docs.map((d: any) => d.document_type));
    const missing = REQUIRED_DOC_TYPES.filter((t) => !uploadedTypes.has(t));
    const completeness = Math.round(((REQUIRED_DOC_TYPES.length - missing.length) / REQUIRED_DOC_TYPES.length) * 100);
    app.Completeness_score = completeness;
    saveDb(db);
    return respond({
      application_id: app.id,
      completeness_score: completeness,
      risk_score: app.risk_score,
      missing_documents: missing,
      checked_count: docs.length,
    });
  }

  // 5. DOCUMENTS
  if (path === '/documents' && method === 'GET') {
    let list = scopedInstId ? db.documents.filter((d: any) => d.institution_id === scopedInstId) : [...db.documents];
    if (params.status) {
      list = list.filter((d: any) => d.status === params.status);
    }
    if (params.document_type) {
      list = list.filter((d: any) => d.document_type === params.document_type);
    }
    return respond(list);
  }

  const docMissingMatch = path.match(/^\/documents\/missing\/(\d+)$/);
  if (docMissingMatch && method === 'GET') {
    const instId = isInstituteRole ? currentUser.institution_id || Number(docMissingMatch[1]) : Number(docMissingMatch[1]);
    const docs = db.documents.filter((d: any) => d.institution_id === instId && d.status !== 'REJECTED');
    const uploadedTypes = Array.from(new Set(docs.map((d: any) => d.document_type)));
    const missing = REQUIRED_DOC_TYPES.filter((t) => !uploadedTypes.includes(t));
    const pct = Math.round((uploadedTypes.filter((t) => REQUIRED_DOC_TYPES.includes(String(t))).length / REQUIRED_DOC_TYPES.length) * 100);
    return respond({
      institution_id: instId,
      required_documents: REQUIRED_DOC_TYPES,
      uploaded_documents: uploadedTypes,
      missing_documents: missing,
      completeness_percentage: pct,
    });
  }

  if (path === '/documents/expiry-alerts' && method === 'GET') {
    const docs = scopedInstId ? db.documents.filter((d: any) => d.institution_id === scopedInstId) : db.documents;
    const nowMs = Date.now();
    const expired_documents: any[] = [];
    const expiring_soon: any[] = [];

    for (const d of docs) {
      if (!d.expiry_date) continue;
      const expMs = new Date(d.expiry_date).getTime();
      const daysRemaining = Math.ceil((expMs - nowMs) / 86400000);
      if (daysRemaining < 0 || d.is_expired || d.status === 'EXPIRED') {
        expired_documents.push({
          id: d.id,
          filename: d.filename,
          document_type: d.document_type,
          institution_id: d.institution_id,
          expiry_date: d.expiry_date,
        });
      } else if (daysRemaining <= 90) {
        expiring_soon.push({
          id: d.id,
          filename: d.filename,
          document_type: d.document_type,
          institution_id: d.institution_id,
          expiry_date: d.expiry_date,
          days_remaining: daysRemaining,
        });
      }
    }
    return respond({
      expired_count: expired_documents.length,
      expiring_soon_count: expiring_soon.length,
      expired_documents,
      expiring_soon,
    });
  }

  if (path === '/documents/upload' && method === 'POST') {
    let fileObj: File | null = null;
    let docType = 'AFFIDAVIT';
    let instId = isInstituteRole ? currentUser.institution_id || 1 : 1;
    let appId: number | null = null;
    let issueDateStr: string | null = null;
    let expiryDateStr: string | null = null;

    if (config.data instanceof FormData) {
      fileObj = config.data.get('file') as File | null;
      docType = String(config.data.get('document_type') || 'AFFIDAVIT');
      if (!isInstituteRole && config.data.get('institution_id')) {
        instId = Number(config.data.get('institution_id'));
      }
      if (config.data.get('application_id')) {
        appId = Number(config.data.get('application_id'));
      }
      if (config.data.get('issue_date')) {
        issueDateStr = String(config.data.get('issue_date'));
      }
      if (config.data.get('expiry_date')) {
        expiryDateStr = String(config.data.get('expiry_date'));
      }
    }

    const filename = fileObj?.name || `Document_${Date.now()}.pdf`;
    const fileSize = fileObj?.size || 245760;
    const mimeType = fileObj?.type || 'application/pdf';

    let fileHash = '';
    let rawTextSample = '';
    if (fileObj) {
      const arrayBuf = await fileObj.arrayBuffer();
      fileHash = await sha256Hex(arrayBuf);
      try {
        rawTextSample = new TextDecoder('utf-8', { fatal: false }).decode(arrayBuf.slice(0, 4096));
      } catch {
        rawTextSample = '';
      }
    } else {
      fileHash = await sha256Hex(`${filename}-${fileSize}-${Date.now()}`);
    }

    const existingDup = db.documents.find((d: any) => d.file_hash === fileHash);
    const isDuplicate = Boolean(existingDup);

    const lowerName = filename.toLowerCase();
    if (!expiryDateStr) {
      if (lowerName.includes('expired') || lowerName.includes('2023') || lowerName.includes('2024')) {
        expiryDateStr = '2024-12-31T00:00:00Z';
      } else {
        expiryDateStr = '2027-06-30T00:00:00Z';
      }
    }
    if (!issueDateStr) {
      issueDateStr = '2026-01-15T00:00:00Z';
    }

    const isExpired = expiryDateStr ? new Date(expiryDateStr).getTime() < Date.now() : false;
    const isSuspiciousName = lowerName.includes('suspicious') || lowerName.includes('tamper') || lowerName.includes('unverified') || lowerName.includes('fake');

    const inst = db.institutions.find((i: any) => i.id === instId);
    const printableMatches = rawTextSample.match(/[A-Za-z0-9\s.,:/-]{12,}/g);
    const cleanedSample = printableMatches ? printableMatches.join(' ').slice(0, 220).trim() : '';

    const extractedText =
      `OCR TEXT EXTRACTION REPORT\n` +
      `Document Type: ${docType.replace(/_/g, ' ')}\n` +
      `File Name: ${filename}\n` +
      `Institution: ${inst?.name || `Institution #${instId}`} (${inst?.aicte_id || 'AICTE-VERIFIED'})\n` +
      `SHA-256 Digest: ${fileHash.slice(0, 32)}...\n` +
      `Issue Date: ${issueDateStr.slice(0, 10)} | Expiry Date: ${expiryDateStr.slice(0, 10)}\n` +
      (cleanedSample ? `Extracted Content Snippet: ${cleanedSample}\n` : '') +
      `Verification Signatures & Official Seal Checked.`;

    const fraudFlags: string[] = [];
    let status = 'VERIFIED';
    let authScore = 93.5;

    if (isDuplicate) {
      status = 'DUPLICATE';
      authScore = 32.0;
      fraudFlags.push(`Duplicate SHA-256 file hash matches Document #${existingDup.id} (${existingDup.filename})`);
    } else if (isExpired) {
      status = 'EXPIRED';
      authScore = 54.0;
      fraudFlags.push(`Document validity period expired on ${expiryDateStr.slice(0, 10)}`);
    } else if (isSuspiciousName) {
      status = 'SUSPICIOUS';
      authScore = 42.0;
      fraudFlags.push('Anomaly detected: Missing official registrar stamp / metadata modification trace');
    } else {
      status = 'PENDING';
      authScore = 91.0;
    }

    const nextDocId = db.documents.reduce((m: number, d: any) => Math.max(m, d.id), 0) + 1;
    const now = new Date().toISOString();
    const newDoc = {
      id: nextDocId,
      institution_id: instId,
      application_id: appId || 1,
      document_type: docType,
      filename,
      file_path: `/uploads/${filename}`,
      file_size: fileSize,
      mime_type: mimeType,
      file_hash: fileHash,
      status,
      extracted_text: extractedText,
      extracted_metadata: {
        word_count: extractedText.split(/\s+/).length,
        has_dates: true,
        has_signatures: !isSuspiciousName,
        has_stamp_keywords: !isSuspiciousName,
        detected_dates: [issueDateStr.slice(0, 10), expiryDateStr.slice(0, 10)],
      },
      authenticity_score: authScore,
      fraud_Auto_flags: fraudFlags,
      is_duplicate: isDuplicate,
      duplicate_of_id: existingDup ? existingDup.id : null,
      issue_date: issueDateStr,
      expiry_date: expiryDateStr,
      is_expired: isExpired,
      uploaded_by: currentUser.id,
      verified_by: null,
      verified_at: null,
      created_at: now,
    };

    db.documents.unshift(newDoc);
    db.audit_logs.unshift({
      id: db.audit_logs.length + 1,
      user_id: currentUser.id,
      user_email: currentUser.email,
      action: 'DOCUMENT_UPLOADED',
      entity_type: 'Document',
      entity_id: newDoc.id,
      details: { filename, document_type: docType, status },
      created_at: now,
    });
    saveDb(db);
    return respond(newDoc);
  }

  const docAnalyzeMatch = path.match(/^\/documents\/(\d+)\/analyze$/);
  if (docAnalyzeMatch && method === 'POST') {
    const docId = Number(docAnalyzeMatch[1]);
    const doc = db.documents.find((d: any) => d.id === docId);
    if (!doc) return reject(404, 'Document not found.');

    const dup = db.documents.find((d: any) => d.id !== doc.id && d.file_hash === doc.file_hash);
    doc.is_duplicate = Boolean(dup);
    doc.duplicate_of_id = dup ? dup.id : null;
    doc.is_expired = doc.expiry_date ? new Date(doc.expiry_date).getTime() < Date.now() : false;

    if (doc.is_duplicate) {
      doc.status = 'DUPLICATE';
    } else if (doc.is_expired) {
      doc.status = 'EXPIRED';
    } else if (doc.fraud_Auto_flags && doc.fraud_Auto_flags.length > 0 && doc.authenticity_score < 60) {
      doc.status = 'SUSPICIOUS';
    } else if (doc.status === 'PENDING' || doc.status === 'PROCESSING') {
      doc.status = 'VERIFIED';
      doc.verified_by = currentUser.id;
      doc.verified_at = new Date().toISOString();
    }

    saveDb(db);
    return respond({
      document_id: doc.id,
      filename: doc.filename,
      status: doc.status,
      ocr_result: {
        extracted_text: doc.extracted_text,
        metadata: doc.extracted_metadata,
      },
      forgery_analysis: {
        authenticity_score: doc.authenticity_score,
        risk_level: doc.authenticity_score >= 80 ? 'LOW' : doc.authenticity_score >= 55 ? 'MEDIUM' : 'HIGH',
        flags: doc.fraud_Auto_flags || [],
      },
      duplicate_check: {
        is_duplicate: doc.is_duplicate,
        duplicate_of_id: doc.duplicate_of_id,
        file_hash: doc.file_hash,
      },
      expiry_check: {
        is_expired: doc.is_expired,
        expiry_date: doc.expiry_date,
      },
    });
  }

  const docStatusMatch = path.match(/^\/documents\/(\d+)\/status$/);
  if (docStatusMatch && method === 'PUT') {
    const docId = Number(docStatusMatch[1]);
    const doc = db.documents.find((d: any) => d.id === docId);
    if (!doc) return reject(404, 'Document not found.');
    const newStatus = String(params.status || body?.status || 'VERIFIED').toUpperCase();
    doc.status = newStatus;
    doc.verified_by = currentUser.id;
    doc.verified_at = new Date().toISOString();
    if (newStatus === 'DUPLICATE') doc.is_duplicate = true;
    if (newStatus === 'EXPIRED') doc.is_expired = true;
    if (newStatus === 'SUSPICIOUS' && (!doc.fraud_Auto_flags || doc.fraud_Auto_flags.length === 0)) {
      doc.fraud_Auto_flags = ['Flagged as suspicious during manual reviewer inspection'];
    }
    if (newStatus === 'VERIFIED') {
      doc.is_duplicate = false;
      doc.is_expired = false;
    }

    db.audit_logs.unshift({
      id: db.audit_logs.length + 1,
      user_id: currentUser.id,
      user_email: currentUser.email,
      action: `DOCUMENT_MARKED_${newStatus}`,
      entity_type: 'Document',
      entity_id: doc.id,
      details: { filename: doc.filename, status: newStatus },
      created_at: new Date().toISOString(),
    });
    saveDb(db);
    return respond({ id: doc.id, status: doc.status, verified_by: doc.verified_by, verified_at: doc.verified_at });
  }

  // 6. COMPLIANCE
  if (path === '/compliance/records' && method === 'GET') {
    const list = scopedInstId
      ? db.compliance_records.filter((c: any) => c.institution_id === scopedInstId)
      : db.compliance_records;
    return respond(list);
  }

  if (path === '/compliance/evaluate' && method === 'POST') {
    const instId = isInstituteRole ? currentUser.institution_id || 1 : Number(body?.institution_id || 1);
    const totalStudents = Number(body?.total_students || 720);
    const totalFaculty = Number(body?.total_faculty || 48);
    const ratio = totalFaculty > 0 ? Math.round((totalStudents / totalFaculty) * 10) / 10 : 20;
    const facScore = Math.min(100, Math.max(35, Math.round((15 / Math.max(ratio, 10)) * 90)));
    const infraScore = Math.min(100, Math.round((Number(body?.built_up_area_sqm || 15000) / 15000) * 88));
    const equipScore = Math.min(100, Math.round((Number(body?.computers_count || 250) / 250) * 85));
    const finScore = Math.min(
      100,
      Math.round((Number(body?.actual_utilization_lakhs || 900) / Math.max(1, Number(body?.annual_budget_lakhs || 1000))) * 95)
    );

    const instDocs = db.documents.filter((d: any) => d.institution_id === instId && d.status === 'VERIFIED');
    const docScore = Math.min(100, Math.round((instDocs.length / REQUIRED_DOC_TYPES.length) * 100));
    const overall = Math.round(((facScore + infraScore + equipScore + finScore + Math.max(docScore, 60)) / 5) * 10) / 10;
    const riskLevel = overall >= 80 ? 'LOW' : overall >= 60 ? 'MEDIUM' : 'HIGH';

    const deficiencies: string[] = [];
    if (ratio > 15) deficiencies.push(`Faculty-student ratio 1:${ratio} exceeds AICTE 1:15 norm`);
    if (docScore < 100) deficiencies.push('All 8 mandatory institutional documents are not yet verified');

    const existingIdx = db.compliance_records.findIndex((c: any) => c.institution_id === instId);
    const record = {
      id: existingIdx >= 0 ? db.compliance_records[existingIdx].id : db.compliance_records.length + 1,
      institution_id: instId,
      academic_year: body?.academic_year || '2026-27',
      faculty_student_ratio: ratio,
      total_faculty: totalFaculty,
      phd_faculty_count: Number(body?.phd_faculty_count || 14),
      total_students: totalStudents,
      land_area_acres: Number(body?.land_area_acres || 10),
      built_up_area_sqm: Number(body?.built_up_area_sqm || 16000),
      classrooms_count: Number(body?.classrooms_count || 20),
      labs_count: Number(body?.labs_count || 12),
      library_books_count: Number(body?.library_books_count || 22000),
      library_journals_count: Number(body?.library_journals_count || 50),
      computers_count: Number(body?.computers_count || 260),
      internet_bandwidth_mbps: Number(body?.internet_bandwidth_mbps || 400),
      annual_budget_lakhs: Number(body?.annual_budget_lakhs || 1200),
      actual_utilization_lakhs: Number(body?.actual_utilization_lakhs || 1080),
      overall_compliance_score: overall,
      faculty_score: facScore,
      infrastructure_score: infraScore,
      equipment_score: equipScore,
      financial_score: finScore,
      document_compliance_score: docScore,
      risk_level: riskLevel,
      deficiencies,
      recommendations:
        deficiencies.length > 0
          ? ['Address flagged faculty/document deficiencies prior to final committee review']
          : ['Institution meets all AICTE regulatory parameters'],
      evaluated_at: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      db.compliance_records[existingIdx] = record;
    } else {
      db.compliance_records.unshift(record);
    }
    const inst = db.institutions.find((i: any) => i.id === instId);
    if (inst) inst.compliance_score = overall;
    saveDb(db);
    return respond(record);
  }

  // 7. REPORTS
  if (path === '/users' && method === 'GET') {
    return respond(db.users.map((u: EmbeddedUser) => sanitizeUser(u)));
  }

  if (path === '/reports' && method === 'GET') {
    const list = scopedInstId ? db.reports.filter((r: any) => r.institution_id === scopedInstId) : db.reports;
    return respond(list);
  }

  if (path === '/reports/generate' && method === 'POST') {
    const instId = isInstituteRole ? currentUser.institution_id || 1 : Number(body?.institution_id || 1);
    const reportType = String(body?.report_type || 'COMPLIANCE_SUMMARY');
    const inst = db.institutions.find((i: any) => i.id === instId) || db.institutions[0];
    const docs = db.documents.filter((d: any) => d.institution_id === inst.id);
    const comp = db.compliance_records.find((c: any) => c.institution_id === inst.id);

    const verifiedCount = docs.filter((d: any) => d.status === 'VERIFIED').length;
    const pendingCount = docs.filter((d: any) => d.status === 'PENDING').length;
    const duplicateCount = docs.filter((d: any) => d.status === 'DUPLICATE' || d.is_duplicate).length;
    const suspiciousCount = docs.filter((d: any) => d.status === 'SUSPICIOUS').length;
    const expiredCount = docs.filter((d: any) => d.status === 'EXPIRED' || d.is_expired).length;

    const title = `${reportType.replace(/_/g, ' ')} - ${inst.name}`;
    const pdfBlobUrl = generatePdfBlobUrl(title, [
      `Institution Name: ${inst.name}`,
      `AICTE Permanent ID: ${inst.aicte_id}`,
      `Location: ${inst.city}, ${inst.state} | Type: ${inst.type}`,
      `Overall Compliance Score: ${comp?.overall_compliance_score ?? inst.compliance_score}% (Risk Level: ${comp?.risk_level || 'LOW'})`,
      `Total Uploaded Documents: ${docs.length}`,
      `Verified: ${verifiedCount} | Pending: ${pendingCount} | Duplicate: ${duplicateCount} | Suspicious: ${suspiciousCount} | Expired: ${expiredCount}`,
      `--------------------------------------------------------------------------------`,
      `DOCUMENT VERIFICATION BREAKDOWN:`,
      ...docs.map(
        (d: any, idx: number) =>
          `${idx + 1}. [${d.status}] ${d.document_type} - ${d.filename} (Auth Score: ${d.authenticity_score || 90}%)`
      ),
      `--------------------------------------------------------------------------------`,
      `Generated By: ${currentUser.full_name} (${currentUser.email})`,
    ]);

    const nextId = db.reports.reduce((m: number, r: any) => Math.max(m, r.id), 0) + 1;
    const newReport = {
      id: nextId,
      institution_id: inst.id,
      application_id: body?.application_id ? Number(body.application_id) : 1,
      report_type: reportType,
      title,
      file_path: pdfBlobUrl,
      summary_data: {
        institution_name: inst.name,
        aicte_id: inst.aicte_id,
        compliance_score: comp?.overall_compliance_score ?? inst.compliance_score,
        verified_documents: verifiedCount,
        pending_documents: pendingCount,
        duplicate_documents: duplicateCount,
        suspicious_documents: suspiciousCount,
        expired_documents: expiredCount,
      },
      generated_by: currentUser.id,
      created_at: new Date().toISOString(),
    };
    db.reports.unshift(newReport);
    db.audit_logs.unshift({
      id: db.audit_logs.length + 1,
      user_id: currentUser.id,
      user_email: currentUser.email,
      action: 'PDF_REPORT_GENERATED',
      entity_type: 'Report',
      entity_id: newReport.id,
      details: { title: newReport.title },
      created_at: new Date().toISOString(),
    });
    saveDb(db);
    return respond(newReport);
  }

  return respond({});
}

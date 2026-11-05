// ============================================================
// AI-BMEZ Platform — Central Type Definitions
// ============================================================

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'OFFICER'
  | 'REVIEWER'
  | 'INSTITUTION_ADMIN'
  | 'INSTITUTE_USER'
  | 'AICTE_OFFICIAL'
  | 'INSTITUTE_ADMIN'
  | 'INSTITUTE_STAFF';

export interface User {
  id: number | string;
  email: string;
  full_name: string;
  role: UserRole;
  institution_id?: number | null;
  institution_name?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
  user?: User;
  role?: string;
  full_name?: string;
  user_id?: number;
  institution_id?: number | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  full_name: string;
  role?: UserRole | string;
  institution_id?: number;
  institution_name?: string;
  aicte_id?: string;
  institution_type?: string;
  state?: string;
  district?: string;
  city?: string;
  phone?: string;
}

// ---------- Institution ----------
export type InstitutionStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'INACTIVE' | 'UNDER_REVIEW';

export interface Institution {
  id: number;
  name: string;
  aicte_id: string;
  institution_type?: string;
  type?: string;
  state: string;
  district: string;
  city?: string;
  address: string;
  pincode: string;
  phone?: string;
  email?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_person?: string;
  affiliated_university?: string;
  total_intake?: number;
  compliance_score?: number;
  website?: string;
  status?: InstitutionStatus;
  establishment_year?: number;
  established_year?: number;
  application_count?: number;
  document_count?: number;
  total_applications?: number;
  approved_applications?: number;
  created_at: string;
  updated_at?: string;
}

export interface InstitutionFormData {
  name: string;
  aicte_id: string;
  institution_type?: string;
  type?: string;
  state?: string;
  district?: string;
  city?: string;
  address?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_person?: string;
  establishment_year?: number;
  established_year?: number;
}

// ---------- Application ----------
export type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'DEFICIENCY_RAISED'
  | 'APPROVED'
  | 'REJECTED'
  | 'RETURNED'
  | 'WITHDRAWN';

export interface ApplicationCategoryItem {
  id: number;
  name: string;
  code: string;
  description?: string;
}

export interface Application {
  id: number;
  application_id?: string;
  application_number?: string;
  title?: string;
  institution_id: number;
  institution_name?: string;
  academic_year?: string;
  application_type?: string;
  program_names?: string;
  proposed_intake?: number;
  Completeness_score?: number;
  risk_score?: number;
  assigned_officer_id?: number | null;
  reviewer_remarks?: string | null;
  category_id?: number;
  category_name?: string;
  category_code?: string;
  category?: string;
  status: ApplicationStatus;
  submitted_by?: number;
  submitter_name?: string;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  reviewer_id?: number;
  reviewer_name?: string;
  review_notes?: string;
  document_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface ApplicationFormData {
  institution_id: number;
  category_id?: number;
  title?: string;
  application_type?: string;
  academic_year?: string;
  program_names?: string;
  proposed_intake?: number;
}

// ---------- Document ----------
export type DocumentType =
  | 'AFFIDAVIT'
  | 'BUILDING_PLAN'
  | 'FIRE_NOC'
  | 'LAND_OWNERSHIP'
  | 'FACULTY_LIST'
  | 'EQUIPMENT_SPEC'
  | 'AUDIT_STATEMENT'
  | 'TRUST_DEED'
  | 'ACCREDITATION'
  | 'OTHER';

export type DocumentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'VERIFIED'
  | 'MISSING'
  | 'DUPLICATE'
  | 'SUSPICIOUS'
  | 'FLAGGED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'REPLACED';

export type AuthStatus =
  | 'PENDING'
  | 'NO_ANOMALY'
  | 'POTENTIAL_DUPLICATE'
  | 'SUSPICIOUS'
  | 'MISMATCH'
  | 'MANUAL_REVIEW';

export interface Document {
  id: number;
  institution_id: number;
  application_id?: number | null;
  document_type: DocumentType | string;
  filename: string;
  original_filename?: string;
  stored_filename?: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  file_hash: string;
  sha256_hash?: string;
  status: DocumentStatus;
  extracted_text?: string | null;
  extracted_metadata?: {
    word_count?: number;
    has_dates?: boolean;
    has_signatures?: boolean;
    has_stamp_keywords?: boolean;
    detected_dates?: string[];
  } | null;
  authenticity_score?: number | null;
  fraud_Auto_flags?: string[];
  is_duplicate?: boolean;
  duplicate_of_id?: number | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  is_expired?: boolean;
  uploaded_by?: number | null;
  verified_by?: number | null;
  verified_at?: string | null;
  created_at: string;
  upload_date?: string;
  is_active?: boolean;
  institution_name?: string;
  document_type_id?: number;
  document_type_name?: string;
  uploader_name?: string;
  cert_number?: string;
  ocr_confidence?: number;
  auth_status?: string;
  review_notes?: string;
}

export interface MissingDocsResponse {
  institution_id: number;
  required_documents: string[];
  uploaded_documents: string[];
  missing_documents: string[];
  completeness_percentage: number;
}

export interface ExpiryAlertsResponse {
  expired_count: number;
  expiring_soon_count: number;
  expired_documents: {
    id: number;
    filename: string;
    document_type: string;
    institution_id: number;
    expiry_date: string;
  }[];
  expiring_soon: {
    id: number;
    filename: string;
    document_type: string;
    institution_id: number;
    expiry_date: string;
    days_remaining: number;
  }[];
}

// ---------- Compliance ----------
export type ComplianceStatus = 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | 'PENDING';

export interface ComplianceRecord {
  id: number;
  institution_id: number;
  academic_year: string;
  faculty_student_ratio: number;
  total_faculty: number;
  phd_faculty_count?: number;
  total_students: number;
  land_area_acres?: number;
  built_up_area_sqm: number;
  classrooms_count?: number;
  labs_count?: number;
  library_books_count: number;
  library_journals_count?: number;
  computers_count: number;
  internet_bandwidth_mbps?: number;
  annual_budget_lakhs: number;
  actual_utilization_lakhs: number;
  overall_compliance_score: number;
  faculty_score: number;
  infrastructure_score: number;
  equipment_score: number;
  financial_score: number;
  document_compliance_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  deficiencies: string[];
  recommendations: string[];
  evaluated_at: string;
}

// ---------- Audit ----------
export interface AuditLogEntry {
  id: number;
  user_id?: number;
  user_email?: string;
  action: string;
  entity_type?: string;
  entity_id?: number | string;
  details?: Record<string, any>;
  created_at: string;
}

// ---------- Alerts ----------
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'INFO';

export interface Alert {
  id: number;
  alert_type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  institution_id?: number | null;
  application_id?: number | null;
  document_id?: number | null;
  is_read: boolean;
  is_resolved: boolean;
  created_at: string;
  resolved_at?: string | null;
}

export interface AlertsSummary {
  total: number;
  unread: number;
  unresolved: number;
  critical: number;
  high: number;
  medium: number;
}

export interface MonthlyTrendPoint {
  month: string;
  applications: number;
  documents: number;
  approved: number;
}

export interface ComplianceDistribution {
  name: string;
  value: number;
  color: string;
}

export interface DocumentStatusDistribution {
  status: string;
  count: number;
}

export interface RecentActivityItem {
  id: number;
  action: string;
  user_name: string;
  entity_type: string;
  result: string;
  timestamp: string;
}

export interface ExpiringDocument {
  id: number;
  filename: string;
  institution_id: number;
  institution_name: string;
  expiry_date: string;
  days_remaining: number;
  document_type: string;
}

// ---------- Dashboard ----------
export interface DashboardStats {
  total_institutions: number;
  total_applications: number;
  pending_reviews: number;
  approved_applications: number;
  rejected_applications: number;
  deficiency_raised: number;
  total_documents: number;
  verified_documents: number;
  pending_documents: number;
  flagged_documents: number;
  suspicious_documents: number;
  duplicate_documents: number;
  expired_documents: number;
  missing_documents_count: number;
  average_compliance_score: number;
  high_risk_institutions: number;
  recent_activities: AuditLogEntry[];
  application_status_distribution: { status: string; count: number }[];
  document_status_distribution: { status: string; count: number }[];
  monthly_submissions: { month: string; count: number }[];
  compliance_by_state: { state: string; avg_score: number; count: number }[];
}

// ---------- Reports ----------
export interface Report {
  id: number;
  institution_id: number;
  application_id?: number | null;
  report_type: string;
  title: string;
  file_path: string;
  download_url?: string;
  summary_data?: Record<string, any>;
  generated_by?: number | null;
  generator_name?: string;
  created_at: string;
  filename?: string;
}

// ---------- Pagination ----------
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip?: number;
  limit?: number;
  page?: number;
  size?: number;
  pages?: number;
}

export interface PaginationParams {
  skip?: number;
  limit?: number;
  search?: string;
  [key: string]: string | number | boolean | undefined;
}

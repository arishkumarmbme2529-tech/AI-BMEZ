// ============================================================
// AICTE Smart Platform — Central Type Definitions
// ============================================================

export type UserRole = 'SUPER_ADMIN' | 'OFFICER' | 'INSTITUTION_ADMIN' | 'AICTE_OFFICIAL' | 'INSTITUTE_ADMIN' | 'INSTITUTE_STAFF';

export interface User {
  id: number | string;
  email: string;
  full_name: string;
  role: UserRole;
  institution_id?: number | string | null;
  institution_name?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
  role?: string;
  full_name?: string;
  user_id?: number;
  institution_id?: number | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
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
  phone: string;
  email: string;
  contact_person?: string;
  status: InstitutionStatus;
  establishment_year?: number;
  established_year?: number;
  application_count?: number;
  document_count?: number;
  total_applications?: number;
  approved_applications?: number;
  created_at: string;
  updated_at: string;
}

export interface InstitutionFormData {
  name: string;
  aicte_id: string;
  institution_type?: string;
  state?: string;
  district?: string;
  city?: string;
  address?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  establishment_year?: number;
}

// ---------- Application ----------
export type ApplicationStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'RETURNED' | 'WITHDRAWN';

export interface ApplicationCategoryItem {
  id: number;
  name: string;
  code: string;
  description?: string;
}

export interface Application {
  id: number;
  application_id: string;
  application_number?: string;
  title: string;
  institution_id: number;
  institution_name: string;
  category_id: number;
  category_name: string;
  category_code?: string;
  category?: string;
  status: ApplicationStatus;
  submitted_by: number;
  submitter_name?: string;
  submitted_at?: string;
  reviewer_id?: number;
  reviewer_name?: string;
  review_notes?: string;
  document_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ApplicationFormData {
  institution_id: number;
  category_id: number;
  title: string;
}

export interface ChecklistItem {
  document_type_id: number;
  document_type_name: string;
  code: string;
  is_required: boolean;
  is_uploaded: boolean;
  status: 'UPLOADED' | 'MISSING' | 'OPTIONAL';
}

export interface ApplicationChecklist {
  application_id: string;
  checklist: ChecklistItem[];
  missing_required: number;
  total_required: number;
  total_uploaded: number;
}

export interface ValidationSummary {
  application_id: string;
  status: string;
  institution: string;
  category: string;
  total_documents: number;
  compliance_checked: number;
  compliant_rules: number;
  non_compliant_rules: number;
  auth_issues: number;
  open_alerts: number;
  overall_readiness: 'READY' | 'NEEDS_ATTENTION';
}

// ---------- Document ----------
export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED' | 'REPLACED';
export type AuthStatus = 'PENDING' | 'NO_ANOMALY' | 'POTENTIAL_DUPLICATE' | 'SUSPICIOUS' | 'MISMATCH' | 'MANUAL_REVIEW';

export interface DocumentTypeItem {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_required: boolean;
}

export interface Document {
  id: number;
  original_filename: string;
  stored_filename: string;
  file_size: number;
  mime_type: string;
  sha256_hash?: string;
  upload_date: string;
  status: DocumentStatus;
  is_active: boolean;
  expiry_date?: string;
  application_id?: number;
  institution_id: number;
  document_type_id: number;
  document_type_name?: string;
  uploaded_by: number;
  uploader_name?: string;
}

// ---------- OCR ----------
export interface OCRCorrectionRecord {
  field: string;
  original: string;
  corrected: string;
  corrected_at: string;
  corrected_by: number;
}

export interface OCRResult {
  id: number;
  document_id: number;
  extracted_text: string;
  structured_data?: Record<string, any>;
  institution_name?: string;
  cert_number?: string;
  issue_date?: string;
  expiry_date?: string;
  issuing_authority?: string;
  confidence_score: number;
  ocr_engine: string;
  processed_at: string;
  corrections?: OCRCorrectionRecord[];
  corrected_by?: number;
}

export interface OCRCorrectionData {
  institution_name?: string;
  cert_number?: string;
  issue_date?: string;
  expiry_date?: string;
  issuing_authority?: string;
}

// ---------- Auth Analysis ----------
export interface AnomalyFinding {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'INFO';
  description: string;
  detail?: string;
  note?: string;
}

export interface AuthResult {
  id?: number;
  document_id: number;
  document_name?: string;
  status: AuthStatus;
  duplicate_document_id?: number | null;
  similarity_score?: number | null;
  anomaly_findings: AnomalyFinding[];
  metadata_analysis?: Record<string, any>;
  explanation: string;
  recommendation: string;
  analyzed_at: string;
  reviewed_by?: number | null;
  review_notes?: string | null;
  note?: string;
}

// ---------- Compliance ----------
export type ComplianceStatus = 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | 'PENDING';

export interface ComplianceRule {
  id: number;
  rule_id: string;
  name: string;
  category_id?: number | null;
  category_name?: string;
  description: string;
  requirement: string;
  validation_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  version: string;
  is_sample: boolean;
}

export interface ComplianceRuleResult {
  id: number;
  rule_id: string;
  rule_name: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description?: string;
  status: ComplianceStatus;
  evidence?: string;
  notes?: string;
  checked_at: string;
  is_sample?: boolean;
}

export interface ComplianceResultsResponse {
  application_id: number;
  items: ComplianceRuleResult[];
  summary: {
    total: number;
    compliant: number;
    non_compliant: number;
    compliance_score: number;
  };
}

// ---------- Infrastructure ----------
export interface InfrastructureEvidenceItem {
  id: number;
  application_id?: number;
  institution_id?: number;
  category: string;
  document_id?: number | null;
  ai_observations?: Record<string, any>;
  quality_score?: number | null;
  status: 'PENDING' | 'REVIEWED' | 'APPROVED' | 'REJECTED';
  uploaded_at: string;
  reviewed_at?: string | null;
  note?: string;
}

// ---------- Verification ----------
export interface VerificationRecord {
  id: number;
  document_id?: number;
  verification_type: string;
  status: 'PENDING' | 'VERIFIED' | 'MISMATCH' | 'EXPIRED' | 'UNAVAILABLE' | 'MANUAL_REVIEW';
  source: string;
  external_ref?: string;
  requested_at: string;
  responded_at?: string;
  notes?: string;
  disclaimer?: string;
}

export interface VerificationAction {
  action: 'APPROVE' | 'REJECT' | 'RETURN';
  remarks: string;
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

// ---------- Audit ----------
export interface AuditLog {
  id: number;
  user_id: number;
  user_name?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  application_id?: number | null;
  document_id?: number | null;
  result?: string;
  evidence?: Record<string, any> | null;
  timestamp: string;
}

// ---------- Dashboard ----------
export interface DashboardStats {
  total_institutions: number;
  total_applications: number;
  total_documents: number;
  verified_documents: number;
  pending_applications: number;
  missing_documents: number;
  duplicate_documents: number;
  expired_documents: number;
  anomaly_alerts: number;
  compliance_rate: number;
  generated_at?: string;
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

// ---------- Reports ----------
export interface Report {
  id: number;
  application_id: number;
  report_type: string;
  generated_by: number;
  generator_name?: string;
  created_at: string;
  download_url: string;
  filename?: string;
}

// ---------- Renewal ----------
export interface RenewalRecordItem {
  id: number;
  document_id: number;
  document_name?: string;
  institution_id: number;
  institution_name?: string;
  renewal_due_date: string;
  days_remaining?: number | null;
  status: 'ACTIVE' | 'RENEWED' | 'EXPIRED' | 'CANCELLED';
  reminder_90_sent: boolean;
  reminder_60_sent: boolean;
  reminder_30_sent: boolean;
  reminder_7_sent: boolean;
  renewed_document_id?: number | null;
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

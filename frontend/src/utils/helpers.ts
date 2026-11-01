import { format, formatDistanceToNow, isValid, parseISO, differenceInDays } from 'date-fns';
import type { ApplicationStatus, DocumentStatus, AuthStatus, ComplianceStatus, AlertSeverity, UserRole } from '../types';

// ---- Date helpers ----
export function formatDate(dateStr: string | undefined | null, fmt = 'dd MMM yyyy'): string {
  if (!dateStr) return '—';
  const d = parseISO(dateStr);
  if (!isValid(d)) return '—';
  return format(d, fmt);
}

export function formatDateTime(dateStr: string | undefined | null): string {
  return formatDate(dateStr, 'dd MMM yyyy, HH:mm');
}

export function timeAgo(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  const d = parseISO(dateStr);
  if (!isValid(d)) return '—';
  return formatDistanceToNow(d, { addSuffix: true });
}

export function daysUntilExpiry(dateStr: string | undefined | null): number {
  if (!dateStr) return 999;
  const d = parseISO(dateStr);
  if (!isValid(d)) return 999;
  return differenceInDays(d, new Date());
}

// ---- File helpers ----
export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ---- Status label helpers ----
export function getApplicationStatusLabel(status: ApplicationStatus): string {
  const map: Record<ApplicationStatus, string> = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    UNDER_REVIEW: 'Under Review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    RETURNED: 'Returned',
    WITHDRAWN: 'Withdrawn',
  };
  return map[status] ?? status;
}

export function getApplicationStatusColor(status: ApplicationStatus): string {
  const map: Record<ApplicationStatus, string> = {
    DRAFT: 'bg-slate-100 text-slate-700',
    SUBMITTED: 'bg-blue-100 text-blue-700',
    UNDER_REVIEW: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    RETURNED: 'bg-orange-100 text-orange-700',
    WITHDRAWN: 'bg-gray-100 text-gray-700',
  };
  return map[status] ?? 'bg-slate-100 text-slate-700';
}

export function getDocumentStatusColor(status: DocumentStatus): string {
  const map: Record<DocumentStatus, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    PROCESSING: 'bg-blue-100 text-blue-700',
    VERIFIED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    EXPIRED: 'bg-red-100 text-red-800',
    REPLACED: 'bg-slate-100 text-slate-600',
  };
  return map[status] ?? 'bg-slate-100 text-slate-700';
}

export function getAuthStatusColor(status: AuthStatus): string {
  const map: Record<AuthStatus, string> = {
    PENDING: 'bg-slate-100 text-slate-600',
    NO_ANOMALY: 'bg-green-100 text-green-700',
    POTENTIAL_DUPLICATE: 'bg-orange-100 text-orange-700',
    SUSPICIOUS: 'bg-red-100 text-red-700',
    MISMATCH: 'bg-red-100 text-red-800',
    MANUAL_REVIEW: 'bg-yellow-100 text-yellow-700',
  };
  return map[status] ?? 'bg-slate-100 text-slate-700';
}

export function getComplianceStatusColor(status: ComplianceStatus): string {
  const map: Record<ComplianceStatus, string> = {
    COMPLIANT: 'bg-green-100 text-green-700',
    PARTIAL: 'bg-yellow-100 text-yellow-700',
    NON_COMPLIANT: 'bg-red-100 text-red-700',
    PENDING: 'bg-slate-100 text-slate-600',
  };
  return map[status] ?? 'bg-slate-100 text-slate-700';
}

export function getSeverityColor(severity: string): string {
  const map: Record<string, string> = {
    LOW: 'bg-blue-100 text-blue-700',
    MEDIUM: 'bg-amber-100 text-amber-700',
    HIGH: 'bg-orange-100 text-orange-700',
    CRITICAL: 'bg-red-100 text-red-700',
    INFO: 'bg-slate-100 text-slate-700',
  };
  return map[severity] ?? 'bg-slate-100 text-slate-700';
}

export function getAlertSeverityColor(severity: AlertSeverity): string {
  const map: Record<AlertSeverity, string> = {
    LOW: 'bg-blue-50 border-blue-200 text-blue-800',
    MEDIUM: 'bg-amber-50 border-amber-200 text-amber-800',
    HIGH: 'bg-orange-50 border-orange-200 text-orange-800',
    CRITICAL: 'bg-red-50 border-red-200 text-red-900',
    INFO: 'bg-slate-50 border-slate-200 text-slate-800',
  };
  return map[severity] ?? 'bg-slate-50 border-slate-200 text-slate-800';
}

export function getDaysRemainingColor(days: number): string {
  if (days < 0) return 'text-red-700 font-semibold';
  if (days < 30) return 'text-red-600 font-semibold';
  if (days < 60) return 'text-orange-500 font-semibold';
  if (days < 90) return 'text-yellow-600 font-medium';
  return 'text-green-600';
}

export function getRoleLabel(role: UserRole | string): string {
  const map: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    OFFICER: 'Verification Officer',
    INSTITUTION_ADMIN: 'Institution Admin',
    AICTE_OFFICIAL: 'AICTE Official',
    INSTITUTE_ADMIN: 'Institute Admin',
    INSTITUTE_STAFF: 'Institute Staff',
  };
  return map[role] ?? role;
}

export function getRoleBadgeColor(role: UserRole | string): string {
  const map: Record<string, string> = {
    SUPER_ADMIN: 'bg-purple-100 text-purple-700',
    OFFICER: 'bg-blue-100 text-blue-800',
    INSTITUTION_ADMIN: 'bg-cyan-100 text-cyan-800',
    AICTE_OFFICIAL: 'bg-blue-100 text-blue-700',
    INSTITUTE_ADMIN: 'bg-cyan-100 text-cyan-700',
    INSTITUTE_STAFF: 'bg-slate-100 text-slate-700',
  };
  return map[role] ?? 'bg-slate-100 text-slate-700';
}

// ---- Number helpers ----
export function formatNumber(n?: number | null): string {
  if (n === undefined || n === null) return '0';
  return new Intl.NumberFormat('en-IN').format(n);
}

export function formatPercent(n?: number | null, decimals = 1): string {
  if (n === undefined || n === null) return '0%';
  return `${n.toFixed(decimals)}%`;
}

// ---- String helpers ----
export function truncate(str: string, maxLen = 40): string {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

export function camelToLabel(str: string): string {
  if (!str) return '';
  return str
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getInitials(name: string): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

import React from 'react';
import { clsx } from 'clsx';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'orange';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700 border border-slate-200',
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border border-amber-200',
  danger: 'bg-red-50 text-red-700 border border-red-200',
  info: 'bg-blue-50 text-blue-700 border border-blue-200',
  purple: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  orange: 'bg-orange-50 text-orange-800 border border-orange-200',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-slate-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  purple: 'bg-indigo-500',
  orange: 'bg-orange-500',
};

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', size = 'sm', children, className, dot = false }) => (
  <span
    className={clsx(
      'inline-flex items-center gap-1.5 rounded-md font-medium',
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
      variantClasses[variant],
      className
    )}
  >
    {dot && <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant])} />}
    {children}
  </span>
);

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = (status || 'PENDING').toUpperCase();
  const map: Record<string, BadgeVariant> = {
    ACTIVE: 'success',
    APPROVED: 'success',
    VERIFIED: 'success',
    NO_ANOMALY: 'success',
    COMPLIANT: 'success',
    ADEQUATE: 'success',
    UPLOADED: 'success',
    RENEWED: 'success',
    READY: 'success',
    SUBMITTED: 'info',
    PROCESSING: 'info',
    UNDER_REVIEW: 'warning',
    DRAFT: 'default',
    PENDING: 'warning',
    MISSING: 'danger',
    DUPLICATE: 'orange',
    POTENTIAL_DUPLICATE: 'orange',
    SUSPICIOUS: 'danger',
    REJECTED: 'danger',
    SUSPENDED: 'danger',
    EXPIRED: 'danger',
    NON_COMPLIANT: 'danger',
    MISMATCH: 'danger',
    RETURNED: 'orange',
    PARTIAL: 'warning',
    MANUAL_REVIEW: 'warning',
    NEEDS_ATTENTION: 'warning',
    INACTIVE: 'default',
    INADEQUATE: 'danger',
    CRITICAL: 'danger',
    HIGH: 'orange',
    MEDIUM: 'warning',
    LOW: 'info',
  };
  const labelMap: Record<string, string> = {
    VERIFIED: 'Verified',
    PENDING: 'Pending',
    PROCESSING: 'Processing',
    MISSING: 'Missing',
    DUPLICATE: 'Duplicate',
    POTENTIAL_DUPLICATE: 'Duplicate',
    SUSPICIOUS: 'Suspicious',
    EXPIRED: 'Expired',
    REJECTED: 'Rejected',
    NO_ANOMALY: 'Verified (No Anomaly)',
    MANUAL_REVIEW: 'Needs Review',
    COMPLIANT: 'Compliant',
    NON_COMPLIANT: 'Non-Compliant',
    PARTIAL: 'Partial',
    UNDER_REVIEW: 'Under Review',
    SUBMITTED: 'Submitted',
    APPROVED: 'Approved',
    RETURNED: 'Returned',
    DRAFT: 'Draft',
    UPLOADED: 'Uploaded',
    OPTIONAL: 'Optional',
  };
  const variant = map[s] ?? 'default';
  const label = labelMap[s] ?? s.replace(/_/g, ' ');
  return <Badge variant={variant} className={className}>{label}</Badge>;
}

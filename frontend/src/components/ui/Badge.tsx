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
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-slate-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
};

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', size = 'sm', children, className, dot = false }) => (
  <span
    className={clsx(
      'inline-flex items-center gap-1.5 rounded-full font-medium',
      size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      variantClasses[variant],
      className
    )}
  >
    {dot && <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant])} />}
    {children}
  </span>
);

// Convenience wrappers for common use cases
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const map: Record<string, BadgeVariant> = {
    ACTIVE: 'success',
    APPROVED: 'success',
    VERIFIED: 'success',
    NO_ANOMALY: 'success',
    COMPLIANT: 'success',
    ADEQUATE: 'success',
    SUBMITTED: 'info',
    UNDER_REVIEW: 'warning',
    DRAFT: 'default',
    PENDING: 'default',
    REJECTED: 'danger',
    SUSPENDED: 'danger',
    EXPIRED: 'danger',
    NON_COMPLIANT: 'danger',
    SUSPICIOUS: 'danger',
    MISMATCH: 'danger',
    RETURNED: 'orange',
    POTENTIAL_DUPLICATE: 'orange',
    PARTIAL: 'warning',
    MANUAL_REVIEW: 'warning',
    INACTIVE: 'default',
    INADEQUATE: 'danger',
    CRITICAL: 'danger',
    HIGH: 'orange',
    MEDIUM: 'warning',
    LOW: 'info',
  };
  const variant = map[status] ?? 'default';
  const label = status.replace(/_/g, ' ');
  return <Badge variant={variant} className={className}>{label}</Badge>;
}

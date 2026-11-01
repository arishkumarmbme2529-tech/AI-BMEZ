import React from 'react';
import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    positive?: boolean;
  };
  color?: 'navy' | 'cyan' | 'green' | 'amber' | 'red' | 'purple' | 'orange';
  onClick?: () => void;
}

const colorMap = {
  navy: {
    iconBg: 'bg-brand-navy/10 text-brand-navy',
    border: 'border-l-4 border-l-brand-navy',
  },
  cyan: {
    iconBg: 'bg-cyan-500/10 text-cyan-600',
    border: 'border-l-4 border-l-cyan-500',
  },
  green: {
    iconBg: 'bg-emerald-500/10 text-emerald-600',
    border: 'border-l-4 border-l-emerald-500',
  },
  amber: {
    iconBg: 'bg-amber-500/10 text-amber-600',
    border: 'border-l-4 border-l-amber-500',
  },
  red: {
    iconBg: 'bg-red-500/10 text-red-600',
    border: 'border-l-4 border-l-red-500',
  },
  purple: {
    iconBg: 'bg-purple-500/10 text-purple-600',
    border: 'border-l-4 border-l-purple-500',
  },
  orange: {
    iconBg: 'bg-orange-500/10 text-orange-600',
    border: 'border-l-4 border-l-orange-500',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'navy',
  onClick,
}) => {
  const c = colorMap[color];
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white rounded-xl border border-slate-100 shadow-card p-5 transition-all duration-200',
        c.border,
        onClick && 'hover:shadow-card-hover cursor-pointer hover:-translate-y-0.5'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1.5">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
          {trend && (
            <p
              className={clsx(
                'text-xs font-medium mt-1.5 inline-flex items-center gap-1',
                trend.positive ? 'text-emerald-600' : 'text-red-600'
              )}
            >
              {trend.value}
            </p>
          )}
        </div>
        <div className={clsx('p-3 rounded-xl flex-shrink-0', c.iconBg)}>{icon}</div>
      </div>
    </div>
  );
};


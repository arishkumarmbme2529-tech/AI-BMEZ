import React from 'react';
import { clsx } from 'clsx';

export type StatAccentColor =
  | 'navy'
  | 'cyan'
  | 'green'
  | 'emerald'
  | 'amber'
  | 'red'
  | 'purple'
  | 'orange'
  | 'slate';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    positive?: boolean;
  };
  color?: StatAccentColor;
  accentColor?: StatAccentColor;
  onClick?: () => void;
}

const colorMap: Record<StatAccentColor, { iconBg: string }> = {
  navy: { iconBg: 'bg-slate-100 text-slate-700' },
  cyan: { iconBg: 'bg-blue-50 text-blue-700' },
  green: { iconBg: 'bg-emerald-50 text-emerald-700' },
  emerald: { iconBg: 'bg-emerald-50 text-emerald-700' },
  amber: { iconBg: 'bg-amber-50 text-amber-700' },
  red: { iconBg: 'bg-red-50 text-red-700' },
  purple: { iconBg: 'bg-purple-50 text-purple-700' },
  orange: { iconBg: 'bg-orange-50 text-orange-700' },
  slate: { iconBg: 'bg-slate-100 text-slate-600' },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color,
  accentColor,
  onClick,
}) => {
  const activeColor = accentColor || color || 'navy';
  const c = colorMap[activeColor] || colorMap.navy;
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white rounded-lg border border-slate-200 p-4 transition-colors',
        onClick && 'hover:border-blue-400 hover:bg-slate-50/40 cursor-pointer'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1 truncate">{subtitle}</p>}
          {trend && (
            <p
              className={clsx(
                'text-xs font-medium mt-1 inline-flex items-center gap-1',
                trend.positive ? 'text-emerald-700' : 'text-red-700'
              )}
            >
              {trend.value}
            </p>
          )}
        </div>
        <div className={clsx('p-2.5 rounded-md flex-shrink-0', c.iconBg)}>{icon}</div>
      </div>
    </div>
  );
};

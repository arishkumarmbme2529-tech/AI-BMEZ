import React from 'react';
import { clsx } from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export const Card: React.FC<CardProps> = ({ children, padding = 'md', hover = false, className, ...props }) => (
  <div
    className={clsx(
      'bg-white rounded-xl border border-slate-100 shadow-card',
      hover && 'hover:shadow-card-hover transition-shadow duration-200 cursor-pointer',
      paddingClasses[padding],
      className
    )}
    {...props}
  >
    {children}
  </div>
);

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle, action, className }) => (
  <div className={clsx('flex items-start justify-between gap-4 mb-4', className)}>
    <div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

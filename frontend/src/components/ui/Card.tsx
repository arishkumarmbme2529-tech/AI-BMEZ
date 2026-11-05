import React from 'react';
import { clsx } from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  noPadding?: boolean;
  hover?: boolean;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  noPadding = false,
  hover = false,
  title,
  subtitle,
  action,
  className,
  ...props
}) => {
  const effectivePadding = noPadding ? 'none' : padding;
  return (
    <div
      className={clsx(
        'bg-white rounded-lg border border-slate-200 shadow-sm',
        hover && 'hover:border-slate-300 transition-colors cursor-pointer',
        !title && paddingClasses[effectivePadding],
        className
      )}
      {...props}
    >
      {title ? (
        <>
          <div className="flex items-start justify-between gap-4 px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 rounded-t-lg">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
          </div>
          <div className={paddingClasses[effectivePadding]}>{children}</div>
        </>
      ) : (
        children
      )}
    </div>
  );
};

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle, action, className }) => (
  <div className={clsx('flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-100', className)}>
    <div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

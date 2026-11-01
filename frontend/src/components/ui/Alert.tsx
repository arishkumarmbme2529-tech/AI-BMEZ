import React from 'react';
import { clsx } from 'clsx';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

interface AlertProps {
  variant?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

const config = {
  info: {
    bg: 'bg-blue-50 border-blue-200 text-blue-900',
    icon: <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />,
  },
  warning: {
    bg: 'bg-amber-50 border-amber-200 text-amber-900',
    icon: <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />,
  },
  error: {
    bg: 'bg-red-50 border-red-200 text-red-900',
    icon: <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />,
  },
  success: {
    bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />,
  },
};

export const AlertBox: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  className,
  action,
}) => {
  const c = config[variant];
  return (
    <div className={clsx('flex items-start justify-between gap-3 rounded-xl border p-4', c.bg, className)}>
      <div className="flex items-start gap-3">
        {c.icon}
        <div className="text-sm">
          {title && <p className="font-semibold mb-0.5">{title}</p>}
          <div className="opacity-90 leading-relaxed">{children}</div>
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
};


import React from 'react';
import { clsx } from 'clsx';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-9 w-9 border-3',
  xl: 'h-12 w-12 border-4',
};

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className, label }) => (
  <div className="inline-flex flex-col items-center justify-center gap-2">
    <div
      className={clsx(
        'animate-spin rounded-full border-slate-200 border-t-cyan-500',
        sizeMap[size],
        className
      )}
    />
    {label && <span className="text-xs font-medium text-slate-500">{label}</span>}
  </div>
);

export const PageLoader: React.FC<{ message?: string }> = ({ message = 'Loading data...' }) => (
  <div className="flex flex-col items-center justify-center min-h-[320px] py-12">
    <Spinner size="lg" />
    <p className="mt-3 text-sm text-slate-500 font-medium">{message}</p>
  </div>
);


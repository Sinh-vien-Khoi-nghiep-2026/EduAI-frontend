import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'success' | 'warning' | 'muted';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  children,
  ...props
}) => {
  const variants = {
    default: 'bg-[#4F6D58] text-white',
    outline: 'bg-transparent border border-[#E1E4E1] text-[#5C615C]',
    success: 'bg-[#E8EAE8] text-[#4F6D58] border border-[#D1D4D1]',
    warning: 'bg-amber-100 text-amber-900 border border-amber-200',
    muted: 'bg-[#F0F2F0] text-[#5C615C]'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

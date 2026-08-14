import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  hoverable = false,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-white border border-[#E1E4E1] rounded-2xl p-5 sm:p-6 shadow-2xs transition-all',
        hoverable && 'hover:border-[#4F6D58] hover:shadow-xs',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

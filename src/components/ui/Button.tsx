import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...props
}) => {
  const variants = {
    primary: 'bg-[#4F6D58] hover:bg-[#3E5746] text-white shadow-2xs',
    secondary: 'bg-[#F0F2F0] hover:bg-[#E8EAE8] text-[#1A1C1A]',
    outline: 'bg-transparent border border-[#E1E4E1] hover:bg-[#F0F2F0] text-[#1A1C1A]',
    ghost: 'bg-transparent hover:bg-[#F0F2F0] text-[#5C615C] hover:text-[#1A1C1A]',
    dark: 'bg-[#1A1C1A] hover:bg-[#2D3E32] text-white shadow-2xs'
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1 rounded-lg',
    md: 'text-xs px-3.5 py-2 rounded-xl font-bold',
    lg: 'text-sm px-4 py-2.5 rounded-xl font-bold'
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="space-y-1 w-full">
      {label && (
        <label className="block text-xs font-bold text-[#1A1C1A]">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3 py-2 text-xs bg-white border rounded-xl placeholder:text-[#5C615C]/60 text-[#1A1C1A] transition-colors focus:outline-none focus:ring-1 focus:ring-[#4F6D58] ${
          error ? 'border-red-500' : 'border-[#E1E4E1]'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-[10px] text-red-500 font-medium">{error}</p>}
    </div>
  );
};

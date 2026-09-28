import React from 'react';

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'dark' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
}

export function Btn({
  variant = 'default',
  size = 'md',
  className = '',
  children,
  ...props
}: BtnProps) {
  const base =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const sizes = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3.5 py-1.5 text-xs font-semibold',
    lg: 'px-4 py-2 text-sm font-semibold',
  };

  const variants = {
    default:
      'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-slate-900 shadow-sm focus:ring-slate-400',
    primary:
      'bg-[#5A5A40] text-white hover:bg-[#484833] shadow-sm focus:ring-[#5A5A40]',
    dark:
      'bg-slate-900 text-white hover:bg-slate-800 shadow-sm focus:ring-slate-900',
    ghost:
      'bg-transparent text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 focus:ring-slate-400',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 shadow-sm focus:ring-rose-500',
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

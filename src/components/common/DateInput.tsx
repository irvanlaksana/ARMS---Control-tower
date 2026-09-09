import React from 'react';
import { CalendarDays } from 'lucide-react';

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  value?: string;
}

const toInputDate = (value: string) => {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
};

export const DateInput: React.FC<DateInputProps> = ({ value = '', className = '', ...props }) => (
  <div className="relative">
    <input
      {...props}
      type="date"
      value={toInputDate(value)}
      className={`w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 pr-9 text-xs text-white [color-scheme:dark] ${className}`}
    />
    <CalendarDays className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400" />
  </div>
);

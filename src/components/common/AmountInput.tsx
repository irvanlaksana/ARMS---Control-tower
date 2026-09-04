import React from 'react';

interface AmountInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  required?: boolean;
  readOnly?: boolean;
  placeholder?: string;
}

export const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChange,
  className,
  required,
  readOnly,
  placeholder = 'Masukkan nominal',
}) => (
  <input
    type="text"
    inputMode="numeric"
    pattern="[0-9]*"
    value={value || ''}
    onChange={(event) => {
      const digitsOnly = event.target.value.replace(/\D/g, '');
      onChange(digitsOnly ? Number(digitsOnly) : 0);
    }}
    required={required}
    readOnly={readOnly}
    placeholder={placeholder}
    className={className}
  />
);

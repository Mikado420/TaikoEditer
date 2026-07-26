import React, { useState, useEffect } from 'react';

interface BufferedNumberInputProps {
  value: number;
  onChange: (newValue: number) => void;
  min?: number;
  max?: number;
  step?: string | number;
  defaultValue?: number;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const BufferedNumberInput: React.FC<BufferedNumberInputProps> = ({
  value,
  onChange,
  min,
  max,
  step = 'any',
  defaultValue = 0,
  className = '',
  placeholder = '',
  disabled = false,
}) => {
  const [tempVal, setTempVal] = useState<string>(
    value !== undefined && value !== null ? String(value) : ''
  );

  useEffect(() => {
    setTempVal(value !== undefined && value !== null ? String(value) : '');
  }, [value]);

  const handleBlur = () => {
    if (tempVal.trim() === '') {
      setTempVal(String(defaultValue));
      onChange(defaultValue);
      return;
    }

    let parsed = parseFloat(tempVal);
    if (isNaN(parsed)) {
      parsed = defaultValue;
    }

    if (min !== undefined && parsed < min) parsed = min;
    if (max !== undefined && parsed > max) parsed = max;

    setTempVal(String(parsed));
    onChange(parsed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <input
      type="number"
      step={step}
      min={min}
      max={max}
      placeholder={placeholder}
      value={tempVal}
      disabled={disabled}
      onChange={(e) => setTempVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={className}
    />
  );
};

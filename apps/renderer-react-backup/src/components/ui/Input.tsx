import React from 'react';
import '../../styles/components/Input.css';
import { VSCodeInput } from '../VSCodeUI.tsx';

interface InputProps {
  type?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
  label?: string;
  required?: boolean;
  className?: string;
  icon?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'filled' | 'outlined';
}

const Input: React.FC<InputProps> = ({
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  error = false,
  errorMessage,
  label,
  required = false,
  className = '',
  icon = null,
  size = 'medium',
  variant = 'default',
  ...props
}) => {
  const inputClass = [
    'input',
    `input-${size}`,
    `input-${variant}`,
    error && 'input-error',
    disabled && 'input-disabled',
    icon && 'input-with-icon',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="input-wrapper">
      {label && (
        <label className="input-label">
          {label}
          {required && <span className="input-required">*</span>}
        </label>
      )}
      <div className="input-container">
        {icon && <span className="input-icon">{icon}</span>}
        <VSCodeInput
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClass}
          required={required}
          {...props}
        />
      </div>
      {error && errorMessage && (
        <span className="input-error-message">{errorMessage}</span>
      )}
    </div>
  );
};

export default Input;
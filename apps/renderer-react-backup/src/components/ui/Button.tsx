import React from 'react';
import '../../styles/components/Button.css';
import { VSCodeButton } from '../VSCodeUI.tsx';

interface ButtonProps {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning' | 'info';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
  style?: React.CSSProperties;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon = null,
  className = '',
  onClick,
  type = 'button',
  title,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  const isIconOnly = !children && !!icon;
  const vscodeVariant = isIconOnly
    ? 'icon'
    : variant === 'secondary' || variant === 'ghost'
      ? 'secondary'
      : 'primary';

  const buttonClass = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    isIconOnly && 'btn-icon-only',
    disabled && 'btn-disabled',
    loading && 'btn-loading',
    className
  ].filter(Boolean).join(' ');

  return (
    <VSCodeButton
      type={type}
      variant={vscodeVariant}
      className={buttonClass}
      onClick={handleClick}
      disabled={disabled || loading}
      title={title}
      icon={loading ? <span className="btn-spinner" /> : icon}
      {...props}
    >
      <span className="btn-content">{children}</span>
    </VSCodeButton>
  );
};

export default Button;
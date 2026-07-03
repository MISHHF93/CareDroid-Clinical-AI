import React, { ButtonHTMLAttributes } from 'react';
import './button.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  compact?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

const Button = ({
  variant = 'primary',
  size = 'md',
  compact = false,
  children,
  style,
  disabled,
  loading,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}: ButtonProps) => {
  const getClassName = () => {
    const variants: Record<string, string> = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      ghost: 'btn-ghost',
      danger: 'btn-danger',
      success: 'btn-success',
    };
    const sizes: Record<string, string> = {
      sm: 'btn-sm',
      md: 'btn-md',
      lg: 'btn-lg',
    };
    return ['btn', variants[variant] || variants.primary, sizes[size], compact ? 'btn-compact' : '', className]
      .filter(Boolean)
      .join(' ');
  };

  return (
    <button
      className={getClassName()}
      style={style}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span className="btn-spinner">
          <svg className="spinner-icon" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="none" strokeWidth="3" />
          </svg>
        </span>
      )}
      {!loading && leftIcon && <span className="btn-icon-left">{leftIcon}</span>}
      <span className="btn-content">{children}</span>
      {!loading && rightIcon && <span className="btn-icon-right">{rightIcon}</span>}
    </button>
  );
};

export default Button;

import React, { ButtonHTMLAttributes, useId } from 'react';
import './button.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  compact?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
  /**
   * When the button is disabled for product reasons (missing API, permissions, etc.),
   * provide a human-readable explanation. Applied to title + aria-describedby.
   */
  disabledReason?: string;
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
  disabledReason,
  title,
  'aria-describedby': ariaDescribedBy,
  type = 'button',
  ...props
}: ButtonProps) => {
  const reasonId = useId();
  const isDisabled = Boolean(disabled || loading);
  const showReason = isDisabled && Boolean(disabledReason);
  const describedBy = [ariaDescribedBy, showReason ? reasonId : null].filter(Boolean).join(' ') || undefined;

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
    <>
      <button
        type={type}
        className={getClassName()}
        style={style}
        disabled={isDisabled}
        aria-busy={loading ? 'true' : 'false'}
        title={title || disabledReason || undefined}
        aria-describedby={describedBy}
        data-disabled-reason={showReason ? disabledReason : undefined}
        {...props}
      >
        {loading && (
          <span className="btn-spinner" aria-hidden="true">
            <svg className="spinner-icon" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="none" strokeWidth="3" />
            </svg>
          </span>
        )}
        {!loading && leftIcon && <span className="btn-icon-left">{leftIcon}</span>}
        <span className="btn-content">{children}</span>
        {!loading && rightIcon && <span className="btn-icon-right">{rightIcon}</span>}
      </button>
      {showReason ? (
        <span id={reasonId} className="sr-only">
          {disabledReason}
        </span>
      ) : null}
    </>
  );
};

export default Button;

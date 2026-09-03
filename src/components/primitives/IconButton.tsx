import React from 'react';
import './IconButton.css';

type IconButtonVariant = 'ghost' | 'outline' | 'primary';
type IconButtonSize = 'sm' | 'md' | 'lg';

type IconButtonProps = {
  icon: React.ReactNode;
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  className,
  type = 'button',
  disabled,
  ...props
}: IconButtonProps) {
  const classes = [
    'cd-icon-btn',
    `cd-icon-btn--${variant}`,
    `cd-icon-btn--${size}`,
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} aria-label={label} disabled={disabled} {...props}>
      <span className="cd-icon-btn__icon" aria-hidden="true">
        {icon}
      </span>
    </button>
  );
}

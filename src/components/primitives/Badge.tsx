import React from 'react';
import './Badge.css';

type BadgeVariant = 'neutral' | 'brand' | 'info' | 'success' | 'warning' | 'danger';
type BadgeSize = 'sm' | 'md';

type BadgeProps = {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  children?: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLSpanElement>;

export function Badge({
  variant = 'neutral',
  size = 'md',
  dot,
  children,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={[
        'cd-badge',
        `cd-badge--${variant}`,
        `cd-badge--${size}`,
        className ?? '',
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {dot && <span className="cd-badge__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

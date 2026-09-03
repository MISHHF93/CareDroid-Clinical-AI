import React from 'react';
import './Spinner.css';

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZE_PX: Record<SpinnerSize, number> = { xs: 12, sm: 16, md: 24, lg: 36 };

type SpinnerProps = {
  size?: SpinnerSize;
  label?: string;
  className?: string;
} & React.HTMLAttributes<HTMLSpanElement>;

export function Spinner({ size = 'md', label = 'Loading…', className, ...props }: SpinnerProps) {
  const px = SIZE_PX[size];
  return (
    <span
      role="status"
      className={['cd-spinner', `cd-spinner--${size}`, className ?? ''].filter(Boolean).join(' ')}
      {...props}
    >
      <svg
        className="cd-spinner__svg"
        viewBox="0 0 24 24"
        fill="none"
        width={px}
        height={px}
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="44"
          strokeDashoffset="12"
          opacity=".25"
        />
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="44"
          strokeDashoffset="33"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

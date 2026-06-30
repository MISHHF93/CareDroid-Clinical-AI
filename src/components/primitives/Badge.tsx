import type React from 'react';
import './Badge.css';

const TONES = new Set(['neutral', 'accent', 'success', 'warning', 'danger', 'info']);

type BadgeProps = {
  tone?: string;
  size?: string;
  compact?: boolean;
  className?: string;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLSpanElement>;

export default function Badge({
  tone = 'neutral',
  size = 'md',
  compact = false,
  className = '',
  children,
  ...props
}: BadgeProps) {
  const resolvedTone = TONES.has(tone) ? tone : 'neutral';
  return (
    <span
      className={['cd-badge', `cd-badge--${resolvedTone}`, `cd-badge--${size}`, compact ? 'cd-badge--compact' : '', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </span>
  );
}
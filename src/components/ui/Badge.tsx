import React from 'react';
import PrimitiveBadge from '../primitives/Badge';
import './Badge.css';

type BadgeVariant = 'neutral' | 'brand' | 'info' | 'success' | 'warning' | 'danger';
type BadgeSize = 'sm' | 'md';

const VARIANT_TO_TONE: Record<BadgeVariant, string> = {
  neutral: 'neutral',
  brand: 'accent',
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
};

const TONE_TO_VARIANT: Record<string, BadgeVariant> = {
  neutral: 'neutral',
  accent: 'brand',
  brand: 'brand',
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
};

type BadgeProps = {
  variant?: BadgeVariant;
  tone?: string;
  size?: BadgeSize;
  compact?: boolean;
  dot?: boolean;
  children?: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLSpanElement>;

/** Canonical badge — delegates to primitives/Badge with unified cd-badge styling. */
function Badge({
  variant,
  tone,
  size = 'md',
  compact = false,
  dot,
  children,
  className,
  ...props
}: BadgeProps) {
  const resolvedVariant = variant || TONE_TO_VARIANT[tone || 'neutral'] || 'neutral';
  // Map danger → critical alarm rail for platform consistency
  const alarmTone =
    resolvedVariant === 'danger'
      ? 'critical'
      : resolvedVariant === 'warning'
        ? 'warning'
        : resolvedVariant === 'success'
          ? 'ok'
          : resolvedVariant === 'info'
            ? 'info'
            : 'neutral';
  return (
    <PrimitiveBadge
      tone={VARIANT_TO_TONE[resolvedVariant]}
      size={size}
      compact={compact || size === 'sm'}
      className={[
        dot ? 'cd-badge--with-dot' : '',
        alarmTone !== 'neutral' ? `alarm-badge alarm-badge--${alarmTone}` : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-alarm={alarmTone}
      {...props}
    >
      {dot && <span className="cd-badge__dot" aria-hidden="true" />}
      {children}
    </PrimitiveBadge>
  );
}

export { Badge };
export default Badge;
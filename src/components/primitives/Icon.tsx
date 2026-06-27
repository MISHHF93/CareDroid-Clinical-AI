import React from 'react';

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type IconColor =
  | 'primary'
  | 'secondary'
  | 'disabled'
  | 'brand'
  | 'danger'
  | 'success'
  | 'warning'
  | 'inherit';

type TablerIconComponent = React.ComponentType<{
  size?: number;
  className?: string;
  'aria-hidden'?: boolean;
  style?: React.CSSProperties;
}>;

type IconProps = {
  icon: TablerIconComponent;
  size?: IconSize;
  color?: IconColor;
  className?: string;
  label?: string;
};

const SIZE_MAP: Record<IconSize, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

const COLOR_MAP: Record<IconColor, string> = {
  primary:   'var(--cd-text-primary)',
  secondary: 'var(--cd-text-secondary)',
  disabled:  'var(--cd-text-disabled)',
  brand:     'var(--cd-text-brand)',
  danger:    'var(--cd-text-danger)',
  success:   'var(--cd-success-text)',
  warning:   'var(--cd-warning-text)',
  inherit:   'currentColor',
};

export function Icon({
  icon: IconComponent,
  size = 'md',
  color = 'inherit',
  className,
  label,
}: IconProps) {
  const px = SIZE_MAP[size];
  const colorValue = COLOR_MAP[color];

  if (label) {
    return (
      <span
        role="img"
        aria-label={label}
        style={{ display: 'inline-flex', color: colorValue, flexShrink: 0 }}
      >
        <IconComponent size={px} className={className} aria-hidden />
      </span>
    );
  }

  return (
    <IconComponent
      size={px}
      className={className}
      aria-hidden
      style={{ color: colorValue, flexShrink: 0 } as React.CSSProperties}
    />
  );
}

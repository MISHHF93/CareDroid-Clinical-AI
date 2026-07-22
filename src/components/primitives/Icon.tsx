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
  | 'ai'
  | 'inherit';

type IconComponentType = React.ComponentType<{
  size?: number;
  className?: string;
  'aria-hidden'?: boolean;
  strokeWidth?: number;
}>;

type IconProps = {
  icon: IconComponentType;
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

/**
 * CDL v2 Icon — lucide/tabler-compatible. Color & size via CSS tokens (no hex).
 */
export function Icon({
  icon: IconComponent,
  size = 'md',
  color = 'inherit',
  className,
  label,
}: IconProps) {
  const px = SIZE_MAP[size];
  const wrapClass = ['cdl-icon', `cdl-icon--${size}`, `cdl-icon--${color}`, className]
    .filter(Boolean)
    .join(' ');

  const glyph = (
    <IconComponent size={px} className="cdl-icon__glyph" aria-hidden strokeWidth={1.85} />
  );

  if (label) {
    return (
      <span role="img" aria-label={label} className={wrapClass}>
        {glyph}
      </span>
    );
  }

  return (
    <span className={wrapClass} aria-hidden>
      {glyph}
    </span>
  );
}

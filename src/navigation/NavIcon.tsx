/**
 * Renders a Lucide icon with theme-aware sizing (default: CSS var --nav-icon-size).
 */
export function NavIcon({
  icon: Icon,
  size,
  className = '',
  decorative = true,
  label = undefined as any,
  strokeWidth = 2,
  ...rest
}) {
  if (!Icon) return null;
  const style =
    typeof size === 'number'
      ? { width: size, height: size }
      : { width: 'var(--nav-icon-size, 20px)', height: 'var(--nav-icon-size, 20px)' };

  // Static role only when non-decorative (Edge Tools rejects dynamic ARIA roles).
  if (decorative) {
    return (
      <Icon
        className={`nav-icon-svg ${className}`.trim()}
        style={style}
        strokeWidth={strokeWidth}
        aria-hidden="true"
        {...rest}
      />
    );
  }
  return (
    <Icon
      className={`nav-icon-svg ${className}`.trim()}
      style={style}
      strokeWidth={strokeWidth}
      aria-label={label}
      role="img"
      {...rest}
    />
  );
}

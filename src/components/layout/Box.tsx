import React from 'react';

type SpaceScale = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 10 | 12;
type RadiusScale = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
type BgScale = 'base' | 'surface' | 'elevated' | 'sunken';

type BoxProps = {
  p?: SpaceScale;
  px?: SpaceScale;
  py?: SpaceScale;
  m?: SpaceScale;
  mx?: SpaceScale;
  my?: SpaceScale;
  rounded?: RadiusScale;
  bg?: BgScale;
  border?: boolean;
  fullWidth?: boolean;
  as?: React.ElementType;
  className?: string;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

const sp = (n?: SpaceScale) => n === undefined ? undefined : n === 0 ? '0px' : `var(--cd-space-${n})`;
const radius: Record<RadiusScale, string> = {
  none: '0', sm: 'var(--cd-radius-sm)', md: 'var(--cd-radius-md)',
  lg: 'var(--cd-radius-lg)', xl: 'var(--cd-radius-xl)', '2xl': 'var(--cd-radius-2xl)', full: 'var(--cd-radius-full)',
};
const bg: Record<BgScale, string> = {
  base: 'var(--cd-bg-base)', surface: 'var(--cd-bg-surface)',
  elevated: 'var(--cd-bg-elevated)', sunken: 'var(--cd-bg-sunken)',
};

export function Box({ p, px, py, m, mx, my, rounded, bg: bgProp, border, fullWidth, as: Tag = 'div', className, children, style, ...props }: BoxProps) {
  return (
    <Tag
      className={className}
      style={{
        paddingTop: sp(py ?? p),
        paddingBottom: sp(py ?? p),
        paddingLeft: sp(px ?? p),
        paddingRight: sp(px ?? p),
        marginTop: sp(my ?? m),
        marginBottom: sp(my ?? m),
        marginLeft: sp(mx ?? m),
        marginRight: sp(mx ?? m),
        borderRadius: rounded ? radius[rounded] : undefined,
        background: bgProp ? bg[bgProp] : undefined,
        border: border ? '1px solid var(--cd-border-default)' : undefined,
        width: fullWidth ? '100%' : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </Tag>
  );
}

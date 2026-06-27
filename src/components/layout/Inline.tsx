import React from 'react';
import './Inline.css';

type SpaceScale = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 10 | 12 | 16;
type AlignValue = 'start' | 'center' | 'end' | 'baseline' | 'stretch';
type JustifyValue = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

export type InlineProps = {
  gap?: SpaceScale;
  align?: AlignValue;
  justify?: JustifyValue;
  wrap?: boolean;
  as?: React.ElementType;
  className?: string;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

export function Inline({
  gap = 4,
  align = 'center',
  justify = 'start',
  wrap,
  as: Tag = 'div',
  className,
  children,
  style,
  ...props
}: InlineProps) {
  const classes = [
    'cd-inline',
    `cd-inline--align-${align}`,
    `cd-inline--justify-${justify}`,
    wrap ? 'cd-inline--wrap' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const gapVar = gap === 0 ? '0px' : `var(--cd-space-${gap})`;

  return (
    <Tag
      className={classes}
      style={{ '--inline-gap': gapVar, ...style } as React.CSSProperties}
      {...props}
    >
      {children}
    </Tag>
  );
}

import React from 'react';
import './Stack.css';

type SpaceScale = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 10 | 12 | 16;
type AlignValue = 'start' | 'center' | 'end' | 'stretch';
type JustifyValue = 'start' | 'center' | 'end' | 'between' | 'around';

export type StackProps = {
  gap?: SpaceScale;
  align?: AlignValue;
  justify?: JustifyValue;
  wrap?: boolean;
  as?: React.ElementType;
  className?: string;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

export function Stack({
  gap = 4,
  align = 'stretch',
  justify = 'start',
  wrap,
  as: Tag = 'div',
  className,
  children,
  style,
  ...props
}: StackProps) {
  const classes = [
    'cd-stack',
    `cd-stack--align-${align}`,
    `cd-stack--justify-${justify}`,
    wrap ? 'cd-stack--wrap' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const gapVar = gap === 0 ? '0px' : `var(--cd-space-${gap})`;

  return (
    <Tag
      className={classes}
      style={{ '--stack-gap': gapVar, ...style } as React.CSSProperties}
      {...props}
    >
      {children}
    </Tag>
  );
}

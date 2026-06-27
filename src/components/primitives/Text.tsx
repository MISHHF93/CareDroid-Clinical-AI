import React from 'react';
import './Text.css';

type TextSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold';
type TextColor = 'primary' | 'secondary' | 'disabled' | 'inverse' | 'brand' | 'danger';
type TextTag = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'label' | 'legend' | 'caption' | 'div';

type TextProps = {
  as?: TextTag;
  size?: TextSize;
  weight?: TextWeight;
  color?: TextColor;
  mono?: boolean;
  truncate?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export function Text({
  as: Tag = 'span',
  size = 'md',
  weight = 'regular',
  color = 'primary',
  mono = false,
  truncate = false,
  className,
  children,
  ...props
}: TextProps & React.HTMLAttributes<HTMLElement>) {
  const classes = [
    'cd-text',
    `cd-text--size-${size}`,
    `cd-text--weight-${weight}`,
    `cd-text--color-${color}`,
    mono ? 'cd-text--mono' : '',
    truncate ? 'cd-text--truncate' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={classes} {...props}>
      {children}
    </Tag>
  );
}

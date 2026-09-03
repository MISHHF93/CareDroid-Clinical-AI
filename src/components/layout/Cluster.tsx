import React from 'react';

type SpaceScale = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type AlignValue = 'start' | 'center' | 'end';

type ClusterProps = {
  gap?: SpaceScale;
  align?: AlignValue;
  as?: React.ElementType;
  className?: string;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

export function Cluster({
  gap = 2,
  align = 'center',
  as: Tag = 'div',
  className,
  children,
  style,
  ...props
}: ClusterProps) {
  const gapVar = gap === 0 ? '0px' : `var(--cd-space-${gap})`;
  const alignMap: Record<AlignValue, string> = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
  };

  return (
    <Tag
      className={['cd-cluster', className ?? ''].filter(Boolean).join(' ')}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: gapVar,
        alignItems: alignMap[align],
        ...style,
      }}
      {...props}
    >
      {children}
    </Tag>
  );
}

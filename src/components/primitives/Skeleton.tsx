import React from 'react';
import './Skeleton.css';

type SkeletonProps = {
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  className?: string;
} & React.HTMLAttributes<HTMLSpanElement>;

export function Skeleton({ width, height, rounded, className, style, ...props }: SkeletonProps) {
  return (
    <span
      className={['cd-skeleton', rounded ? 'cd-skeleton--rounded' : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      aria-hidden="true"
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      {...props}
    />
  );
}

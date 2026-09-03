import React from 'react';
import './PageContainer.css';

type ContainerSize = 'default' | 'wide' | 'full';

type PageContainerProps = {
  size?: ContainerSize;
  padded?: boolean;
  as?: React.ElementType;
  className?: string;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

export function PageContainer({
  size = 'default',
  padded = true,
  as: Tag = 'div',
  className,
  children,
  ...props
}: PageContainerProps) {
  return (
    <Tag
      className={[
        'cd-page-container',
        `cd-page-container--${size}`,
        padded ? 'cd-page-container--padded' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </Tag>
  );
}

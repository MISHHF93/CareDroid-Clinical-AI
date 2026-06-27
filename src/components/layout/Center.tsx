import React from 'react';

type CenterProps = {
  vertical?: boolean;
  maxWidth?: string;
  as?: React.ElementType;
  className?: string;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

export function Center({ vertical, maxWidth, as: Tag = 'div', className, children, style, ...props }: CenterProps) {
  return (
    <Tag
      className={['cd-center', className ?? ''].filter(Boolean).join(' ')}
      style={{
        display: 'flex',
        flexDirection: vertical ? 'column' : undefined,
        alignItems: vertical ? 'center' : undefined,
        justifyContent: 'center',
        marginLeft: 'auto',
        marginRight: 'auto',
        maxWidth: maxWidth,
        ...style,
      }}
      {...props}
    >
      {children}
    </Tag>
  );
}

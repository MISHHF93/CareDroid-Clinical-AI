import React from 'react';
import './Divider.css';

type DividerProps = {
  orientation?: 'horizontal' | 'vertical';
  label?: string;
  className?: string;
} & React.HTMLAttributes<HTMLElement>;

export function Divider({ orientation = 'horizontal', label, className, ...props }: DividerProps) {
  if (label) {
    return (
      <div
        className={['cd-divider cd-divider--horizontal cd-divider--labeled', className ?? '']
          .filter(Boolean)
          .join(' ')}
        role="separator"
        {...props}
      >
        <span className="cd-divider__line" aria-hidden="true" />
        <span className="cd-divider__label">{label}</span>
        <span className="cd-divider__line" aria-hidden="true" />
      </div>
    );
  }

  if (orientation === 'vertical') {
    return (
      <div
        className={['cd-divider cd-divider--vertical', className ?? ''].filter(Boolean).join(' ')}
        role="separator"
        aria-orientation="vertical"
        {...props}
      />
    );
  }

  return (
    <hr
      className={['cd-divider cd-divider--horizontal', className ?? ''].filter(Boolean).join(' ')}
      {...(props as React.HTMLAttributes<HTMLHRElement>)}
    />
  );
}

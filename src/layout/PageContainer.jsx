import React from 'react';
import './PageContainer.css';

const SIZE_CLASS = {
  narrow: 'page-container--narrow',
  standard: 'page-container--standard',
  wide: 'page-container--wide',
  full: 'page-container--full',
};

export function PageContainer({
  as: Component = 'section',
  size = 'standard',
  className = '',
  children,
  ...props
}) {
  const classes = ['page-container', SIZE_CLASS[size] || SIZE_CLASS.standard, className]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
}

export function ScrollArea({ as: Component = 'div', className = '', children, ...props }) {
  const classes = ['scroll-area', className].filter(Boolean).join(' ');

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
}

export default PageContainer;

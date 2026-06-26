import React, { HTMLAttributes, KeyboardEvent } from 'react';
import './card.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  subtle?: boolean;
  hover?: boolean;
  glassmorphism?: boolean;
  compact?: boolean;
  padding?: string;
  children?: React.ReactNode;
}

const Card = ({
  children,
  style,
  subtle = false,
  hover = false,
  glassmorphism = false,
  compact = false,
  padding = compact
    ? 'var(--compact-card-padding, var(--app-card-padding-compact, 14px))'
    : 'var(--app-card-padding-compact, 14px)',
  onClick,
  className = '',
  ...props
}: CardProps) => {
  const getClassName = () => {
    const classes = ['card'];
    if (subtle) classes.push('card-subtle');
    if (hover) classes.push('card-hover');
    if (glassmorphism) classes.push('card-glass');
    if (compact) classes.push('card-compact');
    if (onClick) classes.push('card-clickable');
    if (className) classes.push(className);
    return classes.join(' ');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick(event as unknown as React.MouseEvent<HTMLDivElement>);
    }
  };

  return (
    <div
      className={getClassName()}
      style={{ padding, ...style }}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;

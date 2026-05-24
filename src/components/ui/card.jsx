import React from 'react';
import './card.css';

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
}) => {
  const getClassName = () => {
    let classes = ['card'];
    if (subtle) classes.push('card-subtle');
    if (hover) classes.push('card-hover');
    if (glassmorphism) classes.push('card-glass');
    if (compact) classes.push('card-compact');
    if (onClick) classes.push('card-clickable');
    if (className) classes.push(className);
    return classes.join(' ');
  };

  const handleKeyDown = (event) => {
    if (!onClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick(event);
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

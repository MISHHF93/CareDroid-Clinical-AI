import React from 'react';
import './card.css';

const Card = ({ 
  children, 
  style, 
  subtle = false,
  hover = false,
  glassmorphism = false,
  padding = '24px',
  onClick
}) => {
  const getClassName = () => {
    let classes = ['card'];
    if (subtle) classes.push('card-subtle');
    if (hover) classes.push('card-hover');
    if (glassmorphism) classes.push('card-glass');
    if (onClick) classes.push('card-clickable');
    return classes.join(' ');
  };

  return (
    <div 
      className={getClassName()} 
      style={{ padding, ...style }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
};

export default Card;

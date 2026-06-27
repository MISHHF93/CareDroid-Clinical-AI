import React, { useState } from 'react';
import './Tooltip.css';

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

type TooltipProps = {
  content: React.ReactNode;
  placement?: TooltipPlacement;
  disabled?: boolean;
  children: React.ReactElement;
};

export function Tooltip({ content, placement = 'top', disabled, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  if (disabled || !content) return children;

  return (
    <span
      className="cd-tooltip-wrap"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span role="tooltip" className={`cd-tooltip cd-tooltip--${placement}`}>
          {content}
        </span>
      )}
    </span>
  );
}

import React from 'react';
import './Card.css';

type CardElevation = 'flat' | 'default' | 'elevated';

type CardProps = {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  elevation?: CardElevation;
  bordered?: boolean;
  compact?: boolean;
  interactive?: boolean;
  className?: string;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

export function Card({ title, actions, footer, elevation = 'default', bordered, compact, interactive, className, children, ...props }: CardProps) {
  const hasHeader = title || actions;
  return (
    <div
      className={[
        'cd-card',
        elevation === 'flat' ? 'cd-card--flat' : elevation === 'elevated' ? 'cd-card--elevated' : '',
        bordered ? 'cd-card--bordered' : '',
        compact ? 'cd-card--compact' : '',
        interactive ? 'cd-card--interactive' : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
      tabIndex={interactive ? 0 : undefined}
      {...props}
    >
      {hasHeader && (
        <div className="cd-card__header">
          {title && <h3 className="cd-card__title">{title}</h3>}
          {actions && <div className="cd-card__actions">{actions}</div>}
        </div>
      )}
      <div className="cd-card__body">{children}</div>
      {footer && <div className="cd-card__footer">{footer}</div>}
    </div>
  );
}

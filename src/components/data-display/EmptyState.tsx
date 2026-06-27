import React from 'react';
import './EmptyState.css';

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div role="status" className={['cd-empty', className ?? ''].filter(Boolean).join(' ')} {...props}>
      {icon && <span className="cd-empty__icon" aria-hidden="true">{icon}</span>}
      <p className="cd-empty__title">{title}</p>
      {description && <p className="cd-empty__description">{description}</p>}
      {action && <div className="cd-empty__action">{action}</div>}
    </div>
  );
}

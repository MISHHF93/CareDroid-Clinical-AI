import React from 'react';
import { CdlEmptyIllustration } from '../graphics/CdlGraphicIllustrations';
import { resolveEmptyStateGraphic } from '../../config/cdlGraphicModel';
import './EmptyState.css';

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  const graphic = icon ?? <CdlEmptyIllustration variant={resolveEmptyStateGraphic(title)} />;
  return (
    <div
      role="status"
      className={['cd-empty', 'cd-empty--graphic', className ?? ''].filter(Boolean).join(' ')}
      {...props}
    >
      <span className="cd-empty__icon" aria-hidden="true">
        {graphic}
      </span>
      <p className="cd-empty__title">{title}</p>
      {description && <p className="cd-empty__description">{description}</p>}
      {action && <div className="cd-empty__action">{action}</div>}
    </div>
  );
}

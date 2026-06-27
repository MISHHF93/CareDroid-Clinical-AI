import React from 'react';
import './Banner.css';

type BannerTone = 'info' | 'success' | 'warning' | 'danger';

type BannerProps = {
  tone?: BannerTone;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

export function Banner({ tone = 'info', icon, action, className, children, ...props }: BannerProps) {
  return (
    <div
      role="status"
      className={['cd-banner', `cd-banner--${tone}`, className ?? ''].filter(Boolean).join(' ')}
      {...props}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>{children}</span>
      {action && <span className="cd-banner__action">{action}</span>}
    </div>
  );
}

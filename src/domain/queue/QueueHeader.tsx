import React from 'react';
import './queue.css';

type QueueHeaderProps = {
  name: string;
  count: number;
  criticalCount?: number;
  actions?: React.ReactNode;
  className?: string;
};

export function QueueHeader({ name, count, criticalCount = 0, actions, className }: QueueHeaderProps) {
  return (
    <div className={['cd-queue-header', className ?? ''].filter(Boolean).join(' ')}>
      <span className="cd-queue-header__name">{name}</span>
      <span className={['cd-queue-header__count', criticalCount > 0 ? 'cd-queue-header__count--critical' : ''].filter(Boolean).join(' ')}>
        {count}
      </span>
      {actions}
    </div>
  );
}

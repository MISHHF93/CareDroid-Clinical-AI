import React from 'react';
import { RECEPTION_QUEUE_BADGE_LIMIT } from '../../utils/receptionQueueRowModel';
import './ReceptionQueueBadgeStack.css';

export default function ReceptionQueueBadgeStack({
  limit = RECEPTION_QUEUE_BADGE_LIMIT,
  children,
}) {
  const items = React.Children.toArray(children).filter(Boolean);
  const visible = items.slice(0, limit);
  const overflow = Math.max(0, items.length - limit);

  if (!visible.length && !overflow) return null;

  return (
    <span className="reception-queue-badge-stack">
      {visible}
      {overflow > 0 ? (
        <span className="reception-queue-badge-stack__more" title={`${overflow} more signal(s)`}>
          +{overflow}
        </span>
      ) : null}
    </span>
  );
}
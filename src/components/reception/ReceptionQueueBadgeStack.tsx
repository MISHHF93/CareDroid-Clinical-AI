import React, { useId, useState } from 'react';
import { RECEPTION_QUEUE_BADGE_LIMIT } from '../../utils/receptionQueueRowModel';
import './ReceptionQueueBadgeStack.css';

export default function ReceptionQueueBadgeStack({
  limit = RECEPTION_QUEUE_BADGE_LIMIT,
  children,
}) {
  const [expanded, setExpanded] = useState(false);
  const overflowId = useId();
  const items = React.Children.toArray(children).filter(Boolean);
  const visibleCount = Math.min(items.length, limit);
  const overflow = Math.max(0, items.length - limit);
  const overflowItems = items.slice(visibleCount);

  if (!items.length) return null;

  return (
    <span className="reception-queue-badge-stack">
      {items.slice(0, visibleCount)}
      {overflow > 0 ? (
        <button
          type="button"
          className="reception-queue-badge-stack__more"
          {...(expanded ? { 'aria-expanded': 'true' as const } : { 'aria-expanded': 'false' as const })}
          aria-controls={overflowId}
          onClick={(event) => {
            event.stopPropagation();
            setExpanded((current) => !current);
          }}
        >
          {expanded ? 'Show fewer' : `+${overflow} more`}
        </button>
      ) : null}
      <span id={overflowId} className="reception-queue-badge-stack__overflow" hidden={!expanded}>
        {expanded ? overflowItems : null}
      </span>
    </span>
  );
}

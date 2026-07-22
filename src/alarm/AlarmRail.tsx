import React from 'react';
import { AlarmBanner } from './AlarmBanner';
import type { AlarmItem } from './types';

export type AlarmRailProps = {
  title?: string;
  items: AlarmItem[];
  emptyLabel?: string;
  onAction?: (itemId: string, actionId: string) => void;
  className?: string;
  maxVisible?: number;
};

export function AlarmRail({
  title = 'Alerts',
  items,
  emptyLabel = 'No active alerts',
  onAction,
  className = '',
  maxVisible,
}: AlarmRailProps) {
  const visible = typeof maxVisible === 'number' ? items.slice(0, maxVisible) : items;

  return (
    <section className={['cdl-alarm-rail', className].filter(Boolean).join(' ')} aria-label={title}>
      <header className="cdl-alarm-rail__header">
        <h2 className="cdl-alarm-rail__title">{title}</h2>
        <span className="cdl-alarm-rail__count" aria-label={`${items.length} alerts`}>
          {items.length}
        </span>
      </header>
      {visible.length === 0 ? (
        <p className="cdl-alarm-rail__empty">{emptyLabel}</p>
      ) : (
        <ul className="cdl-alarm-rail__list">
          {visible.map((item) => (
            <li key={item.id}>
              <AlarmBanner
                severity={item.severity}
                title={item.title}
                message={item.message || item.recommendedAction}
                acknowledged={item.acknowledged}
                actions={item.actions}
                onAction={(actionId) => onAction?.(item.id, actionId)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default AlarmRail;

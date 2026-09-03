import React, { useMemo } from 'react';
import { AlarmBanner } from './AlarmBanner';
import type { AlarmItem } from './types';
import { resolveAlarmSeverity } from './types';

export type AlarmDockProps = {
  items: AlarmItem[];
  onAction?: (itemId: string, actionId: string) => void;
  className?: string;
  /** Only show critical/urgent by default for the global dock. */
  minSeverity?: 'critical' | 'urgent';
};

function severityRank(s: string): number {
  const r = resolveAlarmSeverity(s);
  if (r === 'critical') return 0;
  if (r === 'urgent') return 1;
  return 9;
}

export function AlarmDock({
  items,
  onAction,
  className = '',
  minSeverity = 'urgent',
}: AlarmDockProps) {
  const dockItems = useMemo(() => {
    const threshold = minSeverity === 'critical' ? 0 : 1;
    return items
      .filter((item) => !item.acknowledged && severityRank(item.severity) <= threshold)
      .sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  }, [items, minSeverity]);

  const announcement = dockItems.length
    ? `${dockItems.length} critical or urgent alert${dockItems.length === 1 ? '' : 's'} require attention`
    : '';

  return (
    <div
      className={['cdl-alarm-dock', className].filter(Boolean).join(' ')}
      data-empty={dockItems.length === 0 ? 'true' : 'false'}
      aria-label="Critical alert dock"
    >
      <div className="cdl-alarm-dock__live" aria-live="assertive" aria-atomic="true">
        {announcement}
      </div>
      {dockItems.map((item) => (
        <AlarmBanner
          key={item.id}
          severity={item.severity}
          title={item.title}
          message={item.message || item.recommendedAction}
          acknowledged={item.acknowledged}
          actions={
            item.actions || [{ id: 'acknowledge', label: 'Acknowledge', variant: 'primary' }]
          }
          onAction={(actionId) => onAction?.(item.id, actionId)}
        />
      ))}
    </div>
  );
}

export default AlarmDock;

import { formatQueueWaitMinutes } from '../../config/queueAuditModel';
import './QueueOperationalPanel.css';

export function QueueAuditBadge({ row, limit = 2 }) {
  if (!row) return null;
  const tags = [];
  if (row.overdueCount > 0) {
    tags.push({
      id: `${row.id}-overdue`,
      label: `${row.overdueCount} overdue`,
      severity: row.bottleneckSeverity === 'critical' ? 'critical' : 'warning',
    });
  }
  if (row.longestWaitMinutes > 0) {
    tags.push({
      id: `${row.id}-wait`,
      label: `Longest ${formatQueueWaitMinutes(row.longestWaitMinutes)}`,
      severity: row.isBottleneck ? 'warning' : 'neutral',
    });
  }
  if (row.isBottleneck && tags.length < limit) {
    tags.push({
      id: `${row.id}-bottleneck`,
      label: 'Bottleneck',
      severity: row.bottleneckSeverity === 'critical' ? 'critical' : 'warning',
    });
  }

  if (!tags.length) return null;

  return (
    <span className="queue-audit-badge" aria-label={`${row.label} queue indicators`}>
      {tags.slice(0, limit).map((tag) => (
        <span
          key={tag.id}
          className={[
            'queue-audit-badge__tag',
            tag.severity === 'critical'
              ? 'queue-audit-badge__tag--critical'
              : tag.severity === 'warning'
                ? 'queue-audit-badge__tag--warning'
                : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {tag.label}
        </span>
      ))}
    </span>
  );
}

export default function QueueOperationalPanel({
  snapshot,
  title = 'Queue audit',
  description = 'Queue length, longest wait, bottlenecks, and overdue items.',
  domain = null,
  compact = false,
  limit = 8,
  className = '',
}) {
  const rows = (snapshot?.rows || []).filter((row) => !domain || row.domain === domain);
  const summary = snapshot?.summary;

  if (!rows.some((row) => row.length > 0 || row.overdueCount > 0) && !summary?.totalLength) {
    if (compact) return null;
    return (
      <section className={`queue-operational-panel ${className}`.trim()} aria-label={title}>
        <header className="queue-operational-panel__header">
          <div>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        </header>
        <p className="queue-operational-panel__empty" role="status">
          All queues clear.
        </p>
      </section>
    );
  }

  return (
    <section
      className={[
        'queue-operational-panel',
        compact ? 'queue-operational-panel--compact' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={title}
    >
      <header className="queue-operational-panel__header">
        <div>
          <h3>{title}</h3>
          {!compact ? <p>{description}</p> : null}
        </div>
        <div className="queue-operational-panel__summary">
          <span className="queue-operational-panel__chip">
            Total waiting: {summary?.totalLength ?? 0}
          </span>
          <span
            className={[
              'queue-operational-panel__chip',
              (summary?.totalOverdue || 0) > 0 ? 'queue-operational-panel__chip--warning' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            Overdue: {summary?.totalOverdue ?? 0}
          </span>
          <span className="queue-operational-panel__chip">
            Longest wait: {summary?.longestWaitLabel || '0m'}
          </span>
          {summary?.primaryBottleneck ? (
            <span
              className={[
                'queue-operational-panel__chip',
                summary.primaryBottleneck.bottleneckSeverity === 'critical'
                  ? 'queue-operational-panel__chip--critical'
                  : 'queue-operational-panel__chip--warning',
              ].join(' ')}
            >
              Bottleneck: {summary.primaryBottleneck.label}
            </span>
          ) : null}
        </div>
      </header>

      {!compact ? (
        <ol className="queue-operational-panel__list">
          {rows
            .filter((row) => row.length > 0 || row.overdueCount > 0)
            .slice(0, limit)
            .map((row) => (
              <li
                key={row.id}
                className={[
                  'queue-operational-panel__item',
                  row.isBottleneck ? 'queue-operational-panel__item--bottleneck' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <strong>{row.label}</strong>
                <span>Length {row.length}</span>
                <span>Longest {formatQueueWaitMinutes(row.longestWaitMinutes)}</span>
                <span>Overdue {row.overdueCount}</span>
                <span>{row.isBottleneck ? row.bottleneckReason || 'Bottleneck' : 'On track'}</span>
              </li>
            ))}
        </ol>
      ) : null}
    </section>
  );
}

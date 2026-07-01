import { useMemo, useState } from 'react';
import {
  OPERATIONAL_AUDIT_DOMAIN,
  OPERATIONAL_AUDIT_DOMAIN_LABELS,
  filterOperationalHistory,
} from '../../config/operationalAuditModel';
import './OperationalHistoryPanel.css';

function formatTime(timestamp) {
  if (!timestamp) return '--';
  try {
    return new Date(timestamp).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(timestamp);
  }
}

function actorLabel(log) {
  return log.actorName || log.actorStaffId || log.source || 'System';
}

export default function OperationalHistoryPanel({
  logs = ([] as any[]),
  patientId = (undefined as string | undefined),
  title = 'Operational history',
  description = 'Recent workflow actions from the CareDroid audit log.',
  domains = Object.values(OPERATIONAL_AUDIT_DOMAIN),
  limit = 8,
  compact = false,
  className = '',
}) {
  const [activeDomain, setActiveDomain] = useState(domains[0] || OPERATIONAL_AUDIT_DOMAIN.PATIENT);

  const visibleDomains = useMemo(
    () => domains.filter((domain) => OPERATIONAL_AUDIT_DOMAIN_LABELS[domain]),
    [domains],
  );

  const entries = useMemo(
    () =>
      filterOperationalHistory(logs, {
        domain: compact ? null : activeDomain,
        patientId,
        limit: compact ? limit : limit,
      }),
    [activeDomain, compact, limit, logs, patientId],
  );

  const domainCounts = useMemo(() => {
    return visibleDomains.reduce((counts, domain) => {
      counts[domain] = filterOperationalHistory(logs, { domain, patientId, limit: 100 }).length;
      return counts;
    }, ({} as Record<string, number>));
  }, [logs, patientId, visibleDomains]);

  return (
    <section
      className={[
        'operational-history-panel',
        compact ? 'operational-history-panel--compact' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={title}
    >
      <header className="operational-history-panel__header">
        <div>
          <h3>{title}</h3>
          {!compact ? <p>{description}</p> : null}
        </div>
        {!compact && visibleDomains.length > 1 ? (
          <div className="operational-history-panel__tabs" role="tablist" aria-label="History domains">
            {visibleDomains.map((domain) => (
              <button
                key={domain}
                type="button"
                role="tab"
                aria-selected={activeDomain === domain}
                className={[
                  'operational-history-panel__tab',
                  activeDomain === domain ? 'operational-history-panel__tab--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setActiveDomain(domain)}
              >
                {OPERATIONAL_AUDIT_DOMAIN_LABELS[domain]}
                {domainCounts[domain] ? ` (${domainCounts[domain]})` : ''}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      {entries.length ? (
        <ol className="operational-history-panel__list">
          {entries.map((log) => (
            <li key={log.id} className="operational-history-panel__item">
              <strong>{log.title}</strong>
              <p>{log.summary}</p>
              <div className="operational-history-panel__meta">
                <span>{actorLabel(log)}</span>
                <time dateTime={log.timestamp}>{formatTime(log.timestamp)}</time>
                {log.source ? <span>{log.source}</span> : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="operational-history-panel__empty" role="status">
          No {OPERATIONAL_AUDIT_DOMAIN_LABELS[activeDomain]?.toLowerCase() || 'operational'} recorded
          yet.
        </p>
      )}
    </section>
  );
}

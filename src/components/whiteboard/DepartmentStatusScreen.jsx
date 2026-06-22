import React, { useEffect, useState } from 'react';
import './DepartmentStatusScreen.css';

function formatUpdatedAt(timestamp) {
  if (!timestamp) return '—';
  try {
    return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '—';
  }
}

function formatLiveClock(timestamp) {
  if (!timestamp) return '—';
  try {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '—';
  }
}

export default function DepartmentStatusScreen({
  snapshot,
  title = 'Department status',
  refreshIntervalMs = 30000,
  privacyLabel,
  layout = 'default',
  liveClock: liveClockProp,
  className = '',
}) {
  const isWallLayout = layout === 'wall';
  const [liveClock, setLiveClock] = useState(() => liveClockProp || Date.now());

  useEffect(() => {
    if (!isWallLayout) return undefined;
    setLiveClock(liveClockProp || Date.now());
    const timer = window.setInterval(() => setLiveClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isWallLayout, liveClockProp]);

  if (!snapshot?.metrics?.length) return null;

  return (
    <section
      className={[
        'department-status-screen',
        isWallLayout ? 'department-status-screen--wall' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Emergency department live status"
    >
      <header className="department-status-screen__header">
        <div>
          <p className="department-status-screen__eyebrow">Live departmental status</p>
          <h2>{title}</h2>
          <p className="department-status-screen__subtitle">
            Aggregate operational metrics only · no patient names or clinical details
            {privacyLabel ? ` · ${privacyLabel}` : ''}
          </p>
        </div>
        <div className="department-status-screen__meta">
          {isWallLayout && liveClock ? (
            <span className="department-status-screen__live-clock" aria-live="polite">
              {formatLiveClock(liveClock)}
            </span>
          ) : null}
          <span>Updated {formatUpdatedAt(snapshot.updatedAt)}</span>
          <span>Refresh every {Math.round(refreshIntervalMs / 1000)}s</span>
        </div>
      </header>

      <p className="department-status-screen__summary" role="status">
        {snapshot.summaryLine}
      </p>

      <div className="department-status-screen__grid">
        {snapshot.metrics.map((metric) => (
          <article
            key={metric.id}
            className="department-status-screen__tile"
            data-tone={metric.tone}
            aria-label={`${metric.label}: ${metric.value}`}
          >
            <strong className="department-status-screen__value">{metric.value}</strong>
            <span className="department-status-screen__label">{metric.label}</span>
            <small className="department-status-screen__detail">{metric.detail}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

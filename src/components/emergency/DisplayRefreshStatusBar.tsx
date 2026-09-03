import {
  formatDisplayRefreshAgeMinutes,
  formatDisplayUpdatedAt,
} from '../../config/displayAutoRefreshModel';
import './DisplayRefreshStatusBar.css';

export default function DisplayRefreshStatusBar({
  refreshStatus,
  liveClock = null,
  showLiveClock = false,
  className = '',
}) {
  if (!refreshStatus?.enabled) return null;

  const updatedLabel = formatDisplayUpdatedAt(refreshStatus.lastUpdatedAt);
  const ageMinutes = formatDisplayRefreshAgeMinutes(refreshStatus.lastUpdatedAt);
  const intervalSeconds = Math.round(refreshStatus.refreshIntervalMs / 1000);

  return (
    <div
      className={[
        'display-refresh-status',
        `display-refresh-status--${refreshStatus.tone}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-live="polite"
    >
      {showLiveClock && liveClock ? (
        <span className="display-refresh-status__clock">
          {formatDisplayUpdatedAt(new Date(liveClock).toISOString())}
        </span>
      ) : null}
      <span>
        {refreshStatus.isRefreshing ? 'Refreshing…' : `Updated ${updatedLabel}`}
        {ageMinutes !== null && ageMinutes > 0 && !refreshStatus.isRefreshing
          ? ` · ${ageMinutes}m ago`
          : ''}
      </span>
      <span>Auto-refresh every {intervalSeconds}s</span>
      {refreshStatus.showStaleBanner ? (
        <span className="display-refresh-status__warning" role="status">
          {refreshStatus.errorMessage || 'Data may be stale — retrying automatically'}
        </span>
      ) : null}
    </div>
  );
}

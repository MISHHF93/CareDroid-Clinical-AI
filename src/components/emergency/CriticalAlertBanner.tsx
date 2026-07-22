import { Link } from 'react-router-dom';
import { Siren, Flame } from 'lucide-react';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { resolveAlarmSeverity } from '../../alarm/types';
import './CriticalAlertBanner.css';

export type CriticalAlertBannerProps = {
  criticalCount: number;
  highCount?: number;
  className?: string;
};

/**
 * Compact critical/high alert strip — CDL v2 severity surfaces.
 * Prefer full AlarmBanner / AlarmDock for rich interactive alerts.
 */
export default function CriticalAlertBanner({
  criticalCount,
  highCount = 0,
  className = '',
}: CriticalAlertBannerProps) {
  const total = criticalCount + highCount;
  if (total === 0) return null;

  const severity = resolveAlarmSeverity(criticalCount > 0 ? 'critical' : 'urgent');
  const parts: string[] = [];
  if (criticalCount > 0) parts.push(`${criticalCount} critical`);
  if (highCount > 0) parts.push(`${highCount} high`);
  const label = parts.join(', ');
  const Icon = criticalCount > 0 ? Siren : Flame;

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      data-severity={severity}
      className={[
        'critical-alert-banner',
        'cdl-alarm-banner',
        criticalCount > 0 ? 'cdl-alarm-banner--pulse' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="cdl-alarm-banner__icon critical-alert-banner__icon" aria-hidden="true">
        <Icon size={18} strokeWidth={1.85} />
      </span>
      <span className="critical-alert-banner__message cdl-alarm-banner__message">
        <strong className="cdl-alarm-banner__title">{label}</strong> unacknowledged alert
        {total !== 1 ? 's' : ''} — response required now
      </span>
      <Link
        to={CANONICAL_ROUTES.emergencyAlerts}
        className="critical-alert-banner__link cdl-alarm-banner__action cdl-alarm-banner__action--primary"
        aria-label={`View ${total} unacknowledged alert${total !== 1 ? 's' : ''}`}
      >
        View alerts
      </Link>
    </div>
  );
}

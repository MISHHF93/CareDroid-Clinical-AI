import { Link } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import './CriticalAlertBanner.css';

export type CriticalAlertBannerProps = {
  criticalCount: number;
  highCount?: number;
  className?: string;
};

export default function CriticalAlertBanner({
  criticalCount,
  highCount = 0,
  className = '',
}: CriticalAlertBannerProps) {
  const total = criticalCount + highCount;
  if (total === 0) return null;

  const parts: string[] = [];
  if (criticalCount > 0) parts.push(`${criticalCount} critical`);
  if (highCount > 0) parts.push(`${highCount} high`);
  const label = parts.join(', ');

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={['critical-alert-banner', criticalCount > 0 ? 'critical-alert-banner--critical' : 'critical-alert-banner--high', className].filter(Boolean).join(' ')}
    >
      <span className="critical-alert-banner__dot" aria-hidden="true" />
      <span className="critical-alert-banner__message">
        <strong>{label}</strong> unacknowledged alert{total !== 1 ? 's' : ''} — response required now
      </span>
      <Link
        to={CANONICAL_ROUTES.emergencyAlerts}
        className="critical-alert-banner__link"
        aria-label={`View ${total} unacknowledged alert${total !== 1 ? 's' : ''}`}
      >
        View alerts
      </Link>
    </div>
  );
}

import { normalizeIntegrationStatusLabel } from '../../config/integrationStatusModel';
import './IntegrationStatusPanel.css';

export default function IntegrationStatusBadge({ status, className = '' }) {
  const label = normalizeIntegrationStatusLabel(status);
  return (
    <span
      className={[
        'integration-status-badge',
        `integration-status-badge--${status}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={label}
    >
      {label}
    </span>
  );
}

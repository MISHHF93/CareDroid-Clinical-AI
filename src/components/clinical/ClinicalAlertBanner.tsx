import { Siren, Flame, AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';
import { resolveAlarmSeverity, type AlarmSeverity } from '../../alarm/types';
import './ClinicalAlertBanner.css';

const SEVERITY_ICONS: Record<
  string,
  React.ComponentType<{ size?: number; strokeWidth?: number }>
> = {
  critical: Siren,
  high: Flame,
  warning: AlertTriangle,
  info: Info,
  ok: CheckCircle2,
};

const ClinicalAlertBanner = ({ alert, onAcknowledge, onDismiss }) => {
  if (!alert) return null;

  const severity: AlarmSeverity = resolveAlarmSeverity(alert.severity);
  const Icon = SEVERITY_ICONS[alert.severity] || Info;
  const isAcknowledged = alert.acknowledged || false;

  return (
    <div className={`clinical-alert-banner severity-${alert.severity}`} data-severity={severity}>
      <div className="alert-header">
        <span className="alert-icon" aria-hidden="true">
          <Icon size={20} strokeWidth={1.85} />
        </span>
        <div className="alert-content-wrapper">
          <div className="alert-title">{alert.title || 'Clinical Alert'}</div>
          {alert.description && <div className="alert-description">{alert.description}</div>}
          {alert.findings && alert.findings.length > 0 && (
            <div className="alert-findings">
              <span className="findings-label">Key Findings:</span>
              <ul className="findings-list">
                {alert.findings.map((finding, idx) => (
                  <li key={idx}>{finding}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {onDismiss && (
          <button type="button" className="alert-close" onClick={onDismiss} title="Dismiss">
            <X size={16} strokeWidth={2} />
          </button>
        )}
      </div>

      {alert.recommendations && alert.recommendations.length > 0 && (
        <div className="alert-recommendations">
          <div className="alert-label">Recommended Actions:</div>
          <ul className="recommendations-list">
            {alert.recommendations.map((rec, idx) => (
              <li key={idx}>
                <span className="rec-bullet">▸</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="alert-footer">
        {alert.timestamp && (
          <span className="alert-timestamp">{new Date(alert.timestamp).toLocaleString()}</span>
        )}
        <div className="alert-actions">
          {onAcknowledge && !isAcknowledged && (
            <button
              type="button"
              className="alert-action-btn acknowledge"
              onClick={() => onAcknowledge(alert.id)}
              title="Mark as acknowledged"
            >
              Acknowledge
            </button>
          )}
          {isAcknowledged && <span className="alert-acknowledged">✓ Acknowledged</span>}
        </div>
      </div>
    </div>
  );
};

export default ClinicalAlertBanner;

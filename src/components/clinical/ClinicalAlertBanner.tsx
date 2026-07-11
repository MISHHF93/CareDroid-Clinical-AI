import './ClinicalAlertBanner.css';

const ClinicalAlertBanner = ({ alert, onAcknowledge, onDismiss }) => {
  if (!alert) return null;

  const getSeverityIcon = (severity) => {
    const icons = {
      critical: '🔴',
      high: '🟠',
      warning: '🟡',
      info: '🔵'
    };
    return icons[severity] || '🔵';
  };

  const isAcknowledged = alert.acknowledged || false;

  return (
    <div className={`clinical-alert-banner severity-${alert.severity}`}>
      <div className="alert-header">
        <span className="alert-icon">{getSeverityIcon(alert.severity)}</span>
        <div className="alert-content-wrapper">
          <div className="alert-title">{alert.title || 'Clinical Alert'}</div>
          {alert.description && (
            <div className="alert-description">{alert.description}</div>
          )}
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
          <button type="button" className="alert-close" onClick={onDismiss} title="Dismiss">✕</button>
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
          <span className="alert-timestamp">
            {new Date(alert.timestamp).toLocaleString()}
          </span>
        )}
        <div className="alert-actions">
          {onAcknowledge && !isAcknowledged && (
            <button type="button" 
              className="alert-action-btn acknowledge"
              onClick={() => onAcknowledge(alert.id)}
              title="Mark as acknowledged"
            >
              Acknowledge
            </button>
          )}
          {isAcknowledged && (
            <span className="alert-acknowledged">✓ Acknowledged</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClinicalAlertBanner;

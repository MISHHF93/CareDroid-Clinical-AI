import './AnomalyBanner.css';

const AnomalyBanner = ({ score, types, recommendations, onDismiss }) => {
  if (!score || score < 0.5) return null;

  const getSeverity = (score) => {
    if (score >= 0.8) return 'critical';
    if (score >= 0.65) return 'high';
    if (score >= 0.5) return 'warning';
    return 'info';
  };

  const severity = getSeverity(score);

  return (
    <div className={`anomaly-banner severity-${severity}`}>
      <div className="anomaly-header">
        <span className="anomaly-icon">⚠️</span>
        <div className="anomaly-title">
          <h4>Anomaly Detected</h4>
          <p className="anomaly-score">Anomaly Score: {Math.round(score * 100)}%</p>
        </div>
        {onDismiss && (
          <button className="anomaly-close" onClick={onDismiss}>✕</button>
        )}
      </div>

      {types && types.length > 0 && (
        <div className="anomaly-types">
          <div className="anomaly-label">Type{types.length > 1 ? 's' : ''}:</div>
          <div className="anomaly-type-list">
            {types.map((type) => (
              <span key={type} className="anomaly-type-badge">{type}</span>
            ))}
          </div>
        </div>
      )}

      {recommendations && recommendations.length > 0 && (
        <div className="anomaly-recommendations">
          <div className="anomaly-label">Recommendations:</div>
          <ul className="anomaly-rec-list">
            {recommendations.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AnomalyBanner;

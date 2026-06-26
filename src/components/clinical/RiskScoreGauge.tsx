import './RiskScoreGauge.css';

const RiskScoreGauge = ({ value, category, confidence, size = 'medium', label = 'Risk Score' }) => {
  if (value === undefined || value === null) return null;

  const getSeverityColor = (cat) => {
    if (!cat) {
      if (value < 0.33) return 'low';
      if (value < 0.66) return 'moderate';
      if (value < 0.85) return 'high';
      return 'critical';
    }
    return cat;
  };

  const severity = getSeverityColor(category);
  const percentage = Math.round(value * 100);
  const sizeClass = `gauge-${size}`;

  return (
    <div className={`risk-score-gauge ${sizeClass} severity-${severity}`}>
      <div className="gauge-wrapper">
        <svg viewBox="0 0 200 120" className="gauge-svg">
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="8"
          />
          {/* Progress arc */}
          <path
            d={`M 20 100 A 80 80 0 0 1 ${20 + (160 * percentage / 100)} 100`}
            fill="none"
            stroke={getSeverityStrokeColor(severity)}
            strokeWidth="8"
            strokeLinecap="round"
            className="gauge-progress"
          />
          {/* Center text */}
          <text x="100" y="90" textAnchor="middle" className="gauge-value">
            {percentage}%
          </text>
          {confidence && (
            <text x="100" y="110" textAnchor="middle" className="gauge-confidence">
              {Math.round(confidence * 100)}% confidence
            </text>
          )}
        </svg>
      </div>
      <div className="gauge-label">{label}</div>
      <div className={`gauge-category ${severity}`}>{severity.toUpperCase()}</div>
    </div>
  );
};

const getSeverityStrokeColor = (severity) => {
  const colors = {
    low: '#52c41a',
    moderate: '#faad14',
    high: '#ff7a45',
    critical: '#ff4d4f'
  };
  return colors[severity] || colors.low;
};

export default RiskScoreGauge;

import { DATA_QUALITY_RISK_LABELS } from '../../config/dataQualityModel';
import './DataQualityRiskPanel.css';

export default function DataQualityRiskBadge({ risks = [], limit = 2 }) {
  if (!risks.length) return null;

  return (
    <span className="data-quality-risk-badge" aria-label="Data quality risks">
      {risks.slice(0, limit).map((risk) => (
        <span
          key={risk.id}
          className={[
            'data-quality-risk-badge__tag',
            risk.severity === 'warning'
              ? 'data-quality-risk-badge__tag--warning'
              : 'data-quality-risk-badge__tag--info',
          ].join(' ')}
          title={risk.summary}
        >
          {risk.label || DATA_QUALITY_RISK_LABELS[risk.category]}
        </span>
      ))}
    </span>
  );
}

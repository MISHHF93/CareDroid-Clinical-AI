import './RiskFactorsList.css';
import { EMPTY_STATE_COPY } from '../../config/emptyStateCopy';

const RiskFactorsList = ({ factors = [] as any[] }) => {
  if (!factors || factors.length === 0) {
    return (
      <p className="risk-factors-list__empty" role="status">
        {EMPTY_STATE_COPY.clinical.noRiskFactors.guidance}
      </p>
    );
  }

  const parseRiskFactor = (factor) => {
    // Parse factors like "SOFA ≥ 13", "K+ = 6.8 mEq/L"
    if (typeof factor === 'string') {
      return {
        label: factor,
        severity: factor.includes('critical') || factor.includes('≥ 13') ? 'critical' : 
                 factor.includes('elevated') || factor.includes('abnormal') ? 'high' : 'moderate'
      };
    }
    return factor;
  };

  return (
    <div className="risk-factors-list">
      <div className="risk-factors-label">Risk Factors</div>
      <div className="risk-factors-items">
        {factors.map((factor, idx) => {
          const parsed = parseRiskFactor(factor);
          const displayLabel = typeof parsed === 'string' ? parsed : parsed.label;
          const severity = parsed.severity || 'moderate';

          return (
            <div key={idx} className={`risk-factor-item severity-${severity}`}>
              <span className="risk-factor-indicator">●</span>
              <span className="risk-factor-text">{displayLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RiskFactorsList;

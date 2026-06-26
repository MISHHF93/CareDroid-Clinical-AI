import { DATA_QUALITY_RISK_LABELS } from '../../config/dataQualityModel';
import './DataQualityRiskPanel.css';

function actionLabel(action) {
  if (action === 'verify_identity') return 'Check ID';
  if (action === 'capture_complaint') return 'Add reason for visit';
  if (action === 'review_duplicate') return 'Review duplicate';
  return 'Review';
}

export default function DataQualityRiskPanel({
  snapshot,
  title = 'Data quality risks',
  description = 'Missing demographics, possible duplicates, arrival reason gaps, and incomplete verification.',
  compact = false,
  limit = 8,
  onVerifyPatient,
  onCaptureComplaint,
  onReviewDuplicate,
  className = '',
}) {
  const { summary, topRisks, duplicatePairs } = snapshot || {
    summary: { byCategory: {}, patientsWithRisks: 0, totalRisks: 0 },
    topRisks: [],
    duplicatePairs: [],
  };

  const chips = Object.entries(summary.byCategory || {}).filter(([, count]) => (count as number) > 0);

  if (!summary.patientsWithRisks && !duplicatePairs.length) {
    if (compact) return null;
    return (
      <section className={`data-quality-risk-panel ${className}`.trim()} aria-label={title}>
        <header className="data-quality-risk-panel__header">
          <div>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        </header>
        <p className="data-quality-risk-panel__empty" role="status">
          No active data quality risks detected in the current patient list.
        </p>
      </section>
    );
  }

  const handleAction = (risk) => {
    if (risk.recommendedAction === 'verify_identity') {
      onVerifyPatient?.(risk.patientId);
      return;
    }
    if (risk.recommendedAction === 'capture_complaint') {
      onCaptureComplaint?.(risk.patientId);
      return;
    }
    if (risk.recommendedAction === 'review_duplicate') {
      onReviewDuplicate?.(risk.patientId);
    }
  };

  return (
    <section
      className={[
        'data-quality-risk-panel',
        compact ? 'data-quality-risk-panel--compact' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={title}
    >
      <header className="data-quality-risk-panel__header">
        <div>
          <h3>{title}</h3>
          {!compact ? <p>{description}</p> : null}
        </div>
        <div className="data-quality-risk-panel__summary" aria-label="Risk counts by category">
          {chips.map(([category, count]) => (
            <span
              key={category}
              className={[
                'data-quality-risk-panel__chip',
                category === 'duplicate_patient' || category === 'missing_verification'
                  ? 'data-quality-risk-panel__chip--warning'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {DATA_QUALITY_RISK_LABELS[category] || category}: {count}
            </span>
          ))}
        </div>
      </header>

      {!compact && topRisks.length ? (
        <ol className="data-quality-risk-panel__list">
          {topRisks.slice(0, limit).map((risk) => (
            <li key={risk.id} className="data-quality-risk-panel__item">
              <div>
                <strong>
                  {risk.patientLabel} · {risk.label}
                </strong>
                <p>{risk.summary}</p>
              </div>
              <div className="data-quality-risk-panel__actions">
                <button type="button" onClick={() => handleAction(risk)}>
                  {actionLabel(risk.recommendedAction)}
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

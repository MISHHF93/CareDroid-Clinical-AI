import {
  collectHighRiskComplaintLabels,
  patientNeedsRapidReview,
} from '../../services/highRiskComplaintFlags';
import './HighRiskComplaintFlagBadge.css';

export default function HighRiskComplaintFlagBadge({
  patient,
  compact = false,
  limit = compact ? 2 : 4,
}) {
  const labels = collectHighRiskComplaintLabels(patient);
  if (!labels.length) return null;

  const visible = labels.slice(0, limit);
  const overflow = labels.length - visible.length;
  const needsReview = patientNeedsRapidReview(patient);

  return (
    <span
      className={[
        'high-risk-complaint-badge',
        compact ? 'high-risk-complaint-badge--compact' : '',
        needsReview ? 'high-risk-complaint-badge--rapid-review' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      title={`High-risk complaint flags (staff alert only): ${labels.join(', ')}`}
    >
      {needsReview ? <span className="high-risk-complaint-badge__review">Rapid review</span> : null}
      {visible.map((label) => (
        <span key={label} className="high-risk-complaint-badge__flag">
          {label}
        </span>
      ))}
      {overflow > 0 ? <span className="high-risk-complaint-badge__more">+{overflow}</span> : null}
    </span>
  );
}

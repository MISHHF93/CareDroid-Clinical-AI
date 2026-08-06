import {
  FIT_TO_WAIT_CLASSIFICATIONS,
  fitToWaitClassificationTone,
  patientNeedsFitToWaitReview,
  resolveFitToWaitClassification,
} from '../../services/fitToWaitPathway';
import './FitToWaitBadge.css';

export default function FitToWaitBadge({ patient, compact = false }) {
  const classification = resolveFitToWaitClassification(patient);
  const needsReview = patientNeedsFitToWaitReview(patient);

  if (!classification && !needsReview) return null;

  if (!classification) {
    return (
      <span
        className={[
          'fit-to-wait-badge',
          'fit-to-wait-badge--review',
          compact ? 'fit-to-wait-badge--compact' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        title="Waiting patient needs staff seating review — not auto-classified"
      >
        Seating review
      </span>
    );
  }

  const tone = fitToWaitClassificationTone(classification.id);

  return (
    <span
      className={[
        'fit-to-wait-badge',
        `fit-to-wait-badge--${tone}`,
        compact ? 'fit-to-wait-badge--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      title={[
        classification.label,
        classification.classifiedByStaffName
          ? `Classified by ${classification.classifiedByStaffName}`
          : 'Staff-confirmed classification',
        classification.notes,
      ]
        .filter(Boolean)
        .join(' · ')}
    >
      {compact
        ? FIT_TO_WAIT_CLASSIFICATIONS.find((entry) => entry.id === classification.id)?.shortLabel ||
          classification.label
        : classification.label}
    </span>
  );
}

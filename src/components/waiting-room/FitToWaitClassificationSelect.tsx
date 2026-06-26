import React from 'react';
import {
  FIT_TO_WAIT_CLASSIFICATIONS,
  canClassifyFitToWait,
  resolveFitToWaitClassification,
} from '../../services/fitToWaitPathway';
import FitToWaitBadge from './FitToWaitBadge';
import './FitToWaitClassificationSelect.css';

export default function FitToWaitClassificationSelect({
  patient,
  readOnly = false,
  compact = false,
  onClassify,
}) {
  const classification = resolveFitToWaitClassification(patient);
  const eligible = canClassifyFitToWait(patient);

  if (!eligible) {
    return classification ? <FitToWaitBadge patient={patient} compact={compact} /> : null;
  }

  if (readOnly || !onClassify) {
    return <FitToWaitBadge patient={patient} compact={compact} />;
  }

  return (
    <div
      className={[
        'fit-to-wait-select',
        compact ? 'fit-to-wait-select--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <FitToWaitBadge patient={patient} compact={compact} />
      <label className="fit-to-wait-select__label">
        <span className="fit-to-wait-select__sr">Classify seating pathway</span>
        <select
          value={classification?.id || ''}
          onChange={(event) => {
            const value = event.target.value;
            if (!value) return;
            onClassify(patient.id, value);
          }}
          title="Staff classification required — not auto-assigned"
        >
          <option value="" disabled={Boolean(classification)}>
            {classification ? 'Change classification…' : 'Select classification…'}
          </option>
          {FIT_TO_WAIT_CLASSIFICATIONS.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

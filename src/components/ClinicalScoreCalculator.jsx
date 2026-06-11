import React, { useEffect, useMemo, useState } from 'react';
import { Save, X } from 'lucide-react';
import './ClinicalScoreCalculator.css';

export const CALCULATOR_BY_SUGGESTION_ID = {
  'heart-score': 'heart',
  qsofa: 'qsofa',
  nihss: 'nihss',
};

const HEART_FIELDS = [
  { id: 'history', label: 'History' },
  { id: 'ecg', label: 'ECG' },
  { id: 'age', label: 'Age' },
  { id: 'riskFactors', label: 'Risk factors' },
  { id: 'troponin', label: 'Troponin' },
];

const QSOFA_FIELDS = [
  { id: 'alteredMentation', label: 'Altered mentation' },
  { id: 'rr22', label: 'RR ≥22' },
  { id: 'sbp100', label: 'SBP ≤100' },
];

const NIHSS_FIELDS = [
  { id: 'consciousness', label: 'Consciousness' },
  { id: 'gaze', label: 'Gaze' },
  { id: 'visual', label: 'Visual' },
  { id: 'facial', label: 'Facial palsy' },
  { id: 'motorLeft', label: 'Motor arm/leg left' },
  { id: 'motorRight', label: 'Motor arm/leg right' },
  { id: 'ataxia', label: 'Ataxia' },
  { id: 'sensory', label: 'Sensory' },
  { id: 'language', label: 'Language' },
  { id: 'dysarthria', label: 'Dysarthria' },
  { id: 'extinction', label: 'Extinction' },
];

const CALCULATOR_LABEL = {
  heart: 'HEART Score',
  qsofa: 'qSOFA',
  nihss: 'NIHSS',
};

export function isClinicalCalculatorSuggestion(suggestion) {
  return Boolean(CALCULATOR_BY_SUGGESTION_ID[suggestion?.id]);
}

function patientName(patient) {
  if (!patient) return 'Patient not selected';
  return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Pending patient';
}

function createInitialValues(calculatorId, patient) {
  if (calculatorId === 'qsofa') {
    return {
      alteredMentation: 0,
      rr22: typeof patient?.vitals?.rr === 'number' && patient.vitals.rr >= 22 ? 1 : 0,
      sbp100:
        typeof patient?.vitals?.bpSystolic === 'number' && patient.vitals.bpSystolic <= 100 ? 1 : 0,
    };
  }

  if (calculatorId === 'heart') {
    const age = Number(patient?.age);
    return {
      history: 0,
      ecg: 0,
      age: Number.isFinite(age) && age >= 65 ? 2 : Number.isFinite(age) && age >= 45 ? 1 : 0,
      riskFactors: 0,
      troponin: 0,
    };
  }

  const fields = calculatorId === 'nihss' ? NIHSS_FIELDS : HEART_FIELDS;
  return Object.fromEntries(fields.map((field) => [field.id, 0]));
}

function fieldsForCalculator(calculatorId) {
  if (calculatorId === 'qsofa') return QSOFA_FIELDS;
  if (calculatorId === 'nihss') return NIHSS_FIELDS;
  return HEART_FIELDS;
}

function maxForCalculator(calculatorId) {
  if (calculatorId === 'qsofa') return 1;
  if (calculatorId === 'nihss') return 4;
  return 2;
}

function totalScore(values) {
  return Object.values(values).reduce((sum, value) => sum + Number(value || 0), 0);
}

function interpretScore(calculatorId, total) {
  if (calculatorId === 'heart') {
    if (total <= 3) {
      return {
        band: 'Low risk',
        recommendation:
          'Low-risk HEART range. Continue clinician review and local chest pain pathway.',
      };
    }
    if (total <= 6) {
      return {
        band: 'Moderate risk',
        recommendation:
          'Moderate-risk HEART range. Consider ACS pathway review and serial assessment.',
      };
    }
    return {
      band: 'High risk',
      recommendation:
        'High-risk HEART range. Escalate ACS protocol context for urgent clinician review.',
    };
  }

  if (calculatorId === 'qsofa') {
    if (total >= 2) {
      return {
        band: 'High risk for sepsis',
        recommendation:
          'qSOFA is 2 or higher. Surface sepsis workflow context and prioritize clinician reassessment.',
      };
    }
    return {
      band: 'Not high risk by qSOFA',
      recommendation: 'qSOFA is below 2. Continue human review and monitor for deterioration.',
    };
  }

  if (total === 0) {
    return {
      band: 'No stroke symptoms recorded',
      recommendation: 'NIHSS total 0. Confirm exam context with clinician review.',
    };
  }
  if (total <= 4) {
    return {
      band: 'Minor stroke range',
      recommendation: 'NIHSS minor range. Preserve last-known-well and clinician review context.',
    };
  }
  if (total <= 15) {
    return {
      band: 'Moderate stroke range',
      recommendation: 'NIHSS moderate range. Surface stroke pathway and imaging readiness context.',
    };
  }
  if (total <= 20) {
    return {
      band: 'Moderate-severe stroke range',
      recommendation: 'NIHSS moderate-severe range. Prioritize stroke team workflow review.',
    };
  }
  return {
    band: 'Severe stroke range',
    recommendation:
      'NIHSS severe range. Escalate urgent stroke pathway context for clinician review.',
  };
}

export function createClinicalScoreEvent(patientId, score, timestamp) {
  return {
    id: `score-${patientId}-${score.calculatorId}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`,
    patientId,
    type: 'ClinicalScoreSaved',
    timestamp,
    summary: `Saved ${score.label}: ${score.total} (${score.interpretation}).`,
    metadata: {
      scoreId: score.calculatorId,
      scoreLabel: score.label,
      scoreTotal: score.total,
      interpretation: score.interpretation,
      recommendation: score.recommendation,
    },
  };
}

export function createClinicalScoreNote(patientId, score, authorStaffId, timestamp) {
  return {
    id: `note-${patientId}-${score.calculatorId}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`,
    patientId,
    authorStaffId,
    type: 'Clinical',
    body: `${score.label}: ${score.total} (${score.interpretation}). ${score.recommendation}`,
    createdAt: timestamp,
  };
}

export default function ClinicalScoreCalculator({ calculatorId, patient, onClose, onSaveScore }) {
  const [values, setValues] = useState(() => createInitialValues(calculatorId, patient));
  const fields = fieldsForCalculator(calculatorId);
  const total = useMemo(() => totalScore(values), [values]);
  const interpretation = interpretScore(calculatorId, total);
  const maxValue = maxForCalculator(calculatorId);
  const label = CALCULATOR_LABEL[calculatorId] || 'Clinical Score';

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose?.();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const saveScore = () => {
    onSaveScore?.({
      calculatorId,
      label,
      total,
      interpretation: interpretation.band,
      recommendation: interpretation.recommendation,
      values,
    });
    onClose?.();
  };

  const renderFieldControl = (field) => {
    if (calculatorId === 'qsofa') {
      const isActive = Number(values[field.id] || 0) === 1;
      return (
        <button
          type="button"
          className={`clinical-score-modal__toggle${isActive ? ' clinical-score-modal__toggle--active' : ''}`}
          aria-pressed={isActive}
          aria-label={`${field.label}: ${isActive ? 'Yes' : 'No'}`}
          onClick={() =>
            setValues((current) => ({ ...current, [field.id]: current[field.id] ? 0 : 1 }))
          }
        >
          {isActive ? 'Yes' : 'No'}
        </button>
      );
    }

    return (
      <select
        value={values[field.id] ?? 0}
        onChange={(event) =>
          setValues((current) => ({ ...current, [field.id]: Number(event.target.value) }))
        }
      >
        {Array.from({ length: maxValue + 1 }, (_, value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    );
  };

  return (
    <div className="clinical-score-modal" role="dialog" aria-modal="true" aria-label={label}>
      <section className="clinical-score-modal__panel">
        <header>
          <div>
            <span>{patient?.mrn || 'No MRN yet'}</span>
            <h2>{label}</h2>
            <p>{patientName(patient)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close calculator">
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="clinical-score-modal__body">
          <div className="clinical-score-modal__fields">
            {fields.map((field) => (
              <label key={field.id}>
                <span>{field.label}</span>
                {renderFieldControl(field)}
              </label>
            ))}
          </div>

          <aside className="clinical-score-modal__result">
            <span>Total</span>
            <strong>{total}</strong>
            <h3>{interpretation.band}</h3>
            <p>{interpretation.recommendation}</p>
            {calculatorId === 'heart' ? (
              <small>Age field is pre-filled from the linked patient when available.</small>
            ) : null}
            {calculatorId === 'qsofa' ? (
              <small>RR and SBP are pre-filled from current patient vitals when available.</small>
            ) : null}
          </aside>
        </div>

        <footer>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="clinical-score-modal__save" onClick={saveScore}>
            <Save size={16} aria-hidden />
            Save to Patient
          </button>
        </footer>
      </section>
    </div>
  );
}

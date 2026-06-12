import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Save, X } from 'lucide-react';
import { sendClinicalChatMessage } from '../services/clinicalChatService';
import { useFeature } from '../hooks/useFeature';
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

function createInitialValues(calculatorId, patient, autoScorePrefill = null) {
  const requiredAssessmentValues = Object.fromEntries(
    (autoScorePrefill?.requiresAssessment || []).map((fieldId) => [fieldId, ''])
  );
  const autoValues = autoScorePrefill?.values || {};
  if (calculatorId === 'qsofa') {
    return {
      alteredMentation: 0,
      rr22: typeof patient?.vitals?.rr === 'number' && patient.vitals.rr >= 22 ? 1 : 0,
      sbp100:
        typeof patient?.vitals?.bpSystolic === 'number' && patient.vitals.bpSystolic <= 100 ? 1 : 0,
      ...requiredAssessmentValues,
      ...autoValues,
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
      ...requiredAssessmentValues,
      ...autoValues,
    };
  }

  const fields = calculatorId === 'nihss' ? NIHSS_FIELDS : HEART_FIELDS;
  return { ...Object.fromEntries(fields.map((field) => [field.id, 0])), ...requiredAssessmentValues, ...autoValues };
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

export function createClinicalScoreEvent(patientId, score, timestamp, staffId = null) {
  return {
    id: `score-${patientId}-${score.calculatorId}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`,
    patientId,
    type: 'SCORE',
    timestamp,
    staffId,
    summary: `Saved ${score.label}: ${score.total} (${score.interpretation}).`,
    metadata: {
      scoreId: score.calculatorId,
      scoreLabel: score.label,
      scoreTotal: score.total,
      result: score.total,
      band: score.interpretation,
      interpretation: score.interpretation,
      recommendation: score.recommendation,
      staffId,
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

export default function ClinicalScoreCalculator({
  calculatorId,
  patient,
  onClose,
  onSaveScore,
  autoScorePrefill = null,
}) {
  const { enabled: scoreAiAssistEnabled } = useFeature('score_ai_assist');
  const [values, setValues] = useState(() => createInitialValues(calculatorId, patient, autoScorePrefill));
  const [reviewedFields, setReviewedFields] = useState({});
  const [assistText, setAssistText] = useState('');
  const [assistError, setAssistError] = useState('');
  const [assistLoading, setAssistLoading] = useState(false);
  const assessmentFieldRef = useRef(null);
  const fields = fieldsForCalculator(calculatorId);
  const total = useMemo(() => totalScore(values), [values]);
  const interpretation = interpretScore(calculatorId, total);
  const maxValue = maxForCalculator(calculatorId);
  const label = CALCULATOR_LABEL[calculatorId] || 'Clinical Score';

  useEffect(() => {
    setValues(createInitialValues(calculatorId, patient, autoScorePrefill));
    setReviewedFields({});
  }, [autoScorePrefill, calculatorId, patient]);

  useEffect(() => {
    assessmentFieldRef.current?.focus();
  }, []);

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
      autoScorePrefill,
    });
    onClose?.();
  };

  const requestAiAssist = async () => {
    if (!patient) return;
    setAssistLoading(true);
    setAssistError('');
    try {
      const response = await sendClinicalChatMessage({
        message: [
          `Based on the vitals, key fields to consider are requested for ${label}.`,
          'Provide scoring guidance only. Do not diagnose, recommend disposition, or invent missing fields.',
        ].join('\n'),
        requestType: 'SCORE_ASSIST',
        workspaceContext: {
          workspaceId: 'emergency',
          workspaceKey: 'emergency',
          aiRequest: {
            requestType: 'SCORE_ASSIST',
            patientId: patient.id,
            calculatorType: calculatorId,
            patientVitals: patient.vitals,
            patientContext: {
              complaint: patient.complaint || patient.chiefComplaint,
              priority: patient.priority,
              state: patient.state,
              age: patient.age,
            },
          },
        },
      });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      setAssistText(response.data.response || 'No guidance returned.');
    } catch (_error) {
      setAssistError('Unable to generate AI scoring guidance.');
    } finally {
      setAssistLoading(false);
    }
  };

  const fieldMeta = (fieldId) => autoScorePrefill?.fields?.[fieldId] || null;
  const fieldClassName = (field) => {
    const meta = fieldMeta(field.id);
    return [
      meta?.status ? `clinical-score-modal__field--${meta.status}` : '',
      reviewedFields[field.id] ? 'clinical-score-modal__field--reviewed' : '',
    ]
      .filter(Boolean)
      .join(' ');
  };
  const fieldRef = (field) =>
    autoScorePrefill?.requiresAssessment?.[0] === field.id ? { ref: assessmentFieldRef } : {};
  const markReviewed = (fieldId) =>
    setReviewedFields((current) => ({ ...current, [fieldId]: true }));

  const renderFieldControl = (field) => {
    if (calculatorId === 'qsofa') {
      const isActive = Number(values[field.id] || 0) === 1;
      return (
        <button
          type="button"
          className={`clinical-score-modal__toggle${isActive ? ' clinical-score-modal__toggle--active' : ''}`}
          aria-pressed={isActive}
          aria-label={`${field.label}: ${values[field.id] === '' ? 'Requires assessment' : isActive ? 'Yes' : 'No'}`}
          onClick={() => {
            setValues((current) => ({ ...current, [field.id]: current[field.id] ? 0 : 1 }));
            markReviewed(field.id);
          }}
          {...fieldRef(field)}
        >
          {values[field.id] === '' ? 'Assess' : isActive ? 'Yes' : 'No'}
        </button>
      );
    }

    return (
      <select
        value={values[field.id] ?? 0}
        onChange={(event) => {
          setValues((current) => ({
            ...current,
            [field.id]: event.target.value === '' ? '' : Number(event.target.value),
          }));
          markReviewed(field.id);
        }}
        {...fieldRef(field)}
      >
        {values[field.id] === '' ? <option value="">Requires assessment</option> : null}
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
            {fields.map((field) => {
              const meta = fieldMeta(field.id);
              return (
              <label key={field.id} className={fieldClassName(field)}>
                <span>
                  {field.label}
                  {meta?.status === 'prefilled' ? <em>Auto-filled</em> : null}
                  {meta?.status === 'requires-assessment' ? <em>Requires assessment</em> : null}
                  {meta?.status === 'needs-confirmation' ? <em>Confirm</em> : null}
                  {reviewedFields[field.id] ? <em>Physician reviewed</em> : null}
                </span>
                {renderFieldControl(field)}
                {meta?.source ? <small>{meta.source}</small> : null}
              </label>
              );
            })}
          </div>

          <aside className="clinical-score-modal__result">
            <span>Total</span>
            <strong>{total}</strong>
            <h3>{interpretation.band}</h3>
            <p>{interpretation.recommendation}</p>
            {patient && scoreAiAssistEnabled ? (
              <button type="button" onClick={requestAiAssist} disabled={assistLoading}>
                {assistLoading ? 'Reviewing...' : 'AI Assist'}
              </button>
            ) : null}
            {assistText ? <small>{assistText}</small> : null}
            {assistError ? <small>{assistError}</small> : null}
            {autoScorePrefill ? (
              <small>{autoScorePrefill.bannerSummary}</small>
            ) : calculatorId === 'heart' ? (
              <small>Age field is pre-filled from the linked patient when available.</small>
            ) : calculatorId === 'qsofa' ? (
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

import { useEffect, useMemo, useState } from 'react';
import { MEDICAL_THEME } from '../../config/medicalTheme.constants';
import { useEmergencyStore } from '../../store/emergencyStore';
import { saveCalculatorResult } from './calculatorSave';
import './mobileCalculator.css';

type ScoreValue = 0 | 1 | 2;

type HEARTScoreProps = {
  patientId?: string;
  onClose: () => void;
};

type ScoreKey = 'history' | 'ecg' | 'age' | 'riskFactors' | 'troponin';

const FIELD_OPTIONS: Array<{
  key: ScoreKey;
  title: string;
  options: Array<{ value: ScoreValue; label: string }>;
}> = [
  {
    key: 'history',
    title: 'HISTORY',
    options: [
      { value: 0, label: 'Slightly suspicious' },
      { value: 1, label: 'Moderately suspicious' },
      { value: 2, label: 'Highly suspicious' },
    ],
  },
  {
    key: 'ecg',
    title: 'ECG',
    options: [
      { value: 0, label: 'Normal' },
      { value: 1, label: 'Non-specific repolarization' },
      { value: 2, label: 'Significant ST deviation' },
    ],
  },
  {
    key: 'age',
    title: 'AGE',
    options: [
      { value: 0, label: '<45' },
      { value: 1, label: '45-64' },
      { value: 2, label: '≥65' },
    ],
  },
  {
    key: 'riskFactors',
    title: 'RISK FACTORS',
    options: [
      { value: 0, label: 'No known risk factors' },
      { value: 1, label: '1-2 risk factors' },
      { value: 2, label: '≥3 or atherosclerotic disease' },
    ],
  },
  {
    key: 'troponin',
    title: 'TROPONIN',
    options: [
      { value: 0, label: '≤Normal limit' },
      { value: 1, label: '1-3× normal limit' },
      { value: 2, label: '>3× normal limit' },
    ],
  },
];

function ageScoreFromDob(dob: string): ScoreValue {
  const dobTime = new Date(dob).getTime();
  if (!Number.isFinite(dobTime)) return 0;
  const ageDate = new Date(Date.now() - dobTime);
  const age = Math.abs(ageDate.getUTCFullYear() - 1970);
  if (age < 45) return 0;
  if (age < 65) return 1;
  return 2;
}

function resultFor(total: number) {
  if (total <= 3) {
    return {
      band: 'Low risk',
      color: '#10B981',
      recommendation: 'Consider early discharge',
    };
  }

  if (total <= 6) {
    return {
      band: 'Moderate risk',
      color: '#F59E0B',
      recommendation: 'Observation, serial troponins',
    };
  }

  return {
    band: 'High risk',
    color: '#EF4444',
    recommendation: 'Consider early invasive strategy',
  };
}

export default function HEARTScore({ patientId, onClose }: HEARTScoreProps) {
  const patients = useEmergencyStore((state) => state.patients);
  const patient = patientId ? patients.find((candidate) => candidate.id === patientId) : undefined;
  const [scores, setScores] = useState<Record<ScoreKey, ScoreValue>>({
    history: 0,
    ecg: 0,
    age: patient ? ageScoreFromDob(patient.dob) : 0,
    riskFactors: 0,
    troponin: 0,
  });
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    if (!patient) return;
    setScores((previous) => ({ ...previous, age: ageScoreFromDob(patient.dob) }));
  }, [patient]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const total = useMemo(
    () => Object.values(scores).reduce<number>((sum, value) => sum + value, 0),
    [scores],
  );
  const result = resultFor(total);

  const saveToPatient = () => {
    if (!patient) return;
    const saved = saveCalculatorResult({
      patientId: patient.id,
      scoreId: 'heart-score',
      scoreName: 'HEART Score',
      total,
      max: 10,
      band: result.band,
      fields: scores,
      staffId: patient.assignedStaffId || undefined,
      critical: total >= 7,
    });
    if (!saved) return;
    setSavedMessage('HEART score saved to patient.');
    onClose();
  };

  return (
    <div
      className="clinical-calculator-modal u-modal-scrim"
      role="dialog"
      aria-modal="true"
      aria-labelledby="heart-score-title"
      
    >
      <div
        className="clinical-calculator-modal__panel"
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: '92vh',
          overflowY: 'auto',
          background: MEDICAL_THEME.surfaceCard,
          border: '1px solid #e0f2fe',
          borderRadius: 12,
          color: 'var(--medical-ink, #111827)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
        }}
      >
        <header
          className="u-panel-header-row"
        >
          <div>
            <h2 id="heart-score-title" className="u-title-18">
              HEART Score
            </h2>
            {patient ? (
              <div style={{ color: MEDICAL_THEME.inkSubtle, fontSize: 12, marginTop: 4 }}>
                {patient.firstName} {patient.lastName} · {patient.mrn}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close HEART score"
            className="u-icon-btn-32"
          >
            X
          </button>
        </header>

        <div className="u-stack-14">
          {FIELD_OPTIONS.map((field) => (
            <section key={field.key} style={{ border: '1px solid #e0f2fe', borderRadius: 10, padding: 12 }}>
              <h3 style={{ margin: '0 0 10px', color: MEDICAL_THEME.inkSubtle, fontSize: 12 }}>{field.title}</h3>
              <div className="u-flex-col u-gap-8">
                {field.options.map((option) => (
                  <label
                    className="clinical-calculator-modal__choice"
                    key={option.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: 'var(--medical-ink, #111827)',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name={`heart-${field.key}`}
                      value={option.value}
                      checked={scores[field.key] === option.value}
                      onChange={() => {
                        setScores((previous) => ({ ...previous, [field.key]: option.value }));
                        setSavedMessage('');
                      }}
                    />
                    <span>{option.label} ({option.value})</span>
                  </label>
                ))}
              </div>
            </section>
          ))}

          <section
            aria-live="polite"
            style={{
              border: `1px solid ${result.color}`,
              background: `${result.color}1F`,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <div style={{ color: result.color, fontSize: 13, fontWeight: 700 }}>{result.band}</div>
            <div className="u-mono-32">
              {total}/10
            </div>
            <div style={{ color: 'var(--medical-ink, #111827)', fontSize: 13, marginTop: 4 }}>{result.recommendation}</div>
          </section>

          {patient ? (
            <button
              className="clinical-calculator-modal__submit"
              type="button"
              onClick={saveToPatient}
              style={{
                background: MEDICAL_THEME.accent,
                border: 'none',
                color: 'var(--medical-ink, #111827)',
                borderRadius: 10,
                padding: '10px 12px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Save to Patient
            </button>
          ) : null}

          {savedMessage ? (
            <div role="status" className="u-ok-13">
              {savedMessage}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { dispatchAlert } from '../../engine/alertEngine';
import { saveCalculatorResult } from './calculatorSave';
import { useEmergencyStore } from '../../store/emergencyStore';
import type { Note, Patient } from '../../types/emergency';
import './CIWAAr.css';

type CIWAArProps = {
  patientId?: string;
  onClose: () => void;
};

type CIWAItem = {
  id: string;
  label: string;
  max: number;
  descriptions: Record<number, string>;
};

export const CIWA_ITEMS: CIWAItem[] = [
  {
    id: 'nausea',
    label: 'Nausea / Vomiting',
    max: 7,
    descriptions: {
      0: 'No nausea, no vomiting',
      1: 'Mild nausea with no dry heaves',
      4: 'Intermittent nausea with dry heaves',
      7: 'Constant nausea, frequent dry heaves and vomiting',
    },
  },
  {
    id: 'tremor',
    label: 'Tremor (arms extended, fingers spread)',
    max: 7,
    descriptions: {
      0: 'No tremor',
      1: 'Not visible, felt fingertip to fingertip',
      4: 'Moderate, patient at rest',
      7: 'Severe, even without extended arms',
    },
  },
  {
    id: 'sweat',
    label: 'Paroxysmal Sweats',
    max: 7,
    descriptions: {
      0: 'No sweat visible',
      1: 'Barely perceptible, palms moist',
      4: 'Beads of sweat on forehead',
      7: 'Drenching sweats',
    },
  },
  {
    id: 'anxiety',
    label: 'Anxiety',
    max: 7,
    descriptions: {
      0: 'No anxiety, at ease',
      1: 'Mildly anxious',
      4: 'Moderately anxious or guarded',
      7: 'Equivalent to acute panic state',
    },
  },
  {
    id: 'agitation',
    label: 'Agitation',
    max: 7,
    descriptions: {
      0: 'Normal activity',
      1: 'Somewhat normal activity',
      4: 'Moderately fidgety and restless',
      7: 'Paces back and forth, thrashing',
    },
  },
  {
    id: 'tactile',
    label: 'Tactile Disturbances',
    max: 7,
    descriptions: {
      0: 'None',
      1: 'Very mild itching, pins and needles',
      4: 'Moderately severe hallucinations',
      7: 'Continuous hallucinations',
    },
  },
  {
    id: 'auditory',
    label: 'Auditory Disturbances',
    max: 7,
    descriptions: {
      0: 'Not present',
      1: 'Very mild harshness or ability to frighten',
      4: 'Moderately severe hallucinations',
      7: 'Continuous hallucinations',
    },
  },
  {
    id: 'visual',
    label: 'Visual Disturbances',
    max: 7,
    descriptions: {
      0: 'Not present',
      1: 'Very mild photosensitivity',
      4: 'Moderately severe hallucinations',
      7: 'Continuous hallucinations',
    },
  },
  {
    id: 'headache',
    label: 'Headache, Fullness in Head',
    max: 7,
    descriptions: {
      0: 'Not present',
      1: 'Very mild',
      4: 'Moderately severe',
      7: 'Extremely severe',
    },
  },
  {
    id: 'orientation',
    label: 'Orientation and Clouding',
    max: 4,
    descriptions: {
      0: 'Oriented, can do serial additions',
      1: 'Cannot do serial additions or uncertain about date',
      2: 'Date disorientation by no more than 2 days',
      3: 'Date disorientation by more than 2 days',
      4: 'Disoriented for place and/or person',
    },
  },
];

type CIWAScores = Record<string, number>;

function patientName(patient?: Patient): string {
  return patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.mrn : 'Patient';
}

function noteText(note: Note): string {
  return `${note.text || ''} ${note.body || ''}`.trim();
}

function hasDocumentedDiaphoresis(patient?: Patient): boolean {
  return Boolean(patient?.notes.some((note) => /\b(diaphoresis|diaphoretic|sweat|sweating)\b/i.test(noteText(note))));
}

function latestGcs(patient?: Patient): number | undefined {
  return patient?.vitals.at(-1)?.gcs;
}

function initialScores(patient?: Patient): CIWAScores {
  const scores = Object.fromEntries(CIWA_ITEMS.map((item) => [item.id, 0])) as CIWAScores;
  if (hasDocumentedDiaphoresis(patient)) scores.sweat = 4;
  const gcs = latestGcs(patient);
  if (gcs !== undefined && gcs < 15) scores.orientation = 2;
  return scores;
}

function closestDescription(item: CIWAItem, value: number): string {
  const anchors = Object.keys(item.descriptions)
    .map(Number)
    .sort((a, b) => a - b);
  const closest = anchors.reduce((best, anchor) =>
    Math.abs(anchor - value) < Math.abs(best - value) ? anchor : best,
  anchors[0]);
  return item.descriptions[closest];
}

export function protocolFor(total: number): {
  band: string;
  recommendation: string;
  color: string;
  alertSeverity?: 'Warning' | 'Critical';
} {
  if (total < 8) {
    return {
      band: 'Mild',
      recommendation: 'Mild - No medication needed. Monitor q4h.',
      color: '#10B981',
    };
  }
  if (total <= 15) {
    return {
      band: 'Moderate',
      recommendation: 'Moderate - Consider Lorazepam 1-2mg PO/IV. Reassess in 1 hour.',
      color: '#F59E0B',
    };
  }
  if (total <= 20) {
    return {
      band: 'Moderate-Severe',
      recommendation: 'Moderate-Severe - Lorazepam 2mg IV. Consider medical admission.',
      color: '#F97316',
      alertSeverity: 'Warning',
    };
  }
  return {
    band: 'Severe',
    recommendation: 'Severe - Lorazepam 4mg IV immediately. ICU/step-down monitoring. Seizure precautions.',
    color: '#EF4444',
    alertSeverity: 'Critical',
  };
}

export default function CIWAAr({ patientId, onClose }: CIWAArProps) {
  const patients = useEmergencyStore((state) => state.patients);
  const patient = patientId ? patients.find((candidate) => candidate.id === patientId) : undefined;
  const [scores, setScores] = useState<CIWAScores>(() => initialScores(patient));
  const [savedMessage, setSavedMessage] = useState('');
  const alertedKeyRef = useRef('');

  useEffect(() => {
    setScores(initialScores(patient));
    alertedKeyRef.current = '';
  }, [patient]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const total = useMemo(
    () => CIWA_ITEMS.reduce((sum, item) => sum + (scores[item.id] || 0), 0),
    [scores],
  );
  const protocol = protocolFor(total);

  useEffect(() => {
    if (!patientId || !patient || !protocol.alertSeverity) return;
    const alertKey = `${patientId}-${protocol.alertSeverity}-${total}`;
    if (alertedKeyRef.current === alertKey) return;
    dispatchAlert({
      severity: protocol.alertSeverity,
      title: `CIWA-Ar ${protocol.band} withdrawal risk - ${patientName(patient)}`,
      message: `${total}/67. ${protocol.recommendation}`,
      patientId,
      source: 'ciwa-ar',
      metadata: {
        calculator: 'CIWA-Ar',
        total: String(total),
        band: protocol.band,
      },
    });
    alertedKeyRef.current = alertKey;
  }, [patient, patientId, protocol, total]);

  const updateScore = (id: string, value: number) => {
    setScores((previous) => ({ ...previous, [id]: value }));
    setSavedMessage('');
  };

  const saveToPatient = () => {
    if (!patientId || !patient) return;
    const saved = saveCalculatorResult({
      patientId,
      scoreId: 'ciwa-ar',
      scoreName: 'CIWA-Ar',
      total,
      max: 67,
      band: protocol.band,
      recommendation: protocol.recommendation,
      fields: scores,
      staffId: patient.assignedStaffId || undefined,
      critical: protocol.band.toLowerCase().includes('severe'),
    });
    if (!saved) return;
    setSavedMessage('CIWA-Ar score saved to patient.');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ciwa-title"
      className="u-modal-scrim"
    >
      <div className="ciwa-panel">
        <header
          className="u-panel-header-row"
        >
          <div>
            <h2 id="ciwa-title" className="u-title-18">
              CIWA-Ar Alcohol Withdrawal
            </h2>
            {patient ? (
              <div className="ciwa-patient-subtitle">
                {patientName(patient)} · {patient.mrn}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close CIWA-Ar"
            className="u-icon-btn-32"
          >
            X
          </button>
        </header>

        <div className="u-stack-14">
          <section
            aria-live="polite"
            style={{
              border: `1px solid ${protocol.color}`,
              background: `${protocol.color}1F`,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <div style={{ color: protocol.color, fontSize: 13, fontWeight: 800 }}>{protocol.band}</div>
            <div className="u-mono-32">
              {total}/67
            </div>
            <p className="ciwa-recommendation">{protocol.recommendation}</p>
          </section>

          {CIWA_ITEMS.map((item) => {
            const value = scores[item.id] || 0;
            return (
              <section key={item.id} className="u-card-border">
                <label className="u-grid-gap-10">
                  <span className="ciwa-item-label">{item.label}</span>
                  <input
                    type="range"
                    min={0}
                    max={item.max}
                    value={value}
                    aria-label={item.label}
                    onChange={(event) => updateScore(item.id, Number(event.target.value))}
                  />
                </label>
                <div className="ciwa-range-row">
                  <span>0</span>
                  <strong className="ciwa-range-value">{value}</strong>
                  <span>{item.max}</span>
                </div>
                <p className="ciwa-item-description">
                  {closestDescription(item, value)}
                </p>
              </section>
            );
          })}

          {patient ? (
            <button
              type="button"
              onClick={saveToPatient}
              className="ciwa-save-btn"
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

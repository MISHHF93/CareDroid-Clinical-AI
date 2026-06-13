import { useEffect, useMemo, useRef, useState } from 'react';
import { dispatchAlert } from '../../engine/alertEngine';
import { useEmergencyStore } from '../../store/emergencyStore';
import { PatientFlag } from '../../types/emergency';
import {
  NEWS2_ITEMS,
  news2Response,
  scoreNews2,
  scoreNews2Item,
  valueFromVitals,
  type NEWS2Item,
  type NEWS2Values,
} from '../../utils/news2';
import { saveCalculatorResult } from './calculatorSave';

type NEWS2Props = {
  patientId?: string;
  onClose: () => void;
};

function patientName(patient?: { firstName?: string; lastName?: string; mrn?: string }): string {
  if (!patient) return 'Patient';
  return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.mrn || 'Patient';
}

function inputValue(value: number | undefined): string {
  return value === undefined ? '' : String(value);
}

function defaultValues(patientId?: string): NEWS2Values {
  const patient = patientId
    ? useEmergencyStore.getState().patients.find((candidate) => candidate.id === patientId)
    : undefined;
  return valueFromVitals(patient?.vitals[0]);
}

function itemScore(item: NEWS2Item, values: NEWS2Values): number {
  return scoreNews2Item(item, values);
}

export default function NEWS2({ patientId, onClose }: NEWS2Props) {
  const patients = useEmergencyStore((state) => state.patients);
  const addFlag = useEmergencyStore((state) => state.addFlag);
  const patient = patientId ? patients.find((candidate) => candidate.id === patientId) : undefined;
  const [values, setValues] = useState<NEWS2Values>(() => defaultValues(patientId));
  const [savedMessage, setSavedMessage] = useState('');
  const alertedKeyRef = useRef('');
  const autoFilled = Boolean(patient?.vitals[0]);

  useEffect(() => {
    setValues(valueFromVitals(patient?.vitals[0]));
    alertedKeyRef.current = '';
  }, [patient]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const score = useMemo(() => scoreNews2(values), [values]);
  const response = useMemo(() => news2Response(score.total, score.hasSingleRed), [score.hasSingleRed, score.total]);

  useEffect(() => {
    if (!patientId || !patient || !response.alertSeverity) return;
    const alertKey = `${patientId}-${response.alertSeverity}-${score.total}-${score.hasSingleRed}`;
    if (alertedKeyRef.current === alertKey) return;

    dispatchAlert({
      severity: response.alertSeverity,
      title: `NEWS2 ${response.band} deterioration risk — ${patientName(patient)}`,
      message: `Score ${score.total}/20 — ${response.recommendation}`,
      patientId,
      source: 'news2-calculator',
      metadata: {
        calculator: 'NEWS2',
        total: String(score.total),
        band: response.band,
        hasSingleRed: score.hasSingleRed,
      },
    });
    if (score.total >= 5 && !patient.flags.includes(PatientFlag.ReassessmentDue)) {
      addFlag(patientId, PatientFlag.ReassessmentDue);
    }
    alertedKeyRef.current = alertKey;
  }, [addFlag, patient, patientId, response, score.hasSingleRed, score.total]);

  const updateNumber = (id: keyof NEWS2Values, rawValue: string) => {
    setValues((previous) => ({
      ...previous,
      [id]: rawValue === '' ? undefined : Number(rawValue),
    }));
    setSavedMessage('');
  };

  const updateSelect = (id: keyof NEWS2Values, value: string) => {
    setValues((previous) => ({ ...previous, [id]: value }));
    setSavedMessage('');
  };

  const saveToPatient = () => {
    if (!patient) return;
    const saved = saveCalculatorResult({
      patientId: patient.id,
      scoreName: 'NEWS2',
      total: score.total,
      max: 20,
      band: response.band,
      fields: {
        values,
        itemScores: score.itemScores,
        hasSingleRed: score.hasSingleRed,
        recommendation: response.recommendation,
      },
      staffId: patient.assignedStaffId || undefined,
      critical: Boolean(response.alertSeverity),
    });
    if (!saved) return;
    setSavedMessage('NEWS2 score saved to patient.');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="news2-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'rgba(0,0,0,0.62)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 720,
          maxHeight: '92vh',
          overflowY: 'auto',
          background: '#111827',
          border: '1px solid #1F2937',
          borderRadius: 12,
          color: '#F9FAFB',
          boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: 16,
            borderBottom: '1px solid #1F2937',
          }}
        >
          <div>
            <h2 id="news2-title" style={{ margin: 0, fontSize: 18, fontWeight: 650 }}>
              NEWS2 Early Warning Score
            </h2>
            {patient ? (
              <div style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>
                {patientName(patient)} · {patient.mrn}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close NEWS2"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid #374151',
              background: 'transparent',
              color: '#F9FAFB',
              cursor: 'pointer',
            }}
          >
            X
          </button>
        </header>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {autoFilled ? (
            <div style={{ color: '#9CA3AF', fontSize: 13 }}>Auto-filled from vitals</div>
          ) : null}

          <section
            aria-live="polite"
            style={{
              border: `1px solid ${response.color}`,
              background: `${response.color}1F`,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <div style={{ color: response.color, fontSize: 13, fontWeight: 800 }}>{response.recommendation}</div>
            <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 32, marginTop: 4 }}>
              {score.total}/20
            </div>
            {score.hasSingleRed ? (
              <p style={{ margin: '8px 0 0', color: '#FDE68A', fontSize: 13 }}>
                Single parameter scoring 3 detected.
              </p>
            ) : null}
          </section>

          {NEWS2_ITEMS.map((item) => {
            const currentScore = itemScore(item, values);
            return (
              <section key={item.id} style={{ border: '1px solid #1F2937', borderRadius: 12, padding: 14 }}>
                <label style={{ display: 'grid', gap: 8 }}>
                  <span style={{ color: '#F9FAFB', fontSize: 14, fontWeight: 700 }}>{item.label}</span>
                  {'note' in item && item.note ? <span style={{ color: '#9CA3AF', fontSize: 12 }}>{item.note}</span> : null}
                  {item.input === 'number' ? (
                    <input
                      type="number"
                      value={inputValue(values[item.id])}
                      aria-label={item.label}
                      onChange={(event) => updateNumber(item.id, event.target.value)}
                      style={{
                        border: '1px solid #374151',
                        borderRadius: 8,
                        background: '#020617',
                        color: '#F9FAFB',
                        padding: 10,
                      }}
                    />
                  ) : (
                    <select
                      value={values[item.id] || item.options[0].label}
                      aria-label={item.label}
                      onChange={(event) => updateSelect(item.id, event.target.value)}
                      style={{
                        border: '1px solid #374151',
                        borderRadius: 8,
                        background: '#020617',
                        color: '#F9FAFB',
                        padding: 10,
                      }}
                    >
                      {item.options.map((option) => (
                        <option key={option.label} value={option.label}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
                <div style={{ color: currentScore === 3 ? '#FCA5A5' : '#9CA3AF', fontSize: 13, marginTop: 8 }}>
                  Score: <strong>{currentScore}</strong>
                  {'unit' in item ? ` ${item.unit}` : ''}
                </div>
              </section>
            );
          })}

          {patient ? (
            <button
              type="button"
              onClick={saveToPatient}
              style={{
                background: '#2563EB',
                border: 'none',
                color: '#F9FAFB',
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
            <div role="status" style={{ color: '#10B981', fontSize: 13 }}>
              {savedMessage}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

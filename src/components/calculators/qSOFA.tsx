import { useEffect, useMemo, useRef, useState } from 'react';
import { MEDICAL_THEME, MEDICAL_TYPE } from '../../config/medicalTheme.constants';
import type { Patient, Vitals } from '../../types/emergency';
import { PatientFlag } from '../../types/emergency';
import { useEmergencyStore } from '../../store/emergencyStore';
import { dispatchScoreAlert } from '../../engine/alertEngine';
import { QSOFA_META } from '../../clinical-calculators/qsofa';
import { saveCalculatorResult } from './calculatorSave';
import './mobileCalculator.css';

type QSOFAProps = {
  patientId?: string;
  onClose: () => void;
};

type CriteriaKey = 'alteredMentation' | 'respiratoryRate' | 'systolicBp';

type CriteriaState = Record<CriteriaKey, boolean>;

const emptyCriteria: CriteriaState = {
  alteredMentation: false,
  respiratoryRate: false,
  systolicBp: false,
};

function criteriaFromVitals(vitals?: Vitals): CriteriaState {
  return {
    alteredMentation: vitals?.gcs !== undefined && vitals.gcs < 15,
    respiratoryRate: vitals?.rr !== undefined && vitals.rr >= 22,
    systolicBp: vitals?.sbp !== undefined && vitals.sbp <= 100,
  };
}

function resultFor(total: number) {
  if (total === 0) {
    return {
      band: 'Low risk',
      color: '#10B981',
      recommendation: 'Monitor and reassess',
      alert: false,
    };
  }

  if (total === 1) {
    return {
      band: 'Moderate',
      color: '#F59E0B',
      recommendation: 'Consider sepsis workup',
      alert: false,
    };
  }

  return {
    band: 'HIGH RISK',
    color: '#EF4444',
    recommendation: 'SEPSIS ALERT - High risk for organ dysfunction. Initiate sepsis bundle immediately',
    alert: true,
  };
}

function criteriaLabels(criteria: CriteriaState): string[] {
  const labels: string[] = [];
  if (criteria.alteredMentation) labels.push('altered mentation / GCS < 15');
  if (criteria.respiratoryRate) labels.push('RR >= 22');
  if (criteria.systolicBp) labels.push('SBP <= 100');
  return labels;
}

export default function QSOFA({ patientId, onClose }: QSOFAProps) {
  const patients = useEmergencyStore((state) => state.patients);
  const addFlag = useEmergencyStore((state) => state.addFlag);
  const patient = patientId ? patients.find((candidate) => candidate.id === patientId) : undefined;
  const firstVitals = patient?.vitals[0];
  const autoFilled = useMemo(() => criteriaFromVitals(firstVitals), [firstVitals]);
  const [criteria, setCriteria] = useState<CriteriaState>(patient ? autoFilled : emptyCriteria);
  const [savedMessage, setSavedMessage] = useState('');
  const alertCreatedRef = useRef(false);

  useEffect(() => {
    if (!patient) return;
    setCriteria(criteriaFromVitals(patient.vitals[0]));
    alertCreatedRef.current = false;
  }, [patient]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const total = useMemo(
    () => Object.values(criteria).reduce<number>((sum, value) => sum + (value ? 1 : 0), 0),
    [criteria],
  );
  const result = resultFor(total);
  const metLabels = useMemo(() => criteriaLabels(criteria), [criteria]);

  useEffect(() => {
    if (!patient || total < 2) {
      if (total < 2) alertCreatedRef.current = false;
      return;
    }

    if (!patient.flags.includes(PatientFlag.SepsisAlert)) {
      addFlag(patient.id, PatientFlag.SepsisAlert);
    }

    if (!alertCreatedRef.current) {
      dispatchScoreAlert({
        patient,
        scoreName: 'qSOFA',
        scoreValue: `${total}/3`,
        message: `qSOFA ${total}/3: ${metLabels.join(', ')}.`,
      });
      alertCreatedRef.current = true;
    }
  }, [addFlag, metLabels, patient, total]);

  const toggleCriteria = (key: CriteriaKey) => {
    setCriteria((previous) => ({ ...previous, [key]: !previous[key] }));
    setSavedMessage('');
  };

  const saveToPatient = () => {
    if (!patient) return;
    const saved = saveCalculatorResult({
      patientId: patient.id,
      scoreId: 'qsofa',
      scoreName: 'qSOFA',
      total,
      max: 3,
      band: result.band,
      fields: {
        ...criteria,
        criteriaMet: metLabels,
      },
      staffId: patient.assignedStaffId || undefined,
      critical: result.alert,
    });
    if (!saved) return;
    setSavedMessage('qSOFA score saved to patient.');
    onClose();
  };

  const renderToggle = ({
    keyName,
    label,
    current,
    autoFilledFromVitals,
  }: {
    keyName: CriteriaKey;
    label: string;
    current?: string;
    autoFilledFromVitals: boolean;
  }) => (
    <label
      className="clinical-calculator-modal__choice"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        border: criteria[keyName] ? '1px solid #0ea5e9' : '1px solid #e0f2fe',
        background: criteria[keyName] ? 'rgba(14, 165, 233, 0.12)' : MEDICAL_THEME.surfaceCard,
        borderRadius: 12,
        padding: 14,
        cursor: 'pointer',
      }}
    >
      <input
        type="checkbox"
        checked={criteria[keyName]}
        onChange={() => toggleCriteria(keyName)}
        style={{ width: 22, height: 22, accentColor: MEDICAL_THEME.accent }}
      />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <strong style={{ color: 'var(--medical-ink, #111827)', fontSize: 14 }}>{label}</strong>
        {current ? <span style={{ color: MEDICAL_THEME.inkSubtle, fontSize: 12 }}>{current}</span> : null}
        {autoFilledFromVitals ? (
          <span style={{ color: MEDICAL_THEME.accent, fontSize: 12, fontWeight: 700 }}>Auto-filled from vitals</span>
        ) : null}
      </span>
    </label>
  );

  return (
    <div
      className="clinical-calculator-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qsofa-title"
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
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: 16,
            borderBottom: '1px solid #e0f2fe',
          }}
        >
          <div>
            <h2 id="qsofa-title" style={{ margin: 0, fontSize: 18, fontWeight: 650 }}>
              qSOFA
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
            aria-label="Close qSOFA"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid #e0f2fe',
              background: 'transparent',
              color: 'var(--medical-ink, #111827)',
              cursor: 'pointer',
            }}
          >
            X
          </button>
        </header>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {renderToggle({
            keyName: 'alteredMentation',
            label: 'Altered mentation / GCS < 15',
            current: firstVitals?.gcs !== undefined ? `Current: ${firstVitals.gcs}` : undefined,
            autoFilledFromVitals: autoFilled.alteredMentation,
          })}
          {renderToggle({
            keyName: 'respiratoryRate',
            label: 'Respiratory rate ≥ 22 /min',
            current: firstVitals?.rr !== undefined ? `Current: ${firstVitals.rr}` : undefined,
            autoFilledFromVitals: autoFilled.respiratoryRate,
          })}
          {renderToggle({
            keyName: 'systolicBp',
            label: 'Systolic BP ≤ 100 mmHg',
            current: firstVitals?.sbp !== undefined ? `Current: ${firstVitals.sbp}` : undefined,
            autoFilledFromVitals: autoFilled.systolicBp,
          })}

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
            <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 32, marginTop: 4 }}>
              {total}/3
            </div>
            {result.alert ? (
              <div style={{ color: MEDICAL_TYPE.statusCritical, fontSize: 13, marginTop: 6, fontWeight: 700 }}>
                SEPSIS ALERT - High risk for organ dysfunction
                <br />
                Initiate sepsis bundle immediately
              </div>
            ) : (
              <div style={{ color: 'var(--medical-ink, #111827)', fontSize: 13, marginTop: 4 }}>{result.recommendation}</div>
            )}
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
            <div role="status" style={{ color: '#10B981', fontSize: 13 }}>
              {savedMessage}
            </div>
          ) : null}

          <p
            className="clinical-calculator-modal__disclaimer"
            style={{ margin: 0, fontSize: 12, color: MEDICAL_THEME.inkSubtle, lineHeight: 1.45 }}
          >
            {QSOFA_META.disclaimer}
            <br />
            <span style={{ fontStyle: 'italic' }}>Source: {QSOFA_META.sourceLabel}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

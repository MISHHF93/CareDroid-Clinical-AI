import { useEffect, useMemo, useRef, useState } from 'react';
import useModalDialog from '../../hooks/useModalDialog';
import { MEDICAL_THEME } from '../../config/medicalTheme.constants';
import type { Vitals } from '../../types/emergency';
import { PatientFlag } from '../../types/emergency';
import { useEmergencyStore } from '../../store/emergencyStore';
import { dispatchScoreAlert } from '../../engine/alertEngine';
import { QSOFA_META } from '../../clinical-calculators/qsofa';
import { saveCalculatorResult } from './calculatorSave';
import './mobileCalculator.css';
import './qSOFA.css';

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

export function criteriaFromVitals(vitals?: Vitals): CriteriaState {
  return {
    alteredMentation: vitals?.gcs !== undefined && vitals.gcs < 15,
    respiratoryRate: vitals?.rr !== undefined && vitals.rr >= 22,
    systolicBp: vitals?.sbp !== undefined && vitals.sbp <= 100,
  };
}

export function resultFor(total: number) {
  if (total === 0) {
    return {
      band: 'Low risk',
      color: MEDICAL_THEME.success,
      recommendation: 'Monitor and reassess',
      alert: false,
    };
  }

  if (total === 1) {
    return {
      band: 'Moderate',
      color: MEDICAL_THEME.warning,
      recommendation: 'Consider sepsis workup',
      alert: false,
    };
  }

  return {
    band: 'HIGH RISK',
    color: MEDICAL_THEME.danger,
    recommendation:
      'SEPSIS ALERT - High risk for organ dysfunction. Initiate sepsis bundle immediately',
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

  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape, Tab containment, initial focus, focus restore and scroll lock all come
  // from the shared hook: this dialog declares aria-modal="true" and previously had
  // none of the containment that claim promises.
  useModalDialog(dialogRef, { onClose });

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
        border: criteria[keyName] ? `1px solid ${MEDICAL_THEME.accent}` : '1px solid #e0f2fe',
        background: criteria[keyName] ? MEDICAL_THEME.accentTint : MEDICAL_THEME.surfaceCard,
        borderRadius: 12,
        padding: 14,
        cursor: 'pointer',
      }}
    >
      <input
        type="checkbox"
        checked={criteria[keyName]}
        onChange={() => toggleCriteria(keyName)}
        className="qsofa-checkbox"
      />
      <span className="u-flex-col-gap-5">
        <strong className="qsofa-toggle-label">{label}</strong>
        {current ? <span className="qsofa-toggle-current">{current}</span> : null}
        {autoFilledFromVitals ? (
          <span className="qsofa-toggle-autofilled">Auto-filled from vitals</span>
        ) : null}
      </span>
    </label>
  );

  return (
    <div
      className="clinical-calculator-modal u-modal-scrim"
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="qsofa-title"
    >
      <div className="clinical-calculator-modal__panel qsofa-panel">
        <header className="u-panel-header-row">
          <div>
            <h2 id="qsofa-title" className="u-title-18">
              qSOFA
            </h2>
            {patient ? (
              <div className="qsofa-patient-subtitle">
                {patient.firstName} {patient.lastName} · {patient.mrn}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close qSOFA"
            className="u-icon-btn-32"
          >
            X
          </button>
        </header>

        <div className="u-stack-14">
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
            <div className="u-mono-32">{total}/3</div>
            {result.alert ? (
              <div className="qsofa-sepsis-alert">
                SEPSIS ALERT - High risk for organ dysfunction
                <br />
                Initiate sepsis bundle immediately
              </div>
            ) : (
              <div className="qsofa-recommendation">{result.recommendation}</div>
            )}
          </section>

          {patient ? (
            <button
              className="clinical-calculator-modal__submit qsofa-save-btn"
              type="button"
              onClick={saveToPatient}
            >
              Save to Patient
            </button>
          ) : null}

          {savedMessage ? (
            <div role="status" className="qsofa-saved-message">
              {savedMessage}
            </div>
          ) : null}

          <p className="clinical-calculator-modal__disclaimer qsofa-disclaimer">
            {QSOFA_META.disclaimer}
            <br />
            <span className="qsofa-source">Source: {QSOFA_META.sourceLabel}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

import { useRef, useEffect, useMemo, useState } from 'react';
import useModalDialog from '../../hooks/useModalDialog';
import { MEDICAL_THEME, MEDICAL_TYPE } from '../../config/medicalTheme.constants';
import { saveCalculatorResult } from './calculatorSave';
import { useEmergencyStore } from '../../store/emergencyStore';
import './NIHSS.css';

type NIHSSProps = {
  patientId?: string;
  onClose: () => void;
};

type NIHSSOption = {
  score: number;
  text: string;
};

type NIHSSItem = {
  id: string;
  label: string;
  options: NIHSSOption[];
};

const motorArmOptions: NIHSSOption[] = [
  { score: 0, text: 'No drift' },
  { score: 1, text: 'Drift before 10 seconds' },
  { score: 2, text: 'Some effort against gravity' },
  { score: 3, text: 'No effort against gravity' },
  { score: 4, text: 'No movement' },
];

const motorLegOptions: NIHSSOption[] = [
  { score: 0, text: 'No drift for 5 seconds' },
  { score: 1, text: 'Drift before 5 seconds' },
  { score: 2, text: 'Some effort against gravity' },
  { score: 3, text: 'No effort against gravity' },
  { score: 4, text: 'No movement' },
];

export const NIHSS_ITEMS: NIHSSItem[] = [
  {
    id: 'loc',
    label: '1a. Level of Consciousness',
    options: [
      { score: 0, text: 'Alert, keenly responsive' },
      { score: 1, text: 'Not alert, arousable by minor stimulation' },
      { score: 2, text: 'Not alert, requires repeated stimulation' },
      { score: 3, text: 'Unresponsive, reflex only' },
    ],
  },
  {
    id: 'loc_q',
    label: '1b. LOC Questions (month + age)',
    options: [
      { score: 0, text: 'Answers both correctly' },
      { score: 1, text: 'Answers one correctly' },
      { score: 2, text: 'Answers neither correctly' },
    ],
  },
  {
    id: 'loc_cmd',
    label: '1c. LOC Commands (open/close eyes + grip)',
    options: [
      { score: 0, text: 'Performs both tasks' },
      { score: 1, text: 'Performs one task' },
      { score: 2, text: 'Performs neither' },
    ],
  },
  {
    id: 'gaze',
    label: '2. Best Gaze',
    options: [
      { score: 0, text: 'Normal' },
      { score: 1, text: 'Partial gaze palsy' },
      { score: 2, text: 'Forced deviation' },
    ],
  },
  {
    id: 'visual',
    label: '3. Visual Fields',
    options: [
      { score: 0, text: 'No visual loss' },
      { score: 1, text: 'Partial hemianopia' },
      { score: 2, text: 'Complete hemianopia' },
      { score: 3, text: 'Bilateral hemianopia' },
    ],
  },
  {
    id: 'facial',
    label: '4. Facial Palsy',
    options: [
      { score: 0, text: 'Normal symmetric movement' },
      { score: 1, text: 'Minor paralysis' },
      { score: 2, text: 'Partial paralysis' },
      { score: 3, text: 'Complete paralysis' },
    ],
  },
  {
    id: 'motor_l',
    label: '5a. Motor Arm — Left',
    options: motorArmOptions,
  },
  {
    id: 'motor_r',
    label: '5b. Motor Arm — Right',
    options: motorArmOptions,
  },
  {
    id: 'leg_l',
    label: '6a. Motor Leg — Left',
    options: motorLegOptions,
  },
  {
    id: 'leg_r',
    label: '6b. Motor Leg — Right',
    options: motorLegOptions,
  },
  {
    id: 'ataxia',
    label: '7. Limb Ataxia',
    options: [
      { score: 0, text: 'Absent' },
      { score: 1, text: 'Present in one limb' },
      { score: 2, text: 'Present in two limbs' },
    ],
  },
  {
    id: 'sensory',
    label: '8. Sensory',
    options: [
      { score: 0, text: 'Normal' },
      { score: 1, text: 'Mild to moderate loss' },
      { score: 2, text: 'Severe to total loss' },
    ],
  },
  {
    id: 'language',
    label: '9. Best Language',
    options: [
      { score: 0, text: 'Normal, no aphasia' },
      { score: 1, text: 'Mild to moderate aphasia' },
      { score: 2, text: 'Severe aphasia' },
      { score: 3, text: 'Mute or global aphasia' },
    ],
  },
  {
    id: 'dysarthria',
    label: '10. Dysarthria',
    options: [
      { score: 0, text: 'Normal' },
      { score: 1, text: 'Mild to moderate' },
      { score: 2, text: 'Severe, unintelligible' },
    ],
  },
  {
    id: 'extinction',
    label: '11. Extinction and Inattention',
    options: [
      { score: 0, text: 'No abnormality' },
      { score: 1, text: 'Inattention or extinction to bilateral stimulation in one modality' },
      { score: 2, text: 'Profound hemi-inattention or extinction to more than one modality' },
    ],
  },
];

type NIHSSScores = Record<string, number | undefined>;

export function severityFor(total: number) {
  if (total === 0) return { label: 'No stroke symptoms', color: MEDICAL_THEME.inkSubtle };
  if (total <= 4) return { label: 'Minor stroke', color: '#10B981' };
  if (total <= 15) return { label: 'Moderate stroke', color: '#F59E0B' };
  if (total <= 20) return { label: 'Moderate-severe stroke', color: '#F97316' };
  return { label: 'Severe stroke', color: '#EF4444' };
}

function patientName(patient?: { firstName?: string; lastName?: string; mrn?: string }): string {
  if (!patient) return 'Patient';
  return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.mrn || 'Patient';
}

function formatLkw(value: string): string {
  if (!value) return 'not documented';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'invalid';
  return date.toLocaleString([], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function elapsedSince(value: string, now: number): { label: string; outsideTpaWindow: boolean } {
  if (!value) return { label: '--:--', outsideTpaWindow: false };
  const lkwTime = new Date(value).getTime();
  if (!Number.isFinite(lkwTime)) return { label: '--:--', outsideTpaWindow: false };
  const diffMs = Math.max(0, now - lkwTime);
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return {
    label: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
    outsideTpaWindow: diffMs > 4.5 * 60 * 60 * 1000,
  };
}

export default function NIHSS({ patientId, onClose }: NIHSSProps) {
  const patients = useEmergencyStore((state) => state.patients);
  const patient = patientId ? patients.find((candidate) => candidate.id === patientId) : undefined;
  const [scores, setScores] = useState<NIHSSScores>({});
  const [lastKnownWell, setLastKnownWell] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape, Tab containment, initial focus, focus restore and scroll lock all come
  // from the shared hook: this dialog declares aria-modal="true" and previously had
  // none of the containment that claim promises.
  useModalDialog(dialogRef, { onClose });

  const total = useMemo(
    () => NIHSS_ITEMS.reduce((sum, item) => sum + (scores[item.id] ?? 0), 0),
    [scores],
  );
  const severity = severityFor(total);
  const lkwElapsed = elapsedSince(lastKnownWell, now);

  const saveToPatient = () => {
    if (!patient) return;
    const lkwFormatted = formatLkw(lastKnownWell);
    const saved = saveCalculatorResult({
      patientId: patient.id,
      scoreId: 'nihss',
      scoreName: 'NIHSS',
      total,
      max: 42,
      band: severity.label,
      recommendation: `LKW: ${lkwFormatted} (${lkwElapsed.label})`,
      fields: {
        scores,
        lastKnownWell,
        lastKnownWellFormatted: lkwFormatted,
        timeSinceLastKnownWell: lkwElapsed.label,
      },
      staffId: patient.assignedStaffId || undefined,
      critical: total >= 5,
    });
    if (!saved) return;
    setSavedMessage('NIHSS score saved to patient.');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nihss-title"
      className="u-modal-scrim"
      ref={dialogRef}
    >
      <div className="nihss-panel">
        <header className="u-panel-header-row">
          <div>
            <h2 id="nihss-title" className="u-title-18">
              NIHSS
            </h2>
            {patient ? (
              <div className="nihss-patient-subtitle">
                {patientName(patient)} · {patient.mrn}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close NIHSS"
            className="u-icon-btn-32"
          >
            X
          </button>
        </header>

        <div className="u-stack-14">
          <section
            style={{
              border: `1px solid ${lkwElapsed.outsideTpaWindow ? '#EF4444' : '#F59E0B'}`,
              background: lkwElapsed.outsideTpaWindow ? '#7F1D1D66' : '#78350F66',
              borderRadius: 12,
              padding: 14,
            }}
          >
            <strong className="nihss-lkw-heading">
              ⏱ Document time of symptom onset or last known well
            </strong>
            <label className="nihss-lkw-label">
              Last Known Well time
              <input
                type="datetime-local"
                value={lastKnownWell}
                onChange={(event) => {
                  setLastKnownWell(event.target.value);
                  setSavedMessage('');
                }}
                className="nihss-lkw-input"
              />
            </label>
            <div
              aria-live="polite"
              style={{
                color: lkwElapsed.outsideTpaWindow ? MEDICAL_TYPE.statusCritical : '#FDE68A',
                fontSize: 13,
                marginTop: 8,
                fontWeight: 700,
              }}
            >
              Time since LKW: {lkwElapsed.label}
              {lkwElapsed.outsideTpaWindow ? ' · outside tPA window' : ''}
            </div>
          </section>

          <section
            aria-live="polite"
            style={{
              border: `1px solid ${severity.color}`,
              background: `${severity.color}1F`,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <div style={{ color: severity.color, fontSize: 13, fontWeight: 700 }}>
              {severity.label}
            </div>
            <div className="u-mono-32">{total}/42</div>
          </section>

          {NIHSS_ITEMS.map((item) => (
            <fieldset key={item.id} className="nihss-item-fieldset">
              <legend className="nihss-item-legend">{item.label}</legend>
              <div className="nihss-options">
                {item.options.map((option) => (
                  <label
                    key={`${item.id}-${option.score}-${option.text}`}
                    className="nihss-option-label"
                  >
                    <input
                      type="radio"
                      name={`nihss-${item.id}`}
                      value={option.score}
                      checked={scores[item.id] === option.score}
                      onChange={() => {
                        setScores((previous) => ({ ...previous, [item.id]: option.score }));
                        setSavedMessage('');
                      }}
                    />
                    <span>
                      {option.score} - {option.text}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          {patient ? (
            <button type="button" onClick={saveToPatient} className="nihss-save-btn">
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

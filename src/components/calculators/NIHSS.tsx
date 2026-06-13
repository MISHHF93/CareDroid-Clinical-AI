import { useEffect, useMemo, useState } from 'react';
import { dispatchAlert } from '../../engine/alertEngine';
import { useEmergencyStore } from '../../store/emergencyStore';

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

function severityFor(total: number) {
  if (total === 0) return { label: 'No stroke symptoms', color: '#9CA3AF' };
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const total = useMemo(
    () => NIHSS_ITEMS.reduce((sum, item) => sum + (scores[item.id] ?? 0), 0),
    [scores],
  );
  const severity = severityFor(total);
  const lkwElapsed = elapsedSince(lastKnownWell, now);

  const saveToPatient = () => {
    if (!patient) return;
    const store = useEmergencyStore.getState();
    const staffId = patient.assignedStaffId || store.activeShift.chargeStaffId || store.staff[0]?.id || 'system';
    const lkwFormatted = formatLkw(lastKnownWell);
    const noteText = `NIHSS: ${total}/42 — ${severity.label}. LKW: ${lkwFormatted}`;
    const detailText = `NIHSS fields: ${JSON.stringify({
      scores,
      lastKnownWell,
      lastKnownWellFormatted: lkwFormatted,
      timeSinceLastKnownWell: lkwElapsed.label,
    })}`;

    store.addNote(patient.id, noteText, staffId);
    store.addNote(patient.id, detailText, staffId);

    if (total >= 5) {
      dispatchAlert({
        severity: 'Warning',
        title: `Significant NIHSS — ${patientName(patient)}`,
        message: `Score ${total}/42 — ${severity.label}`,
        patientId: patient.id,
        source: 'clinical-calculator-hub',
        metadata: {
          calculator: 'NIHSS',
          total: String(total),
          max: '42',
          band: severity.label,
          lastKnownWell: lkwFormatted,
        },
      });
    }

    setSavedMessage('NIHSS score saved to patient.');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nihss-title"
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
          maxWidth: 760,
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
            <h2 id="nihss-title" style={{ margin: 0, fontSize: 18, fontWeight: 650 }}>
              NIHSS
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
            aria-label="Close NIHSS"
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
          <section
            style={{
              border: `1px solid ${lkwElapsed.outsideTpaWindow ? '#EF4444' : '#F59E0B'}`,
              background: lkwElapsed.outsideTpaWindow ? '#7F1D1D66' : '#78350F66',
              borderRadius: 12,
              padding: 14,
            }}
          >
            <strong style={{ display: 'block', marginBottom: 10 }}>
              ⏱ Document time of symptom onset or last known well
            </strong>
            <label style={{ display: 'grid', gap: 6, color: '#D1D5DB', fontSize: 13 }}>
              Last Known Well time
              <input
                type="datetime-local"
                value={lastKnownWell}
                onChange={(event) => {
                  setLastKnownWell(event.target.value);
                  setSavedMessage('');
                }}
                style={{
                  border: '1px solid #374151',
                  borderRadius: 8,
                  background: '#020617',
                  color: '#F9FAFB',
                  padding: 10,
                }}
              />
            </label>
            <div
              aria-live="polite"
              style={{
                color: lkwElapsed.outsideTpaWindow ? '#FCA5A5' : '#FDE68A',
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
            <div style={{ color: severity.color, fontSize: 13, fontWeight: 700 }}>{severity.label}</div>
            <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 32, marginTop: 4 }}>
              {total}/42
            </div>
          </section>

          {NIHSS_ITEMS.map((item) => (
            <fieldset
              key={item.id}
              style={{
                border: '1px solid #1F2937',
                borderRadius: 10,
                padding: 12,
                margin: 0,
              }}
            >
              <legend style={{ color: '#F9FAFB', fontSize: 14, fontWeight: 700, padding: '0 4px' }}>
                {item.label}
              </legend>
              <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                {item.options.map((option) => (
                  <label
                    key={`${item.id}-${option.score}-${option.text}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: '#D1D5DB',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
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

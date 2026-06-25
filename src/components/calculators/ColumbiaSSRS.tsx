import { useEffect, useMemo, useRef, useState } from 'react';
import { MEDICAL_THEME, MEDICAL_TYPE } from '../../config/medicalTheme.constants';
import { dispatchAlert } from '../../engine/alertEngine';
import { saveCalculatorResult } from './calculatorSave';
import { useEmergencyStore } from '../../store/emergencyStore';
import { PatientFlag } from '../../types/emergency';

type ColumbiaSSRSProps = {
  patientId?: string;
  onClose: () => void;
};

type Answer = 'yes' | 'no';
type AnswerMap = Record<string, Answer | undefined>;
type RiskLevel = 'HIGH' | 'MODERATE' | 'LOW' | 'NONE_REPORTED';

export const IDEATION = [
  {
    id: 'q1',
    question: '1. Wish to be dead — Have you wished you were dead or wished you could go to sleep and not wake up?',
    stopIfNo: false,
  },
  {
    id: 'q2',
    question: '2. Suicidal ideation — Have you had any actual thoughts of killing yourself?',
    stopIfNo: true,
  },
  {
    id: 'q3',
    question: '3. Suicidal ideation with method — Have you been thinking about how you might kill yourself?',
    stopIfNo: true,
  },
  {
    id: 'q4',
    question: '4. Suicidal ideation with intent — Have you had these thoughts and had some intention of acting on them?',
    stopIfNo: true,
  },
  {
    id: 'q5',
    question:
      '5. Suicidal ideation with plan — Have you started to work out or worked out the details of how to kill yourself? Do you intend to carry out this plan?',
    stopIfNo: false,
  },
];

export const BEHAVIOR = {
  id: 'q6',
  question:
    '6. Have you done anything, started to do anything, or prepared to do anything to end your life in the past 3 months?',
  examples:
    'Examples: stockpiling pills, obtaining a weapon, giving away valuables, going to a location to jump',
};

export function classifyRisk(answers: AnswerMap): RiskLevel {
  if (answers.q6 === 'yes') return 'HIGH';
  if (answers.q5 === 'yes') return 'HIGH';
  if (answers.q4 === 'yes') return 'HIGH';
  if (answers.q3 === 'yes') return 'MODERATE';
  if (answers.q2 === 'yes') return 'MODERATE';
  if (answers.q1 === 'yes') return 'LOW';
  return 'NONE_REPORTED';
}

const RISK_DISPLAY: Record<RiskLevel, { color: string; background: string; label: string }> = {
  HIGH: {
    color: MEDICAL_TYPE.statusCritical,
    background: '#7F1D1D66',
    label: 'HIGH RISK — Immediate psychiatric consultation required. Do not leave patient alone.',
  },
  MODERATE: {
    color: '#FDBA74',
    background: '#7C2D1266',
    label: 'MODERATE RISK — Physician review required. Safety planning recommended.',
  },
  LOW: {
    color: '#FDE68A',
    background: '#78350F66',
    label: 'LOW RISK — Monitor and reassess. Document safety planning discussion.',
  },
  NONE_REPORTED: {
    color: '#86EFAC',
    background: '#14532D66',
    label: 'No suicidal ideation reported at this time.',
  },
};

function patientName(patient?: { firstName?: string; lastName?: string; mrn?: string }): string {
  if (!patient) return 'Patient';
  return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.mrn || 'Patient';
}

function ideationSummary(answers: AnswerMap): string {
  const answered = IDEATION.filter((item) => answers[item.id]).map(
    (item) => `${item.question.split(' — ')[0]}: ${answers[item.id]?.toUpperCase()}`,
  );
  return answered.length ? answered.join(', ') : 'not completed';
}

function shouldStopIdeation(item: { id: string; stopIfNo: boolean }, answer?: Answer): boolean {
  if (answer !== 'no') return false;
  return item.id === 'q1' || item.stopIfNo;
}

function visibleIdeationItems(answers: AnswerMap) {
  const visible = [];
  for (const item of IDEATION) {
    visible.push(item);
    if (!answers[item.id]) break;
    if (shouldStopIdeation(item, answers[item.id])) break;
  }
  return visible;
}

function getStaffId(patient: { assignedStaffId?: string | null } | undefined): string {
  const store = useEmergencyStore.getState();
  return patient?.assignedStaffId || store.activeShift.chargeStaffId || store.staff[0]?.id || 'system';
}

function AnswerButtons({
  label,
  value,
  onAnswer,
}: {
  label: string;
  value?: Answer;
  onAnswer: (answer: Answer) => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginTop: 12 }}>
      {(['yes', 'no'] as Answer[]).map((answer) => (
        <button
          key={answer}
          type="button"
          aria-pressed={value === answer}
          aria-label={`${label} ${answer.toUpperCase()}`}
          onClick={() => onAnswer(answer)}
          style={{
            width: '100%',
            border: value === answer ? '1px solid #0ea5e9' : '1px solid #e0f2fe',
            background: value === answer ? '#1D4ED84D' : '#f0f9ff',
            color: 'var(--medical-ink, #111827)',
            borderRadius: 10,
            padding: '14px 16px',
            cursor: 'pointer',
            fontWeight: 800,
            letterSpacing: 0.5,
          }}
        >
          {answer.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export default function ColumbiaSSRS({ patientId, onClose }: ColumbiaSSRSProps) {
  const patients = useEmergencyStore((state) => state.patients);
  const patient = patientId ? patients.find((candidate) => candidate.id === patientId) : undefined;
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [confirmingSave, setConfirmingSave] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const alertedRiskRef = useRef<string>('');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const risk = useMemo(() => classifyRisk(answers), [answers]);
  const riskDisplay = RISK_DISPLAY[risk];
  const visibleItems = useMemo(() => visibleIdeationItems(answers), [answers]);
  const ideationStopped = visibleItems.length < IDEATION.length && visibleItems.some((item) => shouldStopIdeation(item, answers[item.id]));

  useEffect(() => {
    if (!patientId || !patient || (risk !== 'HIGH' && risk !== 'MODERATE')) return;
    const alertKey = `${patientId}-${risk}`;
    if (alertedRiskRef.current === alertKey) return;

    dispatchAlert({
      severity: 'Critical',
      title: `Suicide Risk Assessment — ${patientName(patient)}`,
      message: `${risk} risk identified. Physician review required.`,
      patientId,
      source: 'columbia-ssrs',
      metadata: { risk },
    });
    useEmergencyStore.getState().addFlag(patientId, PatientFlag.PsychAlert, {
      severity: 'Critical',
      title: 'Psychiatric safety alert',
      message: `${risk} suicide risk identified by Columbia SSR Scale.`,
      source: 'columbia-ssrs',
    });
    alertedRiskRef.current = alertKey;
  }, [patient, patientId, risk]);

  const answerQuestion = (id: string, answer: Answer) => {
    setAnswers((previous) => {
      const next = { ...previous, [id]: answer };
      const itemIndex = IDEATION.findIndex((item) => item.id === id);
      const item = IDEATION[itemIndex];
      if (item && shouldStopIdeation(item, answer)) {
        for (const remaining of IDEATION.slice(itemIndex + 1)) {
          delete next[remaining.id];
        }
      }
      return next;
    });
    setConfirmingSave(false);
    setSavedMessage('');
  };

  const saveAndAlert = () => {
    if (!patientId || !patient) return;
    const q6Answer = answers.q6 ? answers.q6.toUpperCase() : 'NOT ANSWERED';
    const yesCount = [...IDEATION, BEHAVIOR]
      .map((item) => answers[item.id])
      .filter((answer) => answer === 'yes').length;

    const saved = saveCalculatorResult({
      patientId,
      scoreId: 'columbia-suicide-severity-workflow',
      scoreName: 'Columbia SSR Scale',
      total: yesCount,
      max: 6,
      band: `${risk} risk`,
      recommendation: `Ideation: ${ideationSummary(answers)}. Behavior past 3 months: ${q6Answer}.`,
      fields: {
        answers,
        risk,
        ideationSummary: ideationSummary(answers),
        behaviorPast3Months: q6Answer,
      },
      staffId: getStaffId(patient),
      critical: risk === 'HIGH',
    });
    if (!saved) return;
    setSavedMessage('Columbia SSR Scale saved to patient.');
    setConfirmingSave(false);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cssrs-title"
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
            <h2 id="cssrs-title" style={{ margin: 0, fontSize: 18, fontWeight: 650 }}>
              Columbia Suicide Severity Rating Scale
            </h2>
            {patient ? (
              <div style={{ color: MEDICAL_THEME.inkSubtle, fontSize: 12, marginTop: 4 }}>
                {patientName(patient)} · {patient.mrn}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Columbia SSR Scale"
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
          <section
            style={{
              background: '#f0f9ff',
              border: '1px solid #e0f2fe',
              borderRadius: 12,
              padding: 14,
              color: '#E5E7EB',
              lineHeight: 1.5,
            }}
          >
            This tool is a clinical aid. It does not replace clinical judgment. All results require immediate physician review.
          </section>

          <section>
            <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Ideation Section</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              {visibleItems.map((item) => (
                <section key={item.id} style={{ border: '1px solid #e0f2fe', borderRadius: 12, padding: 14 }}>
                  <strong style={{ display: 'block', color: 'var(--medical-ink, #111827)', lineHeight: 1.45 }}>{item.question}</strong>
                  <AnswerButtons
                    label={item.id}
                    value={answers[item.id]}
                    onAnswer={(answer) => answerQuestion(item.id, answer)}
                  />
                </section>
              ))}
              {ideationStopped ? (
                <div role="status" style={{ color: '#38bdf8', fontSize: 13, fontWeight: 700 }}>
                  Ideation section complete
                </div>
              ) : null}
            </div>
          </section>

          <section style={{ border: '1px solid #e0f2fe', borderRadius: 12, padding: 14 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Behavior Section</h3>
            <strong style={{ display: 'block', color: 'var(--medical-ink, #111827)', lineHeight: 1.45 }}>{BEHAVIOR.question}</strong>
            <p style={{ margin: '8px 0 0', color: MEDICAL_THEME.inkSubtle, fontSize: 13 }}>{BEHAVIOR.examples}</p>
            <AnswerButtons
              label={BEHAVIOR.id}
              value={answers.q6}
              onAnswer={(answer) => answerQuestion(BEHAVIOR.id, answer)}
            />
          </section>

          <section
            aria-live="polite"
            style={{
              border: `1px solid ${riskDisplay.color}`,
              background: riskDisplay.background,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <div style={{ color: riskDisplay.color, fontSize: 14, fontWeight: 800 }}>{riskDisplay.label}</div>
          </section>

          {patient ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {confirmingSave ? (
                <section
                  role="alertdialog"
                  aria-label="Confirm Columbia SSR Scale save"
                  style={{ border: '1px solid #F97316', borderRadius: 12, padding: 14, background: '#7C2D1266' }}
                >
                  <p style={{ margin: '0 0 12px', color: 'var(--medical-ink, #111827)', fontWeight: 700 }}>
                    Saving this score will alert the clinical team. Continue?
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button
                      type="button"
                      onClick={saveAndAlert}
                      style={{
                        border: 'none',
                        borderRadius: 10,
                        background: '#DC2626',
                        color: 'var(--medical-ink, #111827)',
                        padding: '10px 12px',
                        cursor: 'pointer',
                        fontWeight: 800,
                      }}
                    >
                      Save and Alert
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingSave(false)}
                      style={{
                        border: '1px solid #e0f2fe',
                        borderRadius: 10,
                        background: 'transparent',
                        color: 'var(--medical-ink, #111827)',
                        padding: '10px 12px',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </section>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingSave(true)}
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
              )}
            </div>
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

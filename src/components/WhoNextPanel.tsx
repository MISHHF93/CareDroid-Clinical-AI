import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { MEDICAL_THEME } from '../config/medicalTheme.constants';
import { EMPTY_STATE_COPY } from '../config/emptyStateCopy';
import OperationalEmptyState from './ui/OperationalEmptyState';
import { useEmergencyStore } from '../store/emergencyStore';
import { Patient, PatientFlag, PatientState, Priority, Room } from '../types/emergency';
import { hasPatientFlag, patientFlags } from '../utils/patientVitals';

export const CURRENT_STAFF_ID = 'current-staff';
export const WHO_NEXT_REFRESH_MS = 30_000;
export const WHO_NEXT_SNOOZE_TTL_MS = 15 * 60_000;
export const WHO_NEXT_MATERIAL_SCORE_INCREASE = 25;

const CRITICAL_SNOOZE_FLAGS = [
  PatientFlag.DeteriorationRisk,
  PatientFlag.HighRisk,
  PatientFlag.SepsisAlert,
  PatientFlag.ReassessmentDue,
] as const;

type WhoNextMode = 'detail' | 'floating';

export type SnoozedPatient = {
  patientId: string;
  snoozedAt: number;
  scoreAtSnooze: number;
  flagsAtSnooze: PatientFlag[];
};

export type WhoNextRecommendation = {
  patient: Patient;
  score: number;
  waitMins: number;
  reasons: string[];
  reason: string;
  detailParts: string[];
};

type ReasonFactor = {
  label: string;
  weight: number;
};

type WhoNextPanelProps = {
  mode?: WhoNextMode;
};

const priorityScore: Record<Priority, number> = {
  [Priority.P1]: 50,
  [Priority.P2]: 30,
  [Priority.P3]: 15,
  [Priority.P4]: 5,
  [Priority.P5]: 0,
};

function waitMinutes(patient: Patient, now: number): number {
  return (now - new Date(patient.arrivalTime).getTime()) / 60000;
}

function displayWaitMinutes(patient: Patient, now: number): number {
  const waitMins = waitMinutes(patient, now);
  return Number.isFinite(waitMins) ? Math.max(0, Math.round(waitMins)) : 0;
}

export function hasRunProtocolScores(patient: Patient, now = Date.now()): boolean {
  const hour4 = now - 4 * 3600000;
  return patient.notes.some((note) => {
    const timestamp = note.timestamp || note.createdAt;
    const text = note.text || note.body || '';
    return (
      timestamp !== undefined &&
      timestamp > new Date(hour4).toISOString() &&
      (text.includes('HEART') || text.includes('qSOFA') || text.includes('NIHSS'))
    );
  });
}

export function scorePatient(patient: Patient, now: number): number {
  let score = 0;
  const waitMins = waitMinutes(patient, now);
  score += priorityScore[patient.priority] || 0;
  if (waitMins > 45) score += 20 + (waitMins - 45) * 0.5;
  if (hasPatientFlag(patient, PatientFlag.ReassessmentDue)) score += 25;
  if (hasPatientFlag(patient, PatientFlag.DeteriorationRisk)) score += 35;
  if (hasPatientFlag(patient, PatientFlag.HighRisk)) score += 30;
  if (hasPatientFlag(patient, PatientFlag.SepsisAlert)) score += 40;
  if (!hasRunProtocolScores(patient, now)) score += 15;
  return score;
}

export function getReasonFactors(patient: Patient, now: number): ReasonFactor[] {
  const factors: ReasonFactor[] = [];
  const waitMins = waitMinutes(patient, now);
  const priorityWeight = priorityScore[patient.priority] || 0;

  if (priorityWeight > 0) factors.push({ label: `${patient.priority} priority`, weight: priorityWeight });
  if (waitMins > 45) {
    factors.push({
      label: `Wait ${displayWaitMinutes(patient, now)}min`,
      weight: 20 + (waitMins - 45) * 0.5,
    });
  }
  if (hasPatientFlag(patient, PatientFlag.ReassessmentDue)) {
    factors.push({ label: 'Reassessment due', weight: 25 });
  }
  if (hasPatientFlag(patient, PatientFlag.DeteriorationRisk)) {
    factors.push({ label: 'Deterioration risk', weight: 35 });
  }
  if (hasPatientFlag(patient, PatientFlag.HighRisk)) {
    factors.push({ label: 'High risk', weight: 30 });
  }
  if (hasPatientFlag(patient, PatientFlag.SepsisAlert)) {
    factors.push({ label: 'Sepsis alert', weight: 40 });
  }
  if (!hasRunProtocolScores(patient, now)) {
    factors.push({ label: 'Score overdue', weight: 15 });
  }

  return factors.sort((a, b) => b.weight - a.weight);
}

export function hasSnoozeBreakingDeterioration(patient: Patient, snooze: SnoozedPatient, now: number): boolean {
  const flagsAtSnooze = new Set(snooze.flagsAtSnooze);
  const hasNewCriticalFlag = CRITICAL_SNOOZE_FLAGS.some(
    (flag) => hasPatientFlag(patient, flag) && !flagsAtSnooze.has(flag),
  );
  const scoreIncrease = scorePatient(patient, now) - snooze.scoreAtSnooze;
  const hasCriticalFlag = CRITICAL_SNOOZE_FLAGS.some((flag) => hasPatientFlag(patient, flag));

  return hasNewCriticalFlag || (hasCriticalFlag && scoreIncrease >= WHO_NEXT_MATERIAL_SCORE_INCREASE);
}

export function isSnoozeActive(patient: Patient, snooze: SnoozedPatient, now: number): boolean {
  const withinTtl = now - snooze.snoozedAt < WHO_NEXT_SNOOZE_TTL_MS;
  return withinTtl && !hasSnoozeBreakingDeterioration(patient, snooze, now);
}

export function getAssignedPatients(patients: Patient[]): Patient[] {
  return patients.filter(
    (patient) =>
      patient.assignedStaffId === CURRENT_STAFF_ID &&
      ![PatientState.Discharge, PatientState.Admission].includes(patient.state),
  );
}

export function buildWhoNextRecommendation(
  patients: Patient[],
  snoozedPatients: SnoozedPatient[],
  now: number,
): WhoNextRecommendation | null {
  const snoozesByPatientId = new Map(snoozedPatients.map((snooze) => [snooze.patientId, snooze]));
  const candidates = getAssignedPatients(patients)
    .filter((patient) => {
      const snooze = snoozesByPatientId.get(patient.id);
      return !snooze || !isSnoozeActive(patient, snooze, now);
    })
    .map((patient) => ({
      patient,
      score: scorePatient(patient, now),
      waitMins: displayWaitMinutes(patient, now),
      reasons: getReasonFactors(patient, now).slice(0, 2).map((factor) => factor.label),
    }))
    .sort((a, b) => b.score - a.score);

  const recommendation = candidates[0];
  if (!recommendation) return null;

  const detailParts = [
    recommendation.patient.priority,
    `Wait ${recommendation.waitMins}min`,
    !hasRunProtocolScores(recommendation.patient, now) ? 'Score overdue' : null,
  ].filter((part): part is string => Boolean(part));

  return {
    ...recommendation,
    reason: recommendation.reasons.join(' · '),
    detailParts,
  };
}

function patientName(patient: Patient): string {
  return `${patient.firstName} ${patient.lastName}`.trim() || patient.name || patient.id;
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function patientLocation(patient: Patient, rooms: Room[]): string {
  if (patient.location) return patient.location;
  const roomName = rooms.find((room) => room.id === patient.roomId)?.name;
  if (roomName) return roomName;
  if (patient.roomId) return patient.roomId.toUpperCase();
  return 'Bed pending';
}

function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
}

const buttonStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 9,
  background: '#f0f9ff',
  color: 'var(--medical-ink, #111827)',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 700,
  padding: '7px 9px',
};

export default function WhoNextPanel({ mode = 'detail' }: WhoNextPanelProps) {
  const patients = useEmergencyStore((store) => store.patients);
  const rooms = useEmergencyStore((store) => store.rooms);
  const selectPatient = useEmergencyStore((store) => store.selectPatient);
  const [now, setNow] = useState(() => Date.now());
  const [visible, setVisible] = useState(true);
  const [pinned, setPinned] = useState(false);
  const [snoozedPatients, setSnoozedPatients] = useState<SnoozedPatient[]>([]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), WHO_NEXT_REFRESH_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (mode !== 'floating') return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'w' || event.altKey || event.ctrlKey || event.metaKey || isTextEntryTarget(event.target)) {
        return;
      }
      event.preventDefault();
      setVisible((current) => (pinned ? true : !current));
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mode, pinned]);

  useEffect(() => {
    setSnoozedPatients((current) => {
      const active = current.filter((snooze) => {
        const patient = patients.find((candidate) => candidate.id === snooze.patientId);
        return patient && isSnoozeActive(patient, snooze, now);
      });
      return active.length === current.length ? current : active;
    });
  }, [now, patients]);

  const assignedPatients = useMemo(() => getAssignedPatients(patients), [patients]);
  const recommendation = useMemo(
    () => buildWhoNextRecommendation(patients, snoozedPatients, now),
    [now, patients, snoozedPatients],
  );

  if (!visible) return null;

  const containerStyle: CSSProperties =
    mode === 'floating'
      ? {
          position: 'fixed',
          right: 400,
          bottom: 24,
          width: 280,
          zIndex: 330,
        }
      : {
          width: '100%',
        };

  const closePanel = () => {
    setPinned(false);
    setVisible(false);
  };

  const skipPatient = () => {
    if (!recommendation) return;
    const { patient, score } = recommendation;
    setSnoozedPatients((current) => [
      ...current.filter((snooze) => snooze.patientId !== patient.id),
      {
        patientId: patient.id,
        snoozedAt: now,
        scoreAtSnooze: score,
        flagsAtSnooze: [...patientFlags(patient)],
      },
    ]);
  };

  const openReassessment = () => {
    if (!recommendation) return;
    selectPatient(recommendation.patient.id);
    document.dispatchEvent(new Event('open-reassessment-drawer'));
  };

  const recommendationNeedsReassessment = recommendation
    ? hasPatientFlag(recommendation.patient, PatientFlag.ReassessmentDue)
    : false;

  return (
    <aside style={containerStyle} aria-label="See next patient recommendation">
      <div
        style={{
          background: MEDICAL_THEME.surfaceCard,
          border: pinned ? '1px solid #0ea5e9' : '1px solid #e0f2fe',
          borderLeft: '4px solid #0ea5e9',
          borderRadius: 12,
          boxShadow: mode === 'floating' ? '0 18px 48px rgba(0,0,0,0.38)' : 'none',
          color: 'var(--medical-ink, #111827)',
          padding: 12,
        }}
      >
        <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <strong style={{ color: '#38bdf8', fontSize: 11, letterSpacing: '0.12em' }}>SEE NEXT</strong>
          <div style={{ display: 'flex', gap: 6 }}>
            {pinned ? (<button
              type="button"
              aria-pressed="true"
              onClick={() => setPinned((current) => !current)}
              style={{
                ...buttonStyle,
                background: pinned ? '#0284c7' : '#f0f9ff',
                color: pinned ? MEDICAL_THEME.onAccent : MEDICAL_THEME.accent,
                padding: '5px 8px',
              }}
            >
              {pinned ? 'Pinned' : 'Pin'}
            </button>) : (<button
              type="button"
              aria-pressed="false"
              onClick={() => setPinned((current) => !current)}
              style={{
                ...buttonStyle,
                background: pinned ? '#0284c7' : '#f0f9ff',
                color: pinned ? MEDICAL_THEME.onAccent : MEDICAL_THEME.accent,
                padding: '5px 8px',
              }}
            >
              {pinned ? 'Pinned' : 'Pin'}
            </button>)}
            <button
              type="button"
              aria-label="Close see next panel"
              onClick={closePanel}
              style={{
                ...buttonStyle,
                color: MEDICAL_THEME.inkSubtle,
                padding: '5px 8px',
              }}
            >
              ×
            </button>
          </div>
        </div>

        {recommendation ? (
          <>
            <div style={{ color: 'var(--medical-ink, #111827)', fontSize: 14, fontWeight: 700, marginTop: 10 }}>
              {patientName(recommendation.patient)} · {patientLocation(recommendation.patient, rooms)} ·{' '}
              {truncate(recommendation.patient.chiefComplaint, 36)}
            </div>
            <div style={{ color: MEDICAL_THEME.inkSubtle, fontSize: 12, marginTop: 5 }}>
              {recommendation.detailParts.join(' · ')}
            </div>
            <div style={{ color: MEDICAL_THEME.accent, fontSize: 12, fontWeight: 700, marginTop: 6 }}>
              {recommendation.reason || 'Assigned patient needs review'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: recommendationNeedsReassessment ? '1fr 1fr' : '1fr 1fr', gap: 8, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => selectPatient(recommendation.patient.id)}
                style={{ ...buttonStyle, background: MEDICAL_THEME.accent, borderColor: MEDICAL_THEME.accent }}
              >
                Go to Patient
              </button>
              {recommendationNeedsReassessment ? (
                <button
                  type="button"
                  onClick={openReassessment}
                  style={{
                    ...buttonStyle,
                    background: 'color-mix(in srgb, #F59E0B 18%, #f0f9ff)',
                    borderColor: '#F59E0B',
                    color: '#FDE68A',
                  }}
                >
                  Reassess now
                </button>
              ) : (
                <button type="button" onClick={skipPatient} style={buttonStyle}>
                  Skip — next
                </button>
              )}
            </div>
            {recommendationNeedsReassessment ? (
              <button type="button" onClick={skipPatient} style={{ ...buttonStyle, marginTop: 8, width: '100%' }}>
                Skip — next
              </button>
            ) : null}
          </>
        ) : (
          <OperationalEmptyState
            size="inline"
            icon="◎"
            title={
              assignedPatients.length
                ? EMPTY_STATE_COPY.whoNext.snoozed.title
                : EMPTY_STATE_COPY.whoNext.unassigned.title
            }
            guidance={
              assignedPatients.length
                ? EMPTY_STATE_COPY.whoNext.snoozed.guidance
                : EMPTY_STATE_COPY.whoNext.unassigned.guidance
            }
            status={assignedPatients.length ? EMPTY_STATE_COPY.whoNext.snoozed.status : undefined}
            nextSteps={
              assignedPatients.length
                ? EMPTY_STATE_COPY.whoNext.snoozed.nextSteps
                : EMPTY_STATE_COPY.whoNext.unassigned.nextSteps
            }
          />
        )}
      </div>
    </aside>
  );
}

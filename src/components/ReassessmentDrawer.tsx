import { useEffect, useMemo, useRef, useState } from 'react';
import { PatientFlag, type Note, type Patient, type Room } from '../types/emergency';
import { useEmergencyStore } from '../store/emergencyStore';
import { OPERATIONAL_AUDIT_DOMAIN } from '../config/operationalAuditModel';
import { collectReassessmentAttentionPatients } from '../services/reassessmentAttentionPatients';
import OperationalHistoryPanel from './audit/OperationalHistoryPanel';
import './ReassessmentDrawer.css';

export type ReassessmentSortMode = 'severity' | 'wait';

export const REASSESSMENT_ATTENTION_FLAGS = [
  PatientFlag.DeteriorationRisk,
  PatientFlag.SepsisAlert,
  PatientFlag.HighRisk,
  PatientFlag.ReassessmentDue,
  PatientFlag.ScoreReassessmentRecommended,
] as const;

export type ReassessmentAttentionFlag = (typeof REASSESSMENT_ATTENTION_FLAGS)[number];

type FlagRecordLike = {
  type?: unknown;
  reason?: unknown;
  detectedAt?: unknown;
  flaggedAt?: unknown;
  timestamp?: unknown;
  createdAt?: unknown;
};

type TimestampInfo = {
  timestamp: string;
  source: string;
  exact: boolean;
};

const FLAG_COPY: Record<
  ReassessmentAttentionFlag,
  { label: string; icon: string; tone: 'red' | 'orange' | 'yellow'; rowClass: string }
> = {
  [PatientFlag.DeteriorationRisk]: {
    label: 'Deterioration Risk',
    icon: '!',
    tone: 'red',
    rowClass: 'deterioration',
  },
  [PatientFlag.SepsisAlert]: {
    label: 'Sepsis Alert',
    icon: 'S',
    tone: 'red',
    rowClass: 'sepsis',
  },
  [PatientFlag.HighRisk]: {
    label: 'High Risk',
    icon: 'H',
    tone: 'orange',
    rowClass: 'high-risk',
  },
  [PatientFlag.ReassessmentDue]: {
    label: 'Reassessment Due',
    icon: 'R',
    tone: 'yellow',
    rowClass: 'reassessment-due',
  },
  [PatientFlag.ScoreReassessmentRecommended]: {
    label: 'Score reassessment recommended',
    icon: 'S',
    tone: 'yellow',
    rowClass: 'score-reassessment',
  },
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeFlagType(flag: unknown): string | null {
  if (isObject(flag) && 'type' in flag) {
    return typeof flag.type === 'string' ? flag.type : null;
  }

  return typeof flag === 'string' ? flag : null;
}

function isReassessmentAttentionFlag(value: unknown): value is ReassessmentAttentionFlag {
  return REASSESSMENT_ATTENTION_FLAGS.includes(value as ReassessmentAttentionFlag);
}

function flagRecordFor(patient: Patient, targetFlag: ReassessmentAttentionFlag): FlagRecordLike | null {
  return (
    ((patient.flags ?? []) as unknown[]).find((flag) => {
      if (!isObject(flag)) return false;
      return normalizeFlagType(flag) === targetFlag;
    }) ?? null
  );
}

function validTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}

function newestTimestamp(values: Array<string | null | undefined>): string | null {
  return values.reduce<string | null>((newest, value) => {
    if (!value) return newest;
    if (!newest) return value;
    return Date.parse(value) > Date.parse(newest) ? value : newest;
  }, null);
}

function eventMatchesFlag(
  event: NonNullable<Patient['timeline']>[number],
  targetFlag: ReassessmentAttentionFlag,
): boolean {
  const metadataFlag = event.metadata?.flag ?? event.metadata?.flagType ?? event.metadata?.type;
  const metadataFlagType = normalizeFlagType(metadataFlag);
  if (metadataFlagType === targetFlag) return true;

  const label = FLAG_COPY[targetFlag].label.toLowerCase();
  const text = `${event.summary ?? ''} ${event.note ?? ''} ${event.reason ?? ''}`.toLowerCase();
  return text.includes(targetFlag.toLowerCase()) || text.includes(label);
}

function noteMatchesFlag(note: Note, targetFlag: ReassessmentAttentionFlag): boolean {
  const label = FLAG_COPY[targetFlag].label.toLowerCase();
  const text = `${note.type ?? ''} ${note.text ?? ''} ${note.body ?? ''}`.toLowerCase();
  return text.includes(targetFlag.toLowerCase()) || text.includes(label) || text.includes('reassessment');
}

export function getActiveReassessmentFlags(patient: Patient): ReassessmentAttentionFlag[] {
  const activeFlags = new Set<ReassessmentAttentionFlag>();

  for (const flag of (patient.flags ?? []) as unknown[]) {
    const flagType = normalizeFlagType(flag);
    if (isReassessmentAttentionFlag(flagType)) activeFlags.add(flagType);
  }

  return REASSESSMENT_ATTENTION_FLAGS.filter((flag) => activeFlags.has(flag));
}

export function isPatientFlaggedForReassessment(patient: Patient): boolean {
  return getActiveReassessmentFlags(patient).length > 0;
}

export function filterFlaggedReassessmentPatients(patients: Patient[]): Patient[] {
  return patients.filter(isPatientFlaggedForReassessment);
}

export function getMostSevereReassessmentFlag(patient: Patient): ReassessmentAttentionFlag | null {
  return getActiveReassessmentFlags(patient)[0] ?? null;
}

export function getWaitMinutes(patient: Patient, now = Date.now()): number {
  const arrivalTime = Date.parse(patient.arrivalTime);
  if (Number.isNaN(arrivalTime)) return 0;
  return Math.max(0, Math.floor((now - arrivalTime) / 60000));
}

// Named distinctly from utils/patientWhiteboardModel.ts's formatWaitTime — that one
// produces patient-facing reassurance prose ("About 45 minutes"); this produces the
// compact staff-facing shorthand ("45m", "1h 30m") this drawer needs. They're
// intentionally different formats for different audiences, not a drift bug, but sharing
// the same name made it easy to import the wrong one for a given context.
export function formatCompactWaitTime(waitMinutes: number): string {
  if (waitMinutes < 1) return '<1m';
  if (waitMinutes < 60) return `${waitMinutes}m`;

  const hours = Math.floor(waitMinutes / 60);
  const minutes = waitMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function getPatientDisplayName(patient: Patient): string {
  return patient.name || `${patient.firstName} ${patient.lastName}`.trim();
}

function compareReassessmentPatients(
  a: Patient,
  b: Patient,
  sortMode: ReassessmentSortMode,
  now: number,
): number {
  const aFlag = getMostSevereReassessmentFlag(a);
  const bFlag = getMostSevereReassessmentFlag(b);
  const severityDelta =
    REASSESSMENT_ATTENTION_FLAGS.indexOf(aFlag as ReassessmentAttentionFlag) -
    REASSESSMENT_ATTENTION_FLAGS.indexOf(bFlag as ReassessmentAttentionFlag);
  const waitDelta = getWaitMinutes(b, now) - getWaitMinutes(a, now);

  if (sortMode === 'wait') {
    return waitDelta || severityDelta || getPatientDisplayName(a).localeCompare(getPatientDisplayName(b));
  }

  return severityDelta || waitDelta || getPatientDisplayName(a).localeCompare(getPatientDisplayName(b));
}

export function sortReassessmentAttentionPatients(
  patients: Patient[],
  sortMode: ReassessmentSortMode = 'severity',
  now = Date.now(),
): Patient[] {
  return [...patients].sort((a, b) => compareReassessmentPatients(a, b, sortMode, now));
}

export function sortFlaggedReassessmentPatients(
  patients: Patient[],
  sortMode: ReassessmentSortMode = 'severity',
  now = Date.now(),
): Patient[] {
  return sortReassessmentAttentionPatients(
    filterFlaggedReassessmentPatients(patients),
    sortMode,
    now,
  );
}

export function getFlagTimestampInfo(
  patient: Patient,
  targetFlag: ReassessmentAttentionFlag,
): TimestampInfo {
  const flagRecord = flagRecordFor(patient, targetFlag);
  const flagRecordTimestamp =
    validTimestamp(flagRecord?.detectedAt) ??
    validTimestamp(flagRecord?.flaggedAt) ??
    validTimestamp(flagRecord?.timestamp) ??
    validTimestamp(flagRecord?.createdAt);
  if (flagRecordTimestamp) {
    return { timestamp: flagRecordTimestamp, source: 'flag record', exact: true };
  }

  const exactTimelineTimestamp = newestTimestamp(
    (patient.timeline ?? [])
      .filter((event) => event.type === 'FlagAdded' && eventMatchesFlag(event, targetFlag))
      .map((event) => validTimestamp(event.timestamp)),
  );
  if (exactTimelineTimestamp) {
    return { timestamp: exactTimelineTimestamp, source: 'FlagAdded timeline event', exact: true };
  }

  const relatedNoteTimestamp = newestTimestamp(
    (patient.notes ?? [])
      .filter((note) => noteMatchesFlag(note, targetFlag))
      .map((note) => validTimestamp(note.timestamp) ?? validTimestamp(note.createdAt) ?? validTimestamp(note.updatedAt)),
  );
  if (relatedNoteTimestamp) {
    return { timestamp: relatedNoteTimestamp, source: 'related note fallback', exact: false };
  }

  const latestTimelineTimestamp = newestTimestamp((patient.timeline ?? []).map((event) => validTimestamp(event.timestamp)));
  if (latestTimelineTimestamp) {
    return { timestamp: latestTimelineTimestamp, source: 'latest timeline fallback', exact: false };
  }

  const latestNoteTimestamp = newestTimestamp(
    (patient.notes ?? []).map((note) => validTimestamp(note.timestamp) ?? validTimestamp(note.createdAt) ?? validTimestamp(note.updatedAt)),
  );
  if (latestNoteTimestamp) {
    return { timestamp: latestNoteTimestamp, source: 'latest note fallback', exact: false };
  }

  return { timestamp: patient.arrivalTime, source: 'arrival time fallback', exact: false };
}

function formatClockTime(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function getInitials(patient: Patient): string {
  const name = getPatientDisplayName(patient);
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getRoomLabel(patient: Patient, rooms: Room[]): string {
  if (patient.location) return patient.location;
  const roomName = rooms.find((room) => room.id === patient.roomId)?.name;
  if (roomName) return roomName;
  if (patient.roomId) return patient.roomId.toUpperCase();
  return 'Room pending';
}

function getComplaintLabel(patient: Patient): string {
  return patient.chiefComplaint || patient.complaint || patient.complaintCategory || 'Complaint pending';
}

type ReassessmentDrawerProps = {
  open: boolean;
  count?: number;
  onClose: () => void;
};

export default function ReassessmentDrawer({ open, count, onClose }: ReassessmentDrawerProps) {
  const patients = useEmergencyStore((state) => state.patients);
  const rooms = useEmergencyStore((state) => state.rooms);
  const workflowLogs = useEmergencyStore((state) => state.workflowLogs);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const [sortMode, setSortMode] = useState<ReassessmentSortMode>('severity');

  const sortedPatients = useMemo(
    () => sortReassessmentAttentionPatients(collectReassessmentAttentionPatients(patients), sortMode),
    [patients, sortMode],
  );
  const attentionCount = count ?? sortedPatients.length;
  const dialogRef = useRef<HTMLElement>(null);

  // HEAL-221: this dialog had zero focus management -- Escape closed it,
  // but nothing moved focus in on open or restored it on close, so a
  // keyboard user's focus was silently dropped to document.body every
  // time. The sibling surfaces/Modal.tsx and surfaces/Drawer.tsx already
  // implement the correct pattern (capture the trigger, focus the dialog
  // on open, restore the trigger on close); this dialog was built from
  // scratch and never adopted it. Reachable via the global "r" keyboard
  // shortcut, CapacityCrisisMode, and the command palette -- not a rare
  // surface.
  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      previouslyFocused?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="reassessment-drawer-layer">
      <button
        type="button"
        className="reassessment-drawer__backdrop"
        aria-label="Close reassessment drawer backdrop"
        onClick={onClose}
      />
      <section
        ref={dialogRef}
        className="reassessment-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reassessment-drawer-title"
        tabIndex={-1}
      >
        <header className="reassessment-drawer__header">
          <div className="reassessment-drawer__title-group">
            <h2 id="reassessment-drawer-title">Reassessment Required</h2>
            <span className="reassessment-drawer__count">[{attentionCount}] patients need attention</span>
          </div>

          <div className="reassessment-drawer__sort" aria-label="Sort reassessment patients">
            {sortMode === 'severity' ? (<button
              type="button"
              aria-pressed="true"
              onClick={() => setSortMode('severity')}
            >
              By severity
            </button>) : (<button
              type="button"
              aria-pressed="false"
              onClick={() => setSortMode('severity')}
            >
              By severity
            </button>)}
            <span aria-hidden>|</span>
            {sortMode === 'wait' ? (<button type="button" aria-pressed="true" onClick={() => setSortMode('wait')}>
              By wait time
            </button>) : (<button type="button" aria-pressed="false" onClick={() => setSortMode('wait')}>
              By wait time
            </button>)}
          </div>

          <button type="button" className="reassessment-drawer__close" onClick={onClose} aria-label="Close reassessment drawer">
            X
          </button>
        </header>

        {sortedPatients.length === 0 ? (
          <div className="reassessment-drawer__empty" role="status">
            <span className="reassessment-drawer__empty-icon" aria-hidden>
              ✓
            </span>
            <strong>All patients reassessed</strong>
            <span>No flags active</span>
          </div>
        ) : (
          <div className="reassessment-drawer__list" role="list">
            {sortedPatients.map((patient) => {
              const activeFlags = getActiveReassessmentFlags(patient);
              const mostSevereFlag = activeFlags[0] ?? PatientFlag.ReassessmentDue;
              const flagCopy = FLAG_COPY[mostSevereFlag];
              const waitMinutes = getWaitMinutes(patient);
              const timestampInfo = getFlagTimestampInfo(patient, mostSevereFlag);

              return (
                <article
                  key={patient.id}
                  className={[
                    'reassessment-drawer__row',
                    `reassessment-drawer__row--${flagCopy.rowClass}`,
                    `reassessment-drawer__row--${flagCopy.tone}`,
                  ].join(' ')}
                  role="listitem"
                >
                  <span className="reassessment-drawer__priority-bar" aria-hidden />

                  <div className="reassessment-drawer__avatar">
                    <span className="reassessment-drawer__initials">{getInitials(patient)}</span>
                    <span className={`reassessment-drawer__priority reassessment-drawer__priority--${flagCopy.tone}`}>
                      {patient.priority}
                    </span>
                  </div>

                  <div className="reassessment-drawer__main">
                    <div className="reassessment-drawer__name-line">
                      <strong>{getPatientDisplayName(patient)}</strong>
                      <span>{getRoomLabel(patient, rooms)}</span>
                    </div>
                    <div className="reassessment-drawer__chips">
                      <span>{getComplaintLabel(patient)}</span>
                      <span>{patient.state}</span>
                    </div>
                  </div>

                  <div className="reassessment-drawer__flags">
                    <div className="reassessment-drawer__flag-icons" aria-label="Active reassessment flags">
                      {activeFlags.map((flag) => (
                        <span
                          key={flag}
                          className={`reassessment-drawer__flag-icon reassessment-drawer__flag-icon--${FLAG_COPY[flag].tone}`}
                          title={FLAG_COPY[flag].label}
                          aria-label={FLAG_COPY[flag].label}
                        >
                          {FLAG_COPY[flag].icon}
                        </span>
                      ))}
                    </div>
                    <span className={`reassessment-drawer__flag-label reassessment-drawer__flag-label--${flagCopy.tone}`}>
                      ⚠ {flagCopy.label}
                    </span>
                  </div>

                  <div className="reassessment-drawer__actions">
                    <span className={`reassessment-drawer__wait reassessment-drawer__wait--${flagCopy.tone}`}>
                      {formatCompactWaitTime(waitMinutes)}
                    </span>
                    <button
                      type="button"
                      className="reassessment-drawer__assess"
                      onClick={() => {
                        selectPatient(patient.id);
                        onClose();
                      }}
                    >
                      Assess Now
                    </button>
                    <time
                      className="reassessment-drawer__flag-time"
                      dateTime={timestampInfo.timestamp}
                      title={`Flag time source: ${timestampInfo.source}`}
                    >
                      Flag added {formatClockTime(timestampInfo.timestamp)}
                      {timestampInfo.exact ? '' : ' (fallback)'}
                    </time>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <OperationalHistoryPanel
        logs={workflowLogs}
        title="Reassessment history"
        description="Recent reassessment reminders and completions from workflow audit data."
        domains={[OPERATIONAL_AUDIT_DOMAIN.REASSESSMENT]}
        limit={6}
        compact
        className="reassessment-drawer__history"
      />
    </div>
  );
}

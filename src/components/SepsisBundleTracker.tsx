import { useMemo, useState } from 'react';
import type { Alert, Note, Patient, Staff } from '../types/emergency';
import { PatientFlag } from '../types/emergency';
import { useEmergencyStore } from '../store/emergencyStore';

export interface BundleElement {
  id: string;
  label: string;
  target: string;
  completedAt?: string;
  completedBy?: string;
  required: boolean;
}

export type BundleCompletion = Required<Pick<BundleElement, 'completedAt' | 'completedBy'>> & {
  id: string;
};

export type BundleCompletionMap = Record<string, BundleCompletion>;

export interface BundleProgress {
  completed: number;
  total: number;
  percentage: number;
}

export interface SepsisAlertTimeResult {
  time: string;
  source: string;
  isFallback: boolean;
}

export interface AntibioticTimingResult {
  minutes: number;
  status: 'compliant' | 'borderline' | 'non-compliant';
  label: string;
  color: string;
}

export interface SepsisShiftMetrics {
  sepsisCases: number;
  sep1CompliancePercent: number;
  averageAntibioticMinutes: number | null;
  completedRequiredElements: number;
  totalRequiredElements: number;
}

export const SEP1_BUNDLE: BundleElement[] = [
  {
    id: 'cultures',
    label: 'Blood cultures × 2 drawn',
    target: 'Before antibiotics',
    required: true,
  },
  { id: 'lactate', label: 'Lactate measured', target: 'Within 3 hours', required: true },
  {
    id: 'antibiotics',
    label: 'Broad-spectrum antibiotics given',
    target: 'Within 1 hour of recognition',
    required: true,
  },
  {
    id: 'fluids',
    label: '30 ml/kg IV crystalloid',
    target: 'If hypotensive or lactate ≥4',
    required: false,
  },
  {
    id: 'vasopressors',
    label: 'Vasopressors if MAP <65',
    target: 'If persistent hypotension after fluids',
    required: false,
  },
  {
    id: 'lactate2',
    label: 'Repeat lactate if initial >2 mmol/L',
    target: 'Within 6 hours',
    required: false,
  },
];

const SEP1_NOTE_PATTERN = /^SEP-1\s+(.+?):\s+completed at\s+(.+?)\s+by\s+(.+)$/i;
const SEPSIS_TEXT_PATTERN = /sepsis\s+(alert|criteria)|qsofa/i;

function toMs(value?: string): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function earliestByPriority<T extends { time: string; priority: number }>(
  candidates: T[],
): T | null {
  if (!candidates.length) return null;
  return [...candidates].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return (toMs(a.time) ?? 0) - (toMs(b.time) ?? 0);
  })[0];
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function noteText(note: Note): string {
  return String(note.text || note.body || '');
}

function metadataString(
  metadata: Record<string, string | number | boolean | null | undefined> | undefined,
  key: string,
): string | null {
  const value = metadata?.[key];
  return typeof value === 'string' && toMs(value) !== null ? value : null;
}

function flagType(flag: unknown): string {
  if (typeof flag === 'string') return flag;
  if (flag && typeof flag === 'object' && 'type' in flag) {
    return String((flag as { type?: unknown }).type || '');
  }
  return '';
}

function flagDetectedAt(flag: unknown): string | null {
  if (!flag || typeof flag !== 'object' || !('detectedAt' in flag)) return null;
  const detectedAt = (flag as { detectedAt?: unknown }).detectedAt;
  return typeof detectedAt === 'string' && toMs(detectedAt) !== null ? detectedAt : null;
}

function staffDisplayName(staff: Staff[], staffId?: string): string {
  if (!staffId) return '';
  const member = staff.find((candidate) => candidate.id === staffId);
  return member?.displayName || member?.name || staffId;
}

function initials(value: string): string {
  return value
    .split(/[\s.-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatClock(value?: string): string {
  if (!value || toMs(value) === null) return '--';
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function patientHasSepsisAlert(patient: Patient): boolean {
  return (patient.flags as unknown[]).some((flag) => flagType(flag) === PatientFlag.SepsisAlert);
}

export function buildSep1CompletionNote(
  elementId: string,
  completedAt: string,
  completedBy: string,
): string {
  return `SEP-1 ${elementId}: completed at ${completedAt} by ${completedBy}`;
}

export function parseSep1CompletionNotes(
  notes: Note[],
  bundle: BundleElement[] = SEP1_BUNDLE,
): BundleCompletionMap {
  const elementByToken = new Map<string, BundleElement>();
  bundle.forEach((element) => {
    elementByToken.set(normalizeToken(element.id), element);
    elementByToken.set(normalizeToken(element.label), element);
  });

  return notes.reduce<BundleCompletionMap>((completionMap, note) => {
    const match = noteText(note).match(SEP1_NOTE_PATTERN);
    if (!match) return completionMap;

    const [, elementToken, completedAt, completedBy] = match;
    const element = elementByToken.get(normalizeToken(elementToken));
    if (!element || toMs(completedAt) === null) return completionMap;

    const existing = completionMap[element.id];
    if (existing && (toMs(existing.completedAt) ?? 0) > (toMs(completedAt) ?? 0)) {
      return completionMap;
    }

    completionMap[element.id] = {
      id: element.id,
      completedAt,
      completedBy: completedBy.trim(),
    };
    return completionMap;
  }, {});
}

export function calculateBundleProgress(
  completions: BundleCompletionMap,
  bundle: BundleElement[] = SEP1_BUNDLE,
): BundleProgress {
  const requiredElements = bundle.filter((element) => element.required);
  const completed = requiredElements.filter((element) => Boolean(completions[element.id])).length;
  const total = requiredElements.length;
  return {
    completed,
    total,
    percentage: total ? Math.round((completed / total) * 100) : 0,
  };
}

export function deriveSepsisAlertTime(
  patient: Patient,
  alerts: Alert[] = [],
): SepsisAlertTimeResult {
  const candidates: Array<{ time: string; source: string; isFallback: boolean; priority: number }> =
    [];

  (patient.flags as unknown[]).forEach((flag) => {
    if (flagType(flag) !== PatientFlag.SepsisAlert) return;
    const detectedAt = flagDetectedAt(flag);
    if (detectedAt) {
      candidates.push({
        time: detectedAt,
        source: 'flag metadata',
        isFallback: false,
        priority: 1,
      });
    }
  });

  patient.timeline.forEach((event) => {
    const metadataFlag = String(event.metadata?.flag || '');
    const summary = `${event.summary || ''} ${event.note || ''} ${event.reason || ''}`;
    const hasSepsisFlag =
      metadataFlag === PatientFlag.SepsisAlert ||
      (event.type === 'FlagAdded' && summary.includes(PatientFlag.SepsisAlert)) ||
      SEPSIS_TEXT_PATTERN.test(summary);

    if (hasSepsisFlag && toMs(event.timestamp) !== null) {
      candidates.push({
        time: event.timestamp,
        source: 'patient timeline',
        isFallback: false,
        priority: 2,
      });
    }
  });

  alerts.forEach((alert) => {
    if (alert.patientId !== patient.id) return;
    const metadataFlag = String(alert.metadata?.flag || '');
    const alertText = `${alert.title} ${alert.message} ${alert.type || ''} ${alert.source || ''}`;
    if (
      (metadataFlag === PatientFlag.SepsisAlert || SEPSIS_TEXT_PATTERN.test(alertText)) &&
      toMs(alert.createdAt) !== null
    ) {
      candidates.push({
        time: alert.createdAt,
        source: 'alert record',
        isFallback: false,
        priority: 3,
      });
    }
  });

  patient.notes.forEach((note) => {
    const recognitionTime =
      metadataString(note.metadata, 'sepsisAlertTime') ||
      metadataString(note.metadata, 'recognitionTime') ||
      metadataString(note.metadata, 'recognizedAt');
    if (recognitionTime) {
      candidates.push({
        time: recognitionTime,
        source: 'note metadata',
        isFallback: false,
        priority: 4,
      });
      return;
    }

    const text = noteText(note);
    if (!text.startsWith('SEP-1') && SEPSIS_TEXT_PATTERN.test(text)) {
      const timestamp = note.timestamp || note.createdAt;
      if (timestamp && toMs(timestamp) !== null) {
        candidates.push({
          time: timestamp,
          source: 'clinical note timestamp',
          isFallback: false,
          priority: 5,
        });
      }
    }
  });

  const best = earliestByPriority(candidates);
  if (best) {
    return {
      time: best.time,
      source: best.source,
      isFallback: best.isFallback,
    };
  }

  return {
    time: patient.arrivalTime,
    source: 'arrival time fallback',
    isFallback: true,
  };
}

export function calculateAntibioticTiming(
  sepsisAlertTime: string,
  completedAt: string,
): AntibioticTimingResult | null {
  const startMs = toMs(sepsisAlertTime);
  const completedMs = toMs(completedAt);
  if (startMs === null || completedMs === null || completedMs < startMs) return null;

  const minutes = Math.round((completedMs - startMs) / 60000);
  if (minutes <= 60) {
    return {
      minutes,
      status: 'compliant',
      label: `✓ Antibiotics in ${minutes}min — SEP-1 compliant`,
      color: '#10B981',
    };
  }

  if (minutes <= 90) {
    return {
      minutes,
      status: 'borderline',
      label: `⚠ Antibiotics in ${minutes}min — borderline`,
      color: '#F59E0B',
    };
  }

  return {
    minutes,
    status: 'non-compliant',
    label: `✗ Antibiotics in ${minutes}min — SEP-1 non-compliant`,
    color: '#EF4444',
  };
}

export function calculateSepsisShiftMetrics(
  patients: Patient[],
  alerts: Alert[] = [],
): SepsisShiftMetrics {
  const sepsisPatients = patients.filter(patientHasSepsisAlert);
  const totalRequiredElements =
    sepsisPatients.length * SEP1_BUNDLE.filter((element) => element.required).length;
  let completedRequiredElements = 0;
  const antibioticTimes: number[] = [];

  sepsisPatients.forEach((patient) => {
    const completions = parseSep1CompletionNotes(patient.notes);
    completedRequiredElements += calculateBundleProgress(completions).completed;

    const antibiotics = completions.antibiotics;
    if (!antibiotics) return;
    const recognitionTime = deriveSepsisAlertTime(patient, alerts);
    const timing = calculateAntibioticTiming(recognitionTime.time, antibiotics.completedAt);
    if (timing) antibioticTimes.push(timing.minutes);
  });

  return {
    sepsisCases: sepsisPatients.length,
    sep1CompliancePercent: totalRequiredElements
      ? Math.round((completedRequiredElements / totalRequiredElements) * 100)
      : 0,
    averageAntibioticMinutes: antibioticTimes.length
      ? Math.round(
          antibioticTimes.reduce((sum, minutes) => sum + minutes, 0) / antibioticTimes.length,
        )
      : null,
    completedRequiredElements,
    totalRequiredElements,
  };
}

export default function SepsisBundleTracker({
  patient,
  canWriteNote = true,
}: {
  patient: Patient;
  // HEAL-347.87: this tracker's sibling in PatientDetailPanel.tsx,
  // StrokeCodeProtocol, already receives canWriteNote from the parent
  // (which computes it via emergencyRole.presentAction(EMERGENCY_ACTIONS.
  // writeNote)) -- this component was simply missed when that prop was
  // wired up, so any role that can view the patient but not write clinical
  // notes could still mark SEP-1 bundle elements complete, silently calling
  // addNote() each time. Defaults to true only so existing callers/tests
  // that don't pass it keep working; PatientDetailPanel always passes the
  // real computed value explicitly.
  canWriteNote?: boolean;
}) {
  const addNote = useEmergencyStore((state) => state.addNote);
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const staff = useEmergencyStore((state) => state.staff);
  const alerts = useEmergencyStore((state) => state.alerts);
  const [pendingElement, setPendingElement] = useState<BundleElement | null>(null);

  const hasSepsisAlert = patientHasSepsisAlert(patient);
  const completions = useMemo(() => parseSep1CompletionNotes(patient.notes), [patient.notes]);
  const progress = useMemo(() => calculateBundleProgress(completions), [completions]);
  const recognitionTime = useMemo(() => deriveSepsisAlertTime(patient, alerts), [alerts, patient]);
  const antibioticTiming = completions.antibiotics
    ? calculateAntibioticTiming(recognitionTime.time, completions.antibiotics.completedAt)
    : null;
  const staffId =
    patient.assignedStaffId || activeShift.chargeStaffId || staff[0]?.id || 'current-staff';

  if (!hasSepsisAlert) return null;

  const completePendingElement = () => {
    if (!pendingElement || !canWriteNote) return;
    const completedAt = new Date().toISOString();
    addNote(patient.id, buildSep1CompletionNote(pendingElement.id, completedAt, staffId), staffId);
    setPendingElement(null);
  };

  return (
    <section className="sepsis-bundle-tracker" aria-labelledby="sepsis-bundle-heading">
      <div className="sepsis-bundle-tracker__header">
        <div>
          <h3 id="sepsis-bundle-heading">Sepsis Bundle (SEP-1)</h3>
          <p>
            Recognition time:{' '}
            <time dateTime={recognitionTime.time}>{formatClock(recognitionTime.time)}</time>
            {recognitionTime.isFallback ? ' (arrival fallback)' : ''}
          </p>
        </div>
        <strong>{progress.percentage}%</strong>
      </div>

      <div
        className="sepsis-bundle-progress"
        aria-label={`SEP-1 required progress ${progress.completed} of ${progress.total}`}
      >
        <span style={{ width: `${progress.percentage}%` }} />
      </div>
      <div className="sepsis-bundle-progress__label">
        {progress.completed}/{progress.total} required complete
        {progress.percentage === 100 ? <strong>Bundle complete ✓</strong> : null}
      </div>

      {antibioticTiming ? (
        <div
          className="sepsis-bundle-antibiotics"
          style={{ borderColor: antibioticTiming.color, color: antibioticTiming.color }}
        >
          {antibioticTiming.label}
        </div>
      ) : null}

      <div className="sepsis-bundle-list">
        {SEP1_BUNDLE.map((element) => {
          const completion = completions[element.id];
          const completedBy = completion?.completedBy;
          const completedByInitials = completedBy
            ? initials(staffDisplayName(staff, completedBy))
            : '';

          return (
            <article
              key={element.id}
              className={`sepsis-bundle-row ${completion ? 'sepsis-bundle-row--complete' : ''}`}
            >
              <button
                type="button"
                className="sepsis-bundle-row__checkbox"
                aria-label={
                  completion ? `${element.label} completed` : `Mark ${element.label} complete`
                }
                disabled={Boolean(completion) || !canWriteNote}
                onClick={() => setPendingElement(element)}
              >
                {completion ? '✓' : ''}
              </button>
              <div className="sepsis-bundle-row__label">
                <strong>{element.label}</strong>
                <span>{element.required ? 'Required' : 'Conditional'}</span>
              </div>
              <span className="sepsis-bundle-row__target">{element.target}</span>
              <span className="sepsis-bundle-row__timestamp">
                {completion
                  ? `${formatClock(completion.completedAt)} ${completedByInitials}`
                  : 'Pending'}
              </span>
            </article>
          );
        })}
      </div>

      {pendingElement ? (
        <div
          className="sepsis-bundle-confirm"
          role="dialog"
          aria-modal="false"
          aria-labelledby="sepsis-bundle-confirm-title"
        >
          <p id="sepsis-bundle-confirm-title">Mark {pendingElement.label} as complete?</p>
          <div>
            <button type="button" onClick={completePendingElement}>
              Complete
            </button>
            <button type="button" onClick={() => setPendingElement(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { MEDICAL_THEME } from '../config/medicalTheme.constants';
import { dispatchAlert } from '../engine/alertEngine';
import { routeComplaint, type ComplaintRoute } from '../engine/complaintRouter';
import { useEmergencyStore, hasPatientFlag } from '../store/emergencyStore';
import { Patient, PatientFlag, Room, Staff, type Note } from '../types/emergency';

export type StrokeTimelineStepId = 'Arrive' | 'CT Ord' | 'CT Done' | 'Decision' | 'tPA';

export type StrokeTimelineStepState = {
  completedAt: string;
  by: string;
};

export type ParsedStrokeCodeState = {
  activatedAt?: string;
  activatedBy?: string;
  steps: Partial<Record<StrokeTimelineStepId, StrokeTimelineStepState>>;
};

export type DtnClassification = {
  tone: 'green' | 'yellow' | 'red';
  message: string;
};

export type TpaEligibilityStatus = 'eligible' | 'contraindicated' | 'incomplete';

export type TpaEligibilityResult = {
  status: TpaEligibilityStatus;
  tone: 'green' | 'yellow' | 'red';
  message: string;
};

type StrokeCodeProtocolProps = {
  patient: Patient;
  canManageFlags?: boolean;
  canWriteNote?: boolean;
  onOpenCalculator?: (calculatorId: string) => void;
};

type TpaCriterion = {
  id: string;
  label: string;
};

const STROKE_TIMELINE_STEPS: StrokeTimelineStepId[] = ['Arrive', 'CT Ord', 'CT Done', 'Decision', 'tPA'];

export const TPA_INCLUDE_CRITERIA: TpaCriterion[] = [
  { id: 'ischemic-confirmed', label: 'Ischemic stroke confirmed (no hemorrhage on CT)' },
  { id: 'onset-under-4-5h', label: 'Symptoms onset < 4.5 hours (or LKW < 4.5h)' },
  { id: 'age-18-plus', label: 'Age >= 18' },
  { id: 'nihss-documented', label: 'NIHSS performed and documented' },
];

export const TPA_EXCLUDE_CRITERIA: TpaCriterion[] = [
  { id: 'active-bleeding', label: 'Active internal bleeding' },
  { id: 'recent-surgery', label: 'Recent surgery (< 14 days)' },
  { id: 'recent-stroke-head-trauma', label: 'Prior stroke or head trauma < 3 months' },
  { id: 'platelets-low', label: 'Platelet count < 100,000' },
  { id: 'inr-high', label: 'INR > 1.7' },
  { id: 'glucose-out-of-range', label: 'Blood glucose < 50 or > 400 mg/dL' },
  { id: 'uncontrolled-hypertension', label: 'Uncontrolled hypertension (SBP > 185 or DBP > 110)' },
];

const activationNotePattern = /^Stroke Code activated at (\S+) by (.+)$/i;
const stepNotePattern = /^Stroke Code (Arrive|CT Ord|CT Done|Decision|tPA): completed at (\S+) by (.+)$/i;

function noteText(note: Note): string {
  return String(note.text || note.body || '').trim();
}

function isValidIso(value?: string): value is string {
  return Boolean(value && Number.isFinite(new Date(value).getTime()));
}

function normalizeSearchText(value: unknown): string {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function routeLooksStroke(route: ComplaintRoute | null): boolean {
  if (!route) return false;
  const routeText = normalizeSearchText(
    [
      route.routeId,
      route.complaint,
      route.scoreIds.join(' '),
      (route.protocols || []).join(' '),
      (route.workflows || []).join(' '),
    ].join(' '),
  );
  return routeText.includes('stroke') || route.scoreIds.includes('nihss');
}

export function isStrokeComplaint(patient: Pick<Patient, 'chiefComplaint' | 'complaint' | 'complaintCategory'>): boolean {
  const routedByComplaint = routeLooksStroke(routeComplaint(patient.chiefComplaint || patient.complaint || ''));
  const routedByCategory = routeLooksStroke(routeComplaint(patient.complaintCategory || ''));
  if (routedByComplaint || routedByCategory) return true;

  const text = normalizeSearchText([patient.chiefComplaint, patient.complaint, patient.complaintCategory].join(' '));
  return [
    /\bstroke\b/,
    /\bcva\b/,
    /\btia\b/,
    /\bfacial droop\b/,
    /\bface droop\b/,
    /\bslurred speech\b/,
    /\bdysarthria\b/,
    /\baphasia\b/,
    /\bunilateral weakness\b/,
    /\barm weakness\b/,
    /\bleg weakness\b/,
    /\bneuro deficit\b/,
    /\bhemiparesis\b/,
    /\bhemiplegia\b/,
    /\bvision loss\b/,
  ].some((pattern) => pattern.test(text));
}

export function parseStrokeCodeNotes(notes: Note[]): ParsedStrokeCodeState {
  return notes.reduce<ParsedStrokeCodeState>(
    (state, note) => {
      const text = noteText(note);
      const activationMatch = text.match(activationNotePattern);
      if (activationMatch && isValidIso(activationMatch[1])) {
        if (!state.activatedAt || new Date(activationMatch[1]).getTime() >= new Date(state.activatedAt).getTime()) {
          state.activatedAt = activationMatch[1];
          state.activatedBy = activationMatch[2];
        }
        return state;
      }

      const stepMatch = text.match(stepNotePattern);
      if (stepMatch && isValidIso(stepMatch[2])) {
        const step = stepMatch[1] as StrokeTimelineStepId;
        const existing = state.steps[step];
        if (!existing || new Date(stepMatch[2]).getTime() >= new Date(existing.completedAt).getTime()) {
          state.steps[step] = {
            completedAt: stepMatch[2],
            by: stepMatch[3],
          };
        }
      }

      return state;
    },
    { steps: {} },
  );
}

export function minutesBetween(start?: string, end?: string): number | null {
  if (!isValidIso(start) || !isValidIso(end)) return null;
  return Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

export function classifyDtn(minutes: number): DtnClassification {
  if (minutes <= 30) return { tone: 'green', message: '✓ Excellent — Canadian target met' };
  if (minutes <= 60) return { tone: 'yellow', message: '⚠ Within limit — target is ≤30min' };
  return { tone: 'red', message: '✗ Exceeded — review process' };
}

export function getTpaEligibilityResult(
  includeChecked: Record<string, boolean>,
  excludeChecked: Record<string, boolean>,
): TpaEligibilityResult {
  const exclusion = TPA_EXCLUDE_CRITERIA.find((criterion) => excludeChecked[criterion.id]);
  if (exclusion) {
    return {
      status: 'contraindicated',
      tone: 'red',
      message: `tPA CONTRAINDICATED — ${exclusion.label}`,
    };
  }

  const hasAllIncludes = TPA_INCLUDE_CRITERIA.every((criterion) => includeChecked[criterion.id]);
  if (hasAllIncludes) {
    return {
      status: 'eligible',
      tone: 'green',
      message: 'tPA ELIGIBLE — Physician decision required',
    };
  }

  return {
    status: 'incomplete',
    tone: 'yellow',
    message: 'ASSESSMENT INCOMPLETE',
  };
}

function patientName(patient: Patient): string {
  return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.name || patient.mrn;
}

function roomName(patient: Patient, rooms: Room[]): string {
  const room = rooms.find((candidate) => candidate.id === patient.roomId || candidate.patientId === patient.id);
  return room?.name || patient.location || patient.roomId || 'Unassigned';
}

function formatClock(value?: string): string {
  if (!isValidIso(value)) return '--';
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function toneColor(tone: DtnClassification['tone'] | TpaEligibilityResult['tone']): string {
  if (tone === 'green') return '#10B981';
  if (tone === 'yellow') return '#F59E0B';
  return '#EF4444';
}

function buttonStyle(variant: 'primary' | 'secondary' | 'danger' = 'secondary') {
  return {
    border: variant === 'primary' ? 'none' : '1px solid #e0f2fe',
    background: variant === 'primary' ? MEDICAL_THEME.accent : variant === 'danger' ? '#7F1D1D' : 'transparent',
    color: 'var(--medical-ink, #111827)',
    borderRadius: 10,
    padding: '8px 10px',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 700,
  };
}

function CheckboxGroup({
  title,
  criteria,
  values,
  onChange,
}: {
  title: string;
  criteria: TpaCriterion[];
  values: Record<string, boolean>;
  onChange: (id: string, value: boolean) => void;
}) {
  return (
    <div>
      <h5 style={{ margin: '0 0 8px', color: MEDICAL_THEME.inkDisabled, fontSize: 12 }}>{title}</h5>
      <div style={{ display: 'grid', gap: 7 }}>
        {criteria.map((criterion) => (
          <label key={criterion.id} style={{ display: 'flex', gap: 8, color: '#E5E7EB', fontSize: 12, lineHeight: 1.35 }}>
            <input
              type="checkbox"
              checked={Boolean(values[criterion.id])}
              onChange={(event) => onChange(criterion.id, event.target.checked)}
            />
            <span>{criterion.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function StrokeCodeProtocol({
  patient,
  canManageFlags = true,
  canWriteNote = true,
  onOpenCalculator,
}: StrokeCodeProtocolProps) {
  const staff = useEmergencyStore((state) => state.staff);
  const rooms = useEmergencyStore((state) => state.rooms);
  const addFlag = useEmergencyStore((state) => state.addFlag);
  const addNote = useEmergencyStore((state) => state.addNote);
  const [now, setNow] = useState(() => Date.now());
  const [cincinnatiOpen, setCincinnatiOpen] = useState(false);
  const [includeChecked, setIncludeChecked] = useState<Record<string, boolean>>({});
  const [excludeChecked, setExcludeChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const strokeRouteMatch = isStrokeComplaint(patient);
  const active = hasPatientFlag(patient, PatientFlag.StrokeCode);
  const parsedState = useMemo(() => parseStrokeCodeNotes(patient.notes || []), [patient.notes]);
  const actorStaffId = patient.assignedStaffId || staff[0]?.id || 'current-staff';
  const actorLabel = staff.find((member: Staff) => member.id === actorStaffId)?.name || actorStaffId;
  const arrivalTime = parsedState.steps.Arrive?.completedAt || patient.arrivalTime || parsedState.activatedAt;
  const tpaTime = parsedState.steps.tPA?.completedAt;
  const dtnMinutes = tpaTime ? minutesBetween(arrivalTime, tpaTime) : minutesBetween(arrivalTime, new Date(now).toISOString());
  const dtnClassification = typeof dtnMinutes === 'number' ? classifyDtn(dtnMinutes) : null;
  const runningTone = typeof dtnMinutes === 'number' && dtnMinutes >= 50 ? 'red' : 'yellow';
  const eligibilityResult = getTpaEligibilityResult(includeChecked, excludeChecked);

  const activateStrokeCode = () => {
    if (!canManageFlags || !canWriteNote) return;
    const timestamp = new Date().toISOString();
    addFlag(patient.id, PatientFlag.StrokeCode);
    addNote(patient.id, `Stroke Code activated at ${timestamp} by ${actorLabel}`, actorStaffId);
    dispatchAlert({
      severity: 'Critical',
      title: `STROKE CODE — ${patientName(patient)} Bed ${roomName(patient, rooms)}`,
      message: `Stroke Code activated at ${formatClock(timestamp)}. Door-to-needle target ≤60min, Canadian target ≤30min.`,
      patientId: patient.id,
      source: 'stroke-code-protocol',
      metadata: {
        protocol: 'StrokeCode',
        activatedAt: timestamp,
        activatedBy: actorStaffId,
      },
    });
  };

  const recordStep = (step: StrokeTimelineStepId) => {
    if (!canWriteNote) return;
    const timestamp = new Date().toISOString();
    addNote(patient.id, `Stroke Code ${step}: completed at ${timestamp} by ${actorLabel}`, actorStaffId);
  };

  if (!active && !strokeRouteMatch) {
    return (
      <section style={{ padding: 16, borderBottom: '1px solid #e0f2fe' }} aria-labelledby="stroke-manual-heading">
        <h3 id="stroke-manual-heading" style={{ margin: '0 0 8px', fontSize: 13, color: MEDICAL_THEME.inkSubtle }}>
          Stroke Protocol
        </h3>
        <p style={{ margin: '0 0 10px', color: MEDICAL_THEME.inkMuted, fontSize: 12 }}>
          Manual physician activation is available for concerning neurologic presentations not matched by the complaint router.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" style={buttonStyle('primary')} disabled={!canManageFlags || !canWriteNote} onClick={activateStrokeCode}>
            Activate Stroke Code
          </button>
          <button type="button" style={buttonStyle()} onClick={() => onOpenCalculator?.('nihss')}>
            NIHSS
          </button>
        </div>
      </section>
    );
  }

  return (
    <section style={{ padding: 16, borderBottom: '1px solid #e0f2fe' }} aria-labelledby="stroke-code-heading">
      {!active ? (
        <div
          style={{
            border: '1px solid #F59E0B',
            background: '#451A03',
            borderRadius: 12,
            padding: 12,
          }}
        >
          <h3 id="stroke-code-heading" style={{ margin: 0, color: '#FCD34D', fontSize: 14 }}>
            ⚡ Stroke Protocol — Activate Code?
          </h3>
          <p style={{ margin: '6px 0 0', color: '#FDE68A', fontSize: 12 }}>
            Complaint routing matched stroke workflow or NIHSS guidance. Activation still requires clinician confirmation.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <button type="button" style={buttonStyle('primary')} disabled={!canManageFlags || !canWriteNote} onClick={activateStrokeCode}>
              Activate Stroke Code
            </button>
            <button type="button" style={buttonStyle()} onClick={() => onOpenCalculator?.('nihss')}>
              NIHSS
            </button>
            <button type="button" style={buttonStyle()} onClick={() => setCincinnatiOpen((open) => !open)}>
              Cincinnati Screen
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <h3 id="stroke-code-heading" style={{ margin: 0, color: 'var(--medical-ink, #111827)', fontSize: 14 }}>
                Stroke Code Active
              </h3>
              <p style={{ margin: '4px 0 0', color: MEDICAL_THEME.inkSubtle, fontSize: 12 }}>
                Activated {formatClock(parsedState.activatedAt)} by {parsedState.activatedBy || 'unknown staff'}
              </p>
            </div>
            <div style={{ color: '#EF4444', fontSize: 11, fontWeight: 800 }}>60min target</div>
          </div>

          <div style={{ marginTop: 14, overflowX: 'auto' }}>
            <div style={{ minWidth: 560, position: 'relative', padding: '18px 4px 8px' }}>
              <div style={{ position: 'absolute', top: 26, left: 22, right: 22, height: 2, background: '#e0f2fe' }} />
              <div style={{ position: 'absolute', top: 14, right: 22, width: 2, height: 44, background: '#EF4444' }} />
              <div style={{ position: 'absolute', top: 0, right: 0, color: '#EF4444', fontSize: 10 }}>+60min</div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STROKE_TIMELINE_STEPS.length}, 1fr)`, gap: 8 }}>
                {STROKE_TIMELINE_STEPS.map((step, index) => {
                  const stepState = step === 'Arrive' && !parsedState.steps.Arrive && patient.arrivalTime
                    ? { completedAt: patient.arrivalTime, by: 'arrival record' }
                    : parsedState.steps[step];
                  const previousStep = STROKE_TIMELINE_STEPS[index - 1];
                  const previousTime =
                    previousStep === 'Arrive' && !parsedState.steps.Arrive
                      ? patient.arrivalTime
                      : previousStep
                        ? parsedState.steps[previousStep]?.completedAt
                        : undefined;
                  const duration = stepState ? minutesBetween(previousTime, stepState.completedAt) : null;
                  const isCurrent = !stepState && STROKE_TIMELINE_STEPS.slice(0, index).every((candidate) =>
                    candidate === 'Arrive' ? Boolean(parsedState.steps.Arrive || patient.arrivalTime) : Boolean(parsedState.steps[candidate]),
                  );

                  return (
                    <button
                      key={step}
                      type="button"
                      onClick={() => recordStep(step)}
                      disabled={!canWriteNote}
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        border: 0,
                        background: 'transparent',
                        color: 'var(--medical-ink, #111827)',
                        cursor: canWriteNote ? 'pointer' : 'not-allowed',
                        display: 'grid',
                        justifyItems: 'center',
                        gap: 6,
                        padding: 0,
                      }}
                    >
                      <span
                        className={isCurrent ? 'patient-detail-timeline-dot--current' : undefined}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 999,
                          border: `2px solid ${stepState ? '#10B981' : isCurrent ? MEDICAL_THEME.accent : MEDICAL_THEME.inkMuted}`,
                          background: stepState ? '#10B981' : isCurrent ? MEDICAL_THEME.accent : MEDICAL_THEME.ink,
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 12,
                        }}
                      >
                        {stepState ? '✓' : ''}
                      </span>
                      <strong style={{ fontSize: 11 }}>{step}</strong>
                      <span style={{ color: MEDICAL_THEME.inkSubtle, fontSize: 10 }}>{formatClock(stepState?.completedAt)}</span>
                      {duration !== null ? <span style={{ color: MEDICAL_THEME.inkMuted, fontSize: 10 }}>+{duration}min</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              border: `1px solid ${toneColor(tpaTime && dtnClassification ? dtnClassification.tone : runningTone)}`,
              background: MEDICAL_THEME.surfaceCard,
              borderRadius: 10,
              padding: 10,
            }}
          >
            {tpaTime && dtnClassification && dtnMinutes !== null ? (
              <div style={{ color: toneColor(dtnClassification.tone), fontWeight: 800, fontSize: 13 }}>
                DTN: {dtnMinutes}min · {dtnClassification.message}
              </div>
            ) : (
              <div style={{ color: toneColor(runningTone), fontWeight: 800, fontSize: 13 }}>
                {dtnMinutes ?? '--'}min since arrival
              </div>
            )}
          </div>
        </div>
      )}

      {cincinnatiOpen ? (
        <div style={{ marginTop: 12, border: '1px solid #e0f2fe', borderRadius: 10, background: MEDICAL_THEME.surfaceCard, padding: 10 }}>
          <h4 style={{ margin: '0 0 8px', color: 'var(--medical-ink, #111827)', fontSize: 13 }}>Cincinnati Screen</h4>
          <p style={{ margin: '0 0 8px', color: MEDICAL_THEME.inkSubtle, fontSize: 12 }}>
            Lightweight checklist until a dedicated Cincinnati calculator exists.
          </p>
          {['Facial droop', 'Arm drift', 'Speech abnormality'].map((item) => (
            <label key={item} style={{ display: 'flex', gap: 8, color: '#E5E7EB', fontSize: 12, marginTop: 6 }}>
              <input type="checkbox" />
              <span>{item}</span>
            </label>
          ))}
        </div>
      ) : null}

      {active ? (
        <div style={{ marginTop: 16 }}>
          <h4 style={{ margin: '0 0 10px', color: 'var(--medical-ink, #111827)', fontSize: 13 }}>tPA Eligibility Checklist</h4>
          <div style={{ display: 'grid', gap: 14 }}>
            <CheckboxGroup
              title="Include criteria"
              criteria={TPA_INCLUDE_CRITERIA}
              values={includeChecked}
              onChange={(id, value) => setIncludeChecked((current) => ({ ...current, [id]: value }))}
            />
            <CheckboxGroup
              title="Exclude criteria"
              criteria={TPA_EXCLUDE_CRITERIA}
              values={excludeChecked}
              onChange={(id, value) => setExcludeChecked((current) => ({ ...current, [id]: value }))}
            />
            <div
              style={{
                border: `1px solid ${toneColor(eligibilityResult.tone)}`,
                color: toneColor(eligibilityResult.tone),
                borderRadius: 10,
                padding: 10,
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {eligibilityResult.message}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

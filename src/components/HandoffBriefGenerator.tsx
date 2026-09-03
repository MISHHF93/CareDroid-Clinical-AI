import { useCallback, useEffect, useMemo, useState } from 'react';
import { type AIRequest, type AIResponse } from '../lib/ai/client';
import { invokeUnifiedAiHandoffBrief } from '../services/careDroidUnifiedAiNode';
import { useEmergencyStore } from '../store/emergencyStore';
import {
  PatientFlag,
  PatientState,
  Priority,
  type ActiveShift,
  type CapacitySnapshot,
  type EmsUnit,
  type Patient,
  type Referral,
  type Staff,
} from '../types/emergency';

export const HANDOFF_BRIEF_OUTPUT_FORMAT = `SHIFT HANDOFF — [Date] [Start] to [End]
Staff on duty: [names]

DEPARTMENT STATUS:
[2 sentence overview of department state]

HIGH PRIORITY PATIENTS REQUIRING HANDOVER:
[One 2-3 sentence entry per P1/P2/flagged patient]

STABLE PATIENTS REQUIRING MONITORING:
[Brief group summary]

PENDING ACTIONS:
- [Each unresolved referral]
- [Each overdue reassessment]
- [Any boarding patients]

EMS:
[Inbound units or 'No units currently inbound']

CAPACITY:
[Current band and any anticipated changes]`;

export const HANDOFF_BRIEF_SYSTEM_PROMPT = `You are generating a clinical shift handoff brief
for an Emergency Department. Be factual, concise,
and structured. Never fabricate clinical details.
Use only the data provided. Aim for 400-500 words.
Format with clear sections.

Use this output format:
${HANDOFF_BRIEF_OUTPUT_FORMAT}`;

const ACTIVE_PATIENT_STATES: ReadonlySet<PatientState> = new Set(
  Object.values(PatientState).filter(
    (state) => state !== PatientState.Discharge && state !== PatientState.Deceased,
  ),
);

type HandoffContextInput = {
  shift: ActiveShift;
  staff: Staff[];
  patients: Patient[];
  referrals: Referral[];
  emsUnits: EmsUnit[];
  capacity: CapacitySnapshot;
  now?: Date;
};

export type HandoffContext = ReturnType<typeof buildHandoffContext>;

export function formatDuration(startTime: string | undefined, endTime: Date = new Date()): string {
  if (!startTime) return 'Unknown duration';
  const startMs = new Date(startTime).getTime();
  if (!Number.isFinite(startMs)) return 'Unknown duration';
  const totalMinutes = Math.max(0, Math.round((endTime.getTime() - startMs) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes}m`;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function calcWait(patient: Pick<Patient, 'arrivalTime'>, now: Date = new Date()): number {
  const arrivalMs = new Date(patient.arrivalTime).getTime();
  if (!Number.isFinite(arrivalMs)) return 0;
  return Math.max(0, Math.round((now.getTime() - arrivalMs) / 60000));
}

export function countBriefText(text: string): { characters: number; words: number } {
  const trimmed = text.trim();
  return {
    characters: text.length,
    words: trimmed ? trimmed.split(/\s+/).length : 0,
  };
}

function isActivePatient(patient: Patient): boolean {
  return ACTIVE_PATIENT_STATES.has(patient.state);
}

function isHighRiskPatient(patient: Patient): boolean {
  return (
    patient.priority === Priority.P1 || patient.priority === Priority.P2 || patient.flags.length > 0
  );
}

function isOnDuty(member: Staff, shift: ActiveShift): boolean {
  if (!member.active) return false;
  if (member.status && !['OnShift', 'Break'].includes(member.status)) return false;
  return !member.shiftId || member.shiftId === shift.id;
}

function eventAfter(patient: Patient, shiftStartMs: number, matcher: RegExp): boolean {
  return patient.timeline.some((event) => {
    const eventMs = new Date(event.timestamp).getTime();
    if (!Number.isFinite(eventMs) || eventMs < shiftStartMs) return false;
    return matcher.test(
      `${event.type || ''} ${event.summary || ''} ${event.toState || event.to || ''}`,
    );
  });
}

function isInShift(patient: Patient, shiftStartMs: number): boolean {
  const arrivalMs = new Date(patient.arrivalTime).getTime();
  return !Number.isFinite(arrivalMs) || !Number.isFinite(shiftStartMs) || arrivalMs >= shiftStartMs;
}

export function detectBottleneck({
  capacity,
  patients,
  referrals,
  emsUnits,
}: Pick<HandoffContextInput, 'capacity' | 'patients' | 'referrals' | 'emsUnits'>): string {
  const reassessmentDue = patients.filter((patient) =>
    patient.flags.includes(PatientFlag.ReassessmentDue),
  ).length;
  const sentReferrals = referrals.filter((referral) => referral.status === 'Sent').length;
  const inboundEms = emsUnits.filter((unit) => unit.status === 'Inbound').length;

  if (capacity.band === 'Red' || capacity.band === 'Orange') {
    return `${capacity.band} capacity pressure with ${capacity.boardingCount} boarding patients`;
  }
  if (reassessmentDue > 0) return `${reassessmentDue} reassessments due`;
  if (sentReferrals > 0) return `${sentReferrals} referrals awaiting response`;
  if (inboundEms > 0) return `${inboundEms} EMS units inbound`;
  return 'No major bottleneck detected';
}

export function buildHandoffContext({
  shift,
  staff,
  patients,
  referrals,
  emsUnits,
  capacity,
  now = new Date(),
}: HandoffContextInput) {
  const shiftStartMs = new Date(shift.startTime).getTime();
  const activePatients = patients.filter(isActivePatient);
  const highRisk = activePatients.filter(isHighRiskPatient);
  const onDutyStaff = staff.filter((member) => isOnDuty(member, shift));
  const dischargedCount = patients.filter(
    (patient) =>
      patient.state === PatientState.Discharge &&
      (isInShift(patient, shiftStartMs) || eventAfter(patient, shiftStartMs, /discharge/i)),
  ).length;
  const admittedCount = patients.filter(
    (patient) =>
      patient.state === PatientState.Admission &&
      (isInShift(patient, shiftStartMs) ||
        eventAfter(patient, shiftStartMs, /admission|admitted/i)),
  ).length;

  return {
    shiftDuration: formatDuration(shift.startTime, now),
    staffOnDuty: onDutyStaff.map((member) => `${member.name} (${member.role})`).join(', '),
    patientsActive: activePatients.length,
    patientsDischargedThisShift: dischargedCount,
    patientsAdmittedThisShift: admittedCount,
    highRiskPatients: highRisk.map((patient) => ({
      name: `${patient.firstName} ${patient.lastName}`.trim() || patient.name || patient.mrn,
      complaint: patient.chiefComplaint,
      state: patient.state,
      priority: patient.priority,
      waitMins: calcWait(patient, now),
      flags: patient.flags,
      latestVitals: patient.vitals[0] ?? patient.currentVitals ?? null,
      activeReferrals: referrals.filter((referral) => referral.patientId === patient.id),
      // HEAL-190: the AI previously only ever saw structured fields (state/priority/flags) for
      // high-risk patients, never the actual nursing narrative behind them -- a real oncoming
      // nurse needs the "why", not just the "what." Same recent-notes-only shape already trusted
      // for AI context in patientJourneyAiDecisionService.ts (last 3, text-or-body).
      recentNotes: (patient.notes ?? [])
        .slice(-3)
        .map((note) => note.text || note.body)
        .filter(Boolean),
    })),
    pendingActions: [
      ...referrals.filter((referral) => referral.status === 'Sent'),
      ...patients.filter((patient) => patient.flags.includes(PatientFlag.ReassessmentDue)),
    ],
    emsInbound: emsUnits.filter((unit) => unit.status === 'Inbound'),
    capacityBand: capacity.band,
    bottleneck: detectBottleneck({ capacity, patients, referrals, emsUnits }),
  };
}

export function buildHandoffBriefRequest(context: HandoffContext): AIRequest {
  const message = `Generate a handoff brief from this data:\n${JSON.stringify(context, null, 2)}`;
  return {
    requestType: 'HANDOFF_BRIEF',
    systemPrompt: HANDOFF_BRIEF_SYSTEM_PROMPT,
    message,
    messages: [{ role: 'user', content: message }],
    context: {
      activeWorkspaceId: 'emergency',
      workspaceId: 'emergency',
      workspaceKey: 'emergency',
      aiRequest: {
        requestType: 'HANDOFF_BRIEF',
        handoffContext: context,
      },
    },
  };
}

function responseText(response: AIResponse): string {
  if (typeof response.content === 'string' && response.content.trim()) return response.content;
  const { response: dataResponse, message, content } = response.data;
  if (typeof dataResponse === 'string' && dataResponse.trim()) return dataResponse;
  if (typeof message === 'string' && message.trim()) return message;
  if (typeof content === 'string' && content.trim()) return content;
  return 'No handoff brief returned.';
}

const COMPONENT_STYLES = `
.handoff-brief-generator {
  border: 1px solid var(--medical-border, #e0f2fe);
  border-radius: 18px;
  background: var(--medical-surface-card, #ffffff);
  color: var(--medical-text-body, #111827);
  padding: 20px;
  box-shadow: var(--medical-shadow-lift, 0 16px 36px rgba(14, 165, 233, 0.08));
}

.handoff-brief-generator__header,
.handoff-brief-generator__toolbar,
.handoff-brief-generator__counts {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.handoff-brief-generator__eyebrow {
  color: var(--medical-text-link, #0ea5e9);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.handoff-brief-generator h2 {
  margin: 4px 0;
  font-size: 1.35rem;
}

.handoff-brief-generator p {
  margin: 0;
  color: var(--medical-text-muted, #6b7280);
}

.handoff-brief-generator__toolbar {
  margin: 16px 0;
}

.handoff-brief-generator button,
.handoff-brief-generator__toggle {
  border: 1px solid var(--medical-border, #e0f2fe);
  border-radius: 999px;
  background: var(--medical-surface-card, #ffffff);
  color: var(--medical-text-muted, #6b7280);
  cursor: pointer;
  font: inherit;
  padding: 9px 13px;
}

.handoff-brief-generator button:first-child {
  /* Was var(--medical-accent, ...) -- role-tinted (role-accent-theme.css),
     but "Generate Handoff Brief"/"Regenerate" is a generic utility action
     with no role-identity meaning, the same shape as the Medical IoT
     Refresh button fixed earlier this session. */
  background: var(--app-accent);
  border-color: var(--app-accent);
  color: var(--medical-text-on-accent, #ffffff);
}

.handoff-brief-generator button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.handoff-brief-generator__toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.handoff-brief-generator__error {
  border: 1px solid rgba(239, 68, 68, 0.35);
  border-radius: 12px;
  background: #fef2f2;
  color: var(--medical-status-critical-text, #b91c1c);
  margin: 0 0 12px;
  padding: 10px 12px;
}

.handoff-brief-generator__textarea {
  width: 100%;
  min-height: 360px;
  max-height: 560px;
  resize: vertical;
  overflow: auto;
  border: 1px solid var(--medical-border, #e0f2fe);
  border-radius: 14px;
  background: var(--medical-surface-page, #f0f9ff);
  color: var(--medical-text-body, #111827);
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 0.92rem;
  line-height: 1.55;
  padding: 14px;
}

.handoff-brief-generator__textarea:read-only {
  color: var(--medical-text-muted, #6b7280);
}

.handoff-brief-generator__counts {
  color: var(--medical-text-subtle, #9ca3af);
  font-size: 0.85rem;
  margin-top: 10px;
}

.handoff-brief-generator__print-copy {
  display: none;
}

@media print {
  @page {
    size: A4;
    margin: 18mm;
  }

  body * {
    visibility: hidden !important;
  }

  .handoff-brief-generator,
  .handoff-brief-generator * {
    visibility: visible !important;
  }

  .handoff-brief-generator {
    position: absolute;
    inset: 0 auto auto 0;
    width: 100%;
    border: 0;
    border-radius: 0;
    box-shadow: none;
    background: #fff;
    color: #000;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 14px;
    padding: 0;
  }

  .handoff-brief-generator__header,
  .handoff-brief-generator__toolbar,
  .handoff-brief-generator__counts,
  .handoff-brief-generator__error {
    display: none !important;
  }

  .handoff-brief-generator__textarea {
    display: none !important;
  }

  .handoff-brief-generator__print-copy {
    display: block;
    margin: 0;
    white-space: pre-wrap;
    color: #000;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 14px;
    line-height: 1.45;
  }
}
`;

export default function HandoffBriefGenerator() {
  const shift = useEmergencyStore((state) => state.activeShift);
  const staff = useEmergencyStore((state) => state.staff);
  const patients = useEmergencyStore((state) => state.patients);
  const referrals = useEmergencyStore((state) => state.referrals);
  const emsUnits = useEmergencyStore((state) => state.emsUnits);
  const capacity = useEmergencyStore((state) => state.capacity);
  const [briefText, setBriefText] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState('');
  const [editing, setEditing] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const counts = useMemo(() => countBriefText(briefText), [briefText]);

  const generateBrief = useCallback(async () => {
    setBriefLoading(true);
    setBriefError('');
    setCopyStatus('');

    try {
      const context = buildHandoffContext({
        shift,
        staff,
        patients,
        referrals,
        emsUnits,
        capacity,
        now: new Date(),
      });
      const response = await invokeUnifiedAiHandoffBrief(buildHandoffBriefRequest(context));
      if (!response.ok)
        throw new Error(`Handoff brief request failed with status ${response.status}`);
      setBriefText(responseText(response));
    } catch {
      setBriefError('Unable to generate handoff brief. Check the connection and try again.');
    } finally {
      setBriefLoading(false);
    }
  }, [capacity, emsUnits, patients, referrals, shift, staff]);

  useEffect(() => {
    const handleExternalGenerate = () => {
      void generateBrief();
    };
    window.addEventListener('c16:generate-handoff-brief', handleExternalGenerate);
    document.addEventListener('generate-shift-handoff-brief', handleExternalGenerate);
    return () => {
      window.removeEventListener('c16:generate-handoff-brief', handleExternalGenerate);
      document.removeEventListener('generate-shift-handoff-brief', handleExternalGenerate);
    };
  }, [generateBrief]);

  const copyBrief = async () => {
    await navigator.clipboard.writeText(briefText);
    setCopyStatus('Copied to clipboard.');
  };

  const printBrief = () => {
    window.print();
  };

  return (
    <section
      id="shift-handoff-generator"
      className="handoff-brief-generator"
      aria-label="Generate handoff brief"
    >
      <style>{COMPONENT_STYLES}</style>
      <div className="handoff-brief-generator__header">
        <div>
          <span className="handoff-brief-generator__eyebrow">AI handoff</span>
          <h2>Generate Handoff Brief</h2>
          <p>Creates a factual, editable shift handoff from current ED store data.</p>
        </div>
        <span>{briefLoading ? 'Generating...' : 'Human review required'}</span>
      </div>

      <div className="handoff-brief-generator__toolbar">
        <button type="button" onClick={generateBrief} disabled={briefLoading}>
          {briefText ? 'Regenerate' : 'Generate Handoff Brief'}
        </button>
        <button type="button" onClick={copyBrief} disabled={!briefText || briefLoading}>
          Copy to Clipboard
        </button>
        <button type="button" onClick={printBrief} disabled={!briefText || briefLoading}>
          Print
        </button>
        <label className="handoff-brief-generator__toggle">
          <input
            type="checkbox"
            checked={editing}
            onChange={(event) => setEditing(event.target.checked)}
          />
          Editing mode
        </label>
      </div>

      {briefError ? (
        <p className="handoff-brief-generator__error" role="alert">
          {briefError}
        </p>
      ) : null}

      <textarea
        aria-label="Handoff brief text"
        className="handoff-brief-generator__textarea"
        value={briefText}
        onChange={(event) => setBriefText(event.target.value)}
        placeholder="Generate a handoff brief to populate this read-only area."
        readOnly={!editing}
      />
      <pre className="handoff-brief-generator__print-copy" aria-hidden="true">
        {briefText}
      </pre>

      <div className="handoff-brief-generator__counts">
        <span>
          {counts.characters} characters · {counts.words} words
        </span>
        {copyStatus ? <span role="status">{copyStatus}</span> : null}
      </div>
    </section>
  );
}

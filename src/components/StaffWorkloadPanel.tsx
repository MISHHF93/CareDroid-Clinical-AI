import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { STANDARD_ACTION_FEEDBACK } from '../config/careDroidInteractionModel';
import { showActionSuccess } from '../services/careDroidInteractionFeedback';
import { confirmCareDroidAction } from '../services/careDroidInteractionFeedback';
import { invokeUnifiedAiRequest } from '../services/careDroidUnifiedAiNode';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientState, type Patient, type Staff } from '../types/emergency';
import './StaffWorkloadPanel.css';

export type WorkloadBand = 'gray' | 'green' | 'yellow' | 'red';

export type StaffBalanceSuggestion = {
  id: string;
  patientId: string;
  patientName: string;
  fromStaffId: string;
  fromStaffName: string;
  toStaffId: string;
  toStaffName: string;
  reason?: string;
};

export type WorkloadImbalance = {
  staffId: string;
  name: string;
  count: number;
  average: number;
};

type StaffWorkloadPanelProps = {
  open: boolean;
  onClose: () => void;
};

type StaffWorkloadView = {
  member: Staff;
  patients: Patient[];
  count: number;
  band: WorkloadBand;
  fillPercent: number;
};

type AiStatus = 'idle' | 'loading' | 'ready' | 'error' | 'empty';

const inactiveStatuses = new Set(['OffShift', 'Unavailable']);

export function isActiveStaff(member: Staff): boolean {
  // Staff includes active/status fields; only exclude members explicitly out of service.
  return member.active !== false && !inactiveStatuses.has(String(member.status || ''));
}

export function getPatientName(patient: Patient): string {
  return patient.name || [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Unknown patient';
}

export function getPatientComplaint(patient: Patient): string {
  return patient.complaint || patient.chiefComplaint || patient.complaintCategory || 'No complaint recorded';
}

export function getPatientsForStaff(member: Staff, patients: Patient[]): Patient[] {
  return patients.filter(
    (patient) => patient.assignedStaffId === member.id && ![PatientState.Discharge].includes(patient.state),
  );
}

export function getPatientCountForStaff(member: Staff, patients: Patient[]): number {
  return getPatientsForStaff(member, patients).length;
}

export function getWorkloadBand(count: number): WorkloadBand {
  if (count === 0) return 'gray';
  if (count <= 3) return 'green';
  if (count <= 5) return 'yellow';
  return 'red';
}

export function detectWorkloadImbalance(staff: Staff[], patients: Patient[]): WorkloadImbalance | null {
  const activeStaff = staff.filter(isActiveStaff);
  if (!activeStaff.length) return null;

  const workloads = activeStaff.map((member) => ({
    member,
    count: getPatientCountForStaff(member, patients),
  }));
  const totalAssigned = workloads.reduce((sum, workload) => sum + workload.count, 0);
  const average = totalAssigned / activeStaff.length;
  const max = workloads.reduce(
    (highest, workload) => (workload.count > highest.count ? workload : highest),
    workloads[0],
  );

  if (max.count >= average * 2 && average > 0) {
    return {
      staffId: max.member.id,
      name: getStaffName(max.member),
      count: max.count,
      average: roundAverage(average),
    };
  }
  return null;
}

export function parseStaffBalanceSuggestions(
  text: string,
  staff: Staff[],
  patients: Patient[],
): StaffBalanceSuggestion[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const parsedJsonSuggestions = parseJsonCandidates(trimmed).flatMap((value) =>
    normalizeSuggestionItems(value).flatMap((item, index) => normalizeSuggestion(item, index, staff, patients)),
  );
  if (parsedJsonSuggestions.length) return dedupeSuggestions(parsedJsonSuggestions).slice(0, 3);

  const lineSuggestions = trimmed
    .split('\n')
    .flatMap((line, index) => {
      const match = line
        .replace(/^[-*]\s*/, '')
        .replace(/[.;]\s*$/, '')
        .match(/move\s+(.+?)\s+from\s+(.+?)\s+to\s+(.+)$/i);
      if (!match) return [];
      return normalizeSuggestion(
        {
          patientName: match[1].trim(),
          fromStaffName: match[2].trim(),
          toStaffName: match[3].trim(),
        },
        index,
        staff,
        patients,
      );
    });

  return dedupeSuggestions(lineSuggestions).slice(0, 3);
}

export default function StaffWorkloadPanel({ open, onClose }: StaffWorkloadPanelProps) {
  const staff = useEmergencyStore((s) => s.staff);
  const patients = useEmergencyStore((s) => s.patients);
  const assignStaff = useEmergencyStore((s) => s.assignStaff);
  const addNote = useEmergencyStore((s) => s.addNote);
  const [expandedStaffIds, setExpandedStaffIds] = useState<Set<string>>(() => new Set());
  const [reassigningPatientId, setReassigningPatientId] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus>('idle');
  const [aiError, setAiError] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<StaffBalanceSuggestion[]>([]);

  const activeStaff = useMemo(() => staff.filter(isActiveStaff), [staff]);
  const workloads = useMemo<StaffWorkloadView[]>(
    () =>
      activeStaff.map((member) => {
        const myPatients = getPatientsForStaff(member, patients);
        const count = myPatients.length;
        return {
          member,
          patients: myPatients,
          count,
          band: getWorkloadBand(count),
          fillPercent: count === 0 ? 0 : Math.min(100, Math.max(14, Math.round((count / 6) * 100))),
        };
      }),
    [activeStaff, patients],
  );
  const totalAssigned = workloads.reduce((sum, workload) => sum + workload.count, 0);
  const teamAvg = activeStaff.length ? totalAssigned / activeStaff.length : 0;
  const imbalance = useMemo(() => detectWorkloadImbalance(staff, patients), [patients, staff]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose, open]);

  const reassignPatient = async (
    patient: Patient,
    fromStaff: Staff,
    toStaff: Staff,
  ): Promise<boolean> => {
    const patientName = getPatientName(patient);
    const currentName = getStaffName(fromStaff);
    const newName = getStaffName(toStaff);
    const confirmed = await confirmCareDroidAction({
      title: 'Reassign patient?',
      message: `Move ${patientName} from ${currentName} to ${newName}.`,
      confirmLabel: 'Reassign',
    });
    if (!confirmed) return false;

    assignStaff(patient.id, toStaff.id);
    addNote(patient.id, `Reassigned from ${currentName} to ${newName}`, 'system');
    setReassigningPatientId(null);
    showActionSuccess(STANDARD_ACTION_FEEDBACK.reassigned(patientName, newName));
    return true;
  };

  const handleReassignChange = (
    event: ChangeEvent<HTMLSelectElement>,
    patient: Patient,
    fromStaff: Staff,
  ) => {
    const toStaff = activeStaff.find((candidate) => candidate.id === event.target.value);
    event.target.value = '';
    if (!toStaff || toStaff.id === fromStaff.id) return;
    void reassignPatient(patient, fromStaff, toStaff);
  };

  const applySuggestion = (suggestion: StaffBalanceSuggestion) => {
    const patient = patients.find((candidate) => candidate.id === suggestion.patientId);
    const fromStaff = activeStaff.find((candidate) => candidate.id === suggestion.fromStaffId);
    const toStaff = activeStaff.find((candidate) => candidate.id === suggestion.toStaffId);
    if (!patient || !fromStaff || !toStaff) return;
    if (reassignPatient(patient, fromStaff, toStaff)) {
      setAiSuggestions((current) => current.filter((item) => item.id !== suggestion.id));
    }
  };

  const requestAiSuggestions = async () => {
    setAiStatus('loading');
    setAiError('');
    try {
      const response = await invokeUnifiedAiRequest({
        capabilityId: 'copilot',
        platformServiceId: 'copilot',
        requestType: 'STAFF_BALANCE',
        maxTokens: 700,
        tools: [],
        systemPrompt:
          'You suggest Emergency Department staff workload rebalancing. Return JSON only with 2-3 concrete reassignment suggestions and do not make autonomous clinical decisions.',
        messages: [
          {
            role: 'user',
            content: [
              'Return JSON only using schema:',
              '{"suggestions":[{"patientId":"","fromStaffId":"","toStaffId":"","reason":""}]}',
              'Use only this current staff and patient data.',
              JSON.stringify(buildAiPayload(workloads, teamAvg)),
            ].join('\n'),
          },
        ],
        context: {
          requestType: 'STAFF_BALANCE',
          staffWorkloads: buildAiPayload(workloads, teamAvg),
        },
        domain: 'routing',
        sourceScreen: 'staff_workload_panel',
      });
      const responseText =
        typeof response.content === 'string' && response.content.trim()
          ? response.content
          : JSON.stringify(response.data || {});
      const suggestions = parseStaffBalanceSuggestions(responseText, activeStaff, patients);
      setAiSuggestions(suggestions);
      setAiStatus(suggestions.length ? 'ready' : 'empty');
    } catch (error: any) {
      setAiStatus('error');
      setAiError(error instanceof Error ? error.message : 'Unable to build suggestions.');
      setAiSuggestions([]);
    }
  };

  return (
    <aside
      className={`staff-workload-panel${open ? ' staff-workload-panel--open' : ''}`}
      role="dialog"
      aria-label="Staff workload"
      aria-hidden={!open}
    >
      <header className="staff-workload-panel__header">
        <div>
          <span>Team average {roundAverage(teamAvg)} patients</span>
          <h2>Staff workload</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close staff workload panel">
          X
        </button>
      </header>

      <div className="staff-workload-panel__body">
        {imbalance ? (
          <section className="staff-workload-panel__imbalance" role="status">
            <strong>
              ? Workload imbalance - {imbalance.name} has {imbalance.count} patients vs team average of{' '}
              {imbalance.average}
            </strong>
            <button type="button" onClick={requestAiSuggestions} disabled={aiStatus === 'loading'}>
              {aiStatus === 'loading' ? 'Suggesting...' : 'Suggest rebalance'}
            </button>
          </section>
        ) : null}

        {aiStatus === 'error' ? (
          <p className="staff-workload-panel__ai-message" role="alert">
            Could not load rebalance suggestions. {aiError}
          </p>
        ) : null}
        {aiStatus === 'empty' ? (
          <p className="staff-workload-panel__ai-message">No specific reassignment suggestions returned.</p>
        ) : null}
        {aiSuggestions.length ? (
          <section className="staff-workload-panel__suggestions" aria-label="AI rebalance suggestions">
            <h3>Suggested reassignments</h3>
            {aiSuggestions.map((suggestion) => (
              <article key={suggestion.id}>
                <div>
                  <strong>
                    Move {suggestion.patientName} from {suggestion.fromStaffName} to {suggestion.toStaffName}
                  </strong>
                  {suggestion.reason ? <span>{suggestion.reason}</span> : null}
                </div>
                <button type="button" onClick={() => applySuggestion(suggestion)}>
                  Apply
                </button>
              </article>
            ))}
          </section>
        ) : null}

        <section className="staff-workload-panel__staff-list" aria-label="Staff workload rows">
          {workloads.map((workload) => {
            const expanded = expandedStaffIds.has(workload.member.id);
            const rowId = `staff-workload-${workload.member.id}`;
            return (
              <article key={workload.member.id} className="staff-workload-row">
                <button
                  type="button"
                  className="staff-workload-row__summary"
                  onClick={() => toggleExpandedStaff(setExpandedStaffIds, workload.member.id)}
                  aria-expanded={expanded}
                  aria-controls={rowId}
                >
                  {workload.member.avatarUrl ? (
                    <img src={workload.member.avatarUrl} alt="" loading="lazy" />
                  ) : (
                    <span className="staff-workload-row__avatar">{initialsForStaff(workload.member)}</span>
                  )}
                  <span className="staff-workload-row__identity">
                    <strong>{getStaffName(workload.member)}</strong>
                    <small>{workload.member.roleLabel || workload.member.role}</small>
                  </span>
                  <strong className="staff-workload-row__count" aria-label={`${workload.count} patients`}>
                    {workload.count}
                  </strong>
                  <span
                    className={`staff-workload-row__bar staff-workload-row__bar--${workload.band}`}
                    aria-label={`${workload.count} assigned active patients`}
                  >
                    <span style={{ width: `${workload.fillPercent}%` }} />
                  </span>
                </button>

                {expanded ? (
                  <div id={rowId} className="staff-workload-row__patients">
                    {workload.patients.length ? (
                      workload.patients.map((patient) => (
                        <article key={patient.id} className="staff-workload-patient">
                          <span className={`staff-workload-patient__priority staff-workload-patient__priority--${String(patient.priority).toLowerCase()}`} />
                          <div>
                            <strong>{getPatientName(patient)}</strong>
                            <span>
                              {getPatientComplaint(patient)} - {patient.state}
                            </span>
                          </div>
                          {reassigningPatientId === patient.id ? (
                            <label>
                              <span className="staff-workload-patient__select-label">Reassign to</span>
                              <select
                                autoFocus
                                defaultValue=""
                                aria-label={`Reassign ${getPatientName(patient)} to staff`}
                                onChange={(event) => handleReassignChange(event, patient, workload.member)}
                              >
                                <option value="" disabled>
                                  Choose staff
                                </option>
                                {workloads
                                  .filter((candidate) => candidate.member.id !== workload.member.id)
                                  .map((candidate) => (
                                    <option
                                      key={candidate.member.id}
                                      value={candidate.member.id}
                                      className={`staff-workload-panel__staff-option--${candidate.band}`}
                                    >
                                      {formatStaffOption(candidate)}
                                    </option>
                                  ))}
                              </select>
                            </label>
                          ) : (
                            <button type="button" onClick={() => setReassigningPatientId(patient.id)}>
                              Reassign
                            </button>
                          )}
                        </article>
                      ))
                    ) : (
                      <p>No assigned active patients.</p>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      </div>
    </aside>
  );
}

function toggleExpandedStaff(
  setExpandedStaffIds: (updater: (current: Set<string>) => Set<string>) => void,
  staffId: string,
) {
  setExpandedStaffIds((current) => {
    const next = new Set(current);
    if (next.has(staffId)) next.delete(staffId);
    else next.add(staffId);
    return next;
  });
}

function getStaffName(member: Staff): string {
  return member.displayName || member.name || [member.firstName, member.lastName].filter(Boolean).join(' ') || member.id;
}

function initialsForStaff(member: Staff): string {
  return getStaffName(member)
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function roundAverage(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatStaffOption(workload: StaffWorkloadView): string {
  const patientLabel = workload.count === 1 ? 'patient' : 'patients';
  return `${getStaffName(workload.member)} (${workload.count} ${patientLabel})`;
}

function buildAiPayload(workloads: StaffWorkloadView[], teamAverage: number) {
  return {
    teamAverage: roundAverage(teamAverage),
    staff: workloads.map((workload) => ({
      id: workload.member.id,
      name: getStaffName(workload.member),
      role: workload.member.roleLabel || workload.member.role,
      patientCount: workload.count,
      patients: workload.patients.map((patient) => ({
        id: patient.id,
        name: getPatientName(patient),
        complaint: getPatientComplaint(patient),
        state: patient.state,
        priority: patient.priority,
      })),
    })),
  };
}

function parseJsonCandidates(text: string): unknown[] {
  const candidates = [text];
  const fenced = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((match) => match[1].trim());
  candidates.push(...fenced);

  const objectStart = text.indexOf('{');
  const objectEnd = text.lastIndexOf('}');
  if (objectStart >= 0 && objectEnd > objectStart) candidates.push(text.slice(objectStart, objectEnd + 1));

  const arrayStart = text.indexOf('[');
  const arrayEnd = text.lastIndexOf(']');
  if (arrayStart >= 0 && arrayEnd > arrayStart) candidates.push(text.slice(arrayStart, arrayEnd + 1));

  return candidates.flatMap((candidate) => {
    try {
      return [JSON.parse(candidate)];
    } catch (_error: any) {
      return [];
    }
  });
}

function normalizeSuggestionItems(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (!isRecord(value)) return [];
  const suggestions = value.suggestions;
  return Array.isArray(suggestions) ? suggestions.filter(isRecord) : [];
}

function normalizeSuggestion(
  item: Record<string, unknown>,
  index: number,
  staff: Staff[],
  patients: Patient[],
): StaffBalanceSuggestion[] {
  const patient = resolvePatient(stringValue(item.patientId) || stringValue(item.patientName) || stringValue(item.patient), patients);
  const fromStaff = resolveStaff(stringValue(item.fromStaffId) || stringValue(item.fromStaffName) || stringValue(item.from), staff);
  const toStaff = resolveStaff(stringValue(item.toStaffId) || stringValue(item.toStaffName) || stringValue(item.to), staff);
  if (!patient || !fromStaff || !toStaff || fromStaff.id === toStaff.id) return [];

  return [
    {
      id: stringValue(item.id) || `${patient.id}-${fromStaff.id}-${toStaff.id}-${index}`,
      patientId: patient.id,
      patientName: getPatientName(patient),
      fromStaffId: fromStaff.id,
      fromStaffName: getStaffName(fromStaff),
      toStaffId: toStaff.id,
      toStaffName: getStaffName(toStaff),
      reason: stringValue(item.reason) || stringValue(item.rationale),
    },
  ];
}

function resolvePatient(value: string, patients: Patient[]): Patient | undefined {
  const normalized = normalizeLabel(value);
  return patients.find((patient) => patient.id === value || normalizeLabel(getPatientName(patient)) === normalized);
}

function resolveStaff(value: string, staff: Staff[]): Staff | undefined {
  const normalized = normalizeLabel(value);
  return staff.find((member) => member.id === value || normalizeLabel(getStaffName(member)) === normalized);
}

function normalizeLabel(value: string): string {
  return value.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function dedupeSuggestions(suggestions: StaffBalanceSuggestion[]): StaffBalanceSuggestion[] {
  const seen = new Set<string>();
  return suggestions.filter((suggestion) => {
    const key = `${suggestion.patientId}:${suggestion.fromStaffId}:${suggestion.toStaffId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

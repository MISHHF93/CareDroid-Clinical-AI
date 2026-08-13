import React, { useCallback, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { invokeUnifiedAiRequest } from '../services/careDroidUnifiedAiNode';
import { showActionSuccess } from '../services/careDroidInteractionFeedback';
import './WorkloadBalancePanel.css';

function formatShiftStart(activeShift) {
  if (!activeShift?.startTime) return 'No active shift';
  return `Shift started ${new Date(activeShift.startTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function patientName(patient) {
  return patient?.name || [patient?.firstName, patient?.lastName].filter(Boolean).join(' ') || 'Unknown patient';
}

function patientComplaint(patient) {
  return patient?.chiefComplaint || patient?.complaintCategory || 'No complaint recorded';
}

function patientSummary(patient) {
  return `${patientName(patient)} - ${patientComplaint(patient)} - ${patient?.state || 'Unknown state'}`;
}

function staffCapacityClass(member) {
  return member.assignedCount >= 6 ? 'overloaded' : 'capacity';
}

function buildLocalSuggestions(workloads) {
  const overloaded = workloads
    .filter((member) => member.assignedCount >= 4 && member.assignedPatients?.length)
    .sort((a, b) => b.assignedCount - a.assignedCount);
  const receivers = workloads
    .filter((member) => member.assignedCount < 4)
    .sort((a, b) => a.assignedCount - b.assignedCount);

  if (!overloaded.length || !receivers.length) return [];

  const suggestions = [] as any[];
  overloaded.forEach((fromStaff) => {
    fromStaff.assignedPatients.slice(-2).forEach((patient, index) => {
      const toStaff = receivers[(suggestions.length + index) % receivers.length];
      if (!toStaff || toStaff.id === fromStaff.id) return;
      suggestions.push({
        id: `${patient.id}-${fromStaff.id}-${toStaff.id}`,
        patientId: patient.id,
        fromStaffId: fromStaff.id,
        toStaffId: toStaff.id,
        patientName: patientName(patient),
        fromStaffName: fromStaff.displayName,
        toStaffName: toStaff.displayName,
        reason: `${fromStaff.displayName} has ${fromStaff.assignedCount} patients; ${toStaff.displayName} has ${toStaff.assignedCount}.`,
      });
    });
  });

  return suggestions.slice(0, 3);
}

// Returns { suggestions, source } rather than a bare array so callers can
// honestly disclose when the AI response was empty/malformed and this fell
// back to the local rule-based heuristic instead of silently presenting the
// fallback as if it were a real AI answer.
function parseSuggestionResponse(text, localSuggestions) {
  if (!text) return { suggestions: localSuggestions, source: 'local' as const };
  try {
    const parsed = JSON.parse(text);
    const items = Array.isArray(parsed) ? parsed : parsed.suggestions;
    if (!Array.isArray(items)) return { suggestions: localSuggestions, source: 'local' as const };
    const suggestions = items
      .map((item, index) => {
        const fallback = localSuggestions[index];
        return {
          id: item.id || fallback?.id || `ai-suggestion-${index}`,
          patientId: item.patientId || fallback?.patientId,
          fromStaffId: item.fromStaffId || fallback?.fromStaffId,
          toStaffId: item.toStaffId || fallback?.toStaffId,
          patientName: item.patientName || fallback?.patientName,
          fromStaffName: item.fromStaffName || fallback?.fromStaffName,
          toStaffName: item.toStaffName || fallback?.toStaffName,
          reason: item.reason || fallback?.reason || item.rationale || 'Suggested workload rebalance.',
        };
      })
      .filter((item) => item.patientId && item.toStaffId)
      .slice(0, 3);
    return { suggestions, source: 'ai' as const };
  } catch (_error: any) {
    return {
      suggestions: localSuggestions.map((suggestion, index) => ({
        ...suggestion,
        reason: index === 0 ? text : suggestion.reason,
      })),
      source: 'local' as const,
    };
  }
}

export default function WorkloadBalancePanel({
  open,
  activeShift,
  workloads = [] as any[],
  rebalanceSuggestion,
  currentStaffProfile,
  onClose,
  onAssignStaff,
}) {
  const [expandedStaffIds, setExpandedStaffIds] = useState(() => new Set());
  const [activeReassignPatientId, setActiveReassignPatientId] = useState<any>(null);
  // Stable ref identity so React only focuses the select once on mount, not on every
  // re-render (an inline `ref={(el) => el?.focus()}` would steal focus back on each
  // parent re-render since its identity changes every time).
  const focusOnMount = useCallback((el: HTMLElement | null) => el?.focus(), []);

  const [aiStatus, setAiStatus] = useState('idle');
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [suggestionsSource, setSuggestionsSource] = useState<'ai' | 'local' | null>(null);
  const localSuggestions = useMemo(() => buildLocalSuggestions(workloads), [workloads]);
  const teamAverage = rebalanceSuggestion?.teamAverage ?? 0;

  if (!open) return null;

  const toggleExpanded = (staffId) => {
    setExpandedStaffIds((current) => {
      const next = new Set(current);
      if (next.has(staffId)) next.delete(staffId);
      else next.add(staffId);
      return next;
    });
  };



  const reassignPatient = (patient, fromStaff, toStaffId) => {
    if (!toStaffId || toStaffId === fromStaff.id) return;
    const toStaff = workloads.find((member) => member.id === toStaffId);
    onAssignStaff(patient.id, toStaffId, {
      actorStaffId: currentStaffProfile?.id || activeShift?.chargeStaffId || 'charge-nurse',
      actorName: currentStaffProfile?.displayName,
      fromStaffName: fromStaff.displayName,
      toStaffName: toStaff?.displayName,
      reason: 'Workload balance panel reassignment',
    });
    setActiveReassignPatientId(null);
    showActionSuccess(
      `${patientName(patient)} reassigned`,
      `Now assigned to ${toStaff?.displayName || 'selected staff'}.`,
    );
  };

  const applySuggestion = (suggestion) => {
    const fromStaff = workloads.find((member) => member.id === suggestion.fromStaffId);
    const toStaff = workloads.find((member) => member.id === suggestion.toStaffId);
    const patient = fromStaff?.assignedPatients?.find((candidate) => candidate.id === suggestion.patientId);
    if (!fromStaff || !toStaff || !patient) return;
    reassignPatient(patient, fromStaff, toStaff.id);
    setAiSuggestions((current) => current.filter((item) => item.id !== suggestion.id));
  };

  const suggestRebalance = async () => {
    setAiStatus('loading');
    const staffWorkloads = workloads.map((member) => ({
      id: member.id,
      name: member.displayName,
      role: member.roleLabel,
      patientCount: member.assignedCount,
      patients: (member.assignedPatients || []).map((patient) => ({
        id: patient.id,
        name: patientName(patient),
        complaint: patientComplaint(patient),
        state: patient.state,
        priority: patient.priority,
      })),
    }));
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
              'Return JSON only with 2-3 workload rebalance suggestions.',
              'Schema: {"suggestions":[{"patientId":"","fromStaffId":"","toStaffId":"","reason":""}]}',
              'Use only the provided staff and patient load data.',
              JSON.stringify({ staffWorkloads }),
            ].join('\n'),
          },
        ],
        context: {
          requestType: 'STAFF_BALANCE',
          workspaceId: 'emergency',
          staffWorkloads,
        },
        domain: 'routing',
        sourceScreen: 'workload_balance_panel',
      });
      const text =
        typeof response.content === 'string' && response.content.trim()
          ? response.content
          : JSON.stringify(response.data || {});
      const parsed = parseSuggestionResponse(text, localSuggestions);
      setAiSuggestions(parsed.suggestions);
      setSuggestionsSource(parsed.source);
      setAiStatus('ready');
    } catch (_error: any) {
      setAiSuggestions(localSuggestions);
      setSuggestionsSource('local');
      setAiStatus('error');
    }
  };

  return (
    <aside className="workload-balance-panel" aria-label="Staff workload">
      <header className="workload-balance-panel__header">
        <div>
          <span>{formatShiftStart(activeShift)}</span>
          <h2>Staff workload</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close staff workload panel">
          <X size={18} aria-hidden />
        </button>
      </header>

      <div className="workload-balance-panel__body">
        {rebalanceSuggestion ? (
          <section className="workload-balance-panel__imbalance" role="status">
            <strong>
              Imbalance detected - {rebalanceSuggestion.name} has {rebalanceSuggestion.assignedCount} patients vs team average of {teamAverage}
            </strong>
            <button type="button" onClick={suggestRebalance} disabled={aiStatus === 'loading'}>
              {aiStatus === 'loading' ? 'Building suggestions...' : 'Suggest rebalance'}
            </button>
          </section>
        ) : null}

        {aiStatus === 'error' ? (
          <p className="workload-balance-panel__ai-error" role="status">
            AI rebalance suggestions are unavailable right now — showing rule-based suggestions
            computed from current patient counts instead.
          </p>
        ) : null}

        {aiSuggestions.length ? (
          <section className="workload-balance-panel__suggestions" aria-label="Rebalance suggestions">
            <h3>
              {suggestionsSource === 'ai'
                ? 'AI suggestions - requires review'
                : 'Rule-based suggestions - requires review'}
            </h3>
            {aiSuggestions.map((suggestion) => (
              <article key={suggestion.id}>
                <div>
                  <strong>{suggestion.patientName || 'Patient'}</strong>
                  <span>{suggestion.fromStaffName} to {suggestion.toStaffName}: {suggestion.reason}</span>
                </div>
                <button type="button" onClick={() => applySuggestion(suggestion)}>
                  Apply
                </button>
              </article>
            ))}
          </section>
        ) : null}

        <section className="workload-balance-panel__staff-list">
          {workloads.map((member) => {
            const expanded = expandedStaffIds.has(member.id);
            return (
              <article key={member.id} className="workload-staff-row">
                {expanded ? (<button
                  type="button"
                  className="workload-staff-row__summary"
                  onClick={() => toggleExpanded(member.id)}
                  aria-expanded="true"
                >
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" loading="lazy" />
                  ) : (
                    <span className="workload-staff-row__avatar">{member.initials}</span>
                  )}
                  <span className="workload-staff-row__identity">
                    <strong>{member.displayName}</strong>
                    <small>{member.roleLabel}</small>
                  </span>
                  <strong className="workload-staff-row__count">{member.assignedCount}</strong>
                  <span
                    className={`workload-staff-row__bar workload-staff-row__bar--${member.workloadTone}`}
                    aria-label={`${member.assignedCount} assigned patients`}
                  >
                    <span style={{ width: `${member.assignedCount === 0 ? 0 : Math.max(16, member.workloadPercent)}%` }} />
                  </span>
                </button>) : (<button
                  type="button"
                  className="workload-staff-row__summary"
                  onClick={() => toggleExpanded(member.id)}
                  aria-expanded="false"
                >
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" loading="lazy" />
                  ) : (
                    <span className="workload-staff-row__avatar">{member.initials}</span>
                  )}
                  <span className="workload-staff-row__identity">
                    <strong>{member.displayName}</strong>
                    <small>{member.roleLabel}</small>
                  </span>
                  <strong className="workload-staff-row__count">{member.assignedCount}</strong>
                  <span
                    className={`workload-staff-row__bar workload-staff-row__bar--${member.workloadTone}`}
                    aria-label={`${member.assignedCount} assigned patients`}
                  >
                    <span style={{ width: `${member.assignedCount === 0 ? 0 : Math.max(16, member.workloadPercent)}%` }} />
                  </span>
                </button>)}

                {expanded ? (
                  <div className="workload-staff-row__patients">
                    {member.assignedPatients?.length ? (
                      member.assignedPatients.map((patient) => (
                        <article key={patient.id} className="workload-patient-row">
                          <div>
                            <strong>{patientName(patient)}</strong>
                            <span>{patientComplaint(patient)} - {patient.state}</span>
                          </div>
                          {activeReassignPatientId === patient.id ? (
                            <label>
                              Reassign to:
                              <select
                                ref={focusOnMount}
                                defaultValue=""
                                onChange={(event) => reassignPatient(patient, member, event.target.value)}
                              >
                                <option value="" disabled>Select staff</option>
                                {workloads
                                  .filter((candidate) => candidate.id !== member.id)
                                  .map((candidate) => (
                                    <option
                                      key={candidate.id}
                                      value={candidate.id}
                                      className={`workload-patient-row__option--${staffCapacityClass(candidate)}`}
                                    >
                                      {candidate.displayName} ({candidate.assignedCount})
                                    </option>
                                  ))}
                              </select>
                            </label>
                          ) : (
                            <button type="button" onClick={() => setActiveReassignPatientId(patient.id)}>
                              Reassign
                            </button>
                          )}
                        </article>
                      ))
                    ) : (
                      <p>No assigned active patients.</p>
                    )}
                  </div>
                ) : (
                  <span className="workload-staff-row__compact-list">
                    {(member.assignedPatients || []).slice(0, 3).map(patientSummary).join(' | ') ||
                      'No assigned active patients'}
                  </span>
                )}
              </article>
            );
          })}
        </section>
      </div>


    </aside>
  );
}

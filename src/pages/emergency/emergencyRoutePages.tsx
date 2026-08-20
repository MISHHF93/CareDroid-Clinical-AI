import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { PatientFlag, PatientState } from '../../types/emergency';
import { EMERGENCY_OS_BRANDING } from '../../config/emergencyOsBranding.config';
import useEdRouteDataContext from '../../hooks/useEdRouteDataContext';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import { useEmergencyStore } from '../../store/emergencyStore';
import { confirmCareDroidAction } from '../../services/careDroidInteractionFeedback';
import {
  useBoardingStatus,
  useCapacityStatus,
  useEDCopilot,
  useEmergencyPatients,
  useEmergencyQueues,
  useUpgradeHarnessAuditSummary,
  useUpgradeHarnessCapacity,
  useUpgradeHarnessClinicalIntelligence,
  usePatientJourney,
  useReassessmentQueue,
} from '../../hooks/useEmergencyOs';
import {
  EmergencyRoutePage,
  FlowCapacityViewTabs,
  MetricGrid,
  PatientGrid,
  ApiStateBanner,
  OperationalModuleState,
  isHighRisk,
  isBoarding,
  needsReassessmentAttention,
  QUEUE_MOVEMENT_STAGES,
  findUpgradeSignal,
  displayPatientName,
} from './emergencyRouteShared';
import QueueReasonBadge from '../../components/queues/QueueReasonBadge';
import { AiChiefRouteRecommendationsPanel } from '../../components/ai/AiChiefRouteRecommendationsPanel';
import StateSourceNotice from '../../components/StateSourceNotice';
import { buildSessionEngineSourceDetails } from '../../config/shellEngineCatalog';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import {
  clearPatientRouteParam,
  PATIENT_ROUTE_PARAM_KEYS,
  readPatientRouteContext,
} from '../../utils/receptionQueryParams';
import { AlarmBanner, AlarmKpi } from '../../alarm';


export function PatientsRoute() {
  const surfaces = usePractitionerSurfaceVisibility();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeScenarioId, backendAvailable } = useEdRouteDataContext();
  const storePatients = useEmergencyStore((state) => state.patients);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const patientsModule = useEmergencyPatients();
  const journeyModule = usePatientJourney();
  const patients = patientsModule.data?.data?.patients || storePatients;
  const { contextPatientId: patientIdParam } = readPatientRouteContext(searchParams);
  const patientSearchParam = searchParams.get('patientSearch') || '';
  const query = searchParams.get('q') || patientSearchParam || '';
  const requestedPatient = useMemo(
    () => (patientIdParam ? patients.find((patient) => patient.id === patientIdParam) || null : null),
    [patientIdParam, patients],
  );
  const journeyData = journeyModule.data?.data || {};
  const journeyStateCounts = journeyData.stateCounts || patients.reduce((counts, patient) => {
    counts[patient.state] = (counts[patient.state] || 0) + 1;
    return counts;
  }, {});
  const journeyEvents = Array.isArray(journeyData.events)
    ? journeyData.events
    : patients.flatMap((patient) => patient.timeline || []);
  const visibleJourneyStates = Object.entries(journeyStateCounts)
    .filter(([, count]) => Number(count) > 0)
    .slice(0, 6);
  const highRiskFilterActive = searchParams.get('riskFilter') === 'high';
  const visiblePatients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const base = normalizedQuery
      ? patients.filter((patient) =>
          [
            patient.firstName,
            patient.lastName,
            patient.name,
            patient.mrn,
            patient.chiefComplaint,
            patient.complaint,
            patient.state,
            patient.priority,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery),
        )
      : requestedPatient
        ? [requestedPatient, ...patients.filter((patient) => patient.id !== requestedPatient.id)]
        : patients;
    return highRiskFilterActive ? base.filter(isHighRisk) : base;
  }, [patients, query, requestedPatient, highRiskFilterActive]);

  useEffect(() => {
    if (!patientIdParam || !requestedPatient?.id) return;
    selectPatient(requestedPatient.id);
    setSearchParams(
      clearPatientRouteParam(searchParams, PATIENT_ROUTE_PARAM_KEYS.context),
      { replace: true },
    );
  }, [patientIdParam, requestedPatient?.id, searchParams, selectPatient, setSearchParams]);

  const updateQuery = (value) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value.trim()) nextParams.set('q', value);
    else nextParams.delete('q');
    setSearchParams(nextParams, { replace: true });
  };

  const highRiskCount = patients.filter(isHighRisk).length;
  const waitingCount = patients.filter((patient) => patient.state === PatientState.Waiting).length;

  return (
    <EmergencyRoutePage
      eyebrow="Patients"
      title="Department Patients"
      description="Find active patients, search by name or MRN, and open a patient card for next steps."
      situationBrief={{
        status: `${patients.length} active patient${patients.length === 1 ? '' : 's'} on the board`,
        attention:
          highRiskCount || waitingCount
            ? `${highRiskCount} high-risk · ${waitingCount} waiting`
            : 'No high-risk or waiting backlog flagged',
        owner: 'Care team — open a patient card to confirm assignment',
        nextAction: query
          ? 'Refine search or open a matching patient card'
          : requestedPatient
            ? `Review ${displayPatientName(requestedPatient)} and plan next steps`
            : 'Search or select a patient for handoff',
        tone: highRiskCount > 0 ? 'warning' : 'neutral',
      }}
      actions={
        <label className="emergency-route-search-field">
          Search patients
          <input
            type="search"
            value={query}
            placeholder="Name, MRN, complaint..."
            onChange={(event) => updateQuery(event.target.value)}
          />
        </label>
      }
    >
      <OperationalModuleState
        moduleState={patientsModule}
        activeScenarioId={activeScenarioId}
        backendAvailable={backendAvailable}
        compact
      />
      {highRiskCount > 0 ? (
        <AlarmBanner
          severity="critical"
          title={`${highRiskCount} high-risk patient${highRiskCount === 1 ? '' : 's'} on the board`}
          message="Open a patient card to review flags, assignment, and next clinical action. AI suggestions require human review."
          actions={[
            {
              id: 'review',
              label: highRiskFilterActive ? 'Showing high-risk only' : 'Review list',
              variant: 'primary',
              disabled: highRiskFilterActive,
            },
          ]}
          onAction={(actionId) => {
            // HEAL-347.56: this action was declared with a label but no
            // onAction handler anywhere -- AlarmBanner's own onClick calls
            // onAction?.(action.id), a silent no-op when the caller omits
            // it, live-confirmed via network+DOM-change tracing (zero API
            // calls, zero DOM change on click). Reuses the same isHighRisk
            // predicate already computing highRiskCount above, and the same
            // URL-search-param pattern the existing text search (`q`) uses,
            // so the filter survives a refresh/share like the search does.
            if (actionId !== 'review') return;
            const nextParams = new URLSearchParams(searchParams);
            nextParams.set('riskFilter', 'high');
            setSearchParams(nextParams, { replace: true });
          }}
        />
      ) : null}
      {highRiskFilterActive ? (
        <div role="status" className="emergency-route-card emergency-route-filter-banner">
          <span className="emergency-route-filter-banner__label">
            Showing {visiblePatients.length} high-risk patient{visiblePatients.length === 1 ? '' : 's'} only.
          </span>
          <button
            type="button"
            className="emergency-route-filter-banner__btn"
            onClick={() => {
              const nextParams = new URLSearchParams(searchParams);
              nextParams.delete('riskFilter');
              setSearchParams(nextParams, { replace: true });
            }}
          >
            Clear filter
          </button>
        </div>
      ) : null}
      <div className="cdl-alarm-kpi-rail emergency-route-metric-kpi-rail" aria-label="Department patient metrics">
        <AlarmKpi severity="info" value={patients.length} label="Total patients" />
        <AlarmKpi
          severity={highRiskCount > 0 ? 'critical' : 'ok'}
          value={highRiskCount}
          label="High risk"
          acknowledged={highRiskCount === 0}
        />
        <AlarmKpi
          severity={waitingCount > 0 ? 'warning' : 'ok'}
          value={waitingCount}
          label="Waiting"
          acknowledged={waitingCount === 0}
        />
      </div>
      {surfaces.emergencyRoutes.showJourneyEngineCard ? (
        <>
          <ApiStateBanner
            moduleState={journeyModule}
            fallbackText="Patient Journey endpoint is unavailable; patient cards remain available."
          />
        <article aria-label="Patient Journey backend status" className="emergency-route-card emergency-route-journey-card">
          <div className="emergency-route-section-card__header">
            <div>
              <strong>Patient Journey Engine</strong>
              <p className="emergency-route-section-card__lead">
                Backend state-count and timeline-event envelope rendered through the active Patients route.
              </p>
            </div>
            <span className="emergency-route-journey-card__count">{journeyEvents.length} events</span>
          </div>
          <div className="emergency-route-chip-row">
            {visibleJourneyStates.length ? (
              visibleJourneyStates.map(([state, count]) => (
                <span key={state} className="emergency-route-state-chip">
                  {state}: {count as any}
                </span>
              ))
            ) : (
              <span className="emergency-route-section-card__lead">No active journey state counts yet.</span>
            )}
          </div>
        </article>
        </>
      ) : null}
      <PatientGrid
        patients={visiblePatients}
        emptyMessage={
          query
            ? 'No patients match the current search. Clear the search to return to the active board.'
            : 'No active patients are currently on the board.'
        }
      />
      <OperationalModuleState moduleState={patientsModule} placement="footer" />
    </EmergencyRoutePage>
  );
}

export function QueueRoute() {
  const surfaces = usePractitionerSurfaceVisibility();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const patients = useEmergencyStore((state) => state.patients);
  const staff = useEmergencyStore((state) => state.staff);
  const referrals = useEmergencyStore((state) => state.referrals);
  const { activeScenarioId, backendAvailable } = useEdRouteDataContext();
  const activeQueueFilter = useEmergencyStore((state) => state.activeQueueFilter);
  const setActiveQueueFilter = useEmergencyStore((state) => state.setActiveQueueFilter);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const escalatePatient = useEmergencyStore((state) => state.escalatePatient);
  const queues = useEmergencyQueues();
  const [escalatedIds, setEscalatedIds] = useState<Set<string>>(new Set());
  const requestedQueueFilter =
    searchParams.get('queue') || searchParams.get('filter') || searchParams.get('queueFilter') || '';
  const effectiveQueueFilter = activeQueueFilter || requestedQueueFilter;
  const pendingReferralPatientIds = useMemo(
    () =>
      new Set(
        referrals
          .filter((referral) => !['Closed', 'Completed', 'Declined', 'PatientDeparted'].includes(referral.status))
          .map((referral) => referral.patientId),
      ),
    [referrals],
  );
  const queueRows = useMemo(
    () => [
      {
        label: 'Waiting',
        patients: patients.filter((patient) => patient.state === PatientState.Waiting),
        target: 30,
        movementStages: QUEUE_MOVEMENT_STAGES.Waiting,
      },
      {
        label: 'Triage',
        patients: patients.filter((patient) => patient.state === PatientState.Triage),
        target: 10,
        movementStages: QUEUE_MOVEMENT_STAGES.Triage,
      },
      {
        label: 'Assessment',
        patients: patients.filter((patient) => patient.state === PatientState.Assessment),
        target: 45,
        movementStages: QUEUE_MOVEMENT_STAGES.Assessment,
      },
      {
        label: 'Orders',
        patients: patients.filter((patient) => patient.state === PatientState.Orders),
        target: 60,
        movementStages: QUEUE_MOVEMENT_STAGES.Orders,
      },
      {
        label: 'Results',
        patients: patients.filter((patient) => patient.state === PatientState.Results),
        target: 90,
        movementStages: QUEUE_MOVEMENT_STAGES.Results,
      },
      {
        label: 'Admission',
        patients: patients.filter((patient) => patient.state === PatientState.Admission),
        target: 120,
        movementStages: QUEUE_MOVEMENT_STAGES.Admission,
      },
      {
        label: 'Referral',
        patients: patients.filter((patient) => pendingReferralPatientIds.has(patient.id)),
        target: 60,
        movementStages: QUEUE_MOVEMENT_STAGES.Referral,
      },
      {
        label: 'Discharge',
        patients: patients.filter((patient) => patient.state === PatientState.Disposition),
        target: 60,
        movementStages: QUEUE_MOVEMENT_STAGES.Discharge,
      },
      {
        label: 'Reassessment',
        patients: patients.filter((patient) => patient.flags.includes(PatientFlag.ReassessmentDue)),
        target: 30,
        movementStages: QUEUE_MOVEMENT_STAGES.Reassessment,
      },
    ],
    [patients, pendingReferralPatientIds],
  );
  const apiQueueRows = queues.data?.data?.queues;
  const visibleQueueRows = useMemo(() => {
    if (!apiQueueRows?.length) return queueRows;
    const apiLabels = new Set(apiQueueRows.map((queue) => String(queue.label).toLowerCase()));
    const supplementalJourneyQueues = queueRows.filter(
      (queue) => !apiLabels.has(String(queue.label).toLowerCase()),
    );
    return [...apiQueueRows, ...supplementalJourneyQueues];
  }, [apiQueueRows, queueRows]);
  useEffect(() => {
    if (requestedQueueFilter && requestedQueueFilter !== activeQueueFilter) {
      setActiveQueueFilter(requestedQueueFilter);
    }
  }, [activeQueueFilter, requestedQueueFilter, setActiveQueueFilter]);

  const clearQueueFilter = () => {
    setActiveQueueFilter(null);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('queue');
    nextParams.delete('filter');
    nextParams.delete('queueFilter');
    setSearchParams(nextParams, { replace: true });
  };

  const activeFilterKey = String(effectiveQueueFilter || '').trim().toLowerCase();
  const filteredQueueRows = useMemo(() => {
    if (!activeFilterKey) return visibleQueueRows;
    const exactMatches = visibleQueueRows.filter(
      (queue) => String(queue.label || queue.type || '').toLowerCase() === activeFilterKey,
    );
    return exactMatches.length ? exactMatches : visibleQueueRows;
  }, [activeFilterKey, visibleQueueRows]);
  const queueMetrics = useMemo(() => {
    const totalQueued = filteredQueueRows.reduce(
      (total, queue) => total + (queue.count ?? queue.patients?.length ?? 0),
      0,
    );
    const breachedQueues = filteredQueueRows.filter((queue) => {
      const patientsInQueue = queue.patients || [];
      const oldestWait =
        queue.oldestWaitMinutes ??
        patientsInQueue.reduce((max, patient) => {
          const arrivedAt = new Date(patient.arrivalTime).getTime();
          if (!Number.isFinite(arrivedAt)) return max;
          return Math.max(max, Math.round((Date.now() - arrivedAt) / 60000));
        }, 0);
      const target = queue.targetMinutes ?? queue.target ?? 0;
      return queue.breached ?? oldestWait > target;
    }).length;
    return { totalQueued, breachedQueues };
  }, [filteredQueueRows]);

  const isTriageWorkspace =
    location.pathname.includes('/triage') ||
    activeFilterKey === 'pretriage' ||
    activeFilterKey === 'triage';
  const triageQueue = filteredQueueRows.find((queue) =>
    ['triage', 'pretriage'].includes(String(queue.label || queue.type || '').toLowerCase()),
  );
  const triageCount = triageQueue?.count ?? triageQueue?.patients?.length ?? 0;

  return (
    <EmergencyRoutePage
      eyebrow={isTriageWorkspace ? 'Triage' : 'Queues'}
      title={isTriageWorkspace ? 'Triage Workspace' : 'Department Queues'}
      description={
        isTriageWorkspace
          ? 'Patients awaiting nurse triage. Assign acuity, capture vitals, and route to the waiting or assessment queue.'
          : 'See who is waiting, which queues need attention, and where the next handoff is blocked.'
      }
      situationBrief={{
        status: isTriageWorkspace
          ? `${triageCount} patient${triageCount === 1 ? '' : 's'} awaiting triage`
          : `${queueMetrics.totalQueued} patient${queueMetrics.totalQueued === 1 ? '' : 's'} across ${filteredQueueRows.length} queue${filteredQueueRows.length === 1 ? '' : 's'}`,
        attention:
          queueMetrics.breachedQueues > 0
            ? `${queueMetrics.breachedQueues} queue${queueMetrics.breachedQueues === 1 ? '' : 's'} past target wait`
            : isTriageWorkspace
              ? triageCount
                ? 'Oldest pretriage wait needs first look'
                : 'Pretriage queue clear'
              : 'Queues within target waits',
        owner: isTriageWorkspace
          ? 'Triage nurse owns acuity assignment'
          : effectiveQueueFilter
            ? `${effectiveQueueFilter} queue — charge nurse coordinates`
            : 'Charge nurse coordinates queue movement',
        nextAction:
          queueMetrics.breachedQueues > 0
            ? 'Escalate oldest waits or reassign coverage'
            : isTriageWorkspace
              ? triageCount
                ? 'Open the longest-waiting patient and complete triage'
                : 'Monitor arrivals and prep for next pretriage patient'
              : 'Review longest waits and plan the next handoff',
        tone: queueMetrics.breachedQueues > 0 ? 'warning' : isTriageWorkspace && triageCount ? 'info' : 'neutral',
      }}
    >
      <OperationalModuleState
        moduleState={queues}
        activeScenarioId={activeScenarioId}
        backendAvailable={backendAvailable}
      />
      <MetricGrid
        metrics={[
          { label: 'Total queued', value: queueMetrics.totalQueued, tone: 'info' },
          {
            label: 'Breached queues',
            value: queueMetrics.breachedQueues,
            tone: queueMetrics.breachedQueues ? 'critical' : 'success',
          },
          {
            label: effectiveQueueFilter ? 'Filtered queue' : 'Tracked queues',
            value: effectiveQueueFilter || visibleQueueRows.length,
            tone: 'neutral',
          },
        ]}
      />
      {surfaces.emergencyRoutes.showCrossLinks ? (
        <p className="emergency-route-card emergency-route-muted" role="note">
          Waiting-room safety and fit-to-wait review live on the{' '}
          <Link to={CANONICAL_ROUTES.emergencyWhiteboard}>Emergency Whiteboard</Link>.
        </p>
      ) : null}
      {effectiveQueueFilter ? (
        <div role="status" className="emergency-route-card emergency-route-filter-banner">
          <span className="emergency-route-filter-banner__label">
            Showing the {effectiveQueueFilter} queue requested from the whiteboard.
          </span>
          <button type="button" onClick={clearQueueFilter} className="emergency-route-filter-banner__btn">
            Clear queue filter
          </button>
        </div>
      ) : null}
      <div className="emergency-route-stack">
        {filteredQueueRows.map((queue) => {
          const patientsInQueue = queue.patients || [];
          const movementStages =
            queue.movementStages ||
            QUEUE_MOVEMENT_STAGES[queue.label] ||
            QUEUE_MOVEMENT_STAGES[queue.type] ||
            [];
          const oldestWait =
            queue.oldestWaitMinutes ??
            patientsInQueue.reduce((max, patient) => {
              const arrivedAt = new Date(patient.arrivalTime).getTime();
              if (!Number.isFinite(arrivedAt)) return max;
              return Math.max(max, Math.round((Date.now() - arrivedAt) / 60000));
            }, 0);
          const target = queue.targetMinutes ?? queue.target;
          const breached = queue.breached ?? oldestWait > target;
          return (
            <article
              key={queue.label}
              className={`emergency-route-card emergency-route-queue-row${breached ? ' emergency-route-queue-row--breached' : ''}`}
            >
              <div>
                <strong>{queue.label}</strong>
                <div className="emergency-route-queue-row__patients" aria-label={`${queue.label} queue patients`}>
                  {patientsInQueue.length ? (
                    patientsInQueue.slice(0, 3).map((patient) => {
                      const patientWait = patient.arrivalTime
                        ? Math.round((Date.now() - new Date(patient.arrivalTime).getTime()) / 60000)
                        : 0;
                      const patientBreached = patientWait > target;
                      const alreadyEscalated = escalatedIds.has(patient.id);
                      return (
                        <span key={patient.id} className="emergency-route-queue-row__patient emergency-route-queue-row__patient--inline">
                          <button
                            type="button"
                            onClick={() => selectPatient(patient.id)}
                            className="emergency-route-queue-row__patient-btn"
                          >
                            {displayPatientName(patient)}
                          </button>
                          <QueueReasonBadge
                            patient={patient}
                            referrals={referrals}
                            staff={staff}
                            compact
                            showAll
                          />
                          {patientBreached && !alreadyEscalated && (
                            <button
                              type="button"
                              title={`Wait: ${patientWait}m — breaches ${target}m target. Click to escalate.`}
                              onClick={async () => {
                                // HEAL-227: fired escalatePatient() directly on
                                // click with zero confirmation, unlike this
                                // same store action's other real call site
                                // (AiChiefRouteRecommendationsPanel.tsx's
                                // handleAccept), which requires an explicit
                                // confirmCareDroidAction step first.
                                const confirmed = await confirmCareDroidAction({
                                  title: 'Escalate patient?',
                                  message: `${displayPatientName(patient)} has breached the ${target}m wait target and will be escalated.`,
                                  confirmLabel: 'Escalate patient',
                                  tone: 'danger',
                                });
                                if (!confirmed) return;
                                escalatePatient(patient.id, { staffId: 'charge-nurse-current', staffName: 'Charge Nurse' });
                                setEscalatedIds((prev) => new Set([...prev, patient.id]));
                              }}
                              className="emergency-route-queue-row__escalate-btn"
                            >
                              ⚡ Escalate
                            </button>
                          )}
                          {alreadyEscalated && (
                            <span className="emergency-route-queue-row__escalated-badge">✓ Escalated</span>
                          )}
                        </span>
                      );
                    })
                  ) : (
                    'Queue clear'
                  )}
                </div>
                {movementStages.length ? (
                  <small className="emergency-route-queue-row__movement">
                    Movement stage: {movementStages.join(' / ')}
                  </small>
                ) : null}
              </div>
              <strong className="emergency-route-queue-row__count">
                {queue.count ?? patientsInQueue.length}
              </strong>
              <span
                className={`emergency-route-queue-row__oldest${breached ? ' emergency-route-queue-row__oldest--breached' : ' emergency-route-queue-row__oldest--ok'}`}
              >
                Oldest {oldestWait}m
              </span>
            </article>
          );
        })}
      </div>
      <OperationalModuleState moduleState={queues} placement="footer" />
    </EmergencyRoutePage>
  );
}

export function ReassessmentRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const patients = useEmergencyStore((state) => state.patients);
  const { activeScenarioId, backendAvailable } = useEdRouteDataContext();
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const reassessment = useReassessmentQueue();
  const { contextPatientId: patientIdParam } = readPatientRouteContext(searchParams);
  const requestedPatient = useMemo(
    () => (patientIdParam ? patients.find((patient) => patient.id === patientIdParam) || null : null),
    [patientIdParam, patients],
  );
  const duePatients = useMemo(() => {
    const byId = new Map();
    for (const patient of reassessment.data?.data?.patients || []) {
      byId.set(patient.id, patient);
    }
    for (const patient of patients.filter(needsReassessmentAttention)) {
      byId.set(patient.id, patient);
    }
    return [...byId.values()];
  }, [patients, reassessment.data]);
  const prioritizedDuePatients = useMemo(() => {
    if (!requestedPatient || !duePatients.some((patient) => patient.id === requestedPatient.id)) {
      return duePatients;
    }
    return [requestedPatient, ...duePatients.filter((patient) => patient.id !== requestedPatient.id)];
  }, [duePatients, requestedPatient]);
  const overdueCount = Math.max(
    reassessment.data?.data?.overdueCount ?? 0,
    patients.filter((patient) => patient.flags.includes(PatientFlag.ReassessmentDue)).length,
  );

  useEffect(() => {
    if (!patientIdParam || !requestedPatient?.id) return;
    selectPatient(requestedPatient.id);
    setSearchParams(
      clearPatientRouteParam(searchParams, PATIENT_ROUTE_PARAM_KEYS.context),
      { replace: true },
    );
  }, [patientIdParam, requestedPatient?.id, searchParams, selectPatient, setSearchParams]);

  return (
    <EmergencyRoutePage
      eyebrow="Safety"
      title="Reassessment"
      description="Patients due for another look. Open a patient card to review details and update the plan."
      situationBrief={{
        status: `${prioritizedDuePatients.length} patient${prioritizedDuePatients.length === 1 ? '' : 's'} due for reassessment`,
        attention:
          overdueCount > 0
            ? `${overdueCount} overdue reassessment${overdueCount === 1 ? '' : 's'}`
            : prioritizedDuePatients.length
              ? 'Due patients within safety window'
              : 'No reassessments due',
        owner: 'Assigned nurse or physician owns follow-up',
        nextAction: prioritizedDuePatients.length
          ? `Open ${displayPatientName(prioritizedDuePatients[0])} and update the plan`
          : 'Monitor waiting-room patients for change in status',
        tone: overdueCount > 0 ? 'critical' : prioritizedDuePatients.length ? 'warning' : 'neutral',
      }}
    >
      <OperationalModuleState
        moduleState={reassessment}
        activeScenarioId={activeScenarioId}
        backendAvailable={backendAvailable}
      />
      <MetricGrid
        metrics={[
          {
            label: 'Due now',
            value: prioritizedDuePatients.length,
            tone: prioritizedDuePatients.length ? 'warning' : 'success',
          },
          { label: 'Overdue', value: overdueCount, tone: overdueCount ? 'critical' : 'success' },
          {
            label: 'Next action',
            value: reassessment.data?.data?.nextAction || 'Review queue',
            tone: 'info',
          },
        ]}
      />
      <PatientGrid patients={prioritizedDuePatients} emptyMessage="No reassessments are due right now." />
      <OperationalModuleState moduleState={reassessment} placement="footer" />
    </EmergencyRoutePage>
  );
}

export function BoardingRoute() {
  return <Navigate to={`${CANONICAL_ROUTES.emergencyCapacity}?view=boarding`} replace />;
}

export function CapacityRoute() {
  const surfaces = usePractitionerSurfaceVisibility();
  const [searchParams, setSearchParams] = useSearchParams();
  const storeCapacity = useEmergencyStore((state) => state.capacity);
  const storeRooms = useEmergencyStore((state) => state.rooms);
  const patients = useEmergencyStore((state) => state.patients);
  const { activeScenarioId, backendAvailable } = useEdRouteDataContext();
  const capacityStatus = useCapacityStatus();
  const boarding = useBoardingStatus();
  const upgradeCapacity = useUpgradeHarnessCapacity();
  const capacity = capacityStatus.data?.data?.capacity || storeCapacity;
  const rooms = capacityStatus.data?.data?.rooms || storeRooms;
  const upgradeSignals = upgradeCapacity.data?.data?.signals || [];
  const simulationSignal = findUpgradeSignal(upgradeSignals, 'real_time_simulation_adaptive_policy');
  const bragSignal = findUpgradeSignal(upgradeSignals, 'brag_forecast_10h');
  const availableRooms = rooms.filter((room) => room.status === 'Available').length;
  const blockedRooms = rooms.filter((room) => room.status === 'Blocked').length;
  const boardingPatients = boarding.data?.data?.patients || patients.filter(isBoarding);
  const activeView = searchParams.get('view') === 'boarding' ? 'boarding' : 'capacity';

  const setActiveView = (view) => {
    const nextParams = new URLSearchParams(searchParams);
    if (view === 'boarding') nextParams.set('view', 'boarding');
    else nextParams.delete('view');
    setSearchParams(nextParams, { replace: true });
  };

  const longestBoardingMinutes = boarding.data?.data?.longestBoardingMinutes ?? 0;
  const capacitySituationBrief =
    activeView === 'boarding'
      ? {
          status: `${boardingPatients.length} boarding patient${boardingPatients.length === 1 ? '' : 's'}`,
          attention:
            longestBoardingMinutes > 120
              ? `Longest boarding ${longestBoardingMinutes}m — above target`
              : boardingPatients.length
                ? 'Boarding load within routine range'
                : 'No boarding backlog',
          owner: 'Bed management / charge nurse owns placement',
          nextAction:
            boarding.data?.data?.escalation && boarding.data.data.escalation !== 'No escalation'
              ? String(boarding.data.data.escalation)
              : boardingPatients.length
                ? 'Prioritize longest boarders for disposition or transfer'
                : 'Monitor inpatient bed availability',
          tone:
            longestBoardingMinutes > 240 ? 'critical' : longestBoardingMinutes > 120 ? 'warning' : 'neutral',
        }
      : {
          status: `Capacity band ${capacity.band ?? 'unknown'} · ${availableRooms} rooms available`,
          attention:
            blockedRooms > 0
              ? `${blockedRooms} blocked room${blockedRooms === 1 ? '' : 's'}`
              : capacity.band === 'critical' || capacity.band === 'surge'
                ? 'Department at elevated capacity'
                : 'Room pressure stable',
          owner: 'Charge nurse and bed coordinator',
          nextAction:
            blockedRooms > 0
              ? 'Clear blocked rooms or reroute incoming patients'
              : 'Balance arrivals against available treatment space',
          tone:
            capacity.band === 'critical' || blockedRooms > 2
              ? 'warning'
              : capacity.band === 'surge'
                ? 'info'
                : 'neutral',
        };

  return (
    <EmergencyRoutePage
      eyebrow="Flow coordination"
      title="Flow & Capacity"
      maturity={activeView === 'boarding' ? 'demo' : undefined}
      description="Room pressure, boarding load, and department flow in one coordinated view."
      situationBrief={capacitySituationBrief}
    >
      <FlowCapacityViewTabs activeView={activeView} onViewChange={setActiveView} />
      <StateSourceNotice
        title="Capacity data source"
        states={[
          backendAvailable ? DEMO_LIVE_STATES.LIVE : DEMO_LIVE_STATES.BACKEND_UNAVAILABLE,
          DEMO_LIVE_STATES.SESSION_ENGINE,
        ]}
        details={buildSessionEngineSourceDetails(['capacity', 'alertsPoll'])}
      />
      {activeView === 'boarding' ? (
        <>
          <OperationalModuleState
            moduleState={boarding}
            activeScenarioId={activeScenarioId}
            backendAvailable={backendAvailable}
          />
          <MetricGrid
            metrics={[
              {
                label: 'Boarding patients',
                value: boardingPatients.length,
                tone: boardingPatients.length ? 'warning' : 'success',
              },
              {
                label: 'Longest boarding',
                value: `${boarding.data?.data?.longestBoardingMinutes ?? 0}m`,
                tone: 'urgent',
              },
              {
                label: 'Escalation',
                value: boarding.data?.data?.escalation || 'No escalation',
                tone: 'info',
              },
            ]}
          />
          <PatientGrid patients={boardingPatients} emptyMessage="No active boarding patients." />
          <OperationalModuleState moduleState={boarding} placement="footer" />
        </>
      ) : (
        <>
          <OperationalModuleState
            moduleState={capacityStatus}
            activeScenarioId={activeScenarioId}
            backendAvailable={backendAvailable}
          />
          <MetricGrid
            metrics={[
              {
                label: 'Capacity score',
                value: `${capacity.score} ${capacity.band}`,
                tone: 'info',
              },
              { label: 'Occupied rooms', value: capacity.occupiedRooms, tone: 'neutral' },
              {
                label: 'Available rooms',
                value: availableRooms,
                tone: availableRooms ? 'success' : 'warning',
              },
              {
                label: 'Blocked rooms',
                value: blockedRooms,
                tone: blockedRooms ? 'urgent' : 'success',
              },
              {
                label: 'Boarding patients',
                value: capacity.boardingCount,
                tone: capacity.boardingCount ? 'warning' : 'success',
              },
              {
                label: 'Reassessment due',
                value: capacity.reassessmentDue,
                tone: capacity.reassessmentDue ? 'critical' : 'success',
              },
            ]}
          />
          {capacityStatus.data?.data?.recommendations?.length ? (
            <div className="emergency-route-stack">
              {capacityStatus.data.data.recommendations.map((recommendation) => (
                <div key={recommendation} className="emergency-route-card emergency-route-recommendation">
                  {recommendation}
                </div>
              ))}
            </div>
          ) : null}
          {surfaces.emergencyRoutes.showCapacityUpgradeHarness && (simulationSignal || bragSignal) ? (
            <div className="emergency-route-signal-grid">
              {simulationSignal ? (
                <article className="emergency-route-card emergency-route-signal-row">
                  <div className="emergency-route-signal-row__main">
                    <strong>Adaptive policy simulation</strong>
                    <span>
                      Pressure {simulationSignal.data.currentPressureScore};{' '}
                      {simulationSignal.data.recommendedPolicyReview}
                    </span>
                  </div>
                  <small>{simulationSignal.safety.humanReviewMessage}</small>
                </article>
              ) : null}
              {bragSignal ? (
                <article className="emergency-route-card emergency-route-signal-row">
                  <div className="emergency-route-signal-row__main">
                    <strong>10-hour BRAG forecast</strong>
                    <span>
                      Peak band {bragSignal.data.peakBand};{' '}
                      {(bragSignal.data.forecast || []).slice(-1)[0]?.humanReviewTrigger}
                    </span>
                  </div>
                  <small>
                    Confidence {Math.round((bragSignal.confidence || 0) * 100)}% · Audit{' '}
                    {String(bragSignal.audit.immutableLedgerHash).slice(0, 10)}
                  </small>
                </article>
              ) : null}
            </div>
          ) : null}
          <OperationalModuleState moduleState={capacityStatus} placement="footer" />
        </>
      )}
    </EmergencyRoutePage>
  );
}

export function CopilotRoute() {
  const surfaces = usePractitionerSurfaceVisibility();
  const patients = useEmergencyStore((state) => state.patients);
  const capacity = useEmergencyStore((state) => state.capacity);
  const { activeScenarioId, backendAvailable } = useEdRouteDataContext();
  const copilot = useEDCopilot();
  const upgradeClinical = useUpgradeHarnessClinicalIntelligence();
  const upgradeAudit = useUpgradeHarnessAuditSummary();
  const promptContext = copilot.data?.data?.promptContext || {};
  const clinicalSignals = upgradeClinical.data?.data?.signals || [];
  const cdssSignal = findUpgradeSignal(clinicalSignals, 'multimodal_cdss');
  const telephoneSignal = findUpgradeSignal(clinicalSignals, 'telephone_triage_diversion');
  const federatedSignal = findUpgradeSignal(clinicalSignals, 'federated_learning_harness');
  const auditSignal = upgradeAudit.data?.data?.signals?.[0] || null;
  const activePatients = patients.filter((patient) => patient.state !== PatientState.Discharge);
  const highRiskPatients = activePatients.filter(isHighRisk);
  const showUpgradeSignals = surfaces.copilotRoute.showUpgradeSignals;
  const showRouteMetrics = surfaces.copilotRoute.showRouteMetrics;

  const capacityBand = promptContext.capacity?.band ?? capacity.band;

  return (
    <EmergencyRoutePage
      eyebrow="Clinical copilot"
      title={EMERGENCY_OS_BRANDING.copilotName}
      description="Human-reviewed workflow support for routing, context, and next-step prompts."
      situationBrief={{
        status: `${promptContext.patientCount ?? activePatients.length} active patients · capacity ${capacityBand}`,
        attention:
          (promptContext.highRiskCount ?? highRiskPatients.length) > 0
            ? `${promptContext.highRiskCount ?? highRiskPatients.length} high-risk patient${(promptContext.highRiskCount ?? highRiskPatients.length) === 1 ? '' : 's'} flagged`
            : 'No high-risk patients flagged in context',
        owner: 'Clinical team with copilot assist — human review required',
        nextAction: highRiskPatients.length
          ? 'Review AI Chief recommendations for highest-risk patients'
          : `Open the docked ${EMERGENCY_OS_BRANDING.copilotName} panel for routing prompts`,
        tone: highRiskPatients.length ? 'warning' : 'info',
      }}
    >
      <OperationalModuleState
        moduleState={copilot}
        activeScenarioId={activeScenarioId}
        backendAvailable={backendAvailable}
        compact
        showApiState={showRouteMetrics}
      />
      {showRouteMetrics ? (
        <MetricGrid
          metrics={[
            {
              label: 'Active patients',
              value: promptContext.patientCount ?? activePatients.length,
              tone: 'info',
            },
            {
              label: 'High risk',
              value: promptContext.highRiskCount ?? highRiskPatients.length,
              tone:
                (promptContext.highRiskCount ?? highRiskPatients.length) > 0
                  ? 'critical'
                  : 'success',
            },
            {
              label: 'Capacity band',
              value: promptContext.capacity?.band ?? capacity.band,
              tone: 'info',
            },
          ]}
        />
      ) : null}
      {showRouteMetrics && copilot.data?.data?.quickActions?.length ? (
        <div className="emergency-route-chip-row">
          {copilot.data.data.quickActions.map((action) => (
            <span key={action} className="emergency-route-action-chip">
              {action}
            </span>
          ))}
        </div>
      ) : null}

      <AiChiefRouteRecommendationsPanel />

      <p className="emergency-route-card emergency-route-copilot-hint">
        Open the docked {EMERGENCY_OS_BRANDING.copilotName} panel to ask who needs attention, capacity
        pressure, EMS status, or reassessment priorities. {EMERGENCY_OS_BRANDING.safetyLine}
      </p>
      {showUpgradeSignals && (cdssSignal || telephoneSignal || federatedSignal || auditSignal) ? (
        <div className="emergency-route-signal-grid">
          {[
            cdssSignal && {
              title: 'CDSS safety gate',
              body: `${cdssSignal.data.reviewQueue?.length || 0} high-risk review cards. ${cdssSignal.data.safetyGate}`,
              meta: cdssSignal.safety.status,
            },
            telephoneSignal && {
              title: 'Telephone triage diversion',
              body: `${telephoneSignal.data.candidates?.length || 0} candidates held for human approval.`,
              meta: telephoneSignal.data.diversionStatus,
            },
            federatedSignal && {
              title: 'Federated insights',
              body: `Pilot model ${federatedSignal.data.modelCard?.modelId}; no PHI leaves the fixture contract.`,
              meta: `AUC ${federatedSignal.data.modelCard?.metrics?.auc}`,
            },
            auditSignal && {
              title: 'Immutable audit summary',
              body: `${auditSignal.data.ledgerEntries?.length || 0} linked pilot ledger entries.`,
              meta: String(auditSignal.data.latestHash || auditSignal.audit.immutableLedgerHash).slice(0, 12),
            },
          ]
            .filter(Boolean)
            .map((card) => (
              <article key={card.title} className="emergency-route-card emergency-route-signal-row">
                <div className="emergency-route-signal-row__main">
                  <strong>{card.title}</strong>
                  <span>{card.body}</span>
                </div>
                <small>{card.meta}</small>
              </article>
            ))}
        </div>
      ) : null}
      {showRouteMetrics ? (
        <OperationalModuleState moduleState={copilot} placement="footer" />
      ) : null}
    </EmergencyRoutePage>
  );
}
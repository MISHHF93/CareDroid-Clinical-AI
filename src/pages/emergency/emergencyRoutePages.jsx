import { useEffect, useMemo } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { PatientFlag, PatientState } from '../../types/emergency';
import { EMERGENCY_OS_BRANDING } from '../../config/emergencyOsBranding.config';
import {
  shouldHidePatientJourneyEngineCard,
  shouldSuppressCopilotRouteMetrics,
  shouldSuppressCopilotRouteUpgradeSignals,
} from '../../config/practitionerCleanup.config';
import EdDataSourceBanner from '../../components/emergency/EdDataSourceBanner';
import { useEmergencyStore } from '../../store/emergencyStore';
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
  DataSourceNote,
  isHighRisk,
  isBoarding,
  needsReassessmentAttention,
  QUEUE_MOVEMENT_STAGES,
  findUpgradeSignal,
  displayPatientName,
} from './emergencyRouteShared';
import QueueReasonBadge from '../../components/queues/QueueReasonBadge';
import {
  clearPatientRouteParam,
  PATIENT_ROUTE_PARAM_KEYS,
  readPatientRouteContext,
} from '../../utils/receptionQueryParams';


export function PatientsRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const storePatients = useEmergencyStore((state) => state.patients);
  const activeScenarioId = useEmergencyStore((state) => state.activeScenarioId);
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
  const visiblePatients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return requestedPatient
        ? [requestedPatient, ...patients.filter((patient) => patient.id !== requestedPatient.id)]
        : patients;
    }
    return patients.filter((patient) =>
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
    );
  }, [patients, query, requestedPatient]);

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

  return (
    <EmergencyRoutePage
      eyebrow="Patients"
      title="Department Patients"
      description="Find active patients, search by name or MRN, and open a patient card for next steps."
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
      <EdDataSourceBanner
        envelope={patientsModule.data}
        loading={patientsModule.loading}
        error={patientsModule.error}
        activeScenarioId={activeScenarioId}
        compact
      />
      <ApiStateBanner moduleState={patientsModule} />
      <MetricGrid
        metrics={[
          { label: 'Total patients', value: patients.length, color: '#60A5FA' },
          { label: 'High risk', value: patients.filter(isHighRisk).length, color: '#EF4444' },
          {
            label: 'Waiting',
            value: patients.filter((patient) => patient.state === PatientState.Waiting).length,
            color: '#F59E0B',
          },
        ]}
      />
      <ApiStateBanner
        moduleState={journeyModule}
        fallbackText="Patient Journey endpoint is unavailable; patient cards remain available."
      />
      {!shouldHidePatientJourneyEngineCard() ? (
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
                  {state}: {count}
                </span>
              ))
            ) : (
              <span className="emergency-route-section-card__lead">No active journey state counts yet.</span>
            )}
          </div>
        </article>
      ) : null}
      <PatientGrid
        patients={visiblePatients}
        emptyMessage={
          query
            ? 'No patients match the current search. Clear the search to return to the active board.'
            : 'No active patients are currently on the board.'
        }
      />
      <DataSourceNote moduleState={patientsModule} />
    </EmergencyRoutePage>
  );
}

export function QueueRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const patients = useEmergencyStore((state) => state.patients);
  const staff = useEmergencyStore((state) => state.staff);
  const referrals = useEmergencyStore((state) => state.referrals);
  const activeScenarioId = useEmergencyStore((state) => state.activeScenarioId);
  const activeQueueFilter = useEmergencyStore((state) => state.activeQueueFilter);
  const setActiveQueueFilter = useEmergencyStore((state) => state.setActiveQueueFilter);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const queues = useEmergencyQueues();
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

  return (
    <EmergencyRoutePage
      eyebrow="Queues"
      title="Department Queues"
      description="See who is waiting, which queues need attention, and where the next handoff is blocked."
    >
      <EdDataSourceBanner
        envelope={queues.data}
        loading={queues.loading}
        error={queues.error}
        activeScenarioId={activeScenarioId}
      />
      <ApiStateBanner moduleState={queues} />
      <MetricGrid
        metrics={[
          { label: 'Total queued', value: queueMetrics.totalQueued, color: '#60A5FA' },
          {
            label: 'Breached queues',
            value: queueMetrics.breachedQueues,
            color: queueMetrics.breachedQueues ? '#EF4444' : '#10B981',
          },
          {
            label: effectiveQueueFilter ? 'Filtered queue' : 'Tracked queues',
            value: effectiveQueueFilter || visibleQueueRows.length,
          },
        ]}
      />
      <p className="emergency-route-card emergency-route-muted" role="note">
        Waiting-room safety and fit-to-wait review live on the{' '}
        <Link to={CANONICAL_ROUTES.emergencyWhiteboard}>Emergency Whiteboard</Link>.
      </p>
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
                    patientsInQueue.slice(0, 3).map((patient) => (
                      <span key={patient.id} className="emergency-route-queue-row__patient">
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
                      </span>
                    ))
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
      <DataSourceNote moduleState={queues} />
    </EmergencyRoutePage>
  );
}

export function ReassessmentRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const patients = useEmergencyStore((state) => state.patients);
  const activeScenarioId = useEmergencyStore((state) => state.activeScenarioId);
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
    >
      <EdDataSourceBanner
        envelope={reassessment.data}
        loading={reassessment.loading}
        error={reassessment.error}
        activeScenarioId={activeScenarioId}
      />
      <ApiStateBanner moduleState={reassessment} />
      <MetricGrid
        metrics={[
          {
            label: 'Due now',
            value: prioritizedDuePatients.length,
            color: prioritizedDuePatients.length ? '#F59E0B' : '#10B981',
          },
          { label: 'Overdue', value: overdueCount, color: '#EF4444' },
          { label: 'Next action', value: reassessment.data?.data?.nextAction || 'Review queue' },
        ]}
      />
      <PatientGrid patients={prioritizedDuePatients} emptyMessage="No reassessments are due right now." />
      <DataSourceNote moduleState={reassessment} />
    </EmergencyRoutePage>
  );
}

export function BoardingRoute() {
  return <Navigate to={`${CANONICAL_ROUTES.emergencyCapacity}?view=boarding`} replace />;
}

export function CapacityRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const storeCapacity = useEmergencyStore((state) => state.capacity);
  const storeRooms = useEmergencyStore((state) => state.rooms);
  const patients = useEmergencyStore((state) => state.patients);
  const activeScenarioId = useEmergencyStore((state) => state.activeScenarioId);
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

  return (
    <EmergencyRoutePage
      eyebrow="Flow coordination"
      title="Flow & Capacity"
      maturity={activeView === 'boarding' ? 'demo' : undefined}
      description="Room pressure, boarding load, and department flow in one coordinated view."
    >
      <FlowCapacityViewTabs activeView={activeView} onViewChange={setActiveView} />
      {activeView === 'boarding' ? (
        <>
          <EdDataSourceBanner
            envelope={boarding.data}
            loading={boarding.loading}
            error={boarding.error}
            activeScenarioId={activeScenarioId}
          />
          <ApiStateBanner moduleState={boarding} />
          <MetricGrid
            metrics={[
              { label: 'Boarding patients', value: boardingPatients.length, color: '#F59E0B' },
              {
                label: 'Longest boarding',
                value: `${boarding.data?.data?.longestBoardingMinutes ?? 0}m`,
                color: '#F97316',
              },
              { label: 'Escalation', value: boarding.data?.data?.escalation || 'No escalation' },
            ]}
          />
          <PatientGrid patients={boardingPatients} emptyMessage="No active boarding patients." />
          <DataSourceNote moduleState={boarding} />
        </>
      ) : (
        <>
          <EdDataSourceBanner
            envelope={capacityStatus.data}
            loading={capacityStatus.loading}
            error={capacityStatus.error}
            activeScenarioId={activeScenarioId}
          />
          <ApiStateBanner moduleState={capacityStatus} />
          <MetricGrid
            metrics={[
              {
                label: 'Capacity score',
                value: `${capacity.score} ${capacity.band}`,
                color: '#60A5FA',
              },
              { label: 'Occupied rooms', value: capacity.occupiedRooms },
              { label: 'Available rooms', value: availableRooms, color: '#10B981' },
              { label: 'Blocked rooms', value: blockedRooms, color: '#F97316' },
              { label: 'Boarding patients', value: capacity.boardingCount, color: '#F59E0B' },
              { label: 'Reassessment due', value: capacity.reassessmentDue, color: '#EF4444' },
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
          {simulationSignal || bragSignal ? (
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
          <DataSourceNote moduleState={capacityStatus} />
        </>
      )}
    </EmergencyRoutePage>
  );
}

export function CopilotRoute() {
  const patients = useEmergencyStore((state) => state.patients);
  const capacity = useEmergencyStore((state) => state.capacity);
  const activeScenarioId = useEmergencyStore((state) => state.activeScenarioId);
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
  const showUpgradeSignals = !shouldSuppressCopilotRouteUpgradeSignals();
  const showRouteMetrics = !shouldSuppressCopilotRouteMetrics();

  return (
    <EmergencyRoutePage
      eyebrow="Clinical copilot"
      title={EMERGENCY_OS_BRANDING.copilotName}
      description="Human-reviewed workflow support for routing, context, and next-step prompts."
    >
      <EdDataSourceBanner
        envelope={copilot.data}
        loading={copilot.loading}
        error={copilot.error}
        activeScenarioId={activeScenarioId}
        compact
      />
      {showRouteMetrics ? <ApiStateBanner moduleState={copilot} /> : null}
      {showRouteMetrics ? (
        <MetricGrid
          metrics={[
            { label: 'Active patients', value: promptContext.patientCount ?? activePatients.length },
            {
              label: 'High risk',
              value: promptContext.highRiskCount ?? highRiskPatients.length,
              color: '#EF4444',
            },
            {
              label: 'Capacity band',
              value: promptContext.capacity?.band ?? capacity.band,
              color: '#60A5FA',
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
      {showRouteMetrics ? <DataSourceNote moduleState={copilot} /> : null}
    </EmergencyRoutePage>
  );
}
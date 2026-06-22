import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PatientFlag, PatientState } from '../../types/emergency';
import { EMERGENCY_OS_BRANDING } from '../../config/emergencyOsBranding.config';
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
  MetricGrid,
  PatientGrid,
  ApiStateBanner,
  DataSourceNote,
  emergencyRouteStyles,
  isHighRisk,
  isBoarding,
  needsReassessmentAttention,
  QUEUE_MOVEMENT_STAGES,
  findUpgradeSignal,
  displayPatientName,
} from './emergencyRouteShared';
import WaitingRoomSafetyBoard from '../../components/whiteboard/WaitingRoomSafetyBoard';
import QueueReasonBadge from '../../components/queues/QueueReasonBadge';


export function PatientsRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const storePatients = useEmergencyStore((state) => state.patients);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const patientsModule = useEmergencyPatients();
  const journeyModule = usePatientJourney();
  const patients = patientsModule.data?.data?.patients || storePatients;
  const patientIdParam = searchParams.get('patientId') || '';
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
    if (requestedPatient?.id) selectPatient(requestedPatient.id);
  }, [requestedPatient?.id, selectPatient]);

  const updateQuery = (value) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value.trim()) nextParams.set('q', value);
    else nextParams.delete('q');
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <EmergencyRoutePage
      eyebrow="Patients"
      title="Emergency Patients"
      description="Find active patients, search by name or MRN, and open a patient card for next steps."
      actions={
        <label
          style={{
            display: 'grid',
            gap: 4,
            minWidth: 260,
            color: 'var(--color-text-secondary, #9CA3AF)',
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Search patients
          <input
            type="search"
            value={query}
            placeholder="Name, MRN, complaint..."
            onChange={(event) => updateQuery(event.target.value)}
            style={{
              minHeight: 38,
              border: '1px solid var(--color-border-subtle, #1F2937)',
              borderRadius: 'var(--radius-md, 10px)',
              background: 'var(--color-elevated, #0B1120)',
              color: 'var(--color-text-primary, #F9FAFB)',
              font: 'inherit',
              fontSize: 13,
              padding: '0 12px',
              textTransform: 'none',
            }}
          />
        </label>
      }
    >
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
      <article
        aria-label="Patient Journey backend status"
        style={{
          ...emergencyRouteStyles.card,
          display: 'grid',
          gap: 10,
          padding: 'var(--space-3, 12px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <strong style={{ color: 'var(--color-text-primary, #F9FAFB)' }}>
              Patient Journey Engine
            </strong>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary, #9CA3AF)', fontSize: 13 }}>
              Backend state-count and timeline-event envelope rendered through the active Patients route.
            </p>
          </div>
          <span
            style={{
              borderRadius: 999,
              background: 'var(--color-elevated, #0B1120)',
              color: '#BFDBFE',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 12,
              fontWeight: 900,
              padding: '6px 10px',
              whiteSpace: 'nowrap',
            }}
          >
            {journeyEvents.length} events
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {visibleJourneyStates.length ? (
            visibleJourneyStates.map(([state, count]) => (
              <span
                key={state}
                style={{
                  border: '1px solid var(--color-border-subtle, #1F2937)',
                  borderRadius: 999,
                  color: 'var(--color-text-secondary, #9CA3AF)',
                  fontSize: 12,
                  fontWeight: 800,
                  padding: '5px 9px',
                }}
              >
                {state}: {count}
              </span>
            ))
          ) : (
            <span style={{ color: 'var(--color-text-muted, #6B7280)', fontSize: 13 }}>
              No active journey state counts yet.
            </span>
          )}
        </div>
      </article>
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
  const workflowLogs = useEmergencyStore((state) => state.workflowLogs);
  const activeQueueFilter = useEmergencyStore((state) => state.activeQueueFilter);
  const setActiveQueueFilter = useEmergencyStore((state) => state.setActiveQueueFilter);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const setFitToWaitClassification = useEmergencyStore((state) => state.setFitToWaitClassification);
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
      eyebrow="Operations"
      title="Queues"
      description="See who is waiting, which queues need attention, and where the next handoff is blocked."
    >
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
      {(activeFilterKey === 'waiting' || !activeFilterKey) && (
        <WaitingRoomSafetyBoard
          patients={patients}
          staff={staff}
          referrals={referrals}
          workflowLogs={workflowLogs}
          activeQueueFilter={effectiveQueueFilter}
          variant="focused"
          onSelectPatient={(patientId) => {
            selectPatient(patientId);
            document.dispatchEvent(new Event('open-reassessment-drawer'));
          }}
          onOpenReassessment={(patientId) => {
            selectPatient(patientId);
            document.dispatchEvent(new Event('open-reassessment-drawer'));
          }}
          onClassifyFitToWait={(patientId, classificationId) => {
            setFitToWaitClassification(patientId, classificationId, { staffName: 'Staff' });
          }}
        />
      )}
      {effectiveQueueFilter ? (
        <div
          role="status"
          style={{
            ...emergencyRouteStyles.card,
            alignItems: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            justifyContent: 'space-between',
            padding: 'var(--space-3, 12px)',
          }}
        >
          <span style={{ color: '#BFDBFE', fontSize: 13, fontWeight: 800 }}>
            Showing the {effectiveQueueFilter} queue requested from the whiteboard.
          </span>
          <button
            type="button"
            onClick={clearQueueFilter}
            style={{
              border: '1px solid var(--color-border-subtle, #1F2937)',
              borderRadius: 999,
              background: 'transparent',
              color: 'var(--color-text-primary, #F9FAFB)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 800,
              padding: '6px 10px',
            }}
          >
            Clear queue filter
          </button>
        </div>
      ) : null}
      <div style={{ display: 'grid', gap: 'var(--space-3, 12px)' }}>
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
              style={{
                ...emergencyRouteStyles.card,
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: 12,
                alignItems: 'center',
                borderLeft: `4px solid ${breached ? '#EF4444' : '#60A5FA'}`,
                padding: 'var(--space-3, 12px)',
              }}
            >
              <div>
                <strong style={{ color: 'var(--color-text-primary, #F9FAFB)' }}>{queue.label}</strong>
                <div
                  aria-label={`${queue.label} queue patients`}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    margin: '6px 0 0',
                    color: 'var(--color-text-secondary, #9CA3AF)',
                    fontSize: 13,
                  }}
                >
                  {patientsInQueue.length ? (
                    patientsInQueue.slice(0, 3).map((patient) => (
                      <span
                        key={patient.id}
                        style={{
                          display: 'inline-flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: 4,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => selectPatient(patient.id)}
                          style={{
                            border: '1px solid var(--color-border-subtle, #1F2937)',
                            borderRadius: 999,
                            background: 'var(--color-elevated, #0B1120)',
                            color: 'var(--color-text-primary, #F9FAFB)',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 800,
                            padding: '4px 8px',
                          }}
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
                  <small style={{ color: '#BFDBFE', display: 'block', fontSize: 12, fontWeight: 800, marginTop: 4 }}>
                    Movement stage: {movementStages.join(' / ')}
                  </small>
                ) : null}
              </div>
              <strong
                style={{
                  borderRadius: 999,
                  background: 'var(--color-elevated, #0B1120)',
                  color: 'var(--color-text-primary, #F9FAFB)',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  padding: '5px 10px',
                }}
              >
                {queue.count ?? patientsInQueue.length}
              </strong>
              <span style={{ color: breached ? '#EF4444' : '#10B981', fontSize: 12, fontWeight: 900 }}>
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
  const [searchParams] = useSearchParams();
  const patients = useEmergencyStore((state) => state.patients);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const reassessment = useReassessmentQueue();
  const patientIdParam = searchParams.get('patientId') || '';
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
    if (requestedPatient?.id) selectPatient(requestedPatient.id);
  }, [requestedPatient?.id, selectPatient]);

  return (
    <EmergencyRoutePage
      eyebrow="Safety"
      title="Reassessment"
      description="Patients due for another look. Open a patient card to review details and update the plan."
    >
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
  const patients = useEmergencyStore((state) => state.patients);
  const boarding = useBoardingStatus();
  const boardingPatients = boarding.data?.data?.patients || patients.filter(isBoarding);

  return (
    <EmergencyRoutePage
      eyebrow="Flow"
      title="Boarding"
      description="Patients waiting for an inpatient bed and the boarding pressure affecting department flow."
    >
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
    </EmergencyRoutePage>
  );
}

export function CapacityRoute() {
  const storeCapacity = useEmergencyStore((state) => state.capacity);
  const storeRooms = useEmergencyStore((state) => state.rooms);
  const patients = useEmergencyStore((state) => state.patients);
  const capacityStatus = useCapacityStatus();
  const upgradeCapacity = useUpgradeHarnessCapacity();
  const capacity = capacityStatus.data?.data?.capacity || storeCapacity;
  const rooms = capacityStatus.data?.data?.rooms || storeRooms;
  const upgradeSignals = upgradeCapacity.data?.data?.signals || [];
  const simulationSignal = findUpgradeSignal(upgradeSignals, 'real_time_simulation_adaptive_policy');
  const bragSignal = findUpgradeSignal(upgradeSignals, 'brag_forecast_10h');
  const availableRooms = rooms.filter((room) => room.status === 'Available').length;
  const blockedRooms = rooms.filter((room) => room.status === 'Blocked').length;
  const boardingPatients = patients.filter(isBoarding);

  return (
    <EmergencyRoutePage
      eyebrow="Capacity"
      title="Capacity"
      description="Current room availability, boarding load, and department pressure in one view."
    >
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
        <div style={{ display: 'grid', gap: 8 }}>
          {capacityStatus.data.data.recommendations.map((recommendation) => (
            <div
              key={recommendation}
              style={{
                ...emergencyRouteStyles.card,
                borderColor: 'color-mix(in srgb, var(--status-info, #60A5FA) 36%, var(--color-border-default, #1F2937))',
                background:
                  'color-mix(in srgb, var(--status-info, #60A5FA) 8%, var(--color-surface, #111827))',
                color: '#BFDBFE',
                padding: 'var(--space-3, 12px)',
              }}
            >
              {recommendation}
            </div>
          ))}
        </div>
      ) : null}
      {simulationSignal || bragSignal ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {simulationSignal ? (
            <article style={{ ...emergencyRouteStyles.card, padding: 'var(--space-3, 12px)' }}>
              <strong style={{ color: '#BFDBFE' }}>Adaptive policy simulation</strong>
              <p style={{ margin: '6px 0 0', color: '#9CA3AF', fontSize: 13 }}>
                Pressure {simulationSignal.data.currentPressureScore};{' '}
                {simulationSignal.data.recommendedPolicyReview}
              </p>
              <small style={{ color: '#FDE68A' }}>{simulationSignal.safety.humanReviewMessage}</small>
            </article>
          ) : null}
          {bragSignal ? (
            <article style={{ ...emergencyRouteStyles.card, padding: 'var(--space-3, 12px)' }}>
              <strong style={{ color: '#BFDBFE' }}>10-hour BRAG forecast</strong>
              <p style={{ margin: '6px 0 0', color: '#9CA3AF', fontSize: 13 }}>
                Peak band {bragSignal.data.peakBand};{' '}
                {(bragSignal.data.forecast || []).slice(-1)[0]?.humanReviewTrigger}
              </p>
              <small style={{ color: '#FDE68A' }}>
                Confidence {Math.round((bragSignal.confidence || 0) * 100)}% ┬╖ Audit{' '}
                {String(bragSignal.audit.immutableLedgerHash).slice(0, 10)}
              </small>
            </article>
          ) : null}
        </div>
      ) : null}
      <PatientGrid
        patients={boardingPatients}
        emptyMessage="No active boarders affecting capacity."
      />
      <DataSourceNote moduleState={capacityStatus} />
    </EmergencyRoutePage>
  );
}

export function CopilotRoute() {
  const patients = useEmergencyStore((state) => state.patients);
  const capacity = useEmergencyStore((state) => state.capacity);
  const alerts = useEmergencyStore((state) => state.alerts);
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

  return (
    <EmergencyRoutePage
      eyebrow={EMERGENCY_OS_BRANDING.aiiosName}
      title={EMERGENCY_OS_BRANDING.copilotName}
      description={EMERGENCY_OS_BRANDING.copilotIntro}
    >
      <ApiStateBanner moduleState={copilot} />
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
          {
            label: 'Active alerts',
            value: alerts.filter((alert) => !alert.dismissed).length,
            color: '#F59E0B',
          },
        ]}
      />
      {copilot.data?.data?.quickActions?.length ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {copilot.data.data.quickActions.map((action) => (
            <span
              key={action}
              style={{
                border: '1px solid color-mix(in srgb, var(--status-info, #60A5FA) 34%, var(--color-border-default, #1F2937))',
                borderRadius: 999,
                background:
                  'color-mix(in srgb, var(--status-info, #60A5FA) 10%, var(--color-surface, #111827))',
                color: '#BFDBFE',
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {action}
            </span>
          ))}
        </div>
      ) : null}
      <p
        style={{
          ...emergencyRouteStyles.card,
          borderColor:
            'color-mix(in srgb, var(--status-warning, #F59E0B) 40%, var(--color-border-default, #1F2937))',
          background:
            'color-mix(in srgb, var(--status-warning, #F59E0B) 8%, var(--color-surface, #111827))',
          color: 'var(--color-text-secondary, #9CA3AF)',
          margin: 0,
          padding: 'var(--space-3, 12px)',
        }}
      >
        Use the docked {EMERGENCY_OS_BRANDING.copilotName} to ask about who needs attention,
        capacity pressure, EMS status, or reassessment priorities.{' '}
        The active panel supports typed prompts, browser image attachment metadata, and voice dictation
        for staff-reviewed context.{' '}
        {EMERGENCY_OS_BRANDING.safetyLine}
      </p>
      {cdssSignal || telephoneSignal || federatedSignal || auditSignal ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
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
              <article key={card.title} style={{ ...emergencyRouteStyles.card, padding: 'var(--space-3, 12px)' }}>
                <strong style={{ color: '#BFDBFE' }}>{card.title}</strong>
                <p style={{ margin: '6px 0', color: '#9CA3AF', fontSize: 13 }}>{card.body}</p>
                <small style={{ color: '#FDE68A' }}>{card.meta}</small>
              </article>
            ))}
        </div>
      ) : null}
      <DataSourceNote moduleState={copilot} />
    </EmergencyRoutePage>
  );
}
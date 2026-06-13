import { useEffect, useMemo } from 'react';
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider } from './contexts/UserContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ConversationProvider } from './contexts/ConversationContext';
import { ToolPreferencesProvider } from './contexts/ToolPreferencesContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { OrganizationContextProvider } from './contexts/OrganizationContext';
import { WhiteLabelProvider } from './contexts/WhiteLabelContext';
import { UserIdentityProvider } from './contexts/UserIdentityContext';
import { CostTrackingProvider } from './contexts/CostTrackingContext';
import { SystemConfigProvider } from './contexts/SystemConfigContext';
import { TenantContextProvider } from './contexts/TenantContext';
import OfflineProvider from './contexts/OfflineProvider';
import ErrorBoundary from './components/ErrorBoundary';
import { NotificationToastContainer } from './components/notifications/NotificationToast';
import { AppShell } from './components/AppShell';
import EmergencyWhiteboard from './components/EmergencyWhiteboard';
import SmartIntake from './pages/emergency/SmartIntake';
import EmergencyAnalytics from './pages/emergency/EmergencyAnalytics';
import EmergencySettings from './pages/emergency/EmergencySettings';
import ClinicalCalculatorHub from './components/ClinicalCalculatorHub';
import AIGovernanceDashboard from './pages/AIGovernanceDashboard';
import EMSPipeline from './components/EMSPipeline';
import PatientCard from './components/PatientCard';
import ReferralPanel from './components/ReferralPanel';
import { useEmergencyStore } from './store/emergencyStore';
import { PatientFlag, PatientState } from './types/emergency';
import { CANONICAL_ROUTES, LEGACY_EMERGENCY_ROUTE_REDIRECTS } from './config/routes.config';
import { EMERGENCY_ACTIONS } from './config/emergencyRolePermissions';
import { useEmergencyRolePermissions } from './hooks/useEmergencyRolePermissions';
import {
  useBoardingStatus,
  useCapacityStatus,
  useEDCopilot,
  useEmergencyPatients,
  useEmergencyQueues,
  useFederatedLearning,
  useHybridDigitalTwin,
  useIntegrationHub,
  usePatientJourney,
  useProvincialHealth,
  useRealTimeSimulation,
  useReassessmentQueue,
} from './hooks/useEmergencyOs';

function EmergencyRoutePage({ eyebrow, title, description, children }) {
  return (
    <section style={{ padding: 24, display: 'grid', gap: 18 }}>
      <header>
        {eyebrow ? (
          <span style={{ color: '#60A5FA', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {eyebrow}
          </span>
        ) : null}
        <h1 style={{ margin: eyebrow ? '4px 0 0' : 0, color: '#F9FAFB', fontSize: 22, fontWeight: 650 }}>{title}</h1>
        {description ? <p style={{ color: '#9CA3AF', marginTop: 8, maxWidth: 760 }}>{description}</p> : null}
      </header>
      {children}
    </section>
  );
}

function EmergencyAccessDenied({ requestedPath }) {
  const emergencyRole = useEmergencyRolePermissions();
  const fallbackPath = emergencyRole.nearestRoute(requestedPath);

  return (
    <section style={{ minHeight: '100%', display: 'grid', placeItems: 'center', padding: 24, background: '#0A0E1A' }}>
      <div
        role="alert"
        style={{
          maxWidth: 560,
          border: '1px solid #7F1D1D',
          borderRadius: 16,
          background: '#111827',
          color: '#F9FAFB',
          padding: 24,
          boxShadow: '0 24px 70px rgba(0,0,0,0.32)',
        }}
      >
        <span style={{ color: '#FCA5A5', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Access denied
        </span>
        <h1 style={{ margin: '6px 0 0', fontSize: 22 }}>Emergency OS page unavailable</h1>
        <p style={{ color: '#9CA3AF', lineHeight: 1.5 }}>
          {emergencyRole.roleLabel} does not have access to this Emergency OS page.
        </p>
        <Link
          to={fallbackPath}
          style={{
            display: 'inline-flex',
            marginTop: 10,
            borderRadius: 10,
            background: '#2563EB',
            color: '#F9FAFB',
            padding: '10px 13px',
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          Go to permitted Emergency OS page
        </Link>
      </div>
    </section>
  );
}

function EmergencyRouteGuard({ path, children }) {
  const emergencyRole = useEmergencyRolePermissions();
  if (!emergencyRole.canAccessRoute(path)) {
    return <EmergencyAccessDenied requestedPath={path} />;
  }
  return children;
}

function EmergencyDefaultRedirect() {
  const emergencyRole = useEmergencyRolePermissions();
  return <Navigate to={emergencyRole.defaultRoute || emergencyRole.allowedRoutes[0] || CANONICAL_ROUTES.emergencyWhiteboard} replace />;
}

function MetricGrid({ metrics }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
      {metrics.map((metric) => (
        <article key={metric.label} style={{ padding: 16, border: '1px solid #1F2937', borderRadius: 12, background: '#111827' }}>
          <strong style={{ display: 'block', color: metric.color || '#F9FAFB', fontSize: 28, lineHeight: 1 }}>{metric.value}</strong>
          <span style={{ display: 'block', color: '#9CA3AF', fontSize: 12, marginTop: 6 }}>{metric.label}</span>
        </article>
      ))}
    </div>
  );
}

function PatientGrid({ patients, emptyMessage }) {
  if (!patients.length) {
    return (
      <div style={{ padding: 18, border: '1px solid #1F2937', borderRadius: 12, background: '#111827', color: '#9CA3AF' }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
      {patients.map((patient) => <PatientCard key={patient.id} patient={patient} />)}
    </div>
  );
}

function ApiStateBanner({ moduleState, fallbackText = 'Showing the last local Emergency OS state.' }) {
  if (moduleState.loading && !moduleState.data) {
    return (
      <div style={{ padding: 14, border: '1px solid #1F2937', borderRadius: 12, background: '#111827', color: '#9CA3AF' }}>
        Loading backend data...
      </div>
    );
  }

  if (moduleState.error) {
    return (
      <div role="alert" style={{ padding: 14, border: '1px solid #7F1D1D', borderRadius: 12, background: '#450A0A', color: '#FCA5A5' }}>
        {moduleState.error}. {fallbackText}
      </div>
    );
  }

  if (moduleState.isEmpty) {
    return (
      <div style={{ padding: 14, border: '1px solid #1F2937', borderRadius: 12, background: '#111827', color: '#9CA3AF' }}>
        No backend records returned for this module.
      </div>
    );
  }

  return null;
}

function DataSourceNote({ moduleState }) {
  const generatedAt = moduleState.data?.generatedAt;
  return (
    <div style={{ color: '#6B7280', fontSize: 12 }}>
      Source: {moduleState.data?.source || 'local-fallback'}
      {generatedAt ? ` | Updated ${new Date(generatedAt).toLocaleTimeString()}` : ''}
    </div>
  );
}

function ActionButton({ children, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        border: '1px solid rgba(96,165,250,0.45)',
        borderRadius: 10,
        background: disabled ? '#1F2937' : '#1D4ED8',
        color: '#F9FAFB',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 13,
        fontWeight: 700,
        padding: '9px 12px',
      }}
    >
      {children}
    </button>
  );
}

function ActionStatus({ moduleState }) {
  if (moduleState.actionLoading) {
    return (
      <div style={{ padding: 12, border: '1px solid #1F2937', borderRadius: 12, background: '#111827', color: '#9CA3AF' }}>
        Running Emergency OS action...
      </div>
    );
  }
  if (moduleState.actionError) {
    return (
      <div role="alert" style={{ padding: 12, border: '1px solid #7F1D1D', borderRadius: 12, background: '#450A0A', color: '#FCA5A5' }}>
        {moduleState.actionError}
      </div>
    );
  }
  return null;
}

function isHighRisk(patient) {
  return (
    patient.priority === 'P1' ||
    patient.priority === 'P2' ||
    patient.flags.includes(PatientFlag.HighRisk) ||
    patient.flags.includes(PatientFlag.DeteriorationRisk) ||
    patient.flags.includes(PatientFlag.SepsisAlert)
  );
}

function isBoarding(patient) {
  return patient.state === PatientState.Admission || patient.flags.includes(PatientFlag.PendingAdmission);
}

function PatientsRoute() {
  const storePatients = useEmergencyStore((state) => state.patients);
  const patientsModule = useEmergencyPatients();
  const patients = patientsModule.data?.data?.patients || storePatients;

  return (
    <EmergencyRoutePage
      eyebrow="Patients"
      title="Emergency Patients"
      description="Backend-backed active patient census from `/api/emergency/patients`."
    >
      <ApiStateBanner moduleState={patientsModule} />
      <MetricGrid
        metrics={[
          { label: 'Total patients', value: patients.length, color: '#60A5FA' },
          { label: 'High risk', value: patients.filter(isHighRisk).length, color: '#EF4444' },
          { label: 'Waiting', value: patients.filter((patient) => patient.state === PatientState.Waiting).length, color: '#F59E0B' },
        ]}
      />
      <PatientGrid patients={patients} emptyMessage="No patients returned by the Emergency OS patients endpoint." />
      <DataSourceNote moduleState={patientsModule} />
    </EmergencyRoutePage>
  );
}

function JourneyRoute() {
  const journey = usePatientJourney();
  const events = journey.data?.data?.events || [];
  const stateCounts = journey.data?.data?.stateCounts || {};

  return (
    <EmergencyRoutePage
      eyebrow="Flow"
      title="Patient Journey Engine"
      description="State transitions and timeline events from `/api/emergency/journey`."
    >
      <ApiStateBanner moduleState={journey} />
      <MetricGrid
        metrics={[
          { label: 'Journey events', value: events.length, color: '#60A5FA' },
          { label: 'States represented', value: Object.keys(stateCounts).length },
          { label: 'Waiting', value: stateCounts.Waiting || 0, color: '#F59E0B' },
        ]}
      />
      <div style={{ display: 'grid', gap: 10 }}>
        {events.length ? events.map((event) => (
          <article key={event.id} style={{ padding: 14, border: '1px solid #1F2937', borderRadius: 12, background: '#111827' }}>
            <strong style={{ color: '#F9FAFB' }}>{event.patientName}</strong>
            <p style={{ margin: '4px 0 0', color: '#9CA3AF', fontSize: 13 }}>
              {event.from ? `${event.from} -> ` : ''}{event.to} | {event.note || 'Journey event'} | {new Date(event.timestamp).toLocaleTimeString()}
            </p>
          </article>
        )) : (
          <div style={{ padding: 18, border: '1px solid #1F2937', borderRadius: 12, background: '#111827', color: '#9CA3AF' }}>
            No journey events returned.
          </div>
        )}
      </div>
      <DataSourceNote moduleState={journey} />
    </EmergencyRoutePage>
  );
}

function QueueRoute() {
  const patients = useEmergencyStore((state) => state.patients);
  const queues = useEmergencyQueues();
  const queueRows = useMemo(
    () => [
      {
        label: 'Waiting',
        patients: patients.filter((patient) => patient.state === PatientState.Waiting),
        target: 30,
      },
      {
        label: 'Triage',
        patients: patients.filter((patient) => patient.state === PatientState.Triage),
        target: 10,
      },
      {
        label: 'Assessment',
        patients: patients.filter((patient) => patient.state === PatientState.Assessment),
        target: 45,
      },
      {
        label: 'Orders',
        patients: patients.filter((patient) => patient.state === PatientState.Orders),
        target: 60,
      },
      {
        label: 'Results',
        patients: patients.filter((patient) => patient.state === PatientState.Results),
        target: 90,
      },
      {
        label: 'Admission',
        patients: patients.filter((patient) => patient.state === PatientState.Admission),
        target: 120,
      },
      {
        label: 'Reassessment',
        patients: patients.filter((patient) => patient.flags.includes(PatientFlag.ReassessmentDue)),
        target: 30,
      },
    ],
    [patients],
  );
  const apiQueueRows = queues.data?.data?.queues;
  const visibleQueueRows = apiQueueRows?.length ? apiQueueRows : queueRows;

  return (
    <EmergencyRoutePage
      eyebrow="Operations"
      title="Queue Intelligence"
      description="Live bottleneck and handoff pressure across waiting, triage, provider, results, referrals, admission, discharge, and reassessment queues."
    >
      <ApiStateBanner moduleState={queues} />
      <div style={{ display: 'grid', gap: 10 }}>
        {visibleQueueRows.map((queue) => {
          const patientsInQueue = queue.patients || [];
          const oldestWait = queue.oldestWaitMinutes ?? patientsInQueue.reduce((max, patient) => {
            const arrivedAt = new Date(patient.arrivalTime).getTime();
            if (!Number.isFinite(arrivedAt)) return max;
            return Math.max(max, Math.round((Date.now() - arrivedAt) / 60000));
          }, 0);
          const target = queue.targetMinutes ?? queue.target;
          const breached = queue.breached ?? oldestWait > target;
          return (
            <article key={queue.label} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'center', padding: 14, border: '1px solid #1F2937', borderRadius: 12, background: '#111827' }}>
              <div>
                <strong style={{ color: '#F9FAFB' }}>{queue.label}</strong>
                <p style={{ margin: '4px 0 0', color: '#9CA3AF', fontSize: 13 }}>
                  {patientsInQueue.slice(0, 3).map((patient) => `${patient.firstName} ${patient.lastName}`).join(', ') || 'No patients queued'}
                </p>
              </div>
              <strong style={{ color: '#F9FAFB' }}>{queue.count ?? patientsInQueue.length}</strong>
              <span style={{ color: breached ? '#EF4444' : '#10B981', fontSize: 12 }}>
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

function ReassessmentRoute() {
  const patients = useEmergencyStore((state) => state.patients);
  const reassessment = useReassessmentQueue();
  const duePatients = reassessment.data?.data?.patients || patients.filter((patient) => patient.flags.includes(PatientFlag.ReassessmentDue));

  return (
    <EmergencyRoutePage
      eyebrow="Safety"
      title="Reassessment"
      description="Patients with active reassessment flags. Select a card to open the patient detail panel."
    >
      <ApiStateBanner moduleState={reassessment} />
      <MetricGrid
        metrics={[
          { label: 'Due now', value: duePatients.length, color: duePatients.length ? '#F59E0B' : '#10B981' },
          { label: 'Overdue', value: reassessment.data?.data?.overdueCount ?? 0, color: '#EF4444' },
          { label: 'Next action', value: reassessment.data?.data?.nextAction || 'Review queue' },
        ]}
      />
      <PatientGrid patients={duePatients} emptyMessage="No reassessments are due right now." />
      <DataSourceNote moduleState={reassessment} />
    </EmergencyRoutePage>
  );
}

function BoardingRoute() {
  const patients = useEmergencyStore((state) => state.patients);
  const boarding = useBoardingStatus();
  const boardingPatients = boarding.data?.data?.patients || patients.filter(isBoarding);

  return (
    <EmergencyRoutePage
      eyebrow="Flow"
      title="Boarding"
      description="Pending admissions and boarders that are contributing to capacity pressure."
    >
      <ApiStateBanner moduleState={boarding} />
      <MetricGrid
        metrics={[
          { label: 'Boarding patients', value: boardingPatients.length, color: '#F59E0B' },
          { label: 'Longest boarding', value: `${boarding.data?.data?.longestBoardingMinutes ?? 0}m`, color: '#F97316' },
          { label: 'Escalation', value: boarding.data?.data?.escalation || 'No escalation' },
        ]}
      />
      <PatientGrid patients={boardingPatients} emptyMessage="No active boarding patients." />
      <DataSourceNote moduleState={boarding} />
    </EmergencyRoutePage>
  );
}

function CapacityRoute() {
  const storeCapacity = useEmergencyStore((state) => state.capacity);
  const storeRooms = useEmergencyStore((state) => state.rooms);
  const patients = useEmergencyStore((state) => state.patients);
  const capacityStatus = useCapacityStatus();
  const capacity = capacityStatus.data?.data?.capacity || storeCapacity;
  const rooms = capacityStatus.data?.data?.rooms || storeRooms;
  const availableRooms = rooms.filter((room) => room.status === 'Available').length;
  const blockedRooms = rooms.filter((room) => room.status === 'Blocked').length;
  const boardingPatients = patients.filter(isBoarding);

  return (
    <EmergencyRoutePage
      eyebrow="Capacity"
      title="Capacity Detail"
      description="Current ED occupancy, room availability, boarding load, and reassessment pressure."
    >
      <ApiStateBanner moduleState={capacityStatus} />
      <MetricGrid
        metrics={[
          { label: 'Capacity score', value: `${capacity.score} ${capacity.band}`, color: '#60A5FA' },
          { label: 'Total patients', value: capacity.totalPatients },
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
            <div key={recommendation} style={{ padding: 12, border: '1px solid #1F2937', borderRadius: 12, background: '#111827', color: '#BFDBFE' }}>
              {recommendation}
            </div>
          ))}
        </div>
      ) : null}
      <PatientGrid patients={boardingPatients} emptyMessage="No active boarders affecting capacity." />
      <DataSourceNote moduleState={capacityStatus} />
    </EmergencyRoutePage>
  );
}

function ProvincialHealthRoute() {
  const provincialHealth = useProvincialHealth();
  const records = provincialHealth.data?.data?.records || [];
  const recordWorkflowAction = useEmergencyStore((state) => state.recordWorkflowAction);

  useEffect(() => {
    if (!provincialHealth.data || provincialHealth.loading || provincialHealth.error) return;
    recordWorkflowAction({
      type: 'provincial_data_viewed',
      title: 'Provincial data viewed',
      summary: `Viewed ${records.length} provincial health placeholder record${records.length === 1 ? '' : 's'}.`,
      source: 'provincial-health-route',
      metadata: {
        recordCount: records.length,
        connectorStatus: provincialHealth.data?.data?.connectorStatus || 'unavailable',
        jurisdiction: provincialHealth.data?.data?.jurisdiction || null,
      },
    });
  }, [provincialHealth.data, provincialHealth.error, provincialHealth.loading, recordWorkflowAction, records.length]);

  return (
    <EmergencyRoutePage
      eyebrow="External Data"
      title="Provincial Health Connector"
      description="Provincial/HIE placeholder records from `/api/emergency/provincial-health` with unavailable states made explicit."
    >
      <ApiStateBanner moduleState={provincialHealth} fallbackText="Provincial health connector data is unavailable." />
      <MetricGrid
        metrics={[
          { label: 'Connector status', value: provincialHealth.data?.data?.connectorStatus || 'unavailable', color: '#F59E0B' },
          { label: 'Patient snapshots', value: records.length, color: '#60A5FA' },
          { label: 'Jurisdiction', value: provincialHealth.data?.data?.jurisdiction || 'Not configured' },
        ]}
      />
      <div style={{ display: 'grid', gap: 10 }}>
        {records.map((record) => (
          <article key={record.patientId} style={{ padding: 14, border: '1px solid #1F2937', borderRadius: 12, background: '#111827' }}>
            <strong style={{ color: '#F9FAFB' }}>{record.mrn}</strong>
            <p style={{ margin: '6px 0 0', color: '#9CA3AF', fontSize: 13 }}>
              Medications: {record.medications.join('; ')}
            </p>
            <p style={{ margin: '4px 0 0', color: '#9CA3AF', fontSize: 13 }}>
              Allergies: {record.allergies.join('; ')}
            </p>
          </article>
        ))}
      </div>
      <DataSourceNote moduleState={provincialHealth} />
    </EmergencyRoutePage>
  );
}

function IntegrationsRoute() {
  const integrations = useIntegrationHub();
  const sources = integrations.data?.data?.sources || [];
  const reviewQueue = integrations.data?.data?.reviewQueue || [];
  const recordWorkflowAction = useEmergencyStore((state) => state.recordWorkflowAction);
  const latestSource = sources.find((source) => source.lastEventAt) || sources[0];
  const sourceCount = sources.length;
  const latestSourceId = latestSource?.id || null;
  const latestEventAt = latestSource?.lastEventAt || null;

  useEffect(() => {
    if (!integrations.data || integrations.loading || integrations.error) return;
    recordWorkflowAction({
      type: 'integration_event_received',
      title: 'Integration event received',
      summary: `Integration Hub received ${sourceCount} source status record${sourceCount === 1 ? '' : 's'}.`,
      source: 'integration-hub-route',
      severity: reviewQueue.length ? 'Warning' : 'Info',
      metadata: {
        sourceCount,
        reviewQueueCount: reviewQueue.length,
        latestSourceId,
        latestEventAt,
      },
    });
  }, [
    integrations.data,
    integrations.error,
    integrations.loading,
    latestEventAt,
    latestSourceId,
    recordWorkflowAction,
    reviewQueue.length,
    sourceCount,
  ]);

  return (
    <EmergencyRoutePage
      eyebrow="Integrations"
      title="IoT/Integration Hub"
      description="FHIR, HL7, and device integration placeholders from `/api/emergency/integrations`."
    >
      <ApiStateBanner moduleState={integrations} fallbackText="Integration source data is unavailable." />
      <MetricGrid
        metrics={[
          { label: 'Sources', value: sources.length, color: '#60A5FA' },
          { label: 'Review items', value: reviewQueue.length, color: reviewQueue.length ? '#F59E0B' : '#10B981' },
          { label: 'Live feeds', value: sources.filter((source) => source.status === 'live').length, color: '#10B981' },
        ]}
      />
      <div style={{ display: 'grid', gap: 10 }}>
        {sources.map((source) => (
          <article key={source.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: 14, border: '1px solid #1F2937', borderRadius: 12, background: '#111827' }}>
            <div>
              <strong style={{ color: '#F9FAFB' }}>{source.label}</strong>
              <p style={{ margin: '4px 0 0', color: '#9CA3AF', fontSize: 13 }}>
                Last event: {source.lastEventAt ? new Date(source.lastEventAt).toLocaleTimeString() : 'No live feed'}
              </p>
            </div>
            <span style={{ color: source.status === 'demo-ready' ? '#60A5FA' : '#F59E0B', fontSize: 12 }}>{source.status}</span>
          </article>
        ))}
      </div>
      <DataSourceNote moduleState={integrations} />
    </EmergencyRoutePage>
  );
}

function RealTimeSimulationRoute() {
  const emergencyRole = useEmergencyRolePermissions();
  const simulation = useRealTimeSimulation();
  const payload = simulation.data?.data || {};
  const status = payload.currentStatus || {};
  const recommendations = payload.recommendations || [];
  const forecast = payload.fourHourForecast || [];
  const lastEvaluation = simulation.lastActionResult?.data?.evaluation;
  const lastComparison = simulation.lastActionResult?.data?.rankedInterventions;
  const canRunSimulation = emergencyRole.can(EMERGENCY_ACTIONS.runSimulation);

  return (
    <EmergencyRoutePage
      eyebrow="Decision Support"
      title="Real-Time Simulation"
      description="Fixture-backed RtS decision support for ED surge interventions, 4-hour recovery windows, census forecasts, and action recommendations."
    >
      <ApiStateBanner moduleState={simulation} fallbackText="Real-time simulation recommendations are unavailable." />
      <ActionStatus moduleState={simulation} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <ActionButton
          disabled={simulation.actionLoading || !canRunSimulation}
          onClick={() =>
            simulation.updateLiveState({
              census: 58,
              waitingPatients: 21,
              boardingCount: 9,
              staffedBeds: 36,
              physicians: 4,
              nurses: 12,
              arrivalsPerHour: 9,
              source: 'ui-fixture-surge',
            })
          }
        >
          Fuse Surge State
        </ActionButton>
        <ActionButton
          disabled={simulation.actionLoading || !canRunSimulation}
          onClick={() => simulation.evaluateIntervention({ type: 'open_fast_track', intensity: 1 })}
        >
          Evaluate Fast Track
        </ActionButton>
        <ActionButton disabled={simulation.actionLoading || !canRunSimulation} onClick={() => simulation.compareInterventions({})}>
          Rank Interventions
        </ActionButton>
      </div>
      <MetricGrid
        metrics={[
          { label: 'Capacity band', value: status.capacityBand || 'Pending', color: '#60A5FA' },
          { label: 'Resource use', value: `${status.resourceUtilization ?? 0}%`, color: '#F59E0B' },
          { label: 'Avg wait', value: `${status.averageWaitMinutes ?? 0}m` },
          { label: 'Deterioration', value: payload.projectedDeteriorationTimeMinutes == null ? 'None in 4h' : `${payload.projectedDeteriorationTimeMinutes}m`, color: '#EF4444' },
        ]}
      />
      {lastEvaluation ? (
        <article style={{ padding: 16, border: '1px solid #1F2937', borderRadius: 12, background: '#111827' }}>
          <strong style={{ color: '#F9FAFB' }}>Last evaluation: {lastEvaluation.intervention.type}</strong>
          <p style={{ color: '#9CA3AF', margin: '6px 0 0' }}>
            Recovery {lastEvaluation.recoveryTimeMinutes}m | Wait improvement {lastEvaluation.expectedImprovement.waitMinutes}m | Confidence {Math.round(lastEvaluation.confidence * 100)}%
          </p>
        </article>
      ) : null}
      {lastComparison?.length ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {lastComparison.map((item, index) => (
            <article key={`${item.intervention.type}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: 14, border: '1px solid #1F2937', borderRadius: 12, background: '#111827' }}>
              <strong style={{ color: '#F9FAFB' }}>{index + 1}. {item.intervention.type.replace(/_/g, ' ')}</strong>
              <span style={{ color: '#60A5FA' }}>{item.recoveryTimeMinutes}m recovery</span>
            </article>
          ))}
        </div>
      ) : null}
      <div style={{ display: 'grid', gap: 10 }}>
        {recommendations.length ? recommendations.map((recommendation) => (
          <article key={recommendation.intervention} style={{ padding: 14, border: '1px solid #1F2937', borderRadius: 12, background: '#111827' }}>
            <strong style={{ color: '#F9FAFB' }}>{recommendation.intervention.replace(/_/g, ' ')}</strong>
            <p style={{ color: '#9CA3AF', margin: '6px 0 0' }}>
              Implement in {recommendation.timeToImplementMinutes}m, expected wait improvement {recommendation.expectedImprovement.waitMinutes}m.
            </p>
            <p style={{ color: '#BFDBFE', margin: '6px 0 0', fontSize: 13 }}>
              {(recommendation.actionRecommendations || []).join(' | ')}
            </p>
          </article>
        )) : (
          <div style={{ padding: 18, border: '1px solid #1F2937', borderRadius: 12, background: '#111827', color: '#9CA3AF' }}>
            No simulation recommendations returned yet.
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
        {forecast.map((point) => (
          <article key={point.minute} style={{ padding: 12, border: '1px solid #1F2937', borderRadius: 12, background: '#0F172A' }}>
            <strong style={{ color: '#F9FAFB' }}>{point.minute}m</strong>
            <p style={{ color: '#9CA3AF', margin: '4px 0 0', fontSize: 13 }}>
              Census {point.census} | Wait {point.averageWaitMinutes}m | {point.capacityBand}
            </p>
          </article>
        ))}
      </div>
      <DataSourceNote moduleState={simulation} />
    </EmergencyRoutePage>
  );
}

function FederatedLearningRoute() {
  const emergencyRole = useEmergencyRolePermissions();
  const federated = useFederatedLearning();
  const payload = federated.data?.data || {};
  const performance = payload.modelPerformance || {};
  const hospitals = payload.hospitals || [];
  const contributions = payload.hospitalContributions || [];
  const canManageFederated = emergencyRole.can(EMERGENCY_ACTIONS.manageFederatedLearning);

  return (
    <EmergencyRoutePage
      eyebrow="Multi-Hospital Learning"
      title="Federated Learning"
      description="Endpoint-driven FedAvg for ED prediction models with deterministic privacy noise, contribution tracking, and explicit secure aggregation placeholders."
    >
      <ApiStateBanner moduleState={federated} fallbackText="Federated dashboard is unavailable." />
      <ActionStatus moduleState={federated} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <ActionButton
          disabled={federated.actionLoading || !canManageFederated}
          onClick={() => federated.registerHospital({ hospitalId: 'demo-ed-north', name: 'Demo ED North', region: 'Ontario', sampleCapacity: 1200 })}
        >
          Register Hospital
        </ActionButton>
        <ActionButton
          disabled={federated.actionLoading || !canManageFederated}
          onClick={() =>
            federated.submitModelUpdate({
              hospitalId: 'demo-ed-north',
              sampleCount: 240,
              weights: { intercept: 0.12, waitingPatients: 0.32, boardingCount: 0.41, acuityP1P2: 0.29, nurseCoverage: -0.18 },
              metrics: { auc: 0.82, calibration: 0.93, sensitivity: 0.76, specificity: 0.74 },
              differentialPrivacy: true,
            })
          }
        >
          Submit Local Update
        </ActionButton>
        <ActionButton disabled={federated.actionLoading || !canManageFederated} onClick={() => federated.aggregateRound()}>
          Aggregate FedAvg
        </ActionButton>
      </div>
      <MetricGrid
        metrics={[
          { label: 'Active hospitals', value: payload.activeHospitals ?? 0, color: '#60A5FA' },
          { label: 'Registered', value: payload.registeredHospitals ?? hospitals.length },
          { label: 'Current round', value: payload.currentRound ?? 0, color: '#10B981' },
          { label: 'Pending updates', value: payload.pendingUpdates ?? 0, color: '#F59E0B' },
        ]}
      />
      <MetricGrid
        metrics={[
          { label: 'AUC', value: performance.auc ?? 'n/a', color: '#60A5FA' },
          { label: 'Calibration', value: performance.calibration ?? 'n/a' },
          { label: 'Sensitivity', value: performance.sensitivity ?? 'n/a' },
          { label: 'Specificity', value: performance.specificity ?? 'n/a' },
        ]}
      />
      <div style={{ display: 'grid', gap: 10 }}>
        {hospitals.length ? hospitals.map((hospital) => (
          <article key={hospital.hospitalId} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: 14, border: '1px solid #1F2937', borderRadius: 12, background: '#111827' }}>
            <div>
              <strong style={{ color: '#F9FAFB' }}>{hospital.name}</strong>
              <p style={{ color: '#9CA3AF', margin: '4px 0 0', fontSize: 13 }}>{hospital.hospitalId} | {hospital.region}</p>
            </div>
            <span style={{ color: hospital.status === 'active' ? '#10B981' : '#60A5FA' }}>{hospital.status}</span>
          </article>
        )) : (
          <div style={{ padding: 18, border: '1px solid #1F2937', borderRadius: 12, background: '#111827', color: '#9CA3AF' }}>
            No hospitals registered in this in-memory federated round.
          </div>
        )}
      </div>
      {contributions.length ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {contributions.map((contribution) => (
            <div key={contribution.hospitalId} style={{ padding: 12, border: '1px solid #1F2937', borderRadius: 12, background: '#0F172A', color: '#BFDBFE' }}>
              {contribution.hospitalId}: {Math.round(contribution.contributionWeight * 100)}% of last aggregation ({contribution.sampleCount} samples)
            </div>
          ))}
        </div>
      ) : null}
      <DataSourceNote moduleState={federated} />
    </EmergencyRoutePage>
  );
}

function HybridDigitalTwinRoute() {
  const emergencyRole = useEmergencyRolePermissions();
  const twin = useHybridDigitalTwin();
  const payload = twin.data?.data || {};
  const twinState = payload.twin || {};
  const metrics = twin.lastActionResult?.data?.metrics || twin.lastActionResult?.data?.scenario?.metrics || payload.currentMetrics || {};
  const eventTrace = twin.lastActionResult?.data?.eventTrace || twin.lastActionResult?.data?.scenario?.eventTrace || twinState.lastEventTrace || [];
  const canRunTwin = emergencyRole.can(EMERGENCY_ACTIONS.runDigitalTwin);

  return (
    <EmergencyRoutePage
      eyebrow="Operations Twin"
      title="Hybrid DES-ABM Digital Twin"
      description="Deterministic ED operations twin combining discrete process events with patient/staff behavior metrics, scenario evaluation, and event traces."
    >
      <ApiStateBanner moduleState={twin} fallbackText="Digital twin state is unavailable." />
      <ActionStatus moduleState={twin} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <ActionButton
          disabled={twin.actionLoading || !canRunTwin}
          onClick={() => twin.initializeTwin({ twinId: 'ed-hybrid-des-abm-ui', census: 52, waitingPatients: 16, boardingCount: 7 })}
        >
          Initialize Twin
        </ActionButton>
        <ActionButton disabled={twin.actionLoading || !canRunTwin} onClick={() => twin.simulateTwin({ horizonMinutes: 240, includeTrace: true })}>
          Run DES-ABM
        </ActionButton>
        <ActionButton
          disabled={twin.actionLoading || !canRunTwin}
          onClick={() =>
            twin.evaluateScenario({
              interventions: [{ type: 'increase_staff', intensity: 1 }, { type: 'split_flow_triage', intensity: 1 }],
              includeTrace: true,
            })
          }
        >
          Evaluate Scenario
        </ActionButton>
      </div>
      <MetricGrid
        metrics={[
          { label: 'Twin status', value: twinState.status || 'Pending', color: '#60A5FA' },
          { label: 'Throughput', value: metrics.throughput ?? 0, color: '#10B981' },
          { label: 'Avg wait', value: `${metrics.averageWaitMinutes ?? 0}m`, color: '#F59E0B' },
          { label: 'LOS', value: `${metrics.lengthOfStayMinutes ?? 0}m` },
          { label: 'LWBS', value: metrics.lwbsRate == null ? 'n/a' : `${Math.round(metrics.lwbsRate * 100)}%`, color: '#EF4444' },
          { label: 'Burnout', value: metrics.burnoutIndex ?? 0, color: '#F97316' },
          { label: 'Bed use', value: `${metrics.bedUtilization ?? 0}%` },
          { label: 'Calibration error', value: metrics.calibrationError ?? 0 },
        ]}
      />
      {metrics.confidenceIntervals ? (
        <article style={{ padding: 14, border: '1px solid #1F2937', borderRadius: 12, background: '#111827' }}>
          <strong style={{ color: '#F9FAFB' }}>Confidence intervals</strong>
          <p style={{ color: '#9CA3AF', margin: '6px 0 0' }}>
            Wait {metrics.confidenceIntervals.averageWaitMinutes.join(' - ')}m | Throughput {metrics.confidenceIntervals.throughput.join(' - ')}
          </p>
        </article>
      ) : null}
      <div style={{ display: 'grid', gap: 8 }}>
        {eventTrace.length ? eventTrace.slice(0, 8).map((event) => (
          <article key={`${event.minute}-${event.type}-${event.census}`} style={{ padding: 12, border: '1px solid #1F2937', borderRadius: 12, background: '#0F172A' }}>
            <strong style={{ color: '#F9FAFB' }}>{event.minute}m {event.type}</strong>
            <p style={{ color: '#9CA3AF', margin: '4px 0 0', fontSize: 13 }}>{event.description}</p>
          </article>
        )) : (
          <div style={{ padding: 18, border: '1px solid #1F2937', borderRadius: 12, background: '#111827', color: '#9CA3AF' }}>
            Run a simulation with event trace enabled to inspect DES-ABM events.
          </div>
        )}
      </div>
      <DataSourceNote moduleState={twin} />
    </EmergencyRoutePage>
  );
}

function CopilotRoute() {
  const patients = useEmergencyStore((state) => state.patients);
  const capacity = useEmergencyStore((state) => state.capacity);
  const alerts = useEmergencyStore((state) => state.alerts);
  const copilot = useEDCopilot();
  const promptContext = copilot.data?.data?.promptContext || {};
  const activePatients = patients.filter((patient) => patient.state !== PatientState.Discharge);
  const highRiskPatients = activePatients.filter(isHighRisk);

  return (
    <EmergencyRoutePage
      eyebrow="AI Assist"
      title="ED Copilot"
      description="The copilot panel is mounted in the Emergency OS shell and uses this route context for department-level questions."
    >
      <ApiStateBanner moduleState={copilot} />
      <MetricGrid
        metrics={[
          { label: 'Active patients', value: promptContext.patientCount ?? activePatients.length },
          { label: 'High risk', value: promptContext.highRiskCount ?? highRiskPatients.length, color: '#EF4444' },
          { label: 'Capacity band', value: promptContext.capacity?.band ?? capacity.band, color: '#60A5FA' },
          { label: 'Active alerts', value: alerts.filter((alert) => !alert.dismissed).length, color: '#F59E0B' },
        ]}
      />
      {copilot.data?.data?.quickActions?.length ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {copilot.data.data.quickActions.map((action) => (
            <span key={action} style={{ border: '1px solid #1F2937', borderRadius: 999, background: '#111827', color: '#BFDBFE', padding: '6px 10px', fontSize: 12 }}>
              {action}
            </span>
          ))}
        </div>
      ) : null}
      <p style={{ color: '#9CA3AF', margin: 0 }}>
        Use the docked ED Copilot to ask about who needs attention, capacity pressure, EMS status, or reassessment priorities.
      </p>
      <DataSourceNote moduleState={copilot} />
    </EmergencyRoutePage>
  );
}

function ShiftRoute() {
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const staff = useEmergencyStore((state) => state.staff);
  const patients = useEmergencyStore((state) => state.patients);
  const alerts = useEmergencyStore((state) => state.alerts);
  const charge = staff.find((member) => member.id === activeShift.chargeStaffId);

  return (
    <EmergencyRoutePage
      eyebrow="Shift"
      title="Emergency OS Shift"
      description="Current ED shift context, handoff pressure, and open operational signals."
    >
      <MetricGrid
        metrics={[
          { label: 'Active patients', value: patients.filter((patient) => patient.state !== PatientState.Discharge).length, color: '#60A5FA' },
          { label: 'Open alerts', value: alerts.filter((alert) => !alert.dismissed).length, color: '#F59E0B' },
          { label: 'Charge', value: charge?.name || activeShift.chargeStaffId, color: '#10B981' },
        ]}
      />
      <div style={{ padding: 18, border: '1px solid #1F2937', borderRadius: 12, background: '#111827', color: '#9CA3AF' }}>
        {activeShift.label} started {new Date(activeShift.startTime).toLocaleString()}. Use ED Copilot for a human-reviewed handoff brief.
      </div>
    </EmergencyRoutePage>
  );
}

function ToolsRedirect() {
  const location = window.location;
  const parts = location.pathname.split('/').filter(Boolean);
  const candidate = parts.at(-1);
  const params = new URLSearchParams(location.search);
  if (candidate && !['tools', 'calculators'].includes(candidate)) {
    params.set('open', candidate);
    params.set('tool', candidate);
  }
  const suffix = params.toString();
  return <Navigate to={`${CANONICAL_ROUTES.emergencyTools}${suffix ? `?${suffix}` : ''}`} replace />;
}

function RootLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<EmergencyDefaultRedirect />} />
      <Route element={<RootLayout />}>
        <Route path="/emergency" element={<EmergencyDefaultRedirect />} />
        <Route path={CANONICAL_ROUTES.emergencyWhiteboard} element={<EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyWhiteboard}><EmergencyWhiteboard /></EmergencyRouteGuard>} />
        <Route path={CANONICAL_ROUTES.emergencyPatients} element={<EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyPatients}><PatientsRoute /></EmergencyRouteGuard>} />
        <Route path={CANONICAL_ROUTES.emergencyJourney} element={<EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyJourney}><JourneyRoute /></EmergencyRouteGuard>} />
        <Route path={CANONICAL_ROUTES.emergencyEms} element={<EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyEms}><EMSPipeline /></EmergencyRouteGuard>} />
        <Route path={CANONICAL_ROUTES.emergencyIntake} element={<EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyIntake}><SmartIntake /></EmergencyRouteGuard>} />
        <Route path={CANONICAL_ROUTES.emergencyQueues} element={<EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyQueues}><QueueRoute /></EmergencyRouteGuard>} />
        <Route path={CANONICAL_ROUTES.emergencyReassessment} element={<EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyReassessment}><ReassessmentRoute /></EmergencyRouteGuard>} />
        <Route path={CANONICAL_ROUTES.emergencyCapacity} element={<EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyCapacity}><CapacityRoute /></EmergencyRouteGuard>} />
        <Route path={CANONICAL_ROUTES.emergencyBoarding} element={<EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyBoarding}><BoardingRoute /></EmergencyRouteGuard>} />
        <Route path={CANONICAL_ROUTES.emergencyReferrals} element={<EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyReferrals}><ReferralPanel /></EmergencyRouteGuard>} />
        <Route path={CANONICAL_ROUTES.emergencyProvincialHealth} element={<EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyProvincialHealth}><ProvincialHealthRoute /></EmergencyRouteGuard>} />
        <Route path={CANONICAL_ROUTES.emergencyIntegrations} element={<EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyIntegrations}><IntegrationsRoute /></EmergencyRouteGuard>} />
        <Route path={CANONICAL_ROUTES.emergencyCopilot} element={<EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyCopilot}><CopilotRoute /></EmergencyRouteGuard>} />
        <Route path={CANONICAL_ROUTES.emergencyAnalytics} element={<EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyAnalytics}><EmergencyAnalytics /></EmergencyRouteGuard>} />
        <Route path={CANONICAL_ROUTES.emergencySimulation} element={<EmergencyRouteGuard path={CANONICAL_ROUTES.emergencySimulation}><RealTimeSimulationRoute /></EmergencyRouteGuard>} />
        <Route path={CANONICAL_ROUTES.emergencyFederatedLearning} element={<EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyFederatedLearning}><FederatedLearningRoute /></EmergencyRouteGuard>} />
        <Route path={CANONICAL_ROUTES.emergencyDigitalTwin} element={<EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyDigitalTwin}><HybridDigitalTwinRoute /></EmergencyRouteGuard>} />
        <Route path={CANONICAL_ROUTES.emergencyTools} element={<EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyTools}><ClinicalCalculatorHub /></EmergencyRouteGuard>} />
        <Route path={CANONICAL_ROUTES.emergencyShift} element={<EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyShift}><ShiftRoute /></EmergencyRouteGuard>} />
        <Route path={CANONICAL_ROUTES.emergencyAiGovernance} element={<EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyAiGovernance}><AIGovernanceDashboard /></EmergencyRouteGuard>} />
        <Route path={CANONICAL_ROUTES.aiGovernance} element={<EmergencyRouteGuard path={CANONICAL_ROUTES.aiGovernance}><AIGovernanceDashboard /></EmergencyRouteGuard>} />
        <Route path={CANONICAL_ROUTES.emergencySettings} element={<EmergencyRouteGuard path={CANONICAL_ROUTES.emergencySettings}><EmergencySettings /></EmergencyRouteGuard>} />
      </Route>
      {LEGACY_EMERGENCY_ROUTE_REDIRECTS.map(({ path, to }) => (
        <Route key={`${path}-${to}`} path={path} element={<Navigate to={to} replace />} />
      ))}
      <Route path="/dashboard" element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />
      <Route path="/home" element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />
      <Route path="/app" element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />
      <Route path="/workspace" element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />
      <Route path="/mobile" element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />
      <Route path="/general-healthcare" element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />
      <Route path="/tools/*" element={<ToolsRedirect />} />
      <Route path="/calculators/*" element={<ToolsRedirect />} />
      <Route path="/assistant" element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />
      <Route path="/chat" element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />
      <Route path="/ai" element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />
      <Route path="/copilot" element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />
      <Route path="/emergency/*" element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />
      <Route path="*" element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <UserProvider>
          <NotificationProvider>
            <ConversationProvider>
              <ToolPreferencesProvider>
                <WorkspaceProvider>
                  <OrganizationContextProvider>
                    <WhiteLabelProvider>
                      <UserIdentityProvider>
                        <CostTrackingProvider>
                          <SystemConfigProvider>
                            <TenantContextProvider>
                              <OfflineProvider>
                                <BrowserRouter>
                                  <AppRoutes />
                                  <NotificationToastContainer />
                                </BrowserRouter>
                              </OfflineProvider>
                            </TenantContextProvider>
                          </SystemConfigProvider>
                        </CostTrackingProvider>
                      </UserIdentityProvider>
                    </WhiteLabelProvider>
                  </OrganizationContextProvider>
                </WorkspaceProvider>
              </ToolPreferencesProvider>
            </ConversationProvider>
          </NotificationProvider>
        </UserProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

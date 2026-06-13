import { useMemo, useRef } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
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
import EmergencyWhiteboard from './pages/emergency';
import AIGovernanceDashboard from './pages/AIGovernanceDashboard';
import QuickIntake from './components/QuickIntake';
import PatientCard from './components/PatientCard';
import { useEmergencyStore } from './store/emergencyStore';
import { PatientFlag, PatientState } from './types/emergency';
import { CANONICAL_ROUTES, LEGACY_EMERGENCY_ROUTE_REDIRECTS } from './config/routes.config';
import {
  useBoardingStatus,
  useCapacityStatus,
  useEDCopilot,
  useEMSIntake,
  useEmergencyAnalytics,
  useEmergencyPatients,
  useEmergencyQueues,
  useEmergencySettings,
  useIntegrationHub,
  usePatientJourney,
  useProvincialHealth,
  useReassessmentQueue,
  useReferrals,
  useSmartIntake,
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

function SmartIntakeRoute() {
  const navigate = useNavigate();
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const addedPatientRef = useRef(false);
  const smartIntake = useSmartIntake();

  return (
    <EmergencyRoutePage
      eyebrow="Arrival"
      title="Smart Intake"
      description="Backend-backed quick intake, identity review, duplicate check, and provincial-unavailable fallback workflow."
    >
      <ApiStateBanner moduleState={smartIntake} />
      <MetricGrid
        metrics={[
          { label: 'Identity review steps', value: smartIntake.data?.data?.identityReview?.length ?? 0, color: '#60A5FA' },
          { label: 'Recent intakes', value: smartIntake.data?.data?.recentPatients?.length ?? 0 },
          { label: 'Mode', value: smartIntake.data?.data?.mode || 'quick-intake', color: '#10B981' },
        ]}
      />
      <QuickIntake
        onClose={() => {
          if (!addedPatientRef.current) navigate(CANONICAL_ROUTES.emergencyWhiteboard);
        }}
        onAdded={(patient) => {
          addedPatientRef.current = true;
          selectPatient(patient.id);
          smartIntake.refresh();
          navigate(CANONICAL_ROUTES.emergencyPatients);
        }}
      />
      <DataSourceNote moduleState={smartIntake} />
    </EmergencyRoutePage>
  );
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

function EMSRoute() {
  const patients = useEmergencyStore((state) => state.patients);
  const rooms = useEmergencyStore((state) => state.rooms);
  const ems = useEMSIntake();
  const emsArrivals = ems.data?.data?.arrivals || [];
  const emsPatients = emsArrivals.length
    ? emsArrivals.map((arrival) => arrival.patient).filter(Boolean)
    : patients.filter((patient) => patient.flags.includes(PatientFlag.EMSArrival) || /ems|ambulance|pre-arrival/i.test(patient.chiefComplaint));
  const availableResusRooms = rooms.filter((room) => room.type === 'Resus' && room.status === 'Available').length;

  return (
    <EmergencyRoutePage
      eyebrow="EMS"
      title="EMS Pipeline"
      description="Inbound and recently converted EMS arrivals using the active Emergency OS patient model."
    >
      <ApiStateBanner moduleState={ems} />
      <MetricGrid
        metrics={[
          { label: 'EMS-linked patients', value: emsPatients.length, color: '#60A5FA' },
          { label: 'Available resus rooms', value: ems.data?.data?.availableResusRooms ?? availableResusRooms, color: availableResusRooms ? '#10B981' : '#EF4444' },
          { label: 'High-risk inbound', value: emsPatients.filter(isHighRisk).length, color: '#EF4444' },
        ]}
      />
      <PatientGrid patients={emsPatients} emptyMessage="No EMS arrivals are active in the current Emergency OS store." />
      <DataSourceNote moduleState={ems} />
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

function ReferralsRoute() {
  const patients = useEmergencyStore((state) => state.patients);
  const referrals = useReferrals();
  const referralRows = referrals.data?.data?.referrals || [];
  const referralCandidates = referralRows.length
    ? referralRows.map((referral) => referral.patient).filter(Boolean)
    : patients.filter((patient) => patient.state === PatientState.Disposition || isBoarding(patient) || isHighRisk(patient));

  return (
    <EmergencyRoutePage
      eyebrow="Transfers"
      title="Referrals"
      description="Referral and transfer candidates from the active Emergency OS patient list."
    >
      <ApiStateBanner moduleState={referrals} />
      {referralRows.length ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {referralRows.map((referral) => (
            <article key={referral.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: 14, border: '1px solid #1F2937', borderRadius: 12, background: '#111827' }}>
              <div>
                <strong style={{ color: '#F9FAFB' }}>{referral.specialty}</strong>
                <p style={{ margin: '4px 0 0', color: '#9CA3AF', fontSize: 13 }}>
                  {referral.patient.firstName} {referral.patient.lastName} | {referral.patient.chiefComplaint}
                </p>
              </div>
              <span style={{ color: '#60A5FA', fontSize: 12 }}>{referral.status}</span>
            </article>
          ))}
        </div>
      ) : null}
      <PatientGrid patients={referralCandidates} emptyMessage="No referral or transfer candidates are currently flagged." />
      <DataSourceNote moduleState={referrals} />
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

function AnalyticsRoute() {
  const patients = useEmergencyStore((state) => state.patients);
  const capacity = useEmergencyStore((state) => state.capacity);
  const analytics = useEmergencyAnalytics();
  const apiMetrics = analytics.data?.data;
  const activePatients = patients.filter((patient) => patient.state !== PatientState.Discharge);
  const waitingPatients = patients.filter((patient) => patient.state === PatientState.Waiting);

  return (
    <EmergencyRoutePage
      eyebrow="Analytics"
      title="Emergency Analytics"
      description="Operational snapshot from the normalized Emergency OS analytics endpoint."
    >
      <ApiStateBanner moduleState={analytics} />
      <MetricGrid
        metrics={[
          { label: 'Active census', value: apiMetrics?.activeCensus ?? activePatients.length },
          { label: 'Waiting', value: apiMetrics?.waiting ?? waitingPatients.length, color: '#F59E0B' },
          { label: 'High risk', value: apiMetrics?.highRisk ?? activePatients.filter(isHighRisk).length, color: '#EF4444' },
          { label: 'Boarding', value: apiMetrics?.boarding ?? activePatients.filter(isBoarding).length, color: '#F97316' },
          { label: 'Reassessment due', value: apiMetrics?.reassessmentDue ?? capacity.reassessmentDue, color: '#EF4444' },
          { label: 'Avg wait', value: `${apiMetrics?.averageWaitMinutes ?? 0}m`, color: '#60A5FA' },
        ]}
      />
      <DataSourceNote moduleState={analytics} />
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

function EmergencySettingsRoute() {
  const settings = useEmergencySettings();
  const enabledModules = settings.data?.data?.enabledModules || ['Thresholds', 'Staffing Defaults', 'Module Toggles', 'Integrations', 'AI Governance'];

  return (
    <EmergencyRoutePage
      eyebrow="Configuration"
      title="Emergency OS Settings"
      description="Operational configuration entry point for thresholds, staffing defaults, modules, integrations, and AI governance."
    >
      <ApiStateBanner moduleState={settings} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {enabledModules.map((item) => (
          <article key={item} style={{ padding: 16, border: '1px solid #1F2937', borderRadius: 12, background: '#111827' }}>
            <strong style={{ color: '#F9FAFB' }}>{item}</strong>
            <p style={{ color: '#9CA3AF', margin: '6px 0 0' }}>
              Managed from `/api/emergency/settings`.
            </p>
          </article>
        ))}
      </div>
      <MetricGrid
        metrics={[
          { label: 'Reassessment threshold', value: `${settings.data?.data?.thresholds?.reassessmentMinutes ?? 30}m`, color: '#60A5FA' },
          { label: 'Long wait threshold', value: `${settings.data?.data?.thresholds?.longWaitMinutes ?? 60}m`, color: '#F59E0B' },
          { label: 'Capacity red score', value: settings.data?.data?.thresholds?.capacityRedScore ?? 85, color: '#EF4444' },
        ]}
      />
      <DataSourceNote moduleState={settings} />
    </EmergencyRoutePage>
  );
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
      <Route path="/" element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />
      <Route element={<RootLayout />}>
        <Route path="/emergency" element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />
        <Route path={CANONICAL_ROUTES.emergencyWhiteboard} element={<EmergencyWhiteboard />} />
        <Route path={CANONICAL_ROUTES.emergencyPatients} element={<PatientsRoute />} />
        <Route path={CANONICAL_ROUTES.emergencyJourney} element={<JourneyRoute />} />
        <Route path={CANONICAL_ROUTES.emergencyEms} element={<EMSRoute />} />
        <Route path={CANONICAL_ROUTES.emergencyIntake} element={<SmartIntakeRoute />} />
        <Route path={CANONICAL_ROUTES.emergencyQueues} element={<QueueRoute />} />
        <Route path={CANONICAL_ROUTES.emergencyReassessment} element={<ReassessmentRoute />} />
        <Route path={CANONICAL_ROUTES.emergencyCapacity} element={<CapacityRoute />} />
        <Route path={CANONICAL_ROUTES.emergencyBoarding} element={<BoardingRoute />} />
        <Route path={CANONICAL_ROUTES.emergencyReferrals} element={<ReferralsRoute />} />
        <Route path={CANONICAL_ROUTES.emergencyProvincialHealth} element={<ProvincialHealthRoute />} />
        <Route path={CANONICAL_ROUTES.emergencyIntegrations} element={<IntegrationsRoute />} />
        <Route path={CANONICAL_ROUTES.emergencyCopilot} element={<CopilotRoute />} />
        <Route path={CANONICAL_ROUTES.emergencyAnalytics} element={<AnalyticsRoute />} />
        <Route path={CANONICAL_ROUTES.emergencyAiGovernance} element={<AIGovernanceDashboard />} />
        <Route path={CANONICAL_ROUTES.aiGovernance} element={<AIGovernanceDashboard />} />
        <Route path={CANONICAL_ROUTES.emergencySettings} element={<EmergencySettingsRoute />} />
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
      <Route path="/tools/*" element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />
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

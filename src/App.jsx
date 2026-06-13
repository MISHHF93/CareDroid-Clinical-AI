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
import QuickIntake from './components/QuickIntake';
import PatientCard from './components/PatientCard';
import { useEmergencyStore } from './store/emergencyStore';
import { PatientFlag, PatientState } from './types/emergency';
import { CANONICAL_ROUTES, LEGACY_EMERGENCY_ROUTE_REDIRECTS } from './config/routes.config';

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

  return (
    <QuickIntake
      onClose={() => {
        if (!addedPatientRef.current) navigate(CANONICAL_ROUTES.emergencyWhiteboard);
      }}
      onAdded={(patient) => {
        addedPatientRef.current = true;
        selectPatient(patient.id);
        navigate(CANONICAL_ROUTES.emergencyPatients);
      }}
    />
  );
}

function QueueRoute() {
  const patients = useEmergencyStore((state) => state.patients);
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

  return (
    <EmergencyRoutePage
      eyebrow="Operations"
      title="Queue Intelligence"
      description="Live bottleneck and handoff pressure across waiting, triage, provider, results, referrals, admission, discharge, and reassessment queues."
    >
      <div style={{ display: 'grid', gap: 10 }}>
        {queueRows.map((queue) => {
          const oldestWait = queue.patients.reduce((max, patient) => {
            const arrivedAt = new Date(patient.arrivalTime).getTime();
            if (!Number.isFinite(arrivedAt)) return max;
            return Math.max(max, Math.round((Date.now() - arrivedAt) / 60000));
          }, 0);
          const breached = oldestWait > queue.target;
          return (
            <article key={queue.label} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'center', padding: 14, border: '1px solid #1F2937', borderRadius: 12, background: '#111827' }}>
              <div>
                <strong style={{ color: '#F9FAFB' }}>{queue.label}</strong>
                <p style={{ margin: '4px 0 0', color: '#9CA3AF', fontSize: 13 }}>
                  {queue.patients.slice(0, 3).map((patient) => `${patient.firstName} ${patient.lastName}`).join(', ') || 'No patients queued'}
                </p>
              </div>
              <strong style={{ color: '#F9FAFB' }}>{queue.patients.length}</strong>
              <span style={{ color: breached ? '#EF4444' : '#10B981', fontSize: 12 }}>
                Oldest {oldestWait}m
              </span>
            </article>
          );
        })}
      </div>
    </EmergencyRoutePage>
  );
}

function EMSRoute() {
  const patients = useEmergencyStore((state) => state.patients);
  const rooms = useEmergencyStore((state) => state.rooms);
  const emsPatients = useMemo(
    () => patients.filter((patient) => patient.flags.includes(PatientFlag.EMSArrival) || /ems|ambulance|pre-arrival/i.test(patient.chiefComplaint)),
    [patients],
  );
  const availableResusRooms = rooms.filter((room) => room.type === 'Resus' && room.status === 'Available').length;

  return (
    <EmergencyRoutePage
      eyebrow="EMS"
      title="EMS Pipeline"
      description="Inbound and recently converted EMS arrivals using the active Emergency OS patient model."
    >
      <MetricGrid
        metrics={[
          { label: 'EMS-linked patients', value: emsPatients.length, color: '#60A5FA' },
          { label: 'Available resus rooms', value: availableResusRooms, color: availableResusRooms ? '#10B981' : '#EF4444' },
          { label: 'High-risk inbound', value: emsPatients.filter(isHighRisk).length, color: '#EF4444' },
        ]}
      />
      <PatientGrid patients={emsPatients} emptyMessage="No EMS arrivals are active in the current Emergency OS store." />
    </EmergencyRoutePage>
  );
}

function ReassessmentRoute() {
  const patients = useEmergencyStore((state) => state.patients);
  const duePatients = useMemo(
    () => patients.filter((patient) => patient.flags.includes(PatientFlag.ReassessmentDue)),
    [patients],
  );

  return (
    <EmergencyRoutePage
      eyebrow="Safety"
      title="Reassessment"
      description="Patients with active reassessment flags. Select a card to open the patient detail panel."
    >
      <PatientGrid patients={duePatients} emptyMessage="No reassessments are due right now." />
    </EmergencyRoutePage>
  );
}

function BoardingRoute() {
  const patients = useEmergencyStore((state) => state.patients);
  const boardingPatients = useMemo(() => patients.filter(isBoarding), [patients]);

  return (
    <EmergencyRoutePage
      eyebrow="Flow"
      title="Boarding"
      description="Pending admissions and boarders that are contributing to capacity pressure."
    >
      <PatientGrid patients={boardingPatients} emptyMessage="No active boarding patients." />
    </EmergencyRoutePage>
  );
}

function ReferralsRoute() {
  const patients = useEmergencyStore((state) => state.patients);
  const referralCandidates = useMemo(
    () => patients.filter((patient) => patient.state === PatientState.Disposition || isBoarding(patient) || isHighRisk(patient)),
    [patients],
  );

  return (
    <EmergencyRoutePage
      eyebrow="Transfers"
      title="Referrals"
      description="Referral and transfer candidates from the active Emergency OS patient list."
    >
      <PatientGrid patients={referralCandidates} emptyMessage="No referral or transfer candidates are currently flagged." />
    </EmergencyRoutePage>
  );
}

function CapacityRoute() {
  const capacity = useEmergencyStore((state) => state.capacity);
  const rooms = useEmergencyStore((state) => state.rooms);
  const patients = useEmergencyStore((state) => state.patients);
  const availableRooms = rooms.filter((room) => room.status === 'Available').length;
  const blockedRooms = rooms.filter((room) => room.status === 'Blocked').length;
  const boardingPatients = patients.filter(isBoarding);

  return (
    <EmergencyRoutePage
      eyebrow="Capacity"
      title="Capacity Detail"
      description="Current ED occupancy, room availability, boarding load, and reassessment pressure."
    >
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
      <PatientGrid patients={boardingPatients} emptyMessage="No active boarders affecting capacity." />
    </EmergencyRoutePage>
  );
}

function AnalyticsRoute() {
  const patients = useEmergencyStore((state) => state.patients);
  const capacity = useEmergencyStore((state) => state.capacity);
  const activePatients = patients.filter((patient) => patient.state !== PatientState.Discharge);
  const waitingPatients = patients.filter((patient) => patient.state === PatientState.Waiting);

  return (
    <EmergencyRoutePage
      eyebrow="Analytics"
      title="Emergency Analytics"
      description="Operational snapshot from the active Emergency OS store while backend aggregate dashboards are being consolidated."
    >
      <MetricGrid
        metrics={[
          { label: 'Active census', value: activePatients.length },
          { label: 'Waiting', value: waitingPatients.length, color: '#F59E0B' },
          { label: 'High risk', value: activePatients.filter(isHighRisk).length, color: '#EF4444' },
          { label: 'Boarding', value: activePatients.filter(isBoarding).length, color: '#F97316' },
          { label: 'Reassessment due', value: capacity.reassessmentDue, color: '#EF4444' },
          { label: 'Capacity band', value: capacity.band, color: '#60A5FA' },
        ]}
      />
    </EmergencyRoutePage>
  );
}

function CopilotRoute() {
  const patients = useEmergencyStore((state) => state.patients);
  const capacity = useEmergencyStore((state) => state.capacity);
  const alerts = useEmergencyStore((state) => state.alerts);
  const activePatients = patients.filter((patient) => patient.state !== PatientState.Discharge);
  const highRiskPatients = activePatients.filter(isHighRisk);

  return (
    <EmergencyRoutePage
      eyebrow="AI Assist"
      title="ED Copilot"
      description="The copilot panel is mounted in the Emergency OS shell and uses this route context for department-level questions."
    >
      <MetricGrid
        metrics={[
          { label: 'Active patients', value: activePatients.length },
          { label: 'High risk', value: highRiskPatients.length, color: '#EF4444' },
          { label: 'Capacity band', value: capacity.band, color: '#60A5FA' },
          { label: 'Active alerts', value: alerts.filter((alert) => !alert.dismissed).length, color: '#F59E0B' },
        ]}
      />
      <p style={{ color: '#9CA3AF', margin: 0 }}>
        Use the docked ED Copilot to ask about who needs attention, capacity pressure, EMS status, or reassessment priorities.
      </p>
    </EmergencyRoutePage>
  );
}

function EmergencySettingsRoute() {
  return (
    <EmergencyRoutePage
      eyebrow="Configuration"
      title="Emergency OS Settings"
      description="Operational configuration entry point for thresholds, staffing defaults, modules, integrations, and AI governance."
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {['Thresholds', 'Staffing Defaults', 'Module Toggles', 'Integrations', 'AI Governance'].map((item) => (
          <article key={item} style={{ padding: 16, border: '1px solid #1F2937', borderRadius: 12, background: '#111827' }}>
            <strong style={{ color: '#F9FAFB' }}>{item}</strong>
            <p style={{ color: '#9CA3AF', margin: '6px 0 0' }}>Managed from the consolidated Emergency OS configuration surface.</p>
          </article>
        ))}
      </div>
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
        <Route path={CANONICAL_ROUTES.emergencyPatients} element={<EmergencyWhiteboard />} />
        <Route path={CANONICAL_ROUTES.emergencyEms} element={<EMSRoute />} />
        <Route path={CANONICAL_ROUTES.emergencyIntake} element={<SmartIntakeRoute />} />
        <Route path={CANONICAL_ROUTES.emergencyQueues} element={<QueueRoute />} />
        <Route path={CANONICAL_ROUTES.emergencyReassessment} element={<ReassessmentRoute />} />
        <Route path={CANONICAL_ROUTES.emergencyCapacity} element={<CapacityRoute />} />
        <Route path={CANONICAL_ROUTES.emergencyBoarding} element={<BoardingRoute />} />
        <Route path={CANONICAL_ROUTES.emergencyReferrals} element={<ReferralsRoute />} />
        <Route path={CANONICAL_ROUTES.emergencyCopilot} element={<CopilotRoute />} />
        <Route path={CANONICAL_ROUTES.emergencyAnalytics} element={<AnalyticsRoute />} />
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
      <Route path="/ai-governance" element={<Navigate to={CANONICAL_ROUTES.emergencySettings} replace />} />
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

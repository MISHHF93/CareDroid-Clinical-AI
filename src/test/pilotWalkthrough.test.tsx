import React, { Suspense } from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../contexts/ThemeContext';
import { UserProvider } from '../contexts/UserContext';
import { ConversationProvider } from '../contexts/ConversationContext';
import { ToolPreferencesProvider } from '../contexts/ToolPreferencesContext';
import { WorkspaceProvider } from '../contexts/WorkspaceContext';
import { OrganizationContextProvider } from '../contexts/OrganizationContext';
import { WhiteLabelProvider } from '../contexts/WhiteLabelContext';
import { UserIdentityProvider } from '../contexts/UserIdentityContext';
import { SystemConfigProvider } from '../contexts/SystemConfigContext';
import { TenantContextProvider } from '../contexts/TenantContext';
import { useUser } from '../contexts/UserContext';
import { AppRoutes } from '../App';
import { PatientFlag, PatientState, Priority } from '../types/emergency';
import { getPatientFlagType, useEmergencyStore } from '../store/emergencyStore';
import { compileCareDroidAccessProfile, normalizeCareDroidProfile } from '../lib/users/canonicalAccess';
import { createPatientAndRouteFromReception } from '../services/receptionIntakeOrchestrator';

vi.mock('recharts', () => {
  const passthrough = ({ children }) => <div>{children}</div>;
  const noop = () => null;
  return {
    ResponsiveContainer: passthrough,
    BarChart: passthrough,
    Bar: noop,
    CartesianGrid: noop,
    Cell: noop,
    Line: noop,
    LineChart: passthrough,
    Pie: passthrough,
    PieChart: passthrough,
    Tooltip: noop,
    XAxis: noop,
    YAxis: noop,
  };
});

vi.mock('../services/clinicalChatService', () => ({
  sendClinicalChatMessage: vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    data: { response: 'Pilot demo assistant response.' },
  }),
  mapChatResponseToAssistantMessage: vi.fn(),
}));

vi.mock('../services/emergencyTransportApi', () => ({
  fetchEmsFleetSnapshot: vi.fn().mockResolvedValue({
    ok: true,
    data: { units: [], sourceLabel: 'pilot test EMS fixture' },
  }),
  fetchEmergencyDiversionStatus: vi.fn().mockResolvedValue({
    ok: true,
    data: { status: 'Open' },
    message: 'Pilot test diversion fixture.',
  }),
  persistEmergencyReferral: vi.fn().mockResolvedValue({
    ok: true,
    message: 'Referral persisted in pilot test.',
  }),
  updateEmergencyTransferWorkflow: vi.fn().mockResolvedValue({
    ok: true,
    message: 'Transfer workflow synced in pilot test.',
  }),
}));

vi.mock('../services/emergencySettingsApi', () => ({
  fetchSettingsFeatureFlags: vi.fn().mockResolvedValue({ ok: false, message: 'Local pilot flags.' }),
  subscribeToSettingsFeatureChanges: vi.fn(() => () => {}),
  updateSettingsFeatureFlag: vi.fn().mockResolvedValue({ ok: true }),
  fetchIntegrationStatuses: vi.fn().mockResolvedValue({}),
  fetchProtocolsAdmin: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  saveAlertRuleSettings: vi.fn().mockResolvedValue({ ok: true }),
  saveDepartmentSettings: vi.fn().mockResolvedValue({ ok: true }),
  saveStaffSettings: vi.fn().mockResolvedValue({ ok: true }),
  saveThresholdSettings: vi.fn().mockResolvedValue({ ok: true }),
  testIntegrationConnection: vi.fn().mockResolvedValue({ ok: true }),
  updateProtocolAdmin: vi.fn().mockResolvedValue({ ok: true }),
}));

const originalEmergencyState = useEmergencyStore.getState();
// 30s, not 15s: the New Referral header action registers via
// useRouteChromeRegistration one tick after the referrals page body renders,
// and under CPU contention (parallel suites, post-full-run settling) that
// tick has been observed to exceed 15s in jsdom while the same run passes
// idle — same load-headroom class as this file's own 120s test timeout.
const PILOT_ROUTE_LOAD_TIMEOUT = 30000;
// EmergencyAnalytics is the heaviest single fresh-mount route in this suite
// (see the beforeAll prewarm comment below): empirically, cold full-suite
// runs on this Windows dev machine have exceeded PILOT_ROUTE_LOAD_TIMEOUT
// here (observed up to ~34.6s) even after module prewarm, while an isolated
// run of just this stage consistently passes in a few seconds -- cumulative
// environment load across the preceding stage tests in the same worker
// process, not an app defect (see MB-J7 note in the discharge/analytics
// stage test below). Sized with headroom above the worst observed case.
const ANALYTICS_ROUTE_LOAD_TIMEOUT = 45000;

// Permissions and screen mode are resolved by two independent systems, and
// no single front-line HospitalRole has every permission this walkthrough
// exercises (create + discharge + referrals + analytics) -- that split
// mirrors real hospital division of labor (reception/nursing creates,
// physicians discharge). `super_admin` is the only role with every
// permission (`permissions.ts`: `Object.freeze(Object.values(P))`), so it's
// used for the compiled access profile attached below, which every
// route/permission check consults directly via `compiledAccessProfile`.
// Screen mode is resolved separately (`useRouteScreenMode`), driven purely
// by the raw `role` string on the user object, not by
// `compiledAccessProfile` -- `super_admin`'s EmergencyRoleId ('admin')
// would resolve to the aggregate-metrics admin screen mode with no
// individual patient cards, so DemoAccessRole below overrides just that
// raw string to 'physician' to keep the standard clinical whiteboard.
const PILOT_COMPILED_ACCESS_PROFILE = compileCareDroidAccessProfile(
  normalizeCareDroidProfile({
    id: 'pilot-demo-admin',
    employeeId: 'PILOT-001',
    fullName: 'Pilot Demo Admin',
    preferredName: 'Pilot',
    email: 'pilot-demo-admin@caredroid.local',
    phone: '',
    avatarUrl: '',
    role: 'super_admin',
    title: 'Pilot Demo Admin',
    department: 'Administration',
    hospitalSite: 'Central City Hospital',
    cityZone: 'Central',
    shiftStatus: 'on_shift',
    shiftStart: '00:00',
    shiftEnd: '23:59',
    licenseNumber: null,
    specialties: [],
    availabilityStatus: 'available',
    escalationLevel: 'none',
  } as any),
);

function DemoAccessRole() {
  const { setUser } = useUser();
  const initialized = React.useRef(false);

  React.useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setUser({
      id: 'pilot-demo-admin',
      email: 'pilot-demo-admin@caredroid.local',
      name: 'Pilot Demo Admin',
      fullName: 'Pilot Demo Admin',
      role: 'physician',
      authMode: 'open-access',
      isEmailVerified: true,
      compiledAccessProfile: PILOT_COMPILED_ACCESS_PROFILE,
    });
  }, [setUser]);

  return null;
}

function AppRouteHarness({ initialPath = '/emergency/whiteboard' }) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <ThemeProvider>
        <UserProvider>
          <WorkspaceProvider>
            <ToolPreferencesProvider>
              <TenantContextProvider>
                <UserIdentityProvider>
                  <OrganizationContextProvider>
                    <WhiteLabelProvider>
                      <ConversationProvider>
                        <SystemConfigProvider>
                          <Suspense fallback={<div>Loading route</div>}>
                            <DemoAccessRole />
                            <AppRoutes />
                          </Suspense>
                        </SystemConfigProvider>
                      </ConversationProvider>
                    </WhiteLabelProvider>
                  </OrganizationContextProvider>
                </UserIdentityProvider>
              </TenantContextProvider>
            </ToolPreferencesProvider>
          </WorkspaceProvider>
        </UserProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

function findNewPatient(beforeIds) {
  return useEmergencyStore
    .getState()
    .patients.find((patient) => !beforeIds.has(patient.id));
}

async function waitForNewPatient(beforeIds) {
  let patient;
  await waitFor(() => {
    patient = findNewPatient(beforeIds);
    expect(patient).toBeTruthy();
  });
  return patient;
}

async function waitForPatient(patientId, predicate) {
  let patient;
  await waitFor(() => {
    patient = useEmergencyStore.getState().patients.find((candidate) => candidate.id === patientId);
    expect(patient).toBeTruthy();
    expect(predicate(patient)).toBe(true);
  });
  return patient;
}

function getPatientCard(patientId) {
  const card = document.querySelector(`[data-patient-card-id="${patientId}"]`);
  expect(card).toBeTruthy();
  if (!card) throw new Error(`expected patient card for ${patientId}`);
  return card;
}

function flagTypes(patient) {
  return patient.flags.map(getPatientFlagType);
}

function referralForPatient(patientId) {
  return useEmergencyStore.getState().referrals.find((referral) => referral.patientId === patientId);
}

// Builds a Triage-stage patient through the SAME production orchestrator the
// real "reception-create-route" button calls (createPatientAndRouteFromReception),
// rather than hand-authoring a raw Patient object -- later stages get a
// production-faithful precondition without re-exercising Reception's own UI,
// which has its own dedicated stage test below.
async function createTriagePatientViaReception(chiefComplaint = 'Chest pain') {
  const routeResult = await createPatientAndRouteFromReception(
    { arrivalType: 'walk-in', chiefComplaint },
    { actorName: 'Pilot Demo Admin' },
  );
  return routeResult.patient;
}

const STAGE_TEST_TIMEOUT = 60000;

// HEAL-053 diagnosed this suite as env-flaky on this Windows machine
// (2026-08-09/10 triage): a single ~7-stage mega-walkthrough in one it()
// block ran 29-65s and stalled past its per-step timeout at whichever step
// happened to land on a vite-node first-import transform, with three
// DIFFERENT steps observed failing across otherwise-identical runs -- every
// step passed in healthy runs, so the workflows themselves were sound, only
// the test's own cumulative duration/lazy-import exposure was the problem.
// vitest retry was tried and rejected: attempts share the process, so a
// timed-out attempt's leaked render (AppShell interval loops, store
// subscriptions) poisoned the next attempt.
//
// HEAL-063 (MB-J1) applies the durable fix flagged at the time: one route,
// one concern, one fresh render per test. `globals: true` in vitest.config.ts
// gives React Testing Library automatic per-test unmount/cleanup, so each
// `it()` below starts from a clean DOM without manual teardown. Stages that
// don't test Reception or Referrals UI skip straight to their precondition
// via createTriagePatientViaReception + the same store actions the original
// mega-test used, instead of re-driving earlier UI stages just to reach a
// later one.
describe('pilot walkthrough', () => {
  // Pre-warm the walkthrough's lazy route chunks. In the real app these are
  // prebuilt hashed chunks served instantly; under vitest, vite-node
  // transforms each module graph on FIRST import, and the analytics page's
  // graph has been observed to intermittently exceed the per-step findBy
  // timeout mid-test (Suspense fallback stuck 30s+), failing the walkthrough
  // on test-env latency rather than app behavior. Importing here resolves
  // each router lazy() instantly at visit time, for every stage test below
  // (vite-node caches the transformed module after its first import).
  beforeAll(async () => {
    await Promise.all([
      import('../pages/emergency'),
      import('../pages/emergency/ReceptionWorkspace'),
      import('../pages/emergency/SmartIntake'),
      import('../components/ReferralPanel'),
      import('../pages/emergency/EmergencyAnalytics'),
    ]);
  });

  beforeEach(() => {
    useEmergencyStore.setState(originalEmergencyState, true);
    vi.clearAllMocks();
    (global.fetch as any)?.mockRejectedValue?.(new Error('Pilot test uses local CareDroid fixtures.'));
  });

  afterEach(() => {
    useEmergencyStore.setState(originalEmergencyState, true);
  });

  it('loads the default whiteboard route on demo access', { timeout: STAGE_TEST_TIMEOUT }, async () => {
    render(<AppRouteHarness />);

    expect(await screen.findByText('CareDroid')).toBeInTheDocument();
    // Multiple surfaces legitimately show "Waiting" (alarm KPI chip, stat
    // card, filter chip, per-patient state pills) -- this just confirms the
    // whiteboard has finished loading real data, not which one rendered it.
    expect(
      (await screen.findAllByText('Waiting', {}, { timeout: PILOT_ROUTE_LOAD_TIMEOUT })).length,
    ).toBeGreaterThan(0);
  });

  it(
    'creates a patient through the Reception intake flow and routes it to Triage',
    { timeout: STAGE_TEST_TIMEOUT },
    async () => {
      const user = userEvent.setup();
      const beforePatientIds = new Set(useEmergencyStore.getState().patients.map((patient) => patient.id));

      render(<AppRouteHarness initialPath="/emergency/intake" />);

      expect(
        await screen.findByRole('heading', { name: 'Check patient identity' }, { timeout: PILOT_ROUTE_LOAD_TIMEOUT }),
      ).toBeInTheDocument();

      // Reception-embedded intake now runs the life-critical desk form and the
      // identity-verification overlay side by side. Patient creation only
      // requires the desk form (createPatientAndRouteFromReception gates on
      // permission, not field completeness); identity capture is a separate,
      // non-blocking flow layered on top.
      expect(
        await screen.findByRole('heading', { name: 'Life-critical intake' }, { timeout: PILOT_ROUTE_LOAD_TIMEOUT }),
      ).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Chest pain' }));
      // Primary CTA label escalates to "Route to priority triage" for
      // red-flag complaints like chest pain (see
      // resolveUnifiedIntakePrimaryAction), replacing the default
      // "Create patient & route". A separate reception-skill-strip quick
      // action also contains "route" in its text, so target the action-bar
      // CTA's stable test id rather than a name regex to avoid ambiguity.
      await user.click(screen.getByTestId('reception-create-route'));

      const createdPatient = await waitForNewPatient(beforePatientIds);
      expect(createdPatient.state).toBe(PatientState.Triage);
    },
  );

  it(
    'reflects priority, wait state, and reassessment lifecycle on the whiteboard through to Assessment',
    { timeout: STAGE_TEST_TIMEOUT },
    async () => {
      let createdPatient;
      await act(async () => {
        createdPatient = await createTriagePatientViaReception();
      });

      render(<AppRouteHarness initialPath="/emergency/whiteboard" />);

      await waitFor(() => expect(getPatientCard(createdPatient.id)).toBeInTheDocument(), {
        timeout: PILOT_ROUTE_LOAD_TIMEOUT,
      });

      act(() => {
        useEmergencyStore.getState().updatePatient(createdPatient.id, { priority: Priority.P2 });
      });
      await waitForPatient(createdPatient.id, (patient) => patient.priority === Priority.P2);

      act(() => {
        useEmergencyStore.getState().movePatientToState(createdPatient.id, PatientState.Waiting);
      });
      await waitForPatient(createdPatient.id, (patient) => patient.state === PatientState.Waiting);

      act(() => {
        useEmergencyStore.getState().scheduleReassessmentReminder(createdPatient.id, {
          scheduledBy: 'pilot-demo-admin',
          dueAt: new Date(Date.now() - 60_000).toISOString(),
          note: 'Pilot walkthrough reassessment trigger.',
        });
        useEmergencyStore.getState().addFlag(createdPatient.id, 'ReassessmentDue');
      });
      await waitForPatient(createdPatient.id, (patient) => flagTypes(patient).includes('ReassessmentDue'));

      act(() => {
        const patient = useEmergencyStore.getState().patients.find((candidate) => candidate.id === createdPatient.id);
        const reminder = patient?.reassessmentReminders?.find((candidate) => candidate.status !== 'completed');
        if (reminder) {
          useEmergencyStore.getState().completeReassessmentReminder(createdPatient.id, reminder.id, {
            completedBy: 'pilot-demo-admin',
          });
        }
        useEmergencyStore.getState().removeFlag(createdPatient.id, PatientFlag.ReassessmentDue);
      });
      await waitForPatient(createdPatient.id, (patient) => !flagTypes(patient).includes('ReassessmentDue'));

      act(() => {
        useEmergencyStore.getState().movePatientToState(createdPatient.id, PatientState.Assessment);
      });
      await waitForPatient(createdPatient.id, (patient) => patient.state === PatientState.Assessment);
    },
  );

  it(
    'sends a referral for an Assessment-stage patient through the Referrals workspace',
    { timeout: STAGE_TEST_TIMEOUT },
    async () => {
      const user = userEvent.setup();
      let createdPatient;
      await act(async () => {
        createdPatient = await createTriagePatientViaReception();
        useEmergencyStore.getState().movePatientToState(createdPatient.id, PatientState.Assessment);
      });

      render(<AppRouteHarness initialPath="/emergency/referrals" />);

      expect(await screen.findByRole('heading', { name: 'Referrals' })).toBeInTheDocument();
      // Header actions (New Referral/New Transfer) register into the shared
      // route chrome via useRouteChromeRegistration, an effect that commits
      // one tick after the page body renders — findByRole waits for it.
      await user.click(
        await screen.findByRole('button', { name: /New Referral/i }, { timeout: PILOT_ROUTE_LOAD_TIMEOUT }),
      );

      await user.type(screen.getByPlaceholderText(/Search active patients/i), createdPatient.mrn);
      const searchResults = screen.getByLabelText('Active patient search results');
      const patientResult = within(searchResults)
        .getAllByRole('button')
        .find((button) => button.textContent.includes(createdPatient.mrn));
      expect(patientResult).toBeTruthy();
      if (!patientResult) throw new Error(`expected a search result for ${createdPatient.mrn}`);
      await user.click(patientResult);

      await user.type(screen.getByPlaceholderText('Clinical reason for referral'), 'Pilot cardiology referral');
      await user.click(screen.getByRole('button', { name: /Send Referral/i }));
      await waitFor(() => expect(referralForPatient(createdPatient.id)?.status).toBe('Sent'));
      expect(await screen.findByText('Pilot cardiology referral')).toBeInTheDocument();
    },
  );

  // MB-J7 note: this stage has been observed to occasionally exceed even
  // ANALYTICS_ROUTE_LOAD_TIMEOUT on this machine when run as the last of
  // several fresh-mount tests in one worker process (cumulative CPU/GC
  // pressure from the preceding stage tests' own full AppShell mounts), but
  // never when run in isolation -- a real environment characteristic worth a
  // dedicated AppShell mount-cost / engine-cleanup audit in a future round,
  // not a defect in this test or in EmergencyAnalytics itself.
  it(
    'discharges a patient and reflects the discharge in department analytics',
    { timeout: STAGE_TEST_TIMEOUT + 30000 },
    async () => {
      let createdPatient;
      await act(async () => {
        createdPatient = await createTriagePatientViaReception();
        useEmergencyStore.getState().movePatientToState(createdPatient.id, PatientState.Assessment);
        useEmergencyStore.getState().movePatientToState(createdPatient.id, PatientState.Disposition);
        useEmergencyStore.getState().dischargePatient(createdPatient.id, {
          staffId: 'pilot-demo-admin',
          note: 'Patient discharged from pilot walkthrough.',
        });
      });

      render(<AppRouteHarness initialPath="/emergency/analytics" />);

      expect(
        await screen.findByRole('heading', { name: 'Department Analytics' }, { timeout: ANALYTICS_ROUTE_LOAD_TIMEOUT }),
      ).toBeInTheDocument();
      await waitFor(() => expect(useEmergencyStore.getState().emergencyAnalytics.data?.shift).toBeTruthy());

      const analytics = useEmergencyStore.getState().emergencyAnalytics.data;
      if (!analytics) throw new Error('expected emergencyAnalytics data to be populated');
      expect(analytics.shift.dischargeCount).toBeGreaterThan(0);
      expect(analytics.operationalCommand.topComplaints).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: createdPatient.complaintCategory,
          }),
        ])
      );

      const analyticsKpis = screen.getByLabelText('Emergency analytics KPIs');
      expect(within(analyticsKpis).getByText('Discharges')).toBeInTheDocument();
      expect(within(analyticsKpis).getAllByText(String(analytics.shift.dischargeCount)).length).toBeGreaterThan(0);
    },
  );
});

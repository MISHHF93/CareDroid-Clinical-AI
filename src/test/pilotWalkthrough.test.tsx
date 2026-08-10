import React, { Suspense } from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
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

function PilotRouteControls() {
  const navigate = useNavigate();

  return (
    <div style={{ position: 'absolute', left: -9999, top: 0 }}>
      <button type="button" aria-label="Pilot open whiteboard" onClick={() => navigate('/emergency/whiteboard')}>
        Open whiteboard
      </button>
      <button type="button" aria-label="Pilot open intake" onClick={() => navigate('/emergency/intake')}>
        Open intake
      </button>
      <button type="button" aria-label="Pilot open referrals" onClick={() => navigate('/emergency/referrals')}>
        Open referrals
      </button>
      <button type="button" aria-label="Pilot open analytics" onClick={() => navigate('/emergency/analytics')}>
        Open analytics
      </button>
    </div>
  );
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
                            <PilotRouteControls />
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

describe('pilot walkthrough', () => {
  // Pre-warm the walkthrough's lazy route chunks. In the real app these are
  // prebuilt hashed chunks served instantly; under vitest, vite-node
  // transforms each module graph on FIRST import, and the analytics page's
  // graph has been observed to intermittently exceed the per-step findBy
  // timeout mid-test (Suspense fallback stuck 30s+), failing the walkthrough
  // on test-env latency rather than app behavior. Importing here resolves
  // each router lazy() instantly at visit time.
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

  // KNOWN ENV-FLAKY on this Windows machine (2026-08-09 triage): the same run
  // completes in 29-47s or stalls past a 30s per-step timeout at whichever
  // step lands on the stall — three DIFFERENT steps observed failing across
  // otherwise-identical sequential runs, and every step passes in healthy
  // runs, so the workflows themselves are sound. Do NOT add vitest retry:
  // attempts share the process, and a timed-out attempt's leaked render
  // (AppShell interval loops, store subscriptions) poisons the next attempt.
  // Durable fix (future round): split this mega-walkthrough into per-stage
  // tests with fresh renders and explicit unmount/cleanup between stages.
  it('drives the CareDroid pilot from demo access through discharge and analytics', { timeout: 120000 }, async () => {
    const user = userEvent.setup();
    const beforePatientIds = new Set(useEmergencyStore.getState().patients.map((patient) => patient.id));

    render(<AppRouteHarness />);

    expect(await screen.findByText('CareDroid')).toBeInTheDocument();
    // Multiple surfaces legitimately show "Waiting" (alarm KPI chip, stat
    // card, filter chip, per-patient state pills) -- this just confirms the
    // whiteboard has finished loading real data, not which one rendered it.
    expect(
      (await screen.findAllByText('Waiting', {}, { timeout: PILOT_ROUTE_LOAD_TIMEOUT })).length,
    ).toBeGreaterThan(0);

    await user.click(screen.getByLabelText('Pilot open intake'));
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

    await user.click(screen.getByLabelText('Pilot open whiteboard'));
    // Multiple surfaces legitimately show "Waiting" (alarm KPI chip, stat
    // card, filter chip, per-patient state pills) -- this just confirms the
    // whiteboard has finished loading real data, not which one rendered it.
    expect(
      (await screen.findAllByText('Waiting', {}, { timeout: PILOT_ROUTE_LOAD_TIMEOUT })).length,
    ).toBeGreaterThan(0);
    await waitFor(() => expect(getPatientCard(createdPatient.id)).toBeInTheDocument(), {
      timeout: PILOT_ROUTE_LOAD_TIMEOUT,
    });

    await user.click(getPatientCard(createdPatient.id));

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

    await user.click(screen.getByLabelText('Pilot open referrals'));
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

    await user.click(screen.getByLabelText('Pilot open whiteboard'));
    // The board caps visible cards at PRACTITIONER_WHITEBOARD_CARD_LIMIT (18)
    // to reduce clutter; the walkthrough's fixture data plus this session's
    // freshly-created patient can exceed that on the unfiltered view. Narrow
    // to the "Referrals" awareness chip, which the patient we just referred
    // is guaranteed to appear under -- also the natural next click for
    // someone who just sent a referral.
    await user.click(await screen.findByRole('button', { name: /Referrals \(\d+\)/i }));
    await waitFor(() => expect(getPatientCard(createdPatient.id)).toBeInTheDocument());
    act(() => {
      useEmergencyStore.getState().movePatientToState(createdPatient.id, PatientState.Disposition);
    });
    await waitForPatient(createdPatient.id, (patient) => patient.state === PatientState.Disposition);

    act(() => {
      useEmergencyStore.getState().dischargePatient(createdPatient.id, {
        staffId: 'pilot-demo-admin',
        note: 'Patient discharged from pilot walkthrough.',
      });
    });
    await waitForPatient(createdPatient.id, (patient) => patient.state === PatientState.Discharge);

    await user.click(screen.getByLabelText('Pilot open analytics'));
    expect(
      await screen.findByRole('heading', { name: 'Department Analytics' }, { timeout: PILOT_ROUTE_LOAD_TIMEOUT }),
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
  }); // full end-to-end pilot walkthrough genuinely runs 29-65s depending on system load; 60s was too tight and caused load-dependent timeouts, not a real failure (timeout now passed via the it() options object above, matching backendOrphanAudit.test.ts's own HEAVY_ORPHAN_SCAN_TIMEOUT_MS precedent for heavy tests)
});

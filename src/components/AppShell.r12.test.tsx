import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from './AppShell';
import { useEmergencyStore } from '../store/emergencyStore';
import { startCapacityEngine } from '../engine/capacityEngine';
import { startReassessmentEngine } from '../engine/reassessmentEngine';
import { startSimulation, stopSimulation } from '../engine/simulation';

const mocks = vi.hoisted(() => ({
  startCapacityEngine: vi.fn(() => 222),
  startReassessmentEngine: vi.fn(() => 111),
  startContinuousPatientFlowEngine: vi.fn(() => 333),
  startAdministrativeAutomationEngine: vi.fn(() => 444),
  startUnifiedWorkflowAutomationEngine: vi.fn(() => vi.fn()),
  startUnifiedOperationalIntelligenceEngine: vi.fn(() => vi.fn()),
  startUnifiedApplicationKnowledgeGraphEngine: vi.fn(() => vi.fn()),
  startSimulation: vi.fn(() => [333]),
  stopSimulation: vi.fn(),
  startEmergencyRealtime: vi.fn(() => vi.fn()),
  calculateCapacity: vi.fn(() => ({
    score: 42,
    band: 'Green',
    label: 'Green capacity',
    riskLevel: 'Green',
    totalPatients: 0,
    occupiedRooms: 0,
    boardingCount: 0,
    reassessmentDue: 0,
    currentOccupancy: 0,
    maxCapacity: 15,
    occupancyPercent: 0,
  })),
}));

vi.mock('../services/emergencyRealtimeService', () => ({
  default: mocks.startEmergencyRealtime,
  startEmergencyRealtime: mocks.startEmergencyRealtime,
}));

vi.mock('../engine/capacityEngine', () => ({
  startCapacityEngine: mocks.startCapacityEngine,
  calculateCapacity: mocks.calculateCapacity,
}));

vi.mock('../engine/reassessmentEngine', () => ({
  startReassessmentEngine: mocks.startReassessmentEngine,
}));

vi.mock('../engine/continuousPatientFlowEngine', () => ({
  startContinuousPatientFlowEngine: mocks.startContinuousPatientFlowEngine,
}));

vi.mock('../engine/administrativeAutomationEngine', () => ({
  startAdministrativeAutomationEngine: mocks.startAdministrativeAutomationEngine,
}));

vi.mock('../engine/unifiedWorkflowAutomationEngine', () => ({
  startUnifiedWorkflowAutomationEngine: mocks.startUnifiedWorkflowAutomationEngine,
  getLastWorkflowAutomationBackendEvent: vi.fn(() => undefined),
  scheduleWorkflowAutomationRefresh: vi.fn(),
}));

vi.mock('../engine/unifiedOperationalIntelligenceEngine', () => ({
  startUnifiedOperationalIntelligenceEngine: mocks.startUnifiedOperationalIntelligenceEngine,
  getLastUnifiedOperationalIntelligenceBackendEvent: vi.fn(() => undefined),
  scheduleUnifiedOperationalIntelligenceRefresh: vi.fn(),
}));

vi.mock('../engine/unifiedApplicationKnowledgeGraphEngine', () => ({
  startUnifiedApplicationKnowledgeGraphEngine: mocks.startUnifiedApplicationKnowledgeGraphEngine,
  handleUnifiedApplicationKnowledgeGraphBackendEvent: vi.fn(),
}));

vi.mock('../engine/simulation', () => ({
  startSimulation: mocks.startSimulation,
  stopSimulation: mocks.stopSimulation,
}));

vi.mock('../services/backendReachability', () => ({
  probeBackendReachability: vi.fn().mockResolvedValue(true),
  isBackendKnownOffline: vi.fn().mockReturnValue(false),
}));

vi.mock('../services/devBackendSession', () => ({
  ensureDevBackendSession: vi.fn().mockResolvedValue(undefined),
}));

// HEAL-347.2: each mock factory's top-level call proves that module was
// actually *loaded* (module bodies only evaluate once, on first
// resolution) -- distinguishing "the prefetch effect requested this chunk"
// from "nothing ever did". Declared via vi.hoisted() since vi.mock() factory
// bodies are themselves hoisted above plain const declarations.
const lazyPanelLoadSpies = vi.hoisted(() => ({
  patientDetailPanelLoad: vi.fn(),
  commandPaletteLoad: vi.fn(),
  reassessmentDrawerLoad: vi.fn(),
  helpHubLoad: vi.fn(),
  copilotPanelLoad: vi.fn(),
}));

vi.mock('./PatientDetailPanel', () => {
  lazyPanelLoadSpies.patientDetailPanelLoad();
  return { default: () => null };
});
vi.mock('./CommandPalette', () => {
  lazyPanelLoadSpies.commandPaletteLoad();
  return { default: () => null };
});
vi.mock('./ReassessmentDrawer', () => {
  lazyPanelLoadSpies.reassessmentDrawerLoad();
  return { default: () => null };
});
vi.mock('./help/HelpHub', () => {
  lazyPanelLoadSpies.helpHubLoad();
  return { default: () => null };
});
vi.mock('./CopilotPanel', () => {
  lazyPanelLoadSpies.copilotPanelLoad();
  return { CopilotPanel: () => null };
});

const emergencyRoleMock = vi.hoisted(() => {
  const { PERMISSIVE_EMERGENCY_ROLE_MOCK } = require('../test/permissiveEmergencyRoleMock.ts');
  return PERMISSIVE_EMERGENCY_ROLE_MOCK;
});

vi.mock('../hooks/useEmergencyRolePermissions', () => ({
  useEmergencyRolePermissions: () => emergencyRoleMock,
  default: () => emergencyRoleMock,
}));

// Without a UserContext, resolveEmergencyRoleId() fails closed to
// readOnlyViewer (Cycle 219 security hardening), whose default screen mode
// is the wall-kiosk readOnlyWhiteboard. shouldStartShellEngine() gates every
// engine off for kiosk screens, so this "startup wiring" test — which only
// cares whether AppShell wires engines up when capabilities say to, not
// which role/route maps to which screen — pins the screen to a normal
// clinical mode (charge_nurse, matching emergencyRoleMock above) via a
// hand-built capabilities object covering every field AppShell.tsx reads.
const screenCapabilitiesMock = {
  screenMode: 'CHARGE_NURSE_SCREEN',
  label: 'Charge Nurse',
  productLabel: 'CareDroid',
  isPublicDisplay: false,
  isWallKiosk: false,
  useMinimalAppChrome: false,
  isRegistrationScreen: false,
  isReceptionScreen: false,
  isTriageScreen: false,
  showReassessmentEngine: true,
  showCapacityEngine: true,
  showPatientFlowEngine: true,
  showAdministrativeAutomationEngine: true,
  showOperationalIntelligenceEngine: true,
  showReassessAction: true,
  showEmsCriticalOverlay: true,
  showCentralNodeBadge: true,
  showOperationalStrip: true,
};

vi.mock('../hooks/useScreenModeCapabilities', () => ({
  useScreenModeCapabilities: () => screenCapabilitiesMock,
  default: () => screenCapabilitiesMock,
}));

vi.mock('../contexts/SimulationModeContext', () => ({
  useSimulationMode: () => ({
    enabled: true,
    active: true,
    setActive: vi.fn(),
    toggle: vi.fn(),
  }),
}));

vi.mock('./account/DemoPersonaPanel', () => ({
  default: () => null,
}));

vi.mock('./chrome/SessionChromeBar', () => ({
  default: () => null,
}));

vi.mock('./Sidebar', () => ({
  Sidebar: () => <nav aria-label="Sidebar" />,
}));

vi.mock('./Header', () => ({
  Header: () => <header>Header</header>,
}));

vi.mock('./CopilotPanel', () => ({
  CopilotPanel: () => <aside>Copilot</aside>,
}));

vi.mock('./PatientDetailPanel', () => ({
  default: () => null,
}));

vi.mock('./CommandPalette', () => ({
  default: () => null,
}));

vi.mock('./EMSCriticalBroadcast', () => ({
  default: () => null,
}));

vi.mock('./ReassessmentDrawer', () => ({
  default: () => null,
  isPatientFlaggedForReassessment: () => false,
}));

vi.mock('./emergency/HospitalJourneyCommandBar', () => ({ default: () => null }));

vi.mock('sonner', () => ({
  Toaster: () => null,
}));

const originalState = useEmergencyStore.getState();

afterEach(() => {
  useEmergencyStore.setState(originalState, true);
  vi.restoreAllMocks();
});

describe('AppShell R12 startup wiring', () => {
  it('initializes backend state and starts engines with cleanup from AppShell', async () => {
    const initializeFromBackend = vi
      .spyOn(useEmergencyStore.getState(), 'initializeFromBackend')
      .mockResolvedValue({ errors: {} });
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

    const { rerender, unmount } = render(
      <MemoryRouter>
        <AppShell>
          <div>Emergency route</div>
        </AppShell>
      </MemoryRouter>,
    );

    rerender(
      <MemoryRouter>
        <AppShell>
          <div>Emergency route updated</div>
        </AppShell>
      </MemoryRouter>,
    );

    // Default MemoryRouter entry is "/", not a reception route -- AppShell
    // should take the single-full-fetch path (see MB-P0-6-follow-up fix:
    // this used to unconditionally take the reception two-phase path on
    // EVERY route since RECEPTION_FIRST_UX.enabled is a hardcoded `true`
    // constant, doubling bootstrap network/state-churn app-wide).
    await waitFor(() => expect(initializeFromBackend).toHaveBeenCalledTimes(1));
    expect(initializeFromBackend).toHaveBeenNthCalledWith(1);
    expect(mocks.startEmergencyRealtime).toHaveBeenCalledTimes(1);
    expect(startReassessmentEngine).toHaveBeenCalledTimes(1);
    expect(startCapacityEngine).toHaveBeenCalledTimes(1);
    expect(mocks.startContinuousPatientFlowEngine).toHaveBeenCalledTimes(1);
    expect(mocks.startAdministrativeAutomationEngine).toHaveBeenCalledTimes(1);
    expect(mocks.startUnifiedWorkflowAutomationEngine).toHaveBeenCalledTimes(1);
    expect(mocks.startUnifiedOperationalIntelligenceEngine).toHaveBeenCalledTimes(1);
    expect(mocks.startUnifiedApplicationKnowledgeGraphEngine).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(startSimulation).toHaveBeenCalledTimes(1));

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalledWith(111);
    expect(clearIntervalSpy).toHaveBeenCalledWith(222);
    expect(stopSimulation).toHaveBeenCalledTimes(1);
    expect(mocks.startEmergencyRealtime.mock.results[0]?.value).toEqual(expect.any(Function));
  });

  it('keeps the reception two-phase startup (fast reception-scope load, then a silent full-scope backfill) only on reception routes', async () => {
    const initializeFromBackend = vi
      .spyOn(useEmergencyStore.getState(), 'initializeFromBackend')
      .mockResolvedValue({ errors: {} });

    render(
      <MemoryRouter initialEntries={['/emergency/reception']}>
        <AppShell>
          <div>Reception route</div>
        </AppShell>
      </MemoryRouter>,
    );

    await waitFor(() => expect(initializeFromBackend).toHaveBeenCalledTimes(2));
    expect(initializeFromBackend).toHaveBeenNthCalledWith(1, { scope: 'reception' });
    expect(initializeFromBackend).toHaveBeenNthCalledWith(2, { scope: 'full', silent: true });
  });
});

describe('HEAL-347.2: idle-time prefetch for lazy shell panels', () => {
  // Command Palette / Reassessment Drawer were reported as "become
  // permanently unresponsive after ~10-20 minutes of session use" -- live
  // timing (not just static reading) showed this was a Vite dev-server
  // cold-compile artifact: React.lazy() only transforms a chunk's module
  // graph on its FIRST real request, which took multiple real seconds in
  // dev (confirmed live: Command Palette >9s cold vs. ~300-600ms warm).
  // Warming every shell panel's chunk during a post-mount idle window means
  // no real interaction ever hits that cold path. jsdom has no native
  // requestIdleCallback, so this exercises the setTimeout(..., 2000)
  // fallback the same code path uses in that environment.
  it('schedules a low-priority prefetch shortly after mount via requestIdleCallback (or a setTimeout fallback where unavailable, as in jsdom)', async () => {
    vi.spyOn(useEmergencyStore.getState(), 'initializeFromBackend').mockResolvedValue({
      errors: {},
    });
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');

    render(
      <MemoryRouter>
        <AppShell>
          <div>Emergency route</div>
        </AppShell>
      </MemoryRouter>,
    );

    // jsdom has no requestIdleCallback, so the fix's fallback path
    // (`window.setTimeout(prefetch, 2000)`) is what actually schedules the
    // prefetch here -- assert that scheduling exists and fires cleanly
    // rather than trying to observe the dynamic import()s it triggers
    // resolving through Vitest's module-mock graph, which (unlike the
    // static lazy() import at module scope) isn't reliably interceptable
    // for bare `import()` calls in this test environment. The real,
    // decisive proof this fix works is the live-browser timing evidence in
    // this commit's description (Command Palette first-open: >9s cold vs.
    // ~300-600ms once prefetched) -- this test guards the wiring, not a
    // simulation of the browser's module loader.
    await waitFor(() => {
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
    });

    const prefetchCall = setTimeoutSpy.mock.calls.find(([, delay]) => delay === 2000);
    expect(() => (prefetchCall?.[0] as () => void)?.()).not.toThrow();
  });

  // HEAL-347.43: this batch used to fire all entries' import()s
  // synchronously in the same tick -- every one a concurrent request
  // racing the CURRENT route's own (higher-priority, blocking) chunk fetch
  // for the dev server's limited concurrent-transform capacity. Landing
  // directly on /emergency/analytics (one of this batch's own targets, and
  // this codebase's own documented heaviest fresh-mount route) produced
  // 100+ concurrent/aborted requests live and left the page stuck on
  // "Loading analytics..." indefinitely. Fixed by staggering each entry on
  // its own setTimeout and skipping whichever entry matches the route the
  // user is already on. Same "guard the wiring, not the module loader"
  // philosophy as the test above.
  it('stages the prefetch batch across separate timers instead of firing every import() in one tick', async () => {
    vi.spyOn(useEmergencyStore.getState(), 'initializeFromBackend').mockResolvedValue({
      errors: {},
    });
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');

    render(
      <MemoryRouter>
        <AppShell>
          <div>Emergency route</div>
        </AppShell>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
    });

    const callCountBefore = setTimeoutSpy.mock.calls.length;
    const prefetchCall = setTimeoutSpy.mock.calls.find(([, delay]) => delay === 2000);
    (prefetchCall?.[0] as () => void)?.();

    const staggeredDelays = setTimeoutSpy.mock.calls
      .slice(callCountBefore)
      .map(([, delay]) => delay);
    // Every entry gets its own timer at a distinct, increasing delay
    // (0, 120, 240, ...) rather than one shared synchronous burst.
    expect(staggeredDelays.length).toBeGreaterThan(1);
    expect(new Set(staggeredDelays).size).toBe(staggeredDelays.length);
    expect(Math.max(...(staggeredDelays as number[]))).toBeGreaterThan(0);
  });

  it('does not schedule a prefetch entry for the route chunk already active on mount', async () => {
    vi.spyOn(useEmergencyStore.getState(), 'initializeFromBackend').mockResolvedValue({
      errors: {},
    });
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');

    render(
      <MemoryRouter initialEntries={['/emergency/analytics']}>
        <AppShell>
          <div>Emergency route</div>
        </AppShell>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
    });

    const callCountBefore = setTimeoutSpy.mock.calls.length;
    const prefetchCall = setTimeoutSpy.mock.calls.find(([, delay]) => delay === 2000);
    (prefetchCall?.[0] as () => void)?.();

    // 4 route entries are eligible for skipping (Reception/Analytics/
    // Settings/Tools console, added HEAL-347.48); with /emergency/analytics
    // active, exactly one fewer staggered timer should be scheduled than the
    // base "no active match" batch this describe block's other test
    // observes.
    const staggeredCount = setTimeoutSpy.mock.calls.length - callCountBefore;
    expect(staggeredCount).toBe(13);
  });

  // Regression for a live-reproduced bug (HEAL-347.48): /tools/calculators
  // (and every other /tools/* console page) had no entry in this prefetch
  // batch at all, so its first navigation paid the full cold-compile cost
  // (13.5-25s stuck on "Loading tool console..."). Same skip-when-active
  // treatment as the 3 existing route entries -- landing directly on a
  // /tools/* page shouldn't also fire a redundant prefetch of its own chunk.
  it('does not schedule a prefetch entry for the tools console chunk when already on a /tools/* route', async () => {
    vi.spyOn(useEmergencyStore.getState(), 'initializeFromBackend').mockResolvedValue({
      errors: {},
    });
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');

    render(
      <MemoryRouter initialEntries={['/tools/calculators']}>
        <AppShell>
          <div>Tools route</div>
        </AppShell>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
    });

    const callCountBefore = setTimeoutSpy.mock.calls.length;
    const prefetchCall = setTimeoutSpy.mock.calls.find(([, delay]) => delay === 2000);
    (prefetchCall?.[0] as () => void)?.();

    const staggeredCount = setTimeoutSpy.mock.calls.length - callCountBefore;
    expect(staggeredCount).toBe(13);
  });

  // Regression for a live-reproduced bug (HEAL-347.52): unlike every other
  // route-page entry in this batch (Reception/Analytics/Settings/Tools
  // console), the emergencyRoutePages entry -- which serves SIX routes
  // (Patients/Queues/Reassessment/Boarding/Capacity/Copilot) -- had no skip
  // check at all, so landing directly on any of those six duplicated the
  // router's own priority fetch of the exact same chunk. Live-timed via
  // network trace: left /emergency/queues stuck past 20s with 40-60
  // concurrent pending requests, never resolving.
  it('does not schedule a prefetch entry for the shared emergencyRoutePages chunk when already on one of its six routes', async () => {
    vi.spyOn(useEmergencyStore.getState(), 'initializeFromBackend').mockResolvedValue({
      errors: {},
    });
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');

    render(
      <MemoryRouter initialEntries={['/emergency/queues']}>
        <AppShell>
          <div>Queues route</div>
        </AppShell>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
    });

    const callCountBefore = setTimeoutSpy.mock.calls.length;
    const prefetchCall = setTimeoutSpy.mock.calls.find(([, delay]) => delay === 2000);
    (prefetchCall?.[0] as () => void)?.();

    const staggeredCount = setTimeoutSpy.mock.calls.length - callCountBefore;
    expect(staggeredCount).toBe(13);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildCommandResults,
  computeGatedPaletteSearchResults,
  createAiAssistCommands,
  isCommandVisibleForEmergencyRole,
  matchAndRankCommands,
  readRecentCommandIds,
  recordRecentCommand,
  searchPatientsByName,
  type Command,
} from './CommandPalette';
import {
  AI_COMMAND_EVENT,
  AI_PALETTE_COMMANDS,
  resetAiPaletteCommandStateForTests,
} from '../services/interactiveAi/aiCommandRegistry';
import {
  COMMAND_PALETTE_HIGH_VALUE_ACTION_IDS,
  COMMAND_PALETTE_SUPPRESSED_ROUTE_IDS,
} from '../config/commandPaletteHighValueModel';
import { EMERGENCY_ACTIONS } from '../config/emergencyRolePermissions';
import { presentEmergencyRoleAction } from '../config/emergencyRoleActionMatrix';
import { EMERGENCY_ROLE_ID } from '../config/emergencyRoleScreenMatrix';
import { CANONICAL_ROUTES } from '../config/routes.config';
import {
  EMERGENCY_OS_ROUTE_COMMANDS,
  EMERGENCY_OS_TOOL_COMMANDS,
} from '../config/commandPalette.config';
import { PatientState, Priority, type Patient } from '../types/emergency';

function command(
  overrides: Partial<Command> & Pick<Command, 'id' | 'label' | 'keywords' | 'group'>,
): Command {
  return {
    description: '',
    action: vi.fn(),
    ...overrides,
  };
}

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
  };
}

const patient: Patient = {
  id: 'patient-1',
  mrn: 'MRN-1',
  firstName: 'Avery',
  lastName: 'Stone',
  dob: '1970-01-01',
  age: 56,
  sex: 'F',
  arrivalTime: '2026-06-13T12:00:00.000Z',
  chiefComplaint: 'Chest pain',
  complaintCategory: 'Cardiac',
  state: PatientState.Assessment,
  priority: Priority.P2,
  vitals: [],
  flags: [],
  notes: [],
  timeline: [],
};

describe('CommandPalette helpers', () => {
  it('ranks exact and keyword command matches ahead of weaker matches', () => {
    const commands = [
      command({
        id: 'goto-tools',
        label: 'Tools',
        group: 'Navigation',
        keywords: ['tools', 'clinical tools', 'calculators', 'scores'],
      }),
      command({
        id: 'heart',
        label: 'HEART Score',
        group: 'Clinical',
        keywords: ['heart', 'chest', 'acs', 'cardiac'],
      }),
      command({
        id: 'capacity',
        label: 'Capacity Status',
        group: 'Department',
        keywords: ['capacity', 'full', 'beds', 'rooms'],
      }),
    ];

    expect(matchAndRankCommands(commands, 'heart')[0].id).toBe('heart');
    expect(matchAndRankCommands(commands, 'beds')[0].id).toBe('capacity');
  });

  it('returns patient lookup results for name, MRN, and clinical context matches', () => {
    const now = new Date('2026-06-13T12:42:00.000Z');

    expect(searchPatientsByName([patient], 'avery', now)[0]).toEqual(
      expect.objectContaining({
        id: 'patient-patient-1',
        label: 'Avery Stone · Chest pain · Assessment · 42m wait',
        group: 'Patients',
        icon: 'person',
      }),
    );
    expect(searchPatientsByName([patient], 'MRN-1', now)[0]?.id).toBe('patient-patient-1');
    expect(searchPatientsByName([patient], 'chest', now)[0]?.id).toBe('patient-patient-1');
  });

  it('records recent commands with de-dupe and five item limit', () => {
    const storage = memoryStorage();
    const nextIds = recordRecentCommand(
      'capacity',
      ['heart', 'capacity', 'qsofa', 'nihss', 'peds', 'goto-tools'],
      storage,
    );

    expect(nextIds).toEqual(['capacity', 'heart', 'qsofa', 'nihss', 'peds']);
    expect(readRecentCommandIds(storage)).toEqual(['capacity', 'heart', 'qsofa', 'nihss', 'peds']);
  });

  it('registers route and calculator commands against canonical CareDroid paths', () => {
    const routePathsById = Object.fromEntries(
      EMERGENCY_OS_ROUTE_COMMANDS.map((entry) => [entry.id, entry.build().path]),
    );
    const toolPathsById = Object.fromEntries(
      EMERGENCY_OS_TOOL_COMMANDS.map((entry) => [entry.id, entry.build().path]),
    );

    expect(routePathsById['open-pulse']).toBe(CANONICAL_ROUTES.emergencyPulse);
    expect(routePathsById['open-shift']).toBe(CANONICAL_ROUTES.emergencyShift);
    expect(routePathsById['open-analytics']).toBe(CANONICAL_ROUTES.emergencyAnalytics);

    expect(toolPathsById).toEqual(
      expect.objectContaining({
        'open-calculators': `${CANONICAL_ROUTES.emergencyTools}?source=calculators&filter=calculator`,
        'open-qsofa': `${CANONICAL_ROUTES.emergencyTools}?source=calculators&filter=calculator&q=qsofa&open=qsofa`,
        'open-heart-score': `${CANONICAL_ROUTES.emergencyTools}?source=calculators&filter=calculator&q=heart-score&open=heart-score`,
        'open-nihss': `${CANONICAL_ROUTES.emergencyTools}?source=calculators&filter=calculator&q=nihss&open=nihss`,
      }),
    );
  });

  it('pins quick actions on empty query before recent commands', () => {
    const commands = [
      ...COMMAND_PALETTE_HIGH_VALUE_ACTION_IDS.map((id) =>
        command({
          id,
          label: id,
          group: 'Quick actions',
          keywords: [id],
        }),
      ),
      command({
        id: 'open-pulse',
        label: 'Pulse',
        group: 'Navigation',
        keywords: ['pulse'],
      }),
    ];

    const results = buildCommandResults(commands, '', ['open-pulse', 'create-patient']);
    expect(results[0]?.group).toBe('Quick actions');
    expect(results.map((entry) => entry.id)).toEqual([
      ...COMMAND_PALETTE_HIGH_VALUE_ACTION_IDS,
      'open-pulse',
    ]);
  });

  it('suppresses navigation duplicates covered by quick actions', () => {
    expect(COMMAND_PALETTE_SUPPRESSED_ROUTE_IDS.has('open-whiteboard')).toBe(true);
    expect(COMMAND_PALETTE_SUPPRESSED_ROUTE_IDS.has('open-ems')).toBe(true);
    expect(COMMAND_PALETTE_SUPPRESSED_ROUTE_IDS.has('open-reassessment')).toBe(true);
    expect(COMMAND_PALETTE_SUPPRESSED_ROUTE_IDS.has('open-tools')).toBe(true);
    expect(COMMAND_PALETTE_SUPPRESSED_ROUTE_IDS.has('open-calculators')).toBe(true);
    expect(COMMAND_PALETTE_SUPPRESSED_ROUTE_IDS.has('open-capacity')).toBe(true);
  });

  it('hides command actions that the active CareDroid role cannot perform', () => {
    const readOnlyRole = {
      role: EMERGENCY_ROLE_ID.readOnlyViewer,
      can: (action: string) => action === EMERGENCY_ACTIONS.viewAnalytics,
      presentAction: (action: string) =>
        presentEmergencyRoleAction(EMERGENCY_ROLE_ID.readOnlyViewer, action),
      canAccessRoute: (path: string) => path !== CANONICAL_ROUTES.emergencySettings,
      nearestRoute: () => CANONICAL_ROUTES.emergencyWhiteboard,
    };

    expect(
      isCommandVisibleForEmergencyRole(
        {
          id: 'create-patient',
          requiredAction: EMERGENCY_ACTIONS.createPatient,
          requiredRoute: CANONICAL_ROUTES.emergencyWhiteboard,
        },
        readOnlyRole,
      ),
    ).toBe(false);
    expect(
      isCommandVisibleForEmergencyRole(
        {
          id: 'open-patients',
          requiredRoute: CANONICAL_ROUTES.emergencyPatients,
        },
        readOnlyRole,
      ),
    ).toBe(true);
    expect(
      isCommandVisibleForEmergencyRole(
        {
          id: 'open-settings',
          requiredRoute: CANONICAL_ROUTES.emergencySettings,
        },
        readOnlyRole,
      ),
    ).toBe(false);
  });

  it('gates patient and operational search results behind canOpenPatients (HEAL-206)', () => {
    // CommandPalette is mounted for every non-kiosk role and opened by a
    // global `/` keydown shortcut with no route/permission check of its
    // own (AppShell.tsx) -- unlike patientResults' previous unconditional
    // call, this must not leak patient name/MRN/chief complaint (or the
    // same fields embedded in encounter/referral/EMS/queue hits) to a role
    // with no patient access, e.g. it_admin.
    const noPatientAccessRole = {
      role: 'it_admin',
      can: () => false,
      presentAction: () => ({
        state: 'hidden' as const,
        visible: false,
        enabled: false,
        readOnly: true,
        permission: null,
      }),
      canAccessRoute: () => false,
      nearestRoute: () => CANONICAL_ROUTES.emergencySettings,
    };

    const denied = computeGatedPaletteSearchResults({
      canOpenPatients: false,
      patients: [patient],
      query: 'avery',
      navigate: vi.fn() as unknown as Parameters<
        typeof computeGatedPaletteSearchResults
      >[0]['navigate'],
      referrals: [],
      emsArrivals: [],
      queues: [],
      emergencyRole: noPatientAccessRole,
      saasRole: 'student',
    });
    expect(denied.patientResults).toEqual([]);
    expect(denied.operationalResults).toEqual([]);

    const allowAllRole = {
      role: EMERGENCY_ROLE_ID.chargeNurse,
      can: () => true,
      presentAction: () => ({
        state: 'allowed' as const,
        visible: true,
        enabled: true,
        readOnly: false,
        permission: null,
      }),
      canAccessRoute: () => true,
      nearestRoute: () => CANONICAL_ROUTES.emergencyWhiteboard,
    };

    const allowed = computeGatedPaletteSearchResults({
      canOpenPatients: true,
      patients: [patient],
      query: 'avery',
      navigate: vi.fn() as unknown as Parameters<
        typeof computeGatedPaletteSearchResults
      >[0]['navigate'],
      referrals: [],
      emsArrivals: [],
      queues: [],
      emergencyRole: allowAllRole,
      saasRole: 'nurse',
    });
    expect(allowed.patientResults).toHaveLength(1);
    expect(allowed.patientResults[0]?.label).toContain('Avery Stone');
  });
});

describe('AI Assist palette commands (IX14)', () => {
  afterEach(() => {
    resetAiPaletteCommandStateForTests();
  });

  const allowAllRole = {
    role: EMERGENCY_ROLE_ID.chargeNurse,
    can: () => true,
    presentAction: () => ({
      state: 'allowed' as const,
      visible: true,
      enabled: true,
      readOnly: false,
      permission: null,
    }),
    canAccessRoute: () => true,
    nearestRoute: () => CANONICAL_ROUTES.emergencyWhiteboard,
  };

  function buildAiCommands(navigate: () => void = vi.fn()) {
    return createAiAssistCommands(
      navigate as unknown as Parameters<typeof createAiAssistCommands>[0],
      allowAllRole,
    );
  }

  it('builds one permissioned palette entry per registry command', () => {
    const commands = buildAiCommands();
    expect(commands.map((c) => c.id)).toEqual(AI_PALETTE_COMMANDS.map((c) => c.id));
    for (const command of commands) {
      expect(command.group).toBe('AI Assist');
      expect(command.requiredAction).toBe(EMERGENCY_ACTIONS.useCopilot);
      expect(command.requiredRoute).toBeTruthy();
    }
  });

  it('is hidden for roles whose action matrix denies copilot or the target route', () => {
    const noCopilotRole = {
      ...allowAllRole,
      presentAction: () => ({
        state: 'hidden' as const,
        visible: false,
        enabled: false,
        readOnly: true,
        permission: null,
      }),
    };
    for (const command of buildAiCommands()) {
      expect(isCommandVisibleForEmergencyRole(command, noCopilotRole)).toBe(false);
    }

    const noRouteRole = { ...allowAllRole, canAccessRoute: () => false };
    const routeDenied = createAiAssistCommands(
      vi.fn() as unknown as Parameters<typeof createAiAssistCommands>[0],
      noRouteRole,
    );
    // 'any'-channel commands have no reachable surface, so they never build;
    // the channel-fixed ones survive building but fail route visibility.
    expect(routeDenied.map((c) => c.id)).toEqual(
      AI_PALETTE_COMMANDS.filter((c) => c.channel !== 'any').map((c) => c.id),
    );
    for (const command of routeDenied) {
      expect(isCommandVisibleForEmergencyRole(command, noRouteRole)).toBe(false);
    }
  });

  it('is searchable through the normal ranking pipeline', () => {
    const ranked = matchAndRankCommands(buildAiCommands(), 'handoff');
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].id).toMatch(/handoff|prepare/);
    expect(matchAndRankCommands(buildAiCommands(), 'ai')[0].group).toBe('AI Assist');
  });

  it('executing an entry dispatches ONLY the typed command id — never palette text', () => {
    const navigate = vi.fn();
    const commands = buildAiCommands(navigate);
    const target = commands.find((c) => c.id === 'ai-reception-handoff-draft');
    const seen: unknown[] = [];
    const listener = (event: Event) => seen.push((event as CustomEvent).detail);
    document.addEventListener(AI_COMMAND_EVENT, listener);
    try {
      target?.action();
    } finally {
      document.removeEventListener(AI_COMMAND_EVENT, listener);
    }
    expect(seen).toEqual([{ commandId: 'ai-reception-handoff-draft' }]);
  });
});

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useNavigate, type NavigateFunction } from 'react-router-dom';
import { IconSearch } from '@tabler/icons-react';
import { useEmergencyStore } from '../store/emergencyStore';
import {
  EMERGENCY_ACTIONS,
  getReceptionEmbeddedIntakePath,
  getReceptionPrimaryCreatePath,
  prefersReceptionForPatientCreate,
  shouldHideStandaloneIntakeNav,
  EMERGENCY_ROLE_IDS,
  isRegistrationClerkRole,
} from '../config/emergencyRolePermissions';
import OperationalEmptyState from './ui/OperationalEmptyState';
import { EMPTY_STATE_COPY } from '../config/emptyStateCopy';
import {
  buildEmptyQueryPaletteCommands,
  COMMAND_PALETTE_QUICK_ACTIONS_GROUP,
  COMMAND_PALETTE_SUPPRESSED_ROUTE_IDS,
} from '../config/commandPaletteHighValueModel';
import { RECEPTION_COPY } from './reception/receptionCopy';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { compileUserProfile, isRouteAllowedInCompiledProfile } from '../config/userProfileCompiler';
import {
  EMERGENCY_OS_ROUTE_COMMANDS,
  EMERGENCY_OS_HELP_COMMANDS,
  EMERGENCY_OS_TOOL_COMMANDS,
} from '../config/commandPalette.config';
import { RECEPTION_FIRST_UX, isReceptionFirstUxEnabled } from '../config/receptionFirstUx.config';
import { navigateToEmergencySurface } from '../services/navigateToEmergencySurface';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import { MEDICAL_THEME } from '../config/medicalTheme.constants';
import useEffectiveUserProfile from '../hooks/useEffectiveUserProfile';
import { isRouteAllowedForProfile, resolveUserProfileFromSaasRole } from '../config/userProfileCatalog';
import { navigateProfileAware } from '../navigation/profileRouteLaunch';
import { dispatchOpenHelpHub } from '../contexts/HelpHubContext';
import type { EmergencyRoleActionPresentation } from '../config/emergencyRoleActionMatrix';
import type { Patient } from '../types/emergency';
import { getPatientDisplayName, rankPatientsBySearch, scorePatientSearch } from '../utils/patientSearch';
import {
  buildEncounterSearchPath,
  buildEmsCasePath,
  buildQueueItemPath,
  buildReferralSearchPath,
} from '../services/patientSearchActions';
import {
  formatOperationalSearchEntityLabel,
  searchOperationalEntities,
  type OperationalSearchEntityType,
  type OperationalSearchHit,
} from '../services/unifiedOperationalSearch';
import { PILOT_CUSTOMER_MODE } from '../config/unified-navigation.config';
import {
  isPilotExtensionNavItem,
  shouldLimitOperationalSearchForClerk,
} from '../config/practitionerCleanup.config';
import { usePractitionerSurfaceVisibility } from '../contexts/PractitionerVisibilityContext';

export type CommandGroup =
  | 'Quick actions'
  | 'Recent'
  | 'Navigation'
  | 'Patient'
  | 'Clinical'
  | 'Department'
  | 'Settings'
  | 'Help';

export interface Command {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  action: () => void;
  keywords: string[];
  group: CommandGroup;
}

type EmergencyCommandPermissions = {
  role: string;
  can: (action: string) => boolean;
  presentAction: (action: string) => EmergencyRoleActionPresentation;
  canAccessRoute: (path: string) => boolean;
  nearestRoute: (path: string) => string;
};

type CommandWithVisibility = Command & {
  requiredAction?: string;
  requiredRoute?: string;
  hiddenInPilotMode?: boolean;
};

type RouteCommandConfig = {
  id: string;
  navItemId?: string;
  label: string;
  hint?: string;
  keywords: readonly string[];
  build: () => { type: string; path?: string };
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

type PatientResult = {
  type: 'patient';
  id: string;
  label: string;
  description: string;
  group: 'Patients';
  icon: 'person';
  action: () => void;
};

type CommandResult = Command & {
  type: 'command';
  disabled?: boolean;
  readOnly?: boolean;
};

type OperationalEntityResult = {
  type: OperationalSearchEntityType;
  id: string;
  label: string;
  description: string;
  group: 'Encounters' | 'Referrals' | 'EMS' | 'Queues';
  icon: 'entity';
  action: () => void;
};

type PaletteResult = PatientResult | OperationalEntityResult | CommandResult;

type GroupedResult = {
  group: string;
  entries: Array<{ result: PaletteResult; index: number }>;
};

type PatientLookupFields = Pick<Patient, 'id' | 'firstName' | 'lastName' | 'name' | 'mrn' | 'dob'> &
  Partial<Pick<Patient, 'chiefComplaint' | 'complaint' | 'complaintCategory' | 'state' | 'priority'>>;

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  onExecute?: (action: { type: string; commandId?: string }) => void;
};

const RECENT_COMMANDS_KEY = 'caredroid.ed.commandPalette.recents.v1';
const RECENT_COMMAND_LIMIT = 5;
const MAX_PATIENT_RESULTS = 5;

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function searchableCommandText(
  command: Pick<Command, 'id' | 'label' | 'description' | 'keywords' | 'group'>,
): string {
  return normalizeSearch(
    [command.id, command.label, command.description, command.group, ...command.keywords]
      .filter(Boolean)
      .join(' '),
  );
}

export function commandMatchScore(
  command: Pick<Command, 'id' | 'label' | 'description' | 'keywords' | 'group'>,
  query: string,
): number {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return 0;

  const label = normalizeSearch(command.label);
  const keywords = command.keywords.map(normalizeSearch);
  const haystack = searchableCommandText(command);

  if (label === normalizedQuery) return 1000;
  if (label.startsWith(normalizedQuery)) return 900 - label.indexOf(normalizedQuery);
  if (keywords.some((keyword) => keyword === normalizedQuery)) return 850;

  const labelIndex = label.indexOf(normalizedQuery);
  if (labelIndex >= 0) return 800 - labelIndex;

  const keywordIndex = keywords.findIndex((keyword) => keyword.includes(normalizedQuery));
  if (keywordIndex >= 0) return 700 - keywordIndex;

  const queryTokens = normalizedQuery.split(' ').filter(Boolean);
  if (queryTokens.every((token) => haystack.includes(token))) return 500 - queryTokens.length;

  let cursor = 0;
  let fuzzyScore = 0;
  for (const char of normalizedQuery.replace(/\s+/g, '')) {
    const foundAt = haystack.indexOf(char, cursor);
    if (foundAt === -1) return -1;
    fuzzyScore += foundAt === cursor ? 3 : 1;
    cursor = foundAt + 1;
  }
  return fuzzyScore;
}

export function matchAndRankCommands(commands: Command[], query: string): Command[] {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return commands;

  return commands
    .map((command, order) => ({
      command,
      order,
      score: commandMatchScore(command, normalizedQuery),
    }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map((item) => item.command);
}

export { getPatientDisplayName } from '../utils/patientSearch';

export function patientNameMatchScore(
  patient: PatientLookupFields,
  query: string,
): number {
  return scorePatientSearch(patient as unknown as Parameters<typeof scorePatientSearch>[0], query)?.score ?? -1;
}

export function searchOperationalEntitiesForPalette(
  navigate: NavigateFunction,
  {
    patients = [] as any[],
    referrals = [] as any[],
    emsArrivals = [] as any[],
    queues = [] as any[],
    query = '',
    emergencyRole,
    saasRole,
  }: {
    patients?: Patient[];
    referrals?: import('../types/emergency').Referral[];
    emsArrivals?: import('../types/emergency').EMSArrival[];
    queues?: import('../types/emergency').QueueSummary[];
    query?: string;
    emergencyRole?: EmergencyCommandPermissions;
    saasRole?: string;
  },
): OperationalEntityResult[] {
  const groupLabel: Record<Exclude<OperationalSearchEntityType, 'patient'>, OperationalEntityResult['group']> = {
    encounter: 'Encounters',
    referral: 'Referrals',
    ems: 'EMS',
    queue: 'Queues',
  };

  return searchOperationalEntities(
    { query, patients, referrals, emsArrivals, queues },
    { patient: 0, total: 10 },
  )
    .filter((hit) => hit.entityType !== 'patient')
    .map((hit) => ({
      type: hit.entityType,
      id: hit.id,
      label: hit.label,
      description: `${formatOperationalSearchEntityLabel(hit.entityType)} · ${hit.hint}`,
      group: groupLabel[hit.entityType as Exclude<OperationalSearchEntityType, 'patient'>],
      icon: 'entity' as const,
      action: () => {
        if (hit.patientId) useEmergencyStore.getState().selectPatient(hit.patientId);
        if (hit.entityType === 'encounter' && hit.patientId) {
          navigateProfileAware(navigate, buildEncounterSearchPath(hit.patientId, hit.encounterId), {
            emergencyRole,
            saasRole,
          });
          return;
        }
        if (hit.entityType === 'referral' && hit.referralId) {
          navigateProfileAware(navigate, buildReferralSearchPath(hit.referralId, hit.patientId), {
            emergencyRole,
            saasRole,
          });
          return;
        }
        if (hit.entityType === 'ems' && hit.emsArrivalId) {
          navigateProfileAware(navigate, buildEmsCasePath(hit.emsArrivalId), { emergencyRole, saasRole });
          return;
        }
        if (hit.entityType === 'queue') {
          navigateProfileAware(navigate, buildQueueItemPath(hit.queueType || 'Waiting', hit.patientId), {
            emergencyRole,
            saasRole,
          });
        }
      },
    }));
}

export function searchPatientsByName(
  patients: Patient[],
  query: string,
  now = new Date(),
): PatientResult[] {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return [];

  return rankPatientsBySearch(patients, normalizedQuery, MAX_PATIENT_RESULTS).map(({ patient }) => ({
    type: 'patient',
    id: `patient-${patient.id}`,
    label: `${getPatientDisplayName(patient)} · ${patient.chiefComplaint || patient.complaint || 'Complaint not set'} · ${patient.state} · ${formatPatientWait(patient, now)}`,
    description: `Select patient ${patient.mrn}`,
    group: 'Patients',
    icon: 'person',
    action: () => useEmergencyStore.getState().selectPatient(patient.id),
  }));
}

export function readRecentCommandIds(storage: StorageLike | null = getBrowserStorage()): string[] {
  if (!storage) return [];

  try {
    const parsed = JSON.parse(storage.getItem(RECENT_COMMANDS_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string').slice(0, RECENT_COMMAND_LIMIT)
      : [];
  } catch {
    return [];
  }
}

export function writeRecentCommandIds(
  commandIds: string[],
  storage: StorageLike | null = getBrowserStorage(),
): string[] {
  const nextIds = [...new Set(commandIds.filter(Boolean))].slice(0, RECENT_COMMAND_LIMIT);
  try {
    storage?.setItem(RECENT_COMMANDS_KEY, JSON.stringify(nextIds));
  } catch {
    // Storage can be disabled in locked-down browsers; keep the palette usable.
  }
  return nextIds;
}

export function recordRecentCommand(
  commandId: string,
  currentIds: string[],
  storage: StorageLike | null = getBrowserStorage(),
): string[] {
  return writeRecentCommandIds(
    [commandId, ...currentIds.filter((id) => id !== commandId)],
    storage,
  );
}

function getBrowserStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function formatPatientWait(patient: Pick<Patient, 'arrivalTime'>, now: Date): string {
  const arrivalMs = Date.parse(patient.arrivalTime);
  if (!Number.isFinite(arrivalMs)) return '-- wait';

  const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - arrivalMs) / 60000));
  if (elapsedMinutes < 60) return `${elapsedMinutes}m wait`;

  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;
  return minutes ? `${hours}h ${minutes}m wait` : `${hours}h wait`;
}

function routePermissionPath(path: string): string {
  return path.split(/[?#]/)[0] || path;
}

function navigateWithRoleGuard(
  navigate: ReturnType<typeof useNavigate>,
  path: string,
  emergencyRole: EmergencyCommandPermissions,
  saasRole?: string,
): void {
  navigateProfileAware(navigate, path, { emergencyRole, saasRole });
}

function dispatchDocumentEvent(name: string): void {
  document.dispatchEvent(new Event(name));
}

function createEmergencyRouteCommands(
  navigate: ReturnType<typeof useNavigate>,
  emergencyRole: EmergencyCommandPermissions,
  commands: readonly RouteCommandConfig[] = EMERGENCY_OS_ROUTE_COMMANDS,
  saasRole?: string,
  suppressExtensionPaletteCommands = false,
): CommandWithVisibility[] {
  const visibleCommands = commands.filter((command) => {
    if (COMMAND_PALETTE_SUPPRESSED_ROUTE_IDS.has(command.id)) return false;
    if (
      suppressExtensionPaletteCommands &&
      'navItemId' in command &&
      typeof command.navItemId === 'string' &&
      isPilotExtensionNavItem(command.navItemId)
    ) {
      return false;
    }
    return true;
  });

  return visibleCommands.map((command) => {
    const action = command.build();
    return {
      id: command.id,
      label: command.label.replace(/^Open /, ''),
      description: `${command.label} in the active CareDroid shell.`,
      shortcut: command.hint ? `G ${command.hint}` : undefined,
      group: 'Navigation',
      keywords: [...command.keywords],
      requiredRoute: action.path,
      action: () => {
        if (action.type === 'OPEN_ROUTE' && action.path) {
          if (command.navItemId) {
            navigateToEmergencySurface(navigate, command.navItemId, { emergencyRole, saasRole });
            return;
          }
          navigateWithRoleGuard(navigate, action.path, emergencyRole, saasRole);
        }
      },
    };
  });
}

export function resolveCommandActionPresentation(
  command: Pick<CommandWithVisibility, 'requiredAction'>,
  emergencyRole: EmergencyCommandPermissions,
) {
  if (!command.requiredAction) {
    return { visible: true, enabled: true, readOnly: false, state: 'allowed' as const };
  }
  return emergencyRole.presentAction(command.requiredAction);
}

export function isCommandVisibleForEmergencyRole(
  command: Pick<CommandWithVisibility, 'id' | 'requiredAction' | 'requiredRoute' | 'hiddenInPilotMode'>,
  emergencyRole: EmergencyCommandPermissions,
  saasRole?: string,
): boolean {
  if (command.hiddenInPilotMode && PILOT_CUSTOMER_MODE.enabled) return false;
  if (command.id === 'open-intake' && shouldHideStandaloneIntakeNav(emergencyRole.role)) {
    return false;
  }
  if (command.requiredAction && !resolveCommandActionPresentation(command, emergencyRole).visible) {
    return false;
  }
  if (command.requiredRoute && !emergencyRole.canAccessRoute(command.requiredRoute)) return false;
  if (command.requiredRoute && saasRole) {
    const profile = resolveUserProfileFromSaasRole(saasRole);
    if (!isRouteAllowedForProfile(profile, command.requiredRoute)) return false;
  }
  return true;
}

function applyRoleActionMatrixToCommands(
  commands: CommandWithVisibility[],
  emergencyRole: EmergencyCommandPermissions,
  saasRole?: string,
): Array<CommandWithVisibility & { disabled?: boolean; readOnly?: boolean }> {
  return commands
    .filter((command) => isCommandVisibleForEmergencyRole(command, emergencyRole, saasRole))
    .map((command) => {
      if (!command.requiredAction) return command;
      const presentation = emergencyRole.presentAction(command.requiredAction);
      return {
        ...command,
        disabled: !presentation.enabled,
        readOnly: presentation.readOnly,
      };
    });
}

function createHighValueCommands(
  navigate: ReturnType<typeof useNavigate>,
  emergencyRole: EmergencyCommandPermissions,
  saasRole?: string,
): CommandWithVisibility[] {
  const quickGroup = COMMAND_PALETTE_QUICK_ACTIONS_GROUP as CommandGroup;

  return [
    {
      id: 'create-patient',
      label: 'Create patient',
      description: isRegistrationClerkRole(emergencyRole.role)
        ? RECEPTION_COPY.commandPalette.newPatientClerkDescription
        : RECEPTION_COPY.commandPalette.newPatientOtherDescription,
      shortcut: 'N',
      group: quickGroup,
      keywords: ['create patient', 'new patient', 'add patient', 'register', 'express', 'walk-in'],
      requiredAction: EMERGENCY_ACTIONS.createPatient,
      requiredRoute: prefersReceptionForPatientCreate(emergencyRole.role)
        ? CANONICAL_ROUTES.emergencyReception
        : CANONICAL_ROUTES.emergencyWhiteboard,
      action: () => {
        if (prefersReceptionForPatientCreate(emergencyRole.role)) {
          navigateWithRoleGuard(navigate, getReceptionPrimaryCreatePath(emergencyRole.role), emergencyRole, saasRole);
          return;
        }
        navigateWithRoleGuard(navigate, CANONICAL_ROUTES.emergencyWhiteboard, emergencyRole, saasRole);
        window.setTimeout(() => dispatchDocumentEvent('open-intake'), 0);
      },
    },
    {
      id: 'start-intake',
      label: 'Start intake',
      description: 'Open Smart Intake for walk-in, EMS, or identity verification.',
      shortcut: 'I',
      group: quickGroup,
      keywords: ['start intake', 'intake', 'smart intake', 'arrival', 'identity', 'registration', 'ocr'],
      requiredAction: EMERGENCY_ACTIONS.createPatient,
      requiredRoute: prefersReceptionForPatientCreate(emergencyRole.role)
        ? CANONICAL_ROUTES.emergencyReception
        : CANONICAL_ROUTES.emergencyWhiteboard,
      action: () => {
        if (prefersReceptionForPatientCreate(emergencyRole.role)) {
          const receptionPath = routePermissionPath(CANONICAL_ROUTES.emergencyReception);
          if (window.location.pathname.startsWith(receptionPath)) {
            dispatchDocumentEvent('open-reception-intake');
            return;
          }
          navigateWithRoleGuard(navigate, getReceptionEmbeddedIntakePath(), emergencyRole, saasRole);
          return;
        }
        navigateWithRoleGuard(navigate, CANONICAL_ROUTES.emergencyWhiteboard, emergencyRole, saasRole);
        window.setTimeout(() => dispatchDocumentEvent('open-intake'), 0);
      },
    },
    {
      id: 'open-whiteboard',
      label: 'Open whiteboard',
      description: 'Emergency department operational whiteboard and patient flow.',
      shortcut: 'W',
      group: quickGroup,
      keywords: ['whiteboard', 'board', 'patient flow', 'operational screen', 'charge nurse'],
      requiredRoute: CANONICAL_ROUTES.emergencyWhiteboard,
      action: () => navigateWithRoleGuard(navigate, CANONICAL_ROUTES.emergencyWhiteboard, emergencyRole, saasRole),
    },
    {
      id: 'open-ems',
      label: 'Open EMS',
      description: 'EMS pre-arrival pipeline and inbound unit tracking.',
      shortcut: 'E',
      group: quickGroup,
      keywords: ['ems', 'pre-arrival', 'ambulance', 'pipeline', 'inbound'],
      requiredRoute: CANONICAL_ROUTES.emergencyEms,
      action: () => navigateWithRoleGuard(navigate, CANONICAL_ROUTES.emergencyEms, emergencyRole, saasRole),
    },
    {
      id: 'open-reassessment',
      label: 'Open reassessment',
      description: 'Review due reassessments without leaving your current screen.',
      shortcut: 'R',
      group: quickGroup,
      keywords: ['reassessment', 'reassess', 'due', 'safety', 'review', 'flag'],
      requiredAction: EMERGENCY_ACTIONS.completeReassessment,
      requiredRoute: CANONICAL_ROUTES.emergencyReassessment,
      action: () => {
        dispatchDocumentEvent('open-reassessment-drawer');
      },
    },
    {
      id: 'create-referral',
      label: 'Create referral',
      description: 'Start a referral or consult request for human review.',
      group: quickGroup,
      keywords: ['create referral', 'referral', 'consult', 'transfer', 'specialty', 'new referral'],
      requiredAction: EMERGENCY_ACTIONS.manageReferral,
      requiredRoute: CANONICAL_ROUTES.emergencyReferrals,
      action: () =>
        navigateWithRoleGuard(navigate, `${CANONICAL_ROUTES.emergencyReferrals}?new=1`, emergencyRole, saasRole),
    },
  ];
}

function createCommands(
  navigate: ReturnType<typeof useNavigate>,
  toggleCopilot: () => void,
  emergencyRole: EmergencyCommandPermissions,
  selectedPatientId: string | null,
  saasRole?: string,
  suppressExtensionPaletteCommands = false,
): Command[] {
  const compiled = saasRole ? compileUserProfile({ saasRole }) : null;
  const commands: CommandWithVisibility[] = [
    ...createHighValueCommands(navigate, emergencyRole, saasRole),
    ...createEmergencyRouteCommands(
      navigate,
      emergencyRole,
      EMERGENCY_OS_ROUTE_COMMANDS,
      saasRole,
      suppressExtensionPaletteCommands,
    ),
    ...createEmergencyRouteCommands(
      navigate,
      emergencyRole,
      EMERGENCY_OS_TOOL_COMMANDS,
      saasRole,
      suppressExtensionPaletteCommands,
    )
      .filter(
        (command) =>
          !compiled ||
          !command.requiredRoute ||
          isRouteAllowedInCompiledProfile(command.requiredRoute, compiled),
      )
      .map((command) => ({
      ...command,
      group: 'Clinical' as const,
      description: command.description?.replace(' in the active CareDroid shell.', ' in Medical Tools.'),
    })),
    ...EMERGENCY_OS_HELP_COMMANDS.map((command) => {
      const built = command.build() as { type: string; tab?: 'page' | 'role' | 'process' | 'topics' | 'shortcuts'; topicId?: string };
      return {
        id: command.id,
        label: command.label.replace(/^Open /, ''),
        description: 'CareDroid process guide and role procedures',
        shortcut: command.hint,
        group: 'Help' as const,
        keywords: [...command.keywords],
        action: () => {
          dispatchOpenHelpHub({ tab: built.tab, topicId: built.topicId });
        },
      };
    }),
    {
      id: 'patient-lookup',
      label: 'Patient Lookup',
      description:
        emergencyRole.role === EMERGENCY_ROLE_IDS.registrationClerk
          ? RECEPTION_COPY.commandPalette.patientLookupClerk
          : 'Open patient search and census lookup.',
      group: 'Patient',
      keywords: ['find patient', 'lookup', 'mrn', 'search patient', 'census'],
      requiredRoute:
        emergencyRole.role === EMERGENCY_ROLE_IDS.registrationClerk
          ? CANONICAL_ROUTES.emergencyReception
          : CANONICAL_ROUTES.emergencyPatients,
      action: () =>
        navigateWithRoleGuard(
          navigate,
          emergencyRole.role === EMERGENCY_ROLE_IDS.registrationClerk
            ? CANONICAL_ROUTES.emergencyReception
            : CANONICAL_ROUTES.emergencyPatients,
          emergencyRole,
          saasRole,
        ),
    },
    {
      id: 'collaboration-hub',
      label: 'Collaboration Hub',
      description: 'Department channels, patient threads, incidents, and AI Chief recommendations.',
      group: 'Department',
      keywords: ['chat', 'messages', 'channels', 'collaboration', 'discussion', 'incident', 'mentions'],
      requiredRoute: CANONICAL_ROUTES.emergencyCollaboration,
      action: () => navigateWithRoleGuard(navigate, CANONICAL_ROUTES.emergencyCollaboration, emergencyRole, saasRole),
    },
    {
      id: 'toggle-copilot',
      label: 'Toggle Copilot',
      description: 'Show or hide human-reviewed CareDroid Copilot context.',
      shortcut: 'C',
      group: 'Department',
      keywords: ['copilot', 'ai', 'chat', 'assistant'],
      requiredAction: EMERGENCY_ACTIONS.useCopilot,
      requiredRoute: CANONICAL_ROUTES.emergencyCopilot,
      action: toggleCopilot,
    },
    ...(selectedPatientId
      ? [
          {
            id: 'discharge-selected-patient',
            label: 'Discharge Selected Patient',
            description: 'Open discharge confirmation for the selected patient; no autonomous discharge.',
            group: 'Clinical' as const,
            keywords: ['discharge', 'disposition', 'send home', 'close encounter'],
            requiredAction: EMERGENCY_ACTIONS.dischargePatient,
            hiddenInPilotMode: true,
            action: () => dispatchDocumentEvent('open-patient-discharge'),
          },
        ]
      : []),
  ];

  return applyRoleActionMatrixToCommands(commands, emergencyRole, saasRole);
}

export function buildCommandResults(
  commands: Command[],
  query: string,
  recentCommandIds: string[],
): PaletteResult[] {
  if (!normalizeSearch(query)) {
    const pinnedIds = new Set(
      buildEmptyQueryPaletteCommands(commands, []).map((command) => command.id),
    );

    return buildEmptyQueryPaletteCommands(commands, recentCommandIds).map((command) => ({
      ...command,
      group: pinnedIds.has(command.id) ? command.group : ('Recent' as CommandGroup),
      type: 'command' as const,
    }));
  }

  return matchAndRankCommands(commands, query).map((command) => ({ ...command, type: 'command' }));
}

function groupResults(results: PaletteResult[]): GroupedResult[] {
  const groups = new Map<string, GroupedResult>();

  results.forEach((result, index) => {
    const group = result.group;
    const groupEntry = groups.get(group) || { group, entries: [] };
    groupEntry.entries.push({ result, index });
    groups.set(group, groupEntry);
  });

  return [...groups.values()];
}

function resultIcon(result: PaletteResult): string {
  if (result.type === 'patient') return '';
  if (result.type === 'command') return result.group.slice(0, 1);
  return result.group.slice(0, 1);
}

function patientInitials(label: string): string {
  return label
    .split('·')[0]
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function CommandPalette({ open, onClose, onExecute }: CommandPaletteProps) {
  const surfaces = usePractitionerSurfaceVisibility();
  const navigate = useNavigate();
  const emergencyRole = useEmergencyRolePermissions();
  const { saasRole } = useEffectiveUserProfile();
  const patients = useEmergencyStore((state) => state.patients);
  const referrals = useEmergencyStore((state) => state.referrals);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const queues = useEmergencyStore((state) => state.queues);
  const selectedPatientId = useEmergencyStore((state) => state.selectedPatientId);
  const toggleCopilot = useEmergencyStore((state) => state.toggleCopilot);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommandIds, setRecentCommandIds] = useState(() => readRecentCommandIds());
  const [results, setResults] = useState<PaletteResult[]>([]);

  const suppressExtensionPaletteCommands = !surfaces.chrome.showExtensionPaletteCommands;
  const commands = useMemo(
    () =>
      createCommands(
        navigate,
        toggleCopilot,
        emergencyRole,
        selectedPatientId,
        saasRole,
        suppressExtensionPaletteCommands,
      ),
    [
      emergencyRole,
      navigate,
      saasRole,
      selectedPatientId,
      suppressExtensionPaletteCommands,
      toggleCopilot,
    ],
  );

  const computedResults = useMemo(() => {
    const patientResults = searchPatientsByName(patients, query);
    const operationalResults = shouldLimitOperationalSearchForClerk(emergencyRole.role)
      ? []
      : searchOperationalEntitiesForPalette(navigate, {
          patients,
          referrals,
          emsArrivals,
          queues,
          query,
          emergencyRole,
          saasRole,
        });
    const commandResults = buildCommandResults(commands, query, recentCommandIds);
    return normalizeSearch(query)
      ? [...patientResults, ...operationalResults, ...commandResults]
      : commandResults;
  }, [commands, emsArrivals, emergencyRole, navigate, patients, queues, query, recentCommandIds, referrals, saasRole]);

  useEffect(() => {
    setResults(computedResults);
    setSelectedIndex(0);
  }, [computedResults]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setRecentCommandIds(readRecentCommandIds());
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  if (!open) return null;

  const groupedResults = groupResults(results);

  const executeResult = (result: PaletteResult | undefined) => {
    if (!result) return;
    if (result.type === 'command' && result.disabled) return;

    result.action();
    if (result.type === 'command') {
      const nextRecentIds = recordRecentCommand(result.id, recentCommandIds);
      setRecentCommandIds(nextRecentIds);
      onExecute?.({ type: 'COMMAND_EXECUTED', commandId: result.id });
    }
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((index) => (results.length ? (index + 1) % results.length : 0));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((index) =>
        results.length ? (index - 1 + results.length) % results.length : 0,
      );
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      executeResult(results[selectedIndex]);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div style={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        style={styles.modal}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div style={styles.inputRow}>
          <IconSearch size={18} stroke={2} aria-hidden style={styles.searchIcon} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Quick actions, patient search, or type a command..."
            aria-label="Operational search and commands"
            style={styles.input}
          />
        </div>

        <div style={styles.results} role="listbox" aria-label="Command palette results">
          {groupedResults.map((group) => (
            <div key={group.group} style={styles.group}>
              <div style={styles.groupLabel}>{group.group}</div>
              {group.entries.map(({ result, index }) => {
                const active = index === selectedIndex;
                return (
                  <button
                    key={result.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    aria-disabled={result.type === 'command' && result.disabled ? true : undefined}
                    disabled={result.type === 'command' && result.disabled}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => executeResult(result)}
                    style={{
                      ...styles.resultItem,
                      ...(active ? styles.resultItemActive : null),
                      ...(result.type === 'command' && result.disabled ? styles.resultItemDisabled : null),
                    }}
                  >
                    <span
                      style={
                        result.type === 'patient'
                          ? styles.patientIcon
                          : result.type === 'command'
                            ? styles.commandIcon
                            : styles.entityIcon
                      }
                      aria-hidden
                    >
                      {result.type === 'patient'
                        ? patientInitials(result.label)
                        : resultIcon(result)}
                    </span>
                    <span style={styles.resultText}>
                      <span style={styles.resultLabel}>{result.label}</span>
                      {result.description ? (
                        <span style={styles.resultDescription}>{result.description}</span>
                      ) : null}
                    </span>
                    {result.type === 'command' && result.shortcut ? (
                      <kbd style={styles.shortcut}>{result.shortcut}</kbd>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
          {!results.length ? (
            <OperationalEmptyState
              size="inline"
              icon="⌘"
              title={
                normalizeSearch(query)
                  ? EMPTY_STATE_COPY.commandPalette.noResults.title
                  : 'No quick actions for this role'
              }
              guidance={
                normalizeSearch(query)
                  ? EMPTY_STATE_COPY.commandPalette.noResults.guidance
                  : 'Your role may not have access to pinned quick actions. Type to search or use the sidebar.'
              }
              nextSteps={
                normalizeSearch(query) ? EMPTY_STATE_COPY.commandPalette.noResults.nextSteps : ([] as string[])
              }
            />
          ) : null}
        </div>

        <footer style={styles.footer}>
          Quick actions on open · ↑↓ navigate · ↵ select · esc close
        </footer>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '12vh',
    background: MEDICAL_THEME.overlay,
  },
  modal: {
    width: 'min(560px, calc(100vw - 32px))',
    maxWidth: 560,
    overflow: 'hidden',
    background: MEDICAL_THEME.surfaceCard,
    border: `1px solid ${MEDICAL_THEME.border}`,
    borderRadius: 12,
    boxShadow: MEDICAL_THEME.shadowModal,
    color: MEDICAL_THEME.ink,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  inputRow: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    minHeight: 48,
    borderBottom: `1px solid ${MEDICAL_THEME.border}`,
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    color: MEDICAL_THEME.inkMuted,
  },
  input: {
    width: '100%',
    height: 48,
    boxSizing: 'border-box',
    border: 0,
    outline: 0,
    background: 'transparent',
    color: MEDICAL_THEME.ink,
    fontSize: 16,
    padding: '0 16px 0 46px',
  },
  results: {
    maxHeight: 360,
    overflowY: 'auto',
    padding: '8px 8px 4px',
  },
  group: {
    display: 'grid',
    gap: 4,
    marginBottom: 8,
  },
  groupLabel: {
    padding: '6px 8px 4px',
    color: MEDICAL_THEME.inkSubtle,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  resultItem: {
    display: 'grid',
    gridTemplateColumns: '32px minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    minHeight: 54,
    padding: '8px 10px',
    border: 0,
    borderRadius: 10,
    background: 'transparent',
    color: MEDICAL_THEME.ink,
    textAlign: 'left',
    cursor: 'pointer',
  },
  resultItemActive: {
    background: MEDICAL_THEME.accentTint,
  },
  resultItemDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
  },
  commandIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 8,
    background: MEDICAL_THEME.surfaceCard,
    color: MEDICAL_THEME.inkSubtle,
    fontSize: 12,
    fontWeight: 900,
  },
  entityIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 8,
    background: MEDICAL_THEME.surfaceMuted,
    color: MEDICAL_THEME.accent,
    fontSize: 11,
    fontWeight: 900,
  },
  patientIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 999,
    background: MEDICAL_THEME.border,
    color: MEDICAL_THEME.inkMuted,
    fontSize: 10,
    fontWeight: 900,
  },
  resultText: {
    display: 'grid',
    minWidth: 0,
    gap: 3,
  },
  resultLabel: {
    overflow: 'hidden',
    color: MEDICAL_THEME.ink,
    fontSize: 14,
    fontWeight: 700,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  resultDescription: {
    overflow: 'hidden',
    color: MEDICAL_THEME.inkMuted,
    fontSize: 12,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  shortcut: {
    minWidth: 28,
    padding: '3px 7px',
    border: `1px solid ${MEDICAL_THEME.border}`,
    borderRadius: 6,
    background: MEDICAL_THEME.surfaceCard,
    color: MEDICAL_THEME.inkSubtle,
    fontSize: 11,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    textAlign: 'center',
  },
  empty: {
    padding: '22px 12px',
    color: MEDICAL_THEME.inkMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  footer: {
    padding: '8px 12px 10px',
    borderTop: `1px solid ${MEDICAL_THEME.border}`,
    color: MEDICAL_THEME.inkSubtle,
    fontSize: 11,
    textAlign: 'center',
  },
};

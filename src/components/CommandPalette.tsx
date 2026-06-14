import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconSearch } from '@tabler/icons-react';
import { useEmergencyStore } from '../store/emergencyStore';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { EMERGENCY_OS_ROUTE_COMMANDS } from '../config/commandPalette.config';
import { PILOT_CUSTOMER_MODE } from '../config/unified-navigation.config';
import type { Patient } from '../types/emergency';

export type CommandGroup = 'Navigation' | 'Patient' | 'Clinical' | 'Department' | 'Settings';

export interface Command {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  action: () => void;
  keywords: string[];
  group: CommandGroup;
}

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
};

type PaletteResult = PatientResult | CommandResult;

type GroupedResult = {
  group: string;
  entries: Array<{ result: PaletteResult; index: number }>;
};

type PatientLookupFields = Pick<Patient, 'firstName' | 'lastName' | 'name' | 'mrn'> &
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

export function getPatientDisplayName(
  patient: Pick<Patient, 'firstName' | 'lastName' | 'name' | 'mrn'>,
): string {
  return (
    `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.name || patient.mrn
  );
}

export function patientNameMatchScore(
  patient: PatientLookupFields,
  query: string,
): number {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return -1;

  const name = normalizeSearch(getPatientDisplayName(patient));
  const mrn = normalizeSearch(patient.mrn);
  const clinicalContext = normalizeSearch(
    [
      patient.chiefComplaint,
      patient.complaint,
      patient.complaintCategory,
      patient.state,
      patient.priority,
    ]
      .filter(Boolean)
      .join(' '),
  );
  const lookupText = normalizeSearch([name, mrn, clinicalContext].filter(Boolean).join(' '));
  if (name === normalizedQuery) return 1000;
  if (name.startsWith(normalizedQuery)) return 900 - name.indexOf(normalizedQuery);
  if (mrn === normalizedQuery) return 880;
  if (mrn.startsWith(normalizedQuery)) return 820 - mrn.indexOf(normalizedQuery);
  const nameIndex = name.indexOf(normalizedQuery);
  if (nameIndex >= 0) return 800 - nameIndex;
  const clinicalIndex = clinicalContext.indexOf(normalizedQuery);
  if (clinicalIndex >= 0) return 620 - clinicalIndex;

  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('');
  if (initials.startsWith(normalizedQuery)) return 600;

  const queryTokens = normalizedQuery.split(' ').filter(Boolean);
  return queryTokens.every((token) => lookupText.includes(token)) ? 480 - queryTokens.length : -1;
}

export function searchPatientsByName(
  patients: Patient[],
  query: string,
  now = new Date(),
): PatientResult[] {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return [];

  return patients
    .map((patient, order) => ({
      patient,
      order,
      score: patientNameMatchScore(patient, normalizedQuery),
    }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, MAX_PATIENT_RESULTS)
    .map(({ patient }) => ({
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
  storage?.setItem(RECENT_COMMANDS_KEY, JSON.stringify(nextIds));
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
  return window.localStorage;
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

function navigateWithRoleGuard(navigate: ReturnType<typeof useNavigate>, path: string): void {
  navigate(path);
}

function dispatchDocumentEvent(name: string): void {
  document.dispatchEvent(new Event(name));
}

function createEmergencyRouteCommands(navigate: ReturnType<typeof useNavigate>): Command[] {
  return EMERGENCY_OS_ROUTE_COMMANDS.map((command) => ({
    id: command.id,
    label: command.label.replace(/^Open /, ''),
    description: `${command.label} in the active Emergency OS shell.`,
    shortcut: command.hint ? `G ${command.hint}` : undefined,
    group: 'Navigation',
    keywords: command.keywords,
    action: () => {
      const action = command.build();
      if (action.type === 'OPEN_ROUTE' && action.path) {
        navigateWithRoleGuard(navigate, action.path);
      }
    },
  }));
}

function createCommands(
  navigate: ReturnType<typeof useNavigate>,
  toggleCopilot: () => void,
): Command[] {
  const commands: Command[] = [
    ...createEmergencyRouteCommands(navigate),
    {
      id: 'new-patient',
      label: 'Create Patient',
      description: 'Start central intake on the Whiteboard; human review remains required.',
      shortcut: 'N',
      group: 'Patient',
      keywords: ['add', 'new', 'register', 'intake', 'central intake', 'patient create'],
      action: () => {
        navigateWithRoleGuard(navigate, CANONICAL_ROUTES.emergencyWhiteboard);
        window.setTimeout(() => dispatchDocumentEvent('open-intake'), 0);
      },
    },
    {
      id: 'patient-lookup',
      label: 'Patient Lookup',
      description: 'Open patient search and census lookup.',
      group: 'Patient',
      keywords: ['find patient', 'lookup', 'mrn', 'search patient', 'census'],
      action: () => navigateWithRoleGuard(navigate, CANONICAL_ROUTES.emergencyPatients),
    },
    {
      id: 'toggle-copilot',
      label: 'Toggle Copilot',
      description: 'Show or hide human-reviewed Emergency OS Copilot context.',
      shortcut: 'C',
      group: 'Department',
      keywords: ['copilot', 'ai', 'chat', 'assistant'],
      action: toggleCopilot,
    },
    {
      id: 'reassessment',
      label: 'Reassessment Queue',
      description: 'Open due reassessments for clinician review.',
      shortcut: 'R',
      group: 'Department',
      keywords: ['reassess', 'flag', 'attention'],
      action: () => {
        dispatchDocumentEvent('open-reassessment');
        dispatchDocumentEvent('open-reassessment-drawer');
      },
    },
    {
      id: 'new-referral',
      label: 'New Referral',
      description: 'Create a referral or consult request for human review.',
      group: 'Clinical',
      keywords: ['referral', 'consult', 'transfer', 'specialty', 'send referral'],
      action: () => navigateWithRoleGuard(navigate, `${CANONICAL_ROUTES.emergencyReferrals}?new=1`),
    },
    {
      id: 'discharge-selected-patient',
      label: 'Discharge Selected Patient',
      description: 'Open discharge confirmation for the selected patient; no autonomous discharge.',
      group: 'Clinical',
      keywords: ['discharge', 'disposition', 'send home', 'close encounter'],
      action: () => dispatchDocumentEvent('open-patient-discharge'),
    },
  ];

  return PILOT_CUSTOMER_MODE.enabled
    ? commands.filter((command) => command.id !== 'discharge-selected-patient')
    : commands;
}

function buildCommandResults(
  commands: Command[],
  query: string,
  recentCommandIds: string[],
): PaletteResult[] {
  if (!normalizeSearch(query)) {
    return recentCommandIds
      .map((id) => commands.find((command) => command.id === id))
      .filter((command): command is Command => Boolean(command))
      .slice(0, RECENT_COMMAND_LIMIT)
      .map((command) => ({ ...command, type: 'command' }));
  }

  return matchAndRankCommands(commands, query).map((command) => ({ ...command, type: 'command' }));
}

function groupResults(results: PaletteResult[], recentMode = false): GroupedResult[] {
  const groups = new Map<string, GroupedResult>();

  results.forEach((result, index) => {
    const group = recentMode ? 'Recent' : result.group;
    const groupEntry = groups.get(group) || { group, entries: [] };
    groupEntry.entries.push({ result, index });
    groups.set(group, groupEntry);
  });

  return [...groups.values()];
}

function resultIcon(result: PaletteResult): string {
  if (result.type === 'patient') return '';
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
  const navigate = useNavigate();
  const patients = useEmergencyStore((state) => state.patients);
  const toggleCopilot = useEmergencyStore((state) => state.toggleCopilot);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommandIds, setRecentCommandIds] = useState(() => readRecentCommandIds());
  const [results, setResults] = useState<PaletteResult[]>([]);

  const commands = useMemo(
    () => createCommands(navigate, toggleCopilot),
    [navigate, toggleCopilot],
  );

  const computedResults = useMemo(() => {
    const patientResults = searchPatientsByName(patients, query);
    const commandResults = buildCommandResults(commands, query, recentCommandIds);
    return normalizeSearch(query) ? [...patientResults, ...commandResults] : commandResults;
  }, [commands, patients, query, recentCommandIds]);

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

  const groupedResults = groupResults(results, !normalizeSearch(query));

  const executeResult = (result: PaletteResult | undefined) => {
    if (!result) return;

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
            placeholder="Search patients and actions..."
            aria-label="Search patients and actions"
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
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => executeResult(result)}
                    style={{
                      ...styles.resultItem,
                      ...(active ? styles.resultItemActive : null),
                    }}
                  >
                    <span
                      style={result.type === 'patient' ? styles.patientIcon : styles.commandIcon}
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
            <div style={styles.empty}>
              {normalizeSearch(query)
                ? 'No matching patients or commands.'
                : 'No recent commands yet.'}
            </div>
          ) : null}
        </div>

        <footer style={styles.footer}>↑↓ navigate · ↵ select · esc close</footer>
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
    background: 'rgba(0,0,0,0.7)',
  },
  modal: {
    width: 'min(560px, calc(100vw - 32px))',
    maxWidth: 560,
    overflow: 'hidden',
    background: '#111827',
    border: '1px solid #374151',
    borderRadius: 12,
    boxShadow: '0 28px 90px rgba(0,0,0,0.65)',
    color: '#F9FAFB',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  inputRow: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    minHeight: 48,
    borderBottom: '1px solid #374151',
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    color: '#6B7280',
  },
  input: {
    width: '100%',
    height: 48,
    boxSizing: 'border-box',
    border: 0,
    outline: 0,
    background: 'transparent',
    color: '#F9FAFB',
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
    color: '#9CA3AF',
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
    color: '#F9FAFB',
    textAlign: 'left',
    cursor: 'pointer',
  },
  resultItemActive: {
    background: '#1C2333',
  },
  commandIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 8,
    background: '#0B1120',
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: 900,
  },
  patientIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 999,
    background: '#1F2937',
    color: '#D1D5DB',
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
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: 700,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  resultDescription: {
    overflow: 'hidden',
    color: '#9CA3AF',
    fontSize: 12,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  shortcut: {
    minWidth: 28,
    padding: '3px 7px',
    border: '1px solid #374151',
    borderRadius: 6,
    background: '#0B1120',
    color: '#9CA3AF',
    fontSize: 11,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    textAlign: 'center',
  },
  empty: {
    padding: '22px 12px',
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
  },
  footer: {
    padding: '8px 12px 10px',
    borderTop: '1px solid #374151',
    color: '#9CA3AF',
    fontSize: 11,
    textAlign: 'center',
  },
};

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useEmergencyStore } from '../../store/emergencyStore';
import './CommandPalette.css';

const RECENT_COMMANDS_KEY = 'caredroid.ed.commandPalette.recents.v1';

const BASE_COMMANDS = [
  {
    id: 'new-patient',
    label: 'New Patient',
    hint: 'N',
    keywords: ['intake', 'arrival', 'register'],
    build: () => ({ type: 'OPEN_INTAKE' }),
  },
  {
    id: 'find-patient',
    label: 'Find patient [name]',
    hint: 'F',
    keywords: ['search', 'whiteboard', 'patient'],
    build: (query) => ({ type: 'FIND_PATIENT', value: extractValue(query, /^find\s+patient\s*/i) }),
  },
  {
    id: 'open-ems',
    label: 'Open EMS pipeline',
    hint: 'E',
    keywords: ['pre-arrival', 'ambulance', 'pipeline'],
    build: () => ({ type: 'OPEN_ROUTE', path: '/emergency/ems' }),
  },
  {
    id: 'referral',
    label: 'Referral for [patient]',
    hint: 'R',
    keywords: ['consult', 'referrals'],
    build: (query) => ({
      type: 'OPEN_REFERRAL',
      value: extractValue(query, /^referral\s+for\s*/i),
    }),
  },
  {
    id: 'heart',
    label: 'Run HEART score',
    hint: 'H',
    keywords: ['calculator', 'chest pain'],
    build: () => ({ type: 'OPEN_CALCULATOR', calculatorId: 'heart' }),
  },
  {
    id: 'qsofa',
    label: 'Run qSOFA',
    hint: 'Q',
    keywords: ['calculator', 'sepsis'],
    build: () => ({ type: 'OPEN_CALCULATOR', calculatorId: 'qsofa' }),
  },
  {
    id: 'nihss',
    label: 'Run NIHSS',
    hint: 'S',
    keywords: ['calculator', 'stroke'],
    build: () => ({ type: 'OPEN_CALCULATOR', calculatorId: 'nihss' }),
  },
  {
    id: 'capacity',
    label: 'Capacity status',
    hint: 'C',
    keywords: ['capacity', 'pressure'],
    build: () => ({ type: 'OPEN_CAPACITY' }),
  },
  {
    id: 'shift-summary',
    label: 'Shift summary',
    hint: '⇧S',
    keywords: ['handoff', 'summary'],
    build: () => ({ type: 'OPEN_ROUTE', path: '/emergency/shift' }),
  },
  {
    id: 'clear-filters',
    label: 'Clear all filters',
    hint: 'Esc',
    keywords: ['reset', 'whiteboard'],
    build: () => ({ type: 'CLEAR_FILTERS' }),
  },
  {
    id: 'flag-patient',
    label: 'Flag [patient]',
    hint: '!',
    keywords: ['reassessment', 'risk'],
    build: (query) => ({ type: 'OPEN_FLAG_DIALOG', value: extractValue(query, /^flag\s*/i) }),
  },
];

const FLAG_OPTIONS = [
  'ReassessmentDue',
  'DeteriorationRisk',
  'LongWait',
  'HighRisk',
  'PendingAdmission',
  'EMSArrival',
  'Isolation',
];

function extractValue(query, pattern) {
  return String(query || '')
    .replace(pattern, '')
    .trim();
}

function patientName(patient) {
  return `${patient.firstName} ${patient.lastName}`;
}

function scoreCommand(command, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return 0;
  const haystack = [command.label, ...(command.keywords || [])].join(' ').toLowerCase();
  if (haystack.includes(normalizedQuery)) return 100 - haystack.indexOf(normalizedQuery);

  let cursor = 0;
  let score = 0;
  for (const char of normalizedQuery) {
    const foundAt = haystack.indexOf(char, cursor);
    if (foundAt === -1) return -1;
    score += foundAt === cursor ? 5 : 1;
    cursor = foundAt + 1;
  }
  return score;
}

function readRecentCommands() {
  try {
    return JSON.parse(window.localStorage.getItem(RECENT_COMMANDS_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeRecentCommands(commands) {
  window.localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(commands.slice(0, 5)));
}

function findPatient(value, patients) {
  const query = String(value || '')
    .trim()
    .toLowerCase();
  if (!query) return null;
  return (
    patients.find((patient) => patientName(patient).toLowerCase() === query) ||
    patients.find((patient) => patientName(patient).toLowerCase().includes(query)) ||
    patients.find((patient) => patient.mrn.toLowerCase().includes(query)) ||
    null
  );
}

export default function CommandPalette({ open, onClose, onExecute }) {
  const patients = useEmergencyStore((state) => state.patients);
  const addFlag = useEmergencyStore((state) => state.addFlag);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentCommandIds, setRecentCommandIds] = useState(() => readRecentCommands());
  const [flagTarget, setFlagTarget] = useState(null);
  const [selectedFlag, setSelectedFlag] = useState('ReassessmentDue');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const commands = useMemo(() => {
    const dynamicCommands = [];
    const findValue = extractValue(query, /^find\s+patient\s*/i);
    const referralValue = extractValue(query, /^referral\s+for\s*/i);
    const flagValue = extractValue(query, /^flag\s*/i);

    if (/^find\s+patient\s+/i.test(query) && findValue) {
      patients
        .filter((patient) => patientName(patient).toLowerCase().includes(findValue.toLowerCase()))
        .slice(0, 5)
        .forEach((patient) => {
          dynamicCommands.push({
            id: `find-${patient.id}`,
            label: `Find patient ${patientName(patient)}`,
            hint: 'Enter',
            keywords: [patient.mrn, patient.chiefComplaint],
            build: () => ({
              type: 'FIND_PATIENT',
              value: patientName(patient),
              patientId: patient.id,
            }),
          });
        });
    }

    if (/^referral\s+for\s+/i.test(query) && referralValue) {
      patients
        .filter((patient) =>
          patientName(patient).toLowerCase().includes(referralValue.toLowerCase())
        )
        .slice(0, 5)
        .forEach((patient) => {
          dynamicCommands.push({
            id: `referral-${patient.id}`,
            label: `Referral for ${patientName(patient)}`,
            hint: 'Enter',
            keywords: [patient.mrn, patient.chiefComplaint],
            build: () => ({
              type: 'OPEN_REFERRAL',
              value: patientName(patient),
              patientId: patient.id,
            }),
          });
        });
    }

    if (/^flag\s+/i.test(query) && flagValue) {
      patients
        .filter((patient) => patientName(patient).toLowerCase().includes(flagValue.toLowerCase()))
        .slice(0, 5)
        .forEach((patient) => {
          dynamicCommands.push({
            id: `flag-${patient.id}`,
            label: `Flag ${patientName(patient)}`,
            hint: 'Enter',
            keywords: [patient.mrn, patient.chiefComplaint],
            build: () => ({
              type: 'OPEN_FLAG_DIALOG',
              value: patientName(patient),
              patientId: patient.id,
            }),
          });
        });
    }

    const scored = BASE_COMMANDS.map((command) => ({
      ...command,
      score: scoreCommand(command, query),
    })).filter((command) => !query.trim() || command.score >= 0);

    if (!query.trim()) {
      const recentCommands = recentCommandIds
        .map((id) => BASE_COMMANDS.find((command) => command.id === id))
        .filter(Boolean);
      return recentCommands.length ? recentCommands : BASE_COMMANDS.slice(0, 6);
    }

    return [...dynamicCommands, ...scored.sort((a, b) => b.score - a.score)].slice(0, 8);
  }, [patients, query, recentCommandIds]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  const executeCommand = (command) => {
    if (!command) return;
    const payload = command.build(query);
    const nextRecent = [command.id, ...recentCommandIds.filter((id) => id !== command.id)];
    setRecentCommandIds(nextRecent);
    writeRecentCommands(nextRecent);

    if (payload.type === 'OPEN_FLAG_DIALOG') {
      const patient = payload.patientId
        ? patients.find((candidate) => candidate.id === payload.patientId)
        : findPatient(payload.value, patients);
      if (patient) {
        setFlagTarget(patient);
        return;
      }
    }

    onExecute(payload);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (flagTarget) {
        setFlagTarget(null);
        return;
      }
      onClose();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, commands.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      executeCommand(commands[activeIndex]);
    }
  };

  const applyFlag = () => {
    if (!flagTarget) return;
    addFlag(flagTarget.id, selectedFlag);
    onExecute({ type: 'VIEW_PATIENT', patientId: flagTarget.id });
    setFlagTarget(null);
  };

  return (
    <div className="command-palette__overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="command-palette"
        aria-label="Command palette"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="command-palette__search">
          <Search size={18} aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, patient name, or / shortcut..."
          />
          <button type="button" onClick={onClose} aria-label="Close command palette">
            <X size={17} aria-hidden />
          </button>
        </header>

        <div className="command-palette__body">
          {!query.trim() ? <span className="command-palette__eyebrow">Recent commands</span> : null}
          {commands.map((command, index) => (
            <button
              key={command.id}
              type="button"
              className={`command-palette__item${index === activeIndex ? ' command-palette__item--active' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => executeCommand(command)}
            >
              <span>{command.label}</span>
              <kbd>{command.hint}</kbd>
            </button>
          ))}
          {!commands.length ? <p>No commands found.</p> : null}
        </div>

        {flagTarget ? (
          <div className="command-palette__flag-dialog" role="dialog" aria-label="Flag patient">
            <strong>Flag {patientName(flagTarget)}</strong>
            <select value={selectedFlag} onChange={(event) => setSelectedFlag(event.target.value)}>
              {FLAG_OPTIONS.map((flag) => (
                <option key={flag} value={flag}>
                  {flag}
                </option>
              ))}
            </select>
            <div>
              <button type="button" onClick={() => setFlagTarget(null)}>
                Cancel
              </button>
              <button type="button" onClick={applyFlag}>
                Apply Flag
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

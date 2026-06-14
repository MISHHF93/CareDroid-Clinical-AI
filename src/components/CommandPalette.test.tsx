import { describe, expect, it, vi } from 'vitest';
import {
  matchAndRankCommands,
  readRecentCommandIds,
  recordRecentCommand,
  searchPatientsByName,
  type Command,
} from './CommandPalette';
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
});

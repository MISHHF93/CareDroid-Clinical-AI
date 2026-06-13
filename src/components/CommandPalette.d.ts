import type { ComponentType } from 'react';
import type { Patient } from '../types/emergency';

type CommandAction = {
  type: string;
  commandId?: string;
};

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

declare const CommandPalette: ComponentType<{
  open: boolean;
  onClose: () => void;
  onExecute?: (action: CommandAction) => void;
}>;

export function commandMatchScore(
  command: Pick<Command, 'id' | 'label' | 'description' | 'keywords' | 'group'>,
  query: string,
): number;
export function matchAndRankCommands(commands: Command[], query: string): Command[];
export function getPatientDisplayName(patient: Pick<Patient, 'firstName' | 'lastName' | 'name' | 'mrn'>): string;
export function patientNameMatchScore(patient: Pick<Patient, 'firstName' | 'lastName' | 'name' | 'mrn'>, query: string): number;
export function searchPatientsByName(patients: Patient[], query: string, now?: Date): Array<{
  type: 'patient';
  id: string;
  label: string;
  description: string;
  group: 'Patients';
  icon: 'person';
  action: () => void;
}>;
export function readRecentCommandIds(storage?: Pick<Storage, 'getItem' | 'setItem'> | null): string[];
export function writeRecentCommandIds(commandIds: string[], storage?: Pick<Storage, 'getItem' | 'setItem'> | null): string[];
export function recordRecentCommand(commandId: string, currentIds: string[], storage?: Pick<Storage, 'getItem' | 'setItem'> | null): string[];

export default CommandPalette;

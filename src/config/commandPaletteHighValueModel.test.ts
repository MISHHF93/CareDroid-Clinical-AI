import { describe, expect, it } from 'vitest';
import {
  auditCommandPaletteHighValueActions,
  buildEmptyQueryPaletteCommands,
  COMMAND_PALETTE_HIGH_VALUE_ACTION_IDS,
  resolveCommandPaletteId,
  selectHighValuePaletteCommands,
} from './commandPaletteHighValueModel';

function command(id, group = 'Quick actions') {
  return { id, label: id, group, keywords: [], action: () => {} };
}

describe('commandPaletteHighValueModel', () => {
  it('resolves legacy recent-command ids to current high-value ids', () => {
    expect(resolveCommandPaletteId('new-patient')).toBe('create-patient');
    expect(resolveCommandPaletteId('new-referral')).toBe('create-referral');
    expect(resolveCommandPaletteId('reassessment')).toBe('open-reassessment');
    expect(resolveCommandPaletteId('open-ems')).toBe('open-ems');
  });

  it('pins high-value commands before recents on empty query', () => {
    const commands = [
      ...COMMAND_PALETTE_HIGH_VALUE_ACTION_IDS.map((id) => command(id)),
      command('open-pulse', 'Navigation'),
      command('toggle-copilot', 'Department'),
    ];
    const results = buildEmptyQueryPaletteCommands(commands, [
      'open-pulse',
      'create-patient',
      'toggle-copilot',
    ]);

    expect(results.map((entry) => entry.id)).toEqual([
      ...COMMAND_PALETTE_HIGH_VALUE_ACTION_IDS,
      'open-pulse',
      'toggle-copilot',
    ]);
  });

  it('audits full high-value exposure', () => {
    const commands = COMMAND_PALETTE_HIGH_VALUE_ACTION_IDS.map((id) => command(id));
    const audit = auditCommandPaletteHighValueActions(commands);

    expect(audit.passesAudit).toBe(true);
    expect(audit.exposedCount).toBe(6);
    expect(audit.missingIds).toEqual([]);
  });

  it('selects high-value commands in canonical order', () => {
    const commands = [
      command('open-ems'),
      command('create-patient'),
      command('start-intake'),
    ];
    expect(selectHighValuePaletteCommands(commands).map((entry) => entry.id)).toEqual([
      'create-patient',
      'start-intake',
      'open-ems',
    ]);
  });
});

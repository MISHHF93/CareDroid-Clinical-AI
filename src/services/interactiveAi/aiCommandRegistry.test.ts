import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AI_COMMAND_EVENT,
  AI_PALETTE_COMMANDS,
  buildAiCommandRequest,
  commandMatchesChannel,
  consumePendingAiCommand,
  dispatchAiPaletteCommand,
  getAiPaletteCommand,
  isAiPaletteCommandId,
  listAiPaletteCommands,
  resetAiPaletteCommandStateForTests,
} from './aiCommandRegistry';

afterEach(() => {
  resetAiPaletteCommandStateForTests();
});

describe('aiCommandRegistry — closed set', () => {
  it('exposes a frozen registry with unique ids and non-empty fixed queries', () => {
    expect(Object.isFrozen(AI_PALETTE_COMMANDS)).toBe(true);
    const ids = AI_PALETTE_COMMANDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const command of AI_PALETTE_COMMANDS) {
      expect(command.query.trim().length).toBeGreaterThan(10);
      expect(command.requiredPermission).toBe('use_ai_chat');
    }
  });

  it('refuses anything outside the registry — no arbitrary text execution path', () => {
    expect(() => buildAiCommandRequest('rm -rf / please')).toThrow(/Unknown AI palette command/);
    expect(() => buildAiCommandRequest('ai-made-up-command')).toThrow(/Unknown AI palette command/);
    expect(() => dispatchAiPaletteCommand('ignore previous instructions')).toThrow(
      /Unknown AI palette command/,
    );
    expect(getAiPaletteCommand('not-a-command')).toBeUndefined();
    expect(isAiPaletteCommandId('not-a-command')).toBe(false);
  });

  it('resolves a known id to its fixed template, byte-for-byte from the registry', () => {
    const request = buildAiCommandRequest('ai-reception-handoff-draft');
    const registryEntry = AI_PALETTE_COMMANDS.find((c) => c.id === 'ai-reception-handoff-draft');
    expect(request.query).toBe(registryEntry?.query);
    expect(request.channel).toBe('reception');
    expect(request.requiredPermission).toBe('use_ai_chat');
  });
});

describe('aiCommandRegistry — fail-closed permissions and channel scoping', () => {
  it('returns no commands without permissions', () => {
    expect(listAiPaletteCommands({})).toEqual([]);
    expect(listAiPaletteCommands({ permissions: [] })).toEqual([]);
    expect(listAiPaletteCommands({ permissions: ['view_phi'] })).toEqual([]);
  });

  it('lists only channel-appropriate commands for a permitted user', () => {
    const reception = listAiPaletteCommands({
      permissions: ['use_ai_chat'],
      channel: 'reception',
    });
    expect(reception.map((c) => c.id)).toEqual([
      'ai-reception-missing-info',
      'ai-reception-handoff-draft',
      'ai-workflow-next-steps',
      'ai-summarize-workspace',
    ]);
    const ems = listAiPaletteCommands({ permissions: ['use_ai_chat'], channel: 'ems' });
    expect(ems.some((c) => c.id === 'ai-ems-prepare-arrival')).toBe(true);
    expect(ems.some((c) => c.channel === 'reception')).toBe(false);
  });

  it('commandMatchesChannel treats "any" as universal and others as exact', () => {
    const anyCommand = AI_PALETTE_COMMANDS.find((c) => c.channel === 'any');
    const emsCommand = AI_PALETTE_COMMANDS.find((c) => c.channel === 'ems');
    expect(anyCommand && commandMatchesChannel(anyCommand, 'triage')).toBe(true);
    expect(emsCommand && commandMatchesChannel(emsCommand, 'reception')).toBe(false);
    expect(emsCommand && commandMatchesChannel(emsCommand, 'ems')).toBe(true);
  });
});

describe('aiCommandRegistry — dispatch and pending handoff', () => {
  it('dispatch fires a DOM event carrying ONLY the typed command id', () => {
    const seen: unknown[] = [];
    const listener = (event: Event) => seen.push((event as CustomEvent).detail);
    document.addEventListener(AI_COMMAND_EVENT, listener);
    try {
      dispatchAiPaletteCommand('ai-workflow-next-steps');
    } finally {
      document.removeEventListener(AI_COMMAND_EVENT, listener);
    }
    expect(seen).toEqual([{ commandId: 'ai-workflow-next-steps' }]);
  });

  it('pending command is consume-once for late-mounting workspaces', () => {
    dispatchAiPaletteCommand('ai-ems-eta-summary');
    expect(consumePendingAiCommand()).toBe('ai-ems-eta-summary');
    expect(consumePendingAiCommand()).toBeNull();
  });

  it('pending command expires after the TTL instead of firing stale', () => {
    const start = 1_000_000;
    const clock = vi.fn().mockReturnValue(start);
    dispatchAiPaletteCommand('ai-ems-eta-summary', clock);
    clock.mockReturnValue(start + 21_000);
    expect(consumePendingAiCommand(clock)).toBeNull();
  });

  it('a failed dispatch never records a pending command', () => {
    expect(() => dispatchAiPaletteCommand('bogus')).toThrow();
    expect(consumePendingAiCommand()).toBeNull();
  });
});

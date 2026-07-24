/**
 * Typed AI command registry for the command palette (IX14).
 *
 * The palette never executes arbitrary text: every AI command is a closed
 * registry entry with a fixed query template, and only the typed command id
 * crosses the palette → workspace boundary. The workspace re-validates the id
 * against this registry before running anything.
 */

import type { AiRiskLevel } from '../../contracts/interactiveAi';

export type AiPaletteCommandId =
  | 'ai-reception-missing-info'
  | 'ai-reception-handoff-draft'
  | 'ai-open-reception'
  | 'ai-open-patient-lookup'
  | 'ai-open-ocr-scan'
  | 'ai-open-whiteboard'
  | 'ai-ems-prepare-arrival'
  | 'ai-ems-eta-summary'
  | 'ai-workflow-next-steps'
  | 'ai-summarize-workspace';

export type AiPaletteChannel = 'reception' | 'ems' | 'any';

export type AiPaletteCommand = {
  readonly id: AiPaletteCommandId;
  readonly label: string;
  readonly description: string;
  readonly keywords: readonly string[];
  /** Which workspace channel may run this command; 'any' = every mounted workspace. */
  readonly channel: AiPaletteChannel;
  /** Permission the executing user must hold — commands are hidden AND refused without it. */
  readonly requiredPermission: string;
  readonly riskLevel: AiRiskLevel;
  /**
   * Fixed query template. Deliberately a constant with no interpolation of
   * caller-supplied text — patient/user context is attached separately by the
   * workspace through the typed orchestrator request, never through the query.
   */
  readonly query: string;
};

export const AI_PALETTE_COMMANDS: readonly AiPaletteCommand[] = Object.freeze([
  {
    id: 'ai-reception-missing-info',
    label: 'AI: Find missing registration info',
    description: 'Review the selected registration for missing information; draft stays review-only.',
    keywords: ['ai', 'missing', 'registration', 'insurance', 'incomplete', 'fields'],
    channel: 'reception',
    requiredPermission: 'use_ai_chat',
    riskLevel: 'moderate',
    query: 'Review this registration for missing information and prepare a handoff summary for review.',
  },
  {
    id: 'ai-reception-handoff-draft',
    label: 'AI: Draft triage handoff',
    description: 'Draft a registration→triage handoff note for clinician review — no chart write.',
    keywords: ['ai', 'handoff', 'triage', 'draft', 'note', 'transfer'],
    channel: 'reception',
    requiredPermission: 'use_ai_chat',
    riskLevel: 'moderate',
    query: 'Prepare a registration to triage handoff draft for clinician review.',
  },
  {
    id: 'ai-open-reception',
    label: 'AI: Open Reception desk',
    description: 'Propose opening the Reception desk (closed catalog navigate — human confirms).',
    keywords: ['ai', 'open', 'reception', 'desk', 'navigate', 'front desk'],
    channel: 'any',
    requiredPermission: 'view_operations',
    riskLevel: 'low',
    query: 'Open reception desk',
  },
  {
    id: 'ai-open-patient-lookup',
    label: 'AI: Focus patient lookup',
    description: 'Propose focusing Reception lookup-before-create (human confirms).',
    keywords: ['ai', 'lookup', 'find patient', 'search patient', 'duplicate'],
    channel: 'reception',
    requiredPermission: 'view_operations',
    riskLevel: 'low',
    query: 'Focus patient lookup',
  },
  {
    id: 'ai-open-ocr-scan',
    label: 'AI: Open document scan / OCR',
    description: 'Propose opening smart intake / OCR capture on Reception (human confirms).',
    keywords: ['ai', 'ocr', 'scan', 'document', 'health card', 'id'],
    channel: 'reception',
    requiredPermission: 'view_operations',
    riskLevel: 'low',
    query: 'Show OCR document scan',
  },
  {
    id: 'ai-open-whiteboard',
    label: 'AI: Open Whiteboard',
    description: 'Propose opening the ED whiteboard (closed catalog navigate — human confirms).',
    keywords: ['ai', 'open', 'whiteboard', 'board', 'navigate'],
    channel: 'any',
    requiredPermission: 'view_operations',
    riskLevel: 'low',
    query: 'Open the whiteboard',
  },
  {
    id: 'ai-ems-prepare-arrival',
    label: 'AI: Prepare for EMS arrival',
    description: 'Prepare the department for an inbound EMS arrival and draft the handoff for review.',
    keywords: ['ai', 'ems', 'prepare', 'arrival', 'inbound', 'handoff'],
    channel: 'ems',
    requiredPermission: 'use_ai_chat',
    riskLevel: 'moderate',
    query: 'Prepare the department for this inbound EMS arrival and draft the handoff for review.',
  },
  {
    id: 'ai-ems-eta-summary',
    label: 'AI: Summarize inbound ETAs',
    description: 'Summarize inbound EMS ETAs and pending pre-arrival tasks.',
    keywords: ['ai', 'ems', 'eta', 'inbound', 'summary', 'pre-arrival'],
    channel: 'ems',
    requiredPermission: 'use_ai_chat',
    riskLevel: 'low',
    query: 'Summarize inbound EMS ETAs and the pending pre-arrival tasks.',
  },
  {
    id: 'ai-workflow-next-steps',
    label: 'AI: Explain next steps',
    description: 'Explain the next steps to complete the current workflow safely.',
    keywords: ['ai', 'next steps', 'workflow', 'guide', 'help', 'what now'],
    channel: 'any',
    requiredPermission: 'use_ai_chat',
    riskLevel: 'low',
    query: 'Explain the next steps to complete the current workflow safely.',
  },
  {
    id: 'ai-summarize-workspace',
    label: 'AI: Summarize workspace state',
    description: 'Summarize the current workspace state and outstanding items.',
    keywords: ['ai', 'summarize', 'summary', 'status', 'outstanding', 'overview'],
    channel: 'any',
    requiredPermission: 'use_ai_chat',
    riskLevel: 'low',
    query: 'Summarize the current workspace state and the outstanding items.',
  },
]);

const COMMANDS_BY_ID: ReadonlyMap<string, AiPaletteCommand> = new Map(
  AI_PALETTE_COMMANDS.map((command) => [command.id, command]),
);

export function getAiPaletteCommand(commandId: string): AiPaletteCommand | undefined {
  return COMMANDS_BY_ID.get(commandId);
}

export function isAiPaletteCommandId(commandId: string): commandId is AiPaletteCommandId {
  return COMMANDS_BY_ID.has(commandId);
}

/**
 * Fail-closed listing: no permissions → no commands. A command is offered only
 * when the user holds its required permission and it applies to the channel.
 */
export function listAiPaletteCommands(options: {
  permissions?: readonly string[];
  channel?: string;
}): AiPaletteCommand[] {
  const permissions = options.permissions;
  if (!permissions || permissions.length === 0) return [];
  return AI_PALETTE_COMMANDS.filter((command) => {
    if (!permissions.includes(command.requiredPermission)) return false;
    if (!options.channel) return true;
    return commandMatchesChannel(command, options.channel);
  });
}

export function commandMatchesChannel(command: AiPaletteCommand, channel: string): boolean {
  return command.channel === 'any' || command.channel === channel;
}

/**
 * Resolve a command id to its fixed request. Throws on anything outside the
 * registry — this is the "no arbitrary text execution" guarantee: there is no
 * code path that turns palette input into an executed query.
 */
export function buildAiCommandRequest(commandId: string): {
  commandId: AiPaletteCommandId;
  query: string;
  channel: AiPaletteChannel;
  requiredPermission: string;
} {
  const command = COMMANDS_BY_ID.get(commandId);
  if (!command) {
    throw new Error(`Unknown AI palette command: ${commandId}`);
  }
  return {
    commandId: command.id,
    query: command.query,
    channel: command.channel,
    requiredPermission: command.requiredPermission,
  };
}

export const AI_COMMAND_EVENT = 'interactive-ai-command';

/** Pending handoff so a command survives palette → route navigation → workspace mount. */
const PENDING_TTL_MS = 20_000;
let pendingCommand: { commandId: AiPaletteCommandId; at: number } | null = null;

/**
 * Dispatch a typed AI command. Validates the id first (unknown ids throw and
 * nothing is dispatched), records it as pending for late-mounting workspaces,
 * and fires a DOM event carrying ONLY the command id.
 */
export function dispatchAiPaletteCommand(
  commandId: string,
  now: () => number = Date.now,
): AiPaletteCommandId {
  const request = buildAiCommandRequest(commandId);
  pendingCommand = { commandId: request.commandId, at: now() };
  if (typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent(AI_COMMAND_EVENT, { detail: { commandId: request.commandId } }));
  }
  return request.commandId;
}

/** Consume-once pending command; expired entries are dropped, not returned. */
export function consumePendingAiCommand(now: () => number = Date.now): AiPaletteCommandId | null {
  const pending = pendingCommand;
  pendingCommand = null;
  if (!pending) return null;
  if (now() - pending.at > PENDING_TTL_MS) return null;
  return pending.commandId;
}

/** Test-only reset so pending state never leaks between specs. */
export function resetAiPaletteCommandStateForTests(): void {
  pendingCommand = null;
}

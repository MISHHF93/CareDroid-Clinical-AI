/**
 * High-value command palette actions — pinned on open to reduce navigation dependency.
 */

export const COMMAND_PALETTE_HIGH_VALUE_ACTION_IDS = Object.freeze([
  'create-patient',
  'start-intake',
  'open-whiteboard',
  'open-ems',
  'open-reassessment',
  'create-referral',
]);

/** Route commands duplicated by Quick actions — hidden from Navigation group. */
export const COMMAND_PALETTE_SUPPRESSED_ROUTE_IDS = Object.freeze(
  new Set([
    'open-whiteboard',
    'open-ems',
    'open-reassessment',
    'open-intake',
    'open-tools',
    'open-calculators',
    'open-capacity',
  ]),
);

/** Legacy command ids still stored in recent-command localStorage. */
export const COMMAND_PALETTE_LEGACY_ID_ALIASES = Object.freeze({
  'new-patient': 'create-patient',
  'new-referral': 'create-referral',
  reassessment: 'open-reassessment',
});

export const COMMAND_PALETTE_QUICK_ACTIONS_GROUP = 'Quick actions';

export function resolveCommandPaletteId(commandId) {
  return COMMAND_PALETTE_LEGACY_ID_ALIASES[commandId] || commandId;
}

export function selectHighValuePaletteCommands(commands) {
  const byId = new Map<any, any>(commands.map((command) => [command.id, command]));
  return COMMAND_PALETTE_HIGH_VALUE_ACTION_IDS.map((id) => byId.get(id)).filter(Boolean);
}

export function buildEmptyQueryPaletteCommands(commands, recentCommandIds = [] as any[]) {
  const highValue = selectHighValuePaletteCommands(commands);
  const pinnedIds = new Set(highValue.map((command) => command.id));

  const recents = recentCommandIds
    .map(resolveCommandPaletteId)
    .filter((id) => !pinnedIds.has(id))
    .map((id) => commands.find((command) => command.id === id))
    .filter(Boolean)
    .slice(0, 5);

  return [...highValue, ...recents];
}

export function auditCommandPaletteHighValueActions(commands) {
  const byId = new Map<any, any>(commands.map((command) => [command.id, command]));
  const missing = COMMAND_PALETTE_HIGH_VALUE_ACTION_IDS.filter((id) => !byId.has(id));
  const exposed = COMMAND_PALETTE_HIGH_VALUE_ACTION_IDS.filter((id) => byId.has(id)).map((id) => {
    const command = byId.get(id);
    return {
      id,
      label: command.label,
      group: command.group,
      shortcut: command.shortcut || null,
    };
  });

  const navigationRouteCount = commands.filter(
    (command) =>
      command.group === 'Navigation' && !COMMAND_PALETTE_SUPPRESSED_ROUTE_IDS.has(command.id),
  ).length;

  const suppressedDuplicates = [...COMMAND_PALETTE_SUPPRESSED_ROUTE_IDS].filter((id) =>
    commands.some((command) => command.id === id),
  );

  return {
    requiredActionCount: COMMAND_PALETTE_HIGH_VALUE_ACTION_IDS.length,
    exposedCount: exposed.length,
    missingIds: missing,
    exposed,
    navigationRouteCount,
    suppressedRouteDuplicates: suppressedDuplicates,
    passesAudit: missing.length === 0,
    emptyQueryShowsQuickActions: true,
  };
}

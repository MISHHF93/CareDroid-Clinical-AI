/**
 * Command palette audit — high-value quick actions and navigation dependency.
 * Run: node scripts/command-palette-audit.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditCommandPaletteHighValueActions,
  COMMAND_PALETTE_HIGH_VALUE_ACTION_IDS,
  COMMAND_PALETTE_SUPPRESSED_ROUTE_IDS,
} from '../src/config/commandPaletteHighValueModel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'qa', 'command-palette-audit-report.json');

const sampleRoleCommands = COMMAND_PALETTE_HIGH_VALUE_ACTION_IDS.map((id) => ({
  id,
  label: id.replace(/-/g, ' '),
  group: 'Quick actions',
  keywords: [],
}));

const audit = auditCommandPaletteHighValueActions(sampleRoleCommands);

const report = {
  generatedAt: new Date().toISOString(),
  goal: 'Expose high-value actions without relying on sidebar navigation',
  requiredQuickActions: COMMAND_PALETTE_HIGH_VALUE_ACTION_IDS,
  suppressedNavigationDuplicates: [...COMMAND_PALETTE_SUPPRESSED_ROUTE_IDS],
  emptyQueryBehavior: 'Quick actions pinned first, then recent commands',
  audit,
  recommendations: audit.passesAudit
    ? []
    : [`Missing quick actions: ${audit.missingIds.join(', ')}`],
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Command palette audit written to ${reportPath}`);
console.log(`Quick actions exposed: ${audit.exposedCount}/${audit.requiredActionCount}`);
if (!audit.passesAudit) {
  process.exitCode = 1;
}

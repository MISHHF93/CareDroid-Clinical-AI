/**
 * Compliance risk report builder — run via tests or dev tooling.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clinicalIntentTools } from './clinicalIntentToolCatalog';
import {
  runProductionSafetyComplianceAudit,
  GUARDRAIL_CHECKLIST,
  formatClinicalSafetyComplianceMarkdown,
} from './clinicalSafetyGuardrails';
import { resolveCatalogLaunch } from './clinicalCatalogWiring';
import { NLU_PROFILE_TOOL_IDS } from './clinicalToolIdContract';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');

function defaultReadFile(relPath) {
  return readFileSync(join(repoRoot, relPath), 'utf8');
}

/**
 * @param {object} [options]
 * @param {import('./clinicalIntentToolCatalog.ts').clinicalIntentTools} [options.tools]
 * @param {(relPath: string) => string} [options.readFile]
 * @param {string[]} [options.launchToolIds]
 */
export function buildClinicalSafetyComplianceReport(options: any = {}) {
  const tools = options.tools ?? clinicalIntentTools;
  const readFile = options.readFile ?? defaultReadFile;
  const launchToolIds =
    options.launchToolIds ??
    NLU_PROFILE_TOOL_IDS.filter((id) => {
      const row = tools.find((t) => t.toolId === id);
      return row?.chatSeed || resolveCatalogLaunch(id).chatSeed;
    });

  const audit = runProductionSafetyComplianceAudit({
    tools,
    readFile,
    resolveLaunch: resolveCatalogLaunch,
    launchToolIds,
  });

  const { riskLevel } = audit;

  return {
    ...audit,
    guardrailChecklist: GUARDRAIL_CHECKLIST,
    recommendation:
      riskLevel === 'low'
        ? 'All audited chat seeds and UI surfaces meet guardrails. Re-run npm run test:safety-compliance before releases.'
        : 'Remediate failing surfaces before production promotion; do not weaken existing warnings.',
    markdown: formatClinicalSafetyComplianceMarkdown(audit),
  };
}

/** Latest report snapshot for documentation consumers (regenerate in tests). */
export function getClinicalSafetyComplianceSnapshot() {
  return buildClinicalSafetyComplianceReport();
}

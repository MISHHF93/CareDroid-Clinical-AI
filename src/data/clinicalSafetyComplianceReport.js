/**
 * Compliance risk report builder — run via tests or dev tooling.
 */

import { clinicalIntentTools } from './clinicalIntentToolCatalog';
import { runClinicalSafetyComplianceAudit, GUARDRAIL_CHECKLIST } from './clinicalSafetyGuardrails';

/**
 * @param {object} [options]
 * @param {import('./clinicalIntentToolCatalog.js').clinicalIntentTools} [options.tools]
 */
export function buildClinicalSafetyComplianceReport(options = {}) {
  const tools = options.tools ?? clinicalIntentTools;
  const audit = runClinicalSafetyComplianceAudit(tools);

  const riskLevel =
    audit.summary.criticalIssues > 0
      ? 'high'
      : audit.summary.failing > 0
        ? 'medium'
        : 'low';

  return {
    ...audit,
    riskLevel,
    guardrailChecklist: GUARDRAIL_CHECKLIST,
    recommendation:
      riskLevel === 'low'
        ? 'All audited chat seeds meet guardrails. Continue UI spot-checks on Tier-A forms and AI tool pages.'
        : 'Remediate failing chat seeds before production promotion; do not weaken existing warnings.',
  };
}

/** Latest report snapshot for documentation consumers (regenerate in tests). */
export function getClinicalSafetyComplianceSnapshot() {
  return buildClinicalSafetyComplianceReport();
}

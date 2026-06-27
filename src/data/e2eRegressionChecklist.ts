/**
 * Release regression checklist — run before production promotion.
 */

export const E2E_REGRESSION_CHECKLIST = Object.freeze([
  {
    id: 'automated-gates',
    title: 'Automated gates (CI / local)',
    checks: [
      'npm run test:e2e-matrix (e2eToolValidationMatrix.test.js)',
      'vitest: clinicalToolIdContract.test.js',
      'vitest: clinicalCatalogLaunch.test.js',
      'vitest: clinicalToolAliasSync.test.js',
      'vitest: clinicalSafetyGuardrails.test.js',
      'backend jest: tool-orchestrator (registry + service)',
    ],
  },
  {
    id: 'contract-drift',
    title: 'ID contract drift',
    checks: [
      'ALL_REGISTRY_TOOL_IDS matches toolRegistry.js',
      'NLU_PROFILE_TOOL_IDS matches clinicalIntentTools + backend tool.patterns.ts',
      'REGISTRY_ID_TO_ORCHESTRATOR_TOOL matches backend REGISTERED_EXECUTOR_TOOL_IDS (3 only)',
      'No dispatch-ai in REGISTRY_ID_TO_ORCHESTRATOR_TOOL',
    ],
  },
  {
    id: 'routes',
    title: 'SPA routes',
    checks: [
      'Every registry tool path in KNOWN_TOOL_AREA_PATHS',
      'Calculator routes in App.jsx match CALCULATOR_ROUTE_DEFS',
      '/tools/* and /fleet/* unknown paths hit ToolsAreaFallback (not dashboard)',
    ],
  },
  {
    id: 'catalog-discovery',
    title: 'Catalog & discovery',
    checks: [
      'getMedicalToolsCatalogRows() includes all Tier A/B registry tools',
      'Catalog search finds PHQ-9, Wells PE, dispatch-ai by alias',
      'sourceCodeToolDiscovery phantom list unchanged or reviewed',
    ],
  },
  {
    id: 'launch',
    title: 'Launch behavior',
    checks: [
      'resolveCatalogLaunch(registryId) non-empty for shipped registry ids',
      'Tier B → /tools/calculators + chatSeed',
      'Tier C → orchestratorTool for sofa, drug-check, lab-interp only',
    ],
  },
  {
    id: 'safety',
    title: 'Clinical safety copy',
    checks: [
      'buildClinicalSafetyComplianceReport() riskLevel low',
      'ToolPageLayout disclaimer on drug, lab, diagnosis, procedures',
      'CHA2DS2-VASc no anticoagulation mandate strings',
    ],
  },
  {
    id: 'manual-spot',
    title: 'Manual spot-check (smoke)',
    checks: [
      'Complete flattenManualQaChecklist() Tier C + PHQ-9 + dispatch-ai items',
      'Verify 401/403 on tools API when logged out',
    ],
  },
]);

export function flattenRegressionChecklist() {
  return E2E_REGRESSION_CHECKLIST.flatMap((group) =>
    group.checks.map((check, index) => ({
      groupId: group.id,
      groupTitle: group.title,
      checkId: `${group.id}-${index + 1}`,
      check,
    }))
  );
}

/** Markdown export for release notes / ops runbooks. */
export function formatRegressionMarkdown() {
  const lines = [
    '# Regression checklist — production promotion',
    '',
    'Canonical source: `src/data/e2eRegressionChecklist.ts`.',
    '',
  ];
  for (const group of E2E_REGRESSION_CHECKLIST) {
    lines.push(`## ${group.title}`, '');
    for (const check of group.checks) {
      lines.push(`- [ ] ${check}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

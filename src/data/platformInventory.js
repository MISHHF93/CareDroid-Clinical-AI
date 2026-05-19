/**
 * Reverse-engineered platform inventory — counts and lists derived from shipped source.
 * Used by README audit section and drift tests (`platformInventory.test.js`).
 */

import toolRegistry, { toolRegistryById } from './toolRegistry';
import { featureInventory } from './featureInventory';
import {
  builtinUiCalculators,
  clinicalIntentTools,
  nluCalculatorHubOnly,
} from './clinicalIntentToolCatalog';
import { getMedicalCatalogSummary } from './medicalToolsCatalogIndex';
import { getE2eValidationMatrixDocument } from './e2eToolValidationMatrix';
import { tierForRegistryId } from './e2eToolValidationMatrix';
import {
  ALL_REGISTRY_TOOL_IDS,
  CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS,
  CLINICAL_TIER_B_CHAT_REGISTRY_IDS,
  CLINICAL_AI_PAGE_REGISTRY_IDS,
  FLEET_TIER_A_REGISTRY_IDS,
  NLU_HUB_ONLY_PROFILE_TOOL_IDS,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
  REGISTRY,
} from './clinicalToolIdContract';
import { CALCULATOR_ROUTE_DEFS, KNOWN_TOOL_AREA_PATHS } from '../routes/clinicalToolRoutes';

/** @typedef {'A'|'B'|'C'|'clinical-page'|'fleet-A'|'fleet-B'|'hub'|'other'} RegistryTier */

/**
 * @returns {{
 *   auditedAt: string;
 *   counts: Record<string, number>;
 *   registryByTier: Record<string, { id: string; name: string; route: string | null }[]>;
 *   builtinCalculators: { slug: string; name: string; path: string }[];
 *   nluHubOnlyProfiles: string[];
 *   marketingFeatures: { id: string; name: string; category: string; type: string }[];
 *   spaFeatureAreas: { area: string; routes: string[] }[];
 * }}
 */
export function getPlatformInventory() {
  const e2e = getE2eValidationMatrixDocument();
  const catalog = getMedicalCatalogSummary();
  const registryByCategory = toolRegistry.reduce((acc, tool) => {
    const key = tool.category || 'Other';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, /** @type {Record<string, number>} */ ({}));

  /** @type {Record<string, { id: string; name: string; route: string | null }[]>} */
  const registryByTier = {};
  for (const id of ALL_REGISTRY_TOOL_IDS) {
    const tier = tierForRegistryId(id);
    if (!registryByTier[tier]) registryByTier[tier] = [];
    registryByTier[tier].push({
      id,
      name: toolRegistryById[id]?.name ?? id,
      route: toolRegistryById[id]?.path ?? null,
    });
  }
  for (const tier of Object.keys(registryByTier)) {
    registryByTier[tier].sort((a, b) => a.name.localeCompare(b.name));
  }

  const marketingTools = featureInventory.filter((f) => f.type === 'tool');
  const marketingFeatures = featureInventory.filter((f) => f.type === 'feature');

  return {
    auditedAt: new Date().toISOString().slice(0, 10),
    counts: {
      registryTools: ALL_REGISTRY_TOOL_IDS.length,
      toolRegistrySidebarEntries: toolRegistry.length,
      nluClinicalProfiles: clinicalIntentTools.length,
      builtinCalculatorForms: builtinUiCalculators.length,
      calculatorSpaRoutes: CALCULATOR_ROUTE_DEFS.length,
      catalogSearchableRows: catalog.total,
      catalogChatOnRequest: catalog.chatOnRequest,
      catalogWithDedicatedPage: catalog.withPage,
      catalogWithBackendExecutor: catalog.withApi,
      nluHubOnlyCalculatorProfiles: nluCalculatorHubOnly.length,
      nluHubOnlyContractIds: NLU_HUB_ONLY_PROFILE_TOOL_IDS.length,
      knownToolAreaPaths: KNOWN_TOOL_AREA_PATHS.length,
      backendPostExecutors: ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS.length,
      tierACalculators: CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS.length,
      tierBChatAssisted: CLINICAL_TIER_B_CHAT_REGISTRY_IDS.length,
      tierCExecutorPages: 3,
      clinicalAiPages: CLINICAL_AI_PAGE_REGISTRY_IDS.length,
      fleetOperationsPages: FLEET_TIER_A_REGISTRY_IDS.length,
      fleetChatAssisted: 1,
      calculatorsHub: 1,
      marketingFeatureInventory: featureInventory.length,
      marketingClinicalTools: marketingTools.length,
      marketingPlatformFeatures: marketingFeatures.length,
      e2eMatrixRows: e2e.summary.totalRows,
    },
    registryByCategory,
    registryByTier,
    builtinCalculators: builtinUiCalculators.map((c) => ({
      slug: c.id,
      name: c.name,
      path: c.path,
    })),
    nluHubOnlyProfiles: [...NLU_HUB_ONLY_PROFILE_TOOL_IDS],
    marketingFeatures: featureInventory.map((f) => ({
      id: f.id,
      name: f.name,
      category: f.category,
      type: f.type,
    })),
    spaFeatureAreas: [
      {
        area: 'AI workspace',
        routes: ['/dashboard'],
      },
      {
        area: 'Clinical tools hub',
        routes: ['/tools', '/tools/catalog', '/tools/calculators'],
      },
      {
        area: 'Clinical intelligence',
        routes: ['/clinical/alerts'],
      },
      {
        area: 'Account & security',
        routes: [
          '/profile',
          '/profile-settings',
          '/settings',
          '/notifications',
          '/two-factor-setup',
          '/biometric-setup',
          '/onboarding',
          '/consent',
          '/consent-history',
        ],
      },
      {
        area: 'Administration (RBAC)',
        routes: ['/team', '/audit-logs', '/analytics', '/costs'],
      },
      {
        area: 'Public & legal',
        routes: ['/', '/auth', '/privacy', '/terms', '/gdpr', '/hipaa', '/help', '/shared/tools/:shareId'],
      },
    ],
  };
}

/**
 * Markdown fragment for README (platform inventory section).
 * @param {ReturnType<typeof getPlatformInventory>} [inv]
 */
export function formatPlatformInventoryMarkdown(inv = getPlatformInventory()) {
  const c = inv.counts;
  const tierRows = Object.entries(inv.registryByTier)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tier, tools]) => `| **${tier}** | ${tools.length} | ${tools.map((t) => t.name).join(', ')} |`)
    .join('\n');

  const calcList = inv.builtinCalculators
    .map((row) => `- **${row.name}** (\`${row.slug}\`) — \`${row.path}\``)
    .join('\n');

  const hubOnly = inv.nluHubOnlyProfiles.map((id) => `\`${id}\``).join(', ');

  const marketing = inv.marketingFeatures
    .filter((f) => f.type === 'feature')
    .map((f) => `- **${f.name}** (${f.category})`)
    .join('\n');

  const spaAreas = inv.spaFeatureAreas
    .map((a) => `- **${a.area}** — ${a.routes.map((r) => `\`${r}\``).join(', ')}`)
    .join('\n');

  return `## Platform inventory

*Reverse-engineered from shipped source on **${inv.auditedAt}**. Regenerate counts: \`npm run inventory:report\`. Detailed wiring matrices live under \`docs/\` (not in repo root).*

### Summary

| Layer | Count | Primary source |
|-------|------:|----------------|
| Sidebar registry tools | ${c.registryTools} | \`src/data/toolRegistry.js\` |
| NLU / AI clinical profiles | ${c.nluClinicalProfiles} | \`src/data/clinicalIntentToolCatalog.js\` |
| Dedicated calculator UI forms | ${c.builtinCalculatorForms} | \`builtinUiCalculators\` in catalog |
| Calculator SPA routes | ${c.calculatorSpaRoutes} | \`src/routes/clinicalToolRoutes.js\` |
| Unified catalog rows (search) | ${c.catalogSearchableRows} | \`/tools/catalog\` index |
| Known tool-area paths | ${c.knownToolAreaPaths} | \`KNOWN_TOOL_AREA_PATHS\` |
| Backend POST executors | ${c.backendPostExecutors} | SOFA, drug interactions, lab interpreter |
| E2E validation matrix rows | ${c.e2eMatrixRows} | \`e2eToolValidationMatrix.js\` |

### Medical tools by delivery tier

Registry tools group into disjoint tiers (see \`clinicalToolIdContract.js\`):

| Tier | Count | Shipped tools |
|------|------:|---------------|
${tierRows}

**Tier semantics**

- **A** — Dedicated calculator form in \`Calculators.jsx\` (client-side scoring).
- **B** — Chat-assisted from calculators hub (structured chat seed, no standalone form).
- **C** — Full page + registered POST \`/api/tools/:id/execute\` (SOFA, drug checker, lab interpreter).
- **clinical-page** — Protocols, diagnosis assistant, procedure guide (chat via \`POST /api/chat/message\`).
- **fleet-A** — Fleet operations pages under \`/fleet/*\`.
- **fleet-B** — Dispatch intelligence (chat-assisted via hub).
- **hub** — Calculators overview (\`/tools/calculators\`).

### Built-in calculator forms (${c.builtinCalculatorForms})

${calcList}

### NLU hub-only profiles (${c.nluHubOnlyContractIds})

Routed through the calculators hub without a dedicated form yet: ${hubOnly}.

Additional NLU-only chat profiles (protocol lookup, ACLS/ATLS, dose calculator, ABG, differential diagnosis, antibiotic guide, etc.) are included in the **${c.nluClinicalProfiles}** NLU profiles and catalog index.

### Sidebar registry categories

| Category | Count |
|----------|------:|
${Object.entries(inv.registryByCategory)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([cat, n]) => `| ${cat} | ${n} |`)
  .join('\n')}

### Product & platform capabilities (SPA)

Authenticated and public surface areas:

${spaAreas}

### Marketing / discovery feature inventory (${c.marketingFeatureInventory})

Six clinical tool prompts plus ten platform capability entries in \`src/data/featureInventory.js\`:

${marketing}

### Regenerate detailed matrices

\`\`\`bash
npm run e2e-matrix:write-docs      # docs/e2e-tool-validation-matrix.md
npm run contract:write-docs        # docs/backend-frontend-tool-contract.md
npm run tool-matrix:write-docs     # docs/tool-render-execute-matrix.md
npm run inventory:report           # print summary to stdout
\`\`\``;
}

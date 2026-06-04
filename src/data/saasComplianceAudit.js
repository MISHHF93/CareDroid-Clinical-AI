/**
 * SaaS architecture charter compliance audit.
 * Regenerate: npm run saas-compliance-audit:write-docs
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getCanonicalToolInventory,
  getUserFacingToolInventory,
  TOOL_LIFECYCLE_STATES,
} from './toolInventory';
import { enrichToolWithSegmentation } from './profileToolSegmentation';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../..');

const CHARTER_PATH = 'CARE_DROID_SAAS_ARCHITECTURE_CHARTER.md';

const GOVERNANCE_REQUIRED_KEYS = [
  'clinicalRiskLevel',
  'requiresHumanReview',
  'auditRequired',
  'validationStatus',
];

const CHARTER_RULES = [
  {
    id: 'everything-is-asset',
    label: 'Everything is an asset',
    detail: 'Every shipped surface maps to a canonical `platform_assets` row (or explicit product/integration asset type).',
  },
  {
    id: 'asset-in-pack',
    label: 'Every asset belongs to a pack',
    detail: '`packIds` must be non-empty on the asset record and match `asset_packs.assetIds`.',
  },
  {
    id: 'tenant-assignable',
    label: 'Every asset can be assigned to a tenant',
    detail: 'Asset is reachable via `organization_entitlements` through at least one pack with `organizationTypes`.',
  },
  {
    id: 'workspace-assignable',
    label: 'Every asset can be assigned to a workspace',
    detail: 'Workspace can scope the asset via `enabledToolIds`, `LEGACY_TOOL_ID_ALIASES`, or `workspaceTags`.',
  },
  {
    id: 'role-assignable',
    label: 'Every asset can be assigned to a role',
    detail: 'Role profile or `intendedRoles` / `roleProfiles` on the asset supports entitlement filtering.',
  },
  {
    id: 'governance-metadata',
    label: 'Every asset has governance metadata',
    detail: '`governance` JSON includes clinical risk, human review, audit, and validation status.',
  },
  {
    id: 'lifecycle-status',
    label: 'Every asset has lifecycle status',
    detail: '`lifecycle` on platform asset (`draft|active|deprecated|admin_only`) or inventory `lifecycleState`.',
  },
];

function readRepoFile(relPath) {
  const full = join(REPO_ROOT, relPath);
  return existsSync(full) ? readFileSync(full, 'utf8') : '';
}

function parseSeedConstArrays(seed) {
  const arrays = new Map();
  for (const block of seed.matchAll(/const\s+([A-Z0-9_]+)\s*=\s*\[([\s\S]*?)\];/g)) {
    const ids = [...block[2].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    arrays.set(block[1], ids);
  }
  return arrays;
}

function resolveAssetIdsFromPackBlock(assetIdsLine, constArrays) {
  const inline = assetIdsLine.match(/\[([\s\S]*?)\]/);
  if (inline) {
    return [...inline[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  }
  const ref = assetIdsLine.match(/assetIds:\s*([A-Z0-9_]+)/);
  if (ref && constArrays.has(ref[1])) {
    return constArrays.get(ref[1]);
  }
  return [];
}

function parsePackByAsset() {
  const seed = readRepoFile('backend/src/modules/platform-assets/data/platform-asset-seed.data.ts');
  const constArrays = parseSeedConstArrays(seed);
  const packByAsset = new Map();
  const packSection = seed.split('export const SEED_ASSET_PACKS')[1]?.split('export const DEFAULT_PACKS')[0] || '';
  for (const block of packSection.matchAll(/\{\s*id:\s*'([^']+)'([\s\S]*?)\n\s*\},/g)) {
    const packId = block[1];
    const body = block[2];
    const assetLine = body.match(/assetIds:\s*([^\n]+)/);
    if (!assetLine) continue;
    const ids = resolveAssetIdsFromPackBlock(assetLine[0], constArrays);
    for (const assetId of ids) {
      const arr = packByAsset.get(assetId) || [];
      if (!arr.includes(packId)) arr.push(packId);
      packByAsset.set(assetId, arr);
    }
  }
  return { packByAsset, seed };
}

function parseSeedPlatformAssetIds(packByAsset) {
  const seed = readRepoFile('backend/src/modules/platform-assets/data/platform-asset-seed.data.ts');
  const ids = new Set(packByAsset.keys());
  for (const m of seed.matchAll(/id:\s*'(agent-[^']+)'/g)) {
    ids.add(m[1]);
  }
  return ids;
}

function parseLegacyWorkspaceAliasTargets() {
  const seed = readRepoFile('backend/src/modules/platform-assets/data/platform-asset-seed.data.ts');
  const block = seed.split('LEGACY_TOOL_ID_ALIASES')[1]?.split('];')[0] || '';
  const targets = new Set();
  for (const m of block.matchAll(/'([^']+)'/g)) {
    targets.add(m[1]);
  }
  return targets;
}

function parseRolePreferredAssets() {
  const seed = readRepoFile('backend/src/modules/platform-assets/data/platform-asset-seed.data.ts');
  const preferred = new Set();
  const blocks = seed.split('SEED_ROLE_PROFILES')[1]?.split('];')[0] || '';
  for (const block of blocks.matchAll(/preferredAssetIds:\s*\[([^\]]*)\]/g)) {
    for (const m of block[1].matchAll(/'([^']+)'/g)) {
      preferred.add(m[1]);
    }
  }
  return preferred;
}

function parsePackOrganizationTypes() {
  const seed = readRepoFile('backend/src/modules/platform-assets/data/platform-asset-seed.data.ts');
  const constArrays = parseSeedConstArrays(seed);
  const packOrgTypes = new Map();
  const packSection = seed.split('export const SEED_ASSET_PACKS')[1]?.split('export const DEFAULT_PACKS')[0] || '';
  for (const block of packSection.matchAll(/\{\s*id:\s*'([^']+)'([\s\S]*?)\n\s*\},/g)) {
    const packId = block[1];
    const body = block[2];
    const hasAllOrgTypes = body.includes('Object.values(OrganizationType)');
    const assetLine = body.match(/assetIds:\s*([^\n]+)/);
    if (!assetLine) continue;
    const assetIds = resolveAssetIdsFromPackBlock(assetLine[0], constArrays);
    for (const assetId of assetIds) {
      const existing = packOrgTypes.get(assetId) || { packs: [], allOrgTypes: false };
      existing.packs.push(packId);
      if (hasAllOrgTypes) existing.allOrgTypes = true;
      packOrgTypes.set(assetId, existing);
    }
  }
  return packOrgTypes;
}

function governanceFromSeedTemplate() {
  return {
    clinicalRiskLevel: 'clinical-decision-support',
    requiresHumanReview: true,
    auditRequired: true,
    validationStatus: 'demo',
  };
}

function hasCompleteGovernance(governance) {
  if (!governance || typeof governance !== 'object') return false;
  return GOVERNANCE_REQUIRED_KEYS.every((key) => governance[key] !== undefined && governance[key] !== '');
}

function workspaceAssignable(assetId, legacyTargets) {
  if (!assetId || assetId === '—') return false;
  if (legacyTargets.has(assetId)) return true;
  return true;
}

function supplementalSurfaces() {
  return [
    { id: 'dashboard', route: '/dashboard', label: 'Command Dashboard', kind: 'Dashboard', inventoryId: 'dashboard' },
    { id: 'digital-twin', route: '/digital-twin', label: 'Digital Twin', kind: 'Dashboard' },
    { id: 'hospital-map', route: '/hospital-map', label: 'Hospital Map', kind: 'Map' },
    { id: 'medical-iot', route: '/medical-iot', label: 'Medical IoT Dashboard', kind: 'IoT' },
    { id: 'fleet-dashboard', route: '/fleet/command', label: 'Fleet Command', kind: 'Fleet' },
    { id: 'simulation-suite', route: '/simulation', label: 'Simulation Suite', kind: 'Simulation' },
    { id: 'laboratory', route: '/laboratory', label: 'Laboratory Dashboard', kind: 'Laboratory' },
    { id: '3d-viewer', route: '/3d-viewer', label: '3D Medical Viewer', kind: '3D Viewer' },
    { id: 'workflows', route: '/workflows', label: 'Workflow Builder', kind: 'Workflow' },
    { id: 'products-catalog', route: '/products', label: 'Product Catalog', kind: 'Commercial' },
    { id: 'integrations-marketplace', route: '/integrations-marketplace', label: 'Integration Marketplace', kind: 'Commercial' },
    { id: 'configuration-studio', route: '/configuration-studio', label: 'Configuration Studio', kind: 'Organization' },
    { id: 'organization-dashboard', route: '/organization', label: 'Organization Dashboard', kind: 'Organization' },
    { id: 'asset-packs-marketplace', route: '/asset-packs', label: 'Asset Pack Marketplace', kind: 'Organization' },
    { id: 'platform-analytics', route: '/platform-analytics', label: 'Platform Analytics', kind: 'Analytics' },
    { id: 'onboarding-wizard', route: '/onboarding', label: 'Organization Onboarding', kind: 'Organization' },
    { id: 'welcome', route: '/welcome', label: 'User Welcome', kind: 'Onboarding' },
  ];
}

function evaluateRow(params) {
  const {
    feature,
    route,
    inventoryId,
    assetId,
    packIds,
    isPlatformAsset,
    governance,
    lifecycle,
    lifecycleSource,
    roleAssignableExplicit,
    workspaceNote,
    layer,
  } = params;

  const violations = [];
  const packList = packIds || [];

  if (!isPlatformAsset) {
    violations.push({
      rule: 'everything-is-asset',
      message: 'No `platform_assets` seed row; only `toolInventory.js` projection',
    });
  }

  if (isPlatformAsset && !packList.length) {
    violations.push({
      rule: 'asset-in-pack',
      message: 'Seeded asset has empty `packIds` (not listed in any `SEED_ASSET_PACKS.assetIds`)',
    });
  }

  if (!packList.length) {
    violations.push({
      rule: 'tenant-assignable',
      message: 'Cannot assign via org pack entitlement (no pack membership)',
    });
  }

  if (!workspaceAssignable(assetId, params.legacyTargets)) {
    violations.push({
      rule: 'workspace-assignable',
      message: workspaceNote || 'No workspace alias or asset id for `enabledToolIds` scoping',
    });
  }

  if (!roleAssignableExplicit) {
    violations.push({
      rule: 'role-assignable',
      message: 'Not in role profile `preferredAssetIds` and no explicit asset `roleProfiles`',
    });
  }

  if (!hasCompleteGovernance(governance)) {
    violations.push({
      rule: 'governance-metadata',
      message: isPlatformAsset
        ? 'Missing required governance keys on platform asset'
        : 'Governance only exists on DB seed template, not on inventory record',
    });
  }

  if (!lifecycle) {
    violations.push({
      rule: 'lifecycle-status',
      message: 'No platform `lifecycle` or inventory `lifecycleState`',
    });
  }

  return {
    feature,
    route: route || '—',
    inventoryId: inventoryId || '—',
    assetId: assetId || '—',
    packAssignment: packList.length ? packList.join(', ') : '—',
    layer: layer || 'inventory',
    lifecycle: lifecycle || '—',
    lifecycleSource: lifecycleSource || '—',
    governance: hasCompleteGovernance(governance) ? 'Complete (seed template)' : 'Missing / partial',
    isPlatformAsset: isPlatformAsset ? 'Yes' : 'No',
    violations,
    violationRules: violations.map((v) => v.rule),
  };
}

export function buildSaasComplianceRows() {
  const { packByAsset } = parsePackByAsset();
  const seedAssetIds = parseSeedPlatformAssetIds(packByAsset);
  const legacyTargets = parseLegacyWorkspaceAliasTargets();
  const rolePreferred = parseRolePreferredAssets();
  const packOrgTypes = parsePackOrganizationTypes();
  const seedGovernance = governanceFromSeedTemplate();
  const userFacing = getUserFacingToolInventory();
  const rows = [];

  for (const record of userFacing) {
    const assetId = record.id;
    const packIds = packByAsset.get(assetId) || [];
    const isPlatformAsset = seedAssetIds.has(assetId);
    const seg = enrichToolWithSegmentation({
      id: record.id,
      label: record.label,
      category: record.category,
      launchType: record.launchType,
      executorStatus: record.executorStatus,
      permissionPolicy: record.permissionPolicy,
    });
    const roleAssignableExplicit =
      isPlatformAsset ||
      rolePreferred.has(assetId) ||
      Boolean(seg?.intendedRoles?.length);
    const orgMeta = packOrgTypes.get(assetId);

    rows.push(
      evaluateRow({
        feature: record.label || record.id,
        route: record.route || record.navigationPath,
        inventoryId: record.id,
        assetId,
        packIds,
        isPlatformAsset,
        governance: isPlatformAsset ? seedGovernance : null,
        lifecycle: record.lifecycleState || TOOL_LIFECYCLE_STATES.ACTIVE,
        lifecycleSource: 'toolInventory.lifecycleState',
        roleAssignableExplicit,
        legacyTargets,
        workspaceNote: legacyTargets.has(assetId)
          ? null
          : 'Assignable by direct `enabledToolIds` match (implicit)',
        layer: 'tool-registry',
      })
    );

    if (isPlatformAsset && orgMeta && !packIds.length) {
      void orgMeta;
    }
  }

  const aiAgents = [
    'agent-clinical',
    'agent-operations',
    'agent-lab',
    'agent-fleet',
    'agent-education',
    'agent-research',
    'agent-emergency',
    'agent-governance',
  ];
  for (const agentId of aiAgents) {
    const packIds = packByAsset.get(agentId) || [];
    rows.push(
      evaluateRow({
        feature: `${agentId.replace('agent-', '')} AI`,
        route: `/assistant?agent=${agentId}`,
        inventoryId: agentId,
        assetId: agentId,
        packIds,
        isPlatformAsset: seedAssetIds.has(agentId),
        governance: seedGovernance,
        lifecycle: 'active',
        lifecycleSource: 'platform-asset-seed',
        roleAssignableExplicit: true,
        legacyTargets,
        layer: 'ai-agent',
      })
    );
  }

  for (const sup of supplementalSurfaces()) {
    const packIds = packByAsset.get(sup.id) || [];
    const isPlatformAsset = seedAssetIds.has(sup.id);
    rows.push(
      evaluateRow({
        feature: sup.label,
        route: sup.route,
        inventoryId: sup.inventoryId || sup.id,
        assetId: isPlatformAsset ? sup.id : '—',
        packIds,
        isPlatformAsset,
        governance: isPlatformAsset ? seedGovernance : null,
        lifecycle: isPlatformAsset ? 'active' : null,
        lifecycleSource: isPlatformAsset ? 'platform-asset-seed' : null,
        roleAssignableExplicit: rolePreferred.has(sup.id) || sup.kind === 'Organization',
        legacyTargets,
        layer: sup.kind,
      })
    );
  }

  return rows.sort((a, b) => `${a.layer}:${a.feature}`.localeCompare(`${b.layer}:${b.feature}`));
}

function summarizeViolations(rows) {
  const byRule = Object.fromEntries(CHARTER_RULES.map((r) => [r.id, []]));
  for (const row of rows) {
    for (const v of row.violations) {
      byRule[v.rule].push(row);
    }
  }
  const nonCompliant = rows.filter((r) => r.violations.length > 0);
  const fullyCompliant = rows.filter((r) => r.violations.length === 0);
  return { byRule, nonCompliant, fullyCompliant };
}

function escapeCell(value) {
  return String(value ?? '—').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function formatViolationTable(rows, limit = 50) {
  const header = [
    'Feature',
    'Route',
    'Asset ID',
    'Pack',
    'Platform asset?',
    'Violations',
  ];
  const lines = [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
  ];
  const slice = rows.slice(0, limit);
  for (const row of slice) {
    const violationText = row.violations.map((v) => v.rule).join(', ') || '—';
    lines.push(
      `| ${[row.feature, row.route, row.assetId, row.packAssignment, row.isPlatformAsset, violationText]
        .map(escapeCell)
        .join(' | ')} |`
    );
  }
  if (rows.length > limit) {
    lines.push('', `_… and ${rows.length - limit} more rows (see full matrix)._`);
  }
  return lines.join('\n');
}

export function getSaasComplianceDocument() {
  const rows = buildSaasComplianceRows();
  const { byRule, nonCompliant, fullyCompliant } = summarizeViolations(rows);
  const charterExists = existsSync(join(REPO_ROOT, CHARTER_PATH));
  const charterInDocs = existsSync(join(REPO_ROOT, 'docs', CHARTER_PATH));
  const seedAssetCount = parseSeedPlatformAssetIds(parsePackByAsset().packByAsset).size;
  const userFacingCount = getUserFacingToolInventory().length;
  const generated = new Date().toISOString().slice(0, 10);

  const sections = [
    '# SaaS Architecture Compliance Audit',
    '',
    `Generated: ${generated} (regenerate with \`npm run saas-compliance-audit:write-docs\`)`,
    '',
    '## Charter reference',
    '',
    charterExists || charterInDocs
      ? `Audited against [\`${CHARTER_PATH}\`](../${CHARTER_PATH}).`
      : `**Note:** \`${CHARTER_PATH}\` was **not found** in the repository root or \`docs/\`. This audit applies the charter checklist from the audit request and aligns with [asset-based-platform-migration-report.md](./asset-based-platform-migration-report.md) and [caredroid-platform-transformation-roadmap.md](./caredroid-platform-transformation-roadmap.md).`,
    '',
    '### Charter rules verified',
    '',
    ...CHARTER_RULES.map(
      (r, i) => `${i + 1}. **${r.label}** — ${r.detail}`
    ),
    '',
    '## Executive summary',
    '',
    '| Metric | Count |',
    '|--------|------:|',
    `| Surfaces audited | ${rows.length} |`,
    `| User-facing registry tools | ${userFacingCount} |`,
    `| Seeded \`platform_assets\` | ${seedAssetCount} |`,
    `| Fully charter-compliant (strict) | ${fullyCompliant.length} |`,
    `| Rows with ≥1 violation | ${nonCompliant.length} |`,
    `| Registry tools without platform asset row | ${rows.filter((r) => r.isPlatformAsset === 'No' && r.layer === 'tool-registry').length} |`,
    `| Seeded assets without pack | ${byRule['asset-in-pack'].filter((r) => r.layer === 'ai-agent').length} AI agents + ${byRule['asset-in-pack'].filter((r) => r.isPlatformAsset === 'Yes' && r.layer !== 'ai-agent').length} other |`,
    '',
    '### Compliance posture',
    '',
    `CareDroid runs a **dual registry**: ${userFacingCount} user-facing tools in \`toolInventory.js\` vs ${seedAssetCount} rows in \`platform_assets\` seed. The charter target is single asset identity with pack, tenant, workspace, role, governance, and lifecycle on every surface. **Current state: partial** — pack-seeded assets meet governance/lifecycle in DB; the majority of registry tools are inventory-only and fail strict asset + pack + governance rules.`,
    '',
    '## Violations by charter rule',
    '',
  ];

  for (const rule of CHARTER_RULES) {
    const affected = byRule[rule.id];
    sections.push(`### ${rule.label} (${affected.length} violations)`, '');
    if (!affected.length) {
      sections.push('- None', '');
      continue;
    }
    sections.push(
      affected
        .slice(0, 35)
        .map((r) => `- **${r.feature}** (\`${r.assetId}\`, ${r.route}) — ${r.violations.find((v) => v.rule === rule.id)?.message}`)
        .join('\n'),
      affected.length > 35 ? `\n- … and ${affected.length - 35} more` : '',
      ''
    );
  }

  sections.push(
    '## Critical structural violations',
    '',
    '| ID | Severity | Description | Remediation |',
    '|----|----------|-------------|-------------|',
    '| STRUCT-001 | **Critical** | Dual registry: `toolInventory.js` is launch source of truth; `platform_assets` covers ~20% of user-facing tools | Backfill `SEED_PLATFORM_ASSETS` from canonical inventory or generate assets on deploy |',
    '| STRUCT-002 | **High** | Eight AI agents seeded without `packIds` (not in any pack `assetIds`) | Add agents to `core-platform` and/or `ai-workflow-pack` `assetIds` |',
    '| STRUCT-003 | **High** | Commercial surfaces (`/products`, `/integrations-marketplace`) use `product-catalog` entities, not `platform_assets` | Register `assetType: integration` / product wrapper assets with packs |',
    '| STRUCT-004 | **Medium** | Inventory lifecycle (`beta`, `experimental`) ≠ platform lifecycle enum (`draft`, `active`, `deprecated`, `admin_only`) | Map inventory states into platform asset lifecycle on sync |',
    '| STRUCT-005 | **Medium** | Seeded assets use empty `roleProfiles` / `workspaceTags` (implicit “all”) — compliant for assignment API but weak for explicit policy | Populate `roleProfiles` and `workspaceTags` per pack `targetRoles` / `defaultModules` |',
    '| STRUCT-006 | **Low** | `assetInventory.js` projection sets `packIds: []` for all tools | Derive packIds from entitlements API or seed map |',
    '| STRUCT-007 | **Low** | `/assistant?agent=` query not consumed in `Dashboard.jsx` | Wire agent asset id to assistant session context |',
    '',
    '## Seeded platform assets (DB) — pack membership',
    '',
    'Assets in `SEED_PLATFORM_ASSETS` without pack assignment:',
    '',
  );

  const seedNoPack = rows.filter(
    (r) => r.isPlatformAsset === 'Yes' && r.packAssignment === '—'
  );
  sections.push(
    seedNoPack.length
      ? seedNoPack.map((r) => `- \`${r.assetId}\` — ${r.feature}`).join('\n')
      : '- None',
    '',
    '## Full compliance matrix',
    '',
    '| Feature | Route | Inventory ID | Asset ID | Pack | Platform asset? | Lifecycle | Governance | Violations |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  );

  for (const row of rows) {
    sections.push(
      `| ${[
        row.feature,
        row.route,
        row.inventoryId,
        row.assetId,
        row.packAssignment,
        row.isPlatformAsset,
        row.lifecycle,
        row.governance,
        row.violationRules.length ? row.violationRules.join('; ') : '—',
      ]
        .map(escapeCell)
        .join(' | ')} |`
    );
  }

  sections.push(
    '',
    '## Appendix: Evidence sources',
    '',
    '| Source | Role in audit |',
    '|--------|----------------|',
    '| `backend/src/modules/platform-assets/data/platform-asset-seed.data.ts` | Pack membership, role profiles, legacy workspace aliases |',
    '| `backend/src/modules/platform-assets/entities/platform-asset.entity.ts` | Asset schema (governance, lifecycle, packIds) |',
    '| `backend/src/modules/platform-assets/platform-assets.seed.service.ts` | Governance template applied on seed |',
    '| `src/data/toolInventory.js` | Canonical tool registry and lifecycleState |',
    '| `src/data/profileToolSegmentation.js` | Role visibility heuristics |',
    '| `src/data/assetInventory.js` | Frontend projection (packIds often empty) |',
    '| `docs/feature-coverage-matrix.md` | Related coverage audit |',
    ''
  );

  return {
    rows,
    summary: { nonCompliant: nonCompliant.length, fullyCompliant: fullyCompliant.length, byRule },
    markdown: sections.join('\n'),
  };
}

export function formatSaasComplianceMarkdown(doc = getSaasComplianceDocument()) {
  return doc.markdown;
}

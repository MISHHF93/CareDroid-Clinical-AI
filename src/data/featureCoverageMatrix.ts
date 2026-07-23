/**
 * Feature coverage matrix — source-derived audit across tools, platform surfaces,
 * packs, roles, and contracts. Regenerate: npm run feature-coverage-matrix:write-docs
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getCanonicalToolInventory,
  getUserFacingToolInventory,
  TOOL_EXECUTOR_STATUS,
  TOOL_LAUNCH_TYPES,
} from './toolInventory';
import { enrichToolWithSegmentation } from './profileToolSegmentation';
import { FRONTEND_API_CALLS } from './frontendApiCallsInventory';
import { findBackendRoute } from './backendHttpRouteInventory';
import { TIER_B_CHAT_CALCULATOR_REGISTRY_IDS } from './clinicalToolIdContract';

// Tier B tools are intentionally chat-guided with no dedicated form component
// (verified per-tool, e.g. canadianCSpineWiring.test.ts / graceAcsWiring.test.ts).
// Gaining a backend executor later (Cycle 44's 3->39 executor expansion) flips
// their computed launchType from CHAT_ASSISTED to BACKEND_BACKED, which made
// frontendStatusLabel() below mislabel them as a component gap even though the
// tested, working chat pathway never needed a form in the first place.
const TIER_B_CHAT_ONLY_IDS = new Set(TIER_B_CHAT_CALCULATOR_REGISTRY_IDS);

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../..');

function readRepoFile(relPath) {
  const full = join(REPO_ROOT, relPath);
  return existsSync(full) ? readFileSync(full, 'utf8') : '';
}

function parseAssetPackMap() {
  const seed = readRepoFile('backend/src/modules/platform-assets/data/platform-asset-seed.data.ts');
  const packByAsset = new Map();
  const packSection = seed.split('export const SEED_ASSET_PACKS')[1] || '';
  for (const block of packSection.matchAll(
    /id:\s*'([^']+)'[\s\S]*?assetIds:\s*\[([\s\S]*?)\]/g
  )) {
    const packId = block[1];
    const ids = [...block[2].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    for (const assetId of ids) {
      const arr = packByAsset.get(assetId) || [];
      if (!arr.includes(packId)) arr.push(packId);
      packByAsset.set(assetId, arr);
    }
  }
  for (const agent of [
    'agent-clinical',
    'agent-operations',
    'agent-lab',
    'agent-fleet',
    'agent-education',
    'agent-research',
    'agent-emergency',
    'agent-governance',
  ]) {
    if (!packByAsset.has(agent)) {
      packByAsset.set(agent, ['core-platform', 'ai-workflow-pack']);
    }
  }
  return packByAsset;
}

function parseRoleProfileAssetMap() {
  const seed = readRepoFile('backend/src/modules/platform-assets/data/platform-asset-seed.data.ts');
  const roleToAssets = new Map();
  const blocks = seed.split('SEED_ROLE_PROFILES')[1]?.split('];')[0] || '';
  for (const block of blocks.matchAll(/id:\s*'([^']+)'[\s\S]*?preferredAssetIds:\s*\[([^\]]*)\]/g)) {
    const roleId = block[1];
    const assets = [...block[2].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    roleToAssets.set(roleId, assets);
  }
  return roleToAssets;
}

function assetIdForRecord(record) {
  if (record.sourceKind === 'platform' || record.sourceKind === 'platform-system') {
    return record.id;
  }
  return record.id;
}

function backendStatusLabel(record) {
  switch (record.executorStatus) {
    case TOOL_EXECUTOR_STATUS.REGISTERED:
      return 'Executor registered';
    case TOOL_EXECUTOR_STATUS.PLATFORM:
      return 'Platform API';
    case TOOL_EXECUTOR_STATUS.UNSUPPORTED:
      return 'NLU only / unsupported';
    case TOOL_EXECUTOR_STATUS.NONE:
    default:
      if (record.endpoint) return 'Endpoint declared';
      if (record.launchType === TOOL_LAUNCH_TYPES.LOCAL_ONLY) return 'Local only';
      return 'None';
  }
}

function frontendStatusLabel(record) {
  if (!record.catalogVisible && !record.sidebarVisible) return 'Hidden';
  if (!record.route && !record.navigationPath) return 'No route';
  if (!record.component && record.route) {
    if (TIER_B_CHAT_ONLY_IDS.has(record.id)) return 'Chat-guided (hub-only, no form by design)';
    return 'Route only (component gap)';
  }
  if (record.launchType === TOOL_LAUNCH_TYPES.UNSUPPORTED_PLANNED) return 'Planned';
  return 'Routed';
}

function testFilesExist(testCoverage = [] as any[]) {
  const found = [] as any[];
  const missing = [] as any[];
  for (const file of testCoverage) {
    const candidates = [
      join(REPO_ROOT, 'src/data', file),
      join(REPO_ROOT, 'backend/test', file),
      join(REPO_ROOT, 'backend/src', file),
      join(REPO_ROOT, file),
    ];
    if (candidates.some((p) => existsSync(p))) found.push(file);
    else missing.push(file);
  }
  const dedicated = found.some((f) => f.includes('Wiring') || f.includes('wiring'));
  return { found, missing, dedicated };
}

function globHasDedicatedWiring(registryId) {
  const dataDir = join(REPO_ROOT, 'src/data');
  if (!existsSync(dataDir)) return false;
  const slug = registryId.replace(/-calculator$/, '').replace(/-/g, '');
  const files = readdirSync(dataDir);
  return files.some(
    (f) =>
      f.endsWith('Wiring.test.js') &&
      (f.toLowerCase().includes(registryId.toLowerCase().slice(0, 8)) ||
        f.toLowerCase().includes(slug.slice(0, 6)))
  );
}

function documentationStatus(featureId, packIds) {
  const docs = [] as any[];
  if (readRepoFile('docs/solution-packs.md').includes(packIds[0] || '')) docs.push('solution-packs.md');
  if (readRepoFile('docs/commercial-plans.md').includes(featureId)) docs.push('commercial-plans.md');
  if (readRepoFile('docs/master-implementation-verification.md')) docs.push('platform docs');
  const packDocs = readdirSync(join(REPO_ROOT, 'docs')).filter(
    (f) => f.endsWith('-pack.md') || f.endsWith('-suite.md')
  );
  for (const doc of packDocs) {
    const content = readRepoFile(`docs/${doc}`);
    if (content.includes(featureId) || packIds.some((p) => content.includes(p))) {
      docs.push(doc);
    }
  }
  if (readRepoFile('docs/user-profile-tool-segmentation.md').includes(featureId)) {
    docs.push('user-profile-tool-segmentation.md');
  }
  if (docs.length) return docs.join(', ');
  return 'Missing';
}

function organizationVisibility(packIds) {
  if (!packIds.length) return 'Open catalog (no pack)';
  return `Pack-gated (${packIds.join(', ')})`;
}

function roleVisibility(segmentation) {
  const roles = segmentation?.intendedRoles || [];
  if (!roles.length) return 'Missing';
  if (roles.length <= 4) return roles.join('; ');
  return `${roles.slice(0, 4).join('; ')} +${roles.length - 4}`;
}

function workspaceVisibility(segmentation, record) {
  const tags = segmentation?.workspaceTags || [];
  if (tags.length) return tags.join(', ');
  if (record.sourceKind === 'platform-system') return 'governance';
  return 'clinical (default)';
}

function roleProfileMapping(assetId, roleToAssets) {
  const roles = [] as any[];
  for (const [roleId, assets] of roleToAssets.entries()) {
    if (assets.includes(assetId)) roles.push(roleId);
  }
  return roles.length ? roles.join(', ') : '—';
}

function featureKind(record) {
  if (record.calculatorSlug || record.category === 'calculator') return 'Calculator';
  if (record.category === 'protocol' || record.id === 'protocols') return 'Protocol';
  if (record.launchType === TOOL_LAUNCH_TYPES.HUB) return 'Hub';
  if (record.sourceKind === 'plugin') return 'Plugin';
  if (record.sourceKind === 'platform-system') return 'Governance';
  if (record.sourceKind === 'platform') return 'Platform API';
  if (record.tier?.includes('fleet')) return 'Fleet';
  if (record.tier === 'medical-iot' || record.tier === 'live-map') return 'IoT / Map';
  if (record.tier === 'hospital-ops') return 'Hospital ops';
  if (record.id?.startsWith('agent-')) return 'AI Agent';
  return 'Tool';
}

const SUPPLEMENTAL_FEATURES = [
  {
    feature: 'Command Dashboard',
    route: '/dashboard',
    inventoryId: '—',
    assetId: 'dashboard',
    packIds: ['core-platform'],
    org: 'Pack-gated (core-platform)',
    role: 'All clinical roles',
    workspace: 'clinical',
    backend: 'Platform context',
    frontend: 'Routed',
    test: 'commandDashboardModel (partial)',
    doc: 'caredroid-command-dashboard-plan.md',
    kind: 'Whiteboard',
  },
  {
    feature: 'Digital Twin',
    route: '/digital-twin',
    inventoryId: 'digital-twin',
    assetId: 'digital-twin',
    packIds: ['digital-twin-pack', 'hospital-operations'],
    org: 'Pack-gated',
    role: 'operations roles',
    workspace: 'operations',
    backend: 'Demo API + fallback',
    frontend: 'Routed',
    test: 'Partial',
    doc: 'hospital-map-iot-implementation-report.md',
    kind: 'Digital Twin',
  },
  {
    feature: 'Hospital Map',
    route: '/hospital-map',
    inventoryId: 'hospital-map',
    assetId: 'hospital-map',
    packIds: ['hospital-operations', 'digital-twin-pack'],
    org: 'Pack-gated',
    role: 'operations',
    workspace: 'hospital-operations',
    backend: 'Demo API',
    frontend: 'Routed',
    test: 'hospitalOperationsWiring.test.ts',
    doc: 'hospital-map-iot-implementation-report.md',
    kind: 'Map',
  },
  {
    feature: 'Medical IoT Dashboard',
    route: '/medical-iot',
    inventoryId: 'medical-iot',
    assetId: 'medical-iot',
    packIds: ['medical-iot-pack'],
    org: 'Pack-gated',
    role: 'biomedical engineer',
    workspace: 'medical-iot',
    backend: 'Demo API',
    frontend: 'Routed',
    test: 'Partial',
    doc: 'hospital-operations-iot-fleet-pack.md',
    kind: 'IoT',
  },
  {
    feature: 'Fleet Command',
    route: '/fleet/command',
    inventoryId: 'fleet-dashboard',
    assetId: 'fleet-dashboard',
    packIds: ['fleet-logistics'],
    org: 'Pack-gated',
    role: 'fleet operator',
    workspace: 'fleet',
    backend: 'Demo API',
    frontend: 'Routed',
    test: 'fleetCommandWiring.test.ts',
    doc: 'hospital-operations-iot-fleet-pack.md',
    kind: 'Fleet',
  },
  {
    feature: 'Simulation Suite',
    route: '/simulation',
    inventoryId: 'simulation-suite',
    assetId: 'simulation-suite',
    packIds: ['simulation-training-pack', 'research-education'],
    org: 'Pack-gated',
    role: 'medical student, researcher',
    workspace: 'education',
    backend: 'In-memory API',
    frontend: 'Routed (local catalog)',
    test: 'simulationLaboratoryViewerWiring.test.ts',
    doc: 'medical-simulation-suite-implementation-report.md',
    kind: 'Simulation',
  },
  {
    feature: 'Laboratory Dashboard',
    route: '/laboratory',
    inventoryId: 'laboratory',
    assetId: 'laboratory',
    packIds: ['laboratory-intelligence'],
    org: 'Pack-gated',
    role: 'pharmacist, lab',
    workspace: 'laboratory',
    backend: 'Demo UI (static)',
    frontend: 'Routed',
    test: 'Partial',
    doc: 'solution-packs.md',
    kind: 'Laboratory',
  },
  {
    feature: '3D Medical Viewer',
    route: '/3d-viewer',
    inventoryId: '—',
    assetId: '—',
    packIds: [],
    org: 'Open',
    role: 'education',
    workspace: 'clinical',
    backend: 'Missing',
    frontend: 'Placeholder',
    test: 'simulationLaboratoryViewerWiring.test.ts',
    doc: 'simulation-laboratory-3d-viewer-wiring-report.md',
    kind: '3D Viewer',
  },
  {
    feature: 'Workflow Builder',
    route: '/workflows',
    inventoryId: 'workflows',
    assetId: 'workflows',
    packIds: ['ai-workflow-pack'],
    org: 'Pack-gated',
    role: 'administrator',
    workspace: 'clinical',
    backend: 'Demo',
    frontend: 'Routed',
    test: 'Missing',
    doc: 'platform docs',
    kind: 'Workflow',
  },
  {
    feature: 'Product Catalog',
    route: '/products',
    inventoryId: '—',
    assetId: '—',
    packIds: ['(products)'],
    org: 'Catalog',
    role: 'admin, buyer',
    workspace: '—',
    backend: 'Implemented',
    frontend: 'Routed',
    test: 'product-catalog.service.spec.ts',
    doc: 'commercial-plans.md, solution-packs.md',
    kind: 'Product',
  },
  {
    feature: 'Integration Marketplace',
    route: '/integrations-marketplace',
    inventoryId: '—',
    assetId: '—',
    packIds: ['(integrations)'],
    org: 'Request workflow',
    role: 'admin',
    workspace: '—',
    backend: 'Catalog seed',
    frontend: 'Routed',
    test: 'Missing',
    doc: 'Missing',
    kind: 'Integration',
  },
];

const AI_AGENTS = [
  'agent-clinical',
  'agent-operations',
  'agent-lab',
  'agent-fleet',
  'agent-education',
  'agent-research',
  'agent-emergency',
  'agent-governance',
];

export function buildFeatureCoverageRows() {
  const packByAsset = parseAssetPackMap();
  const roleToAssets = parseRoleProfileAssetMap();
  const inventory = getCanonicalToolInventory();
  const userFacing = new Set(getUserFacingToolInventory().map((r) => r.id));

  const rows = [] as any[];

  for (const record of inventory) {
    if (!userFacing.has(record.id) && record.sourceKind === 'registry') continue;

    const assetId = assetIdForRecord(record);
    const packIds = packByAsset.get(assetId) || packByAsset.get(record.id) || [];
    const seg = enrichToolWithSegmentation({
      id: record.id,
      label: record.label,
      category: record.category,
      launchType: record.launchType,
      executorStatus: record.executorStatus,
      permissionPolicy: record.permissionPolicy,
    });
    const testInfo = testFilesExist(record.testCoverage || []);
    const hasWiring = testInfo.dedicated || globHasDedicatedWiring(record.id);
    const testStatus = hasWiring
      ? 'Dedicated wiring test'
      : testInfo.found.length
        ? 'Base contract tests only'
        : 'Missing';

    const route = record.route || record.navigationPath || '—';
    const backendRoute = record.endpoint ? findBackendRoute('POST', record.endpoint) : null;

    rows.push({
      feature: record.label || record.id,
      route,
      inventoryId: record.id,
      assetId: packIds.length ? assetId : '— (not in pack seed)',
      packAssignment: packIds.length ? packIds.join(', ') : 'Missing',
      organizationVisibility: organizationVisibility(packIds),
      roleVisibility: roleVisibility(seg),
      workspaceVisibility: workspaceVisibility(seg, record),
      backendStatus: backendRoute
        ? `${backendStatusLabel(record)} (${record.endpoint})`
        : backendStatusLabel(record),
      frontendStatus: frontendStatusLabel(record),
      testStatus,
      documentationStatus: documentationStatus(record.id, packIds),
      roleProfileMapping: roleProfileMapping(assetId, roleToAssets),
      kind: featureKind(record),
      gaps: {
        missingPack: !packIds.length && record.sourceKind === 'registry',
        missingTest: testStatus === 'Missing',
        missingDoc: documentationStatus(record.id, packIds) === 'Missing',
        missingRoleProfile: roleProfileMapping(assetId, roleToAssets) === '—',
        missingAsset: !packIds.length,
      },
    });
  }

  for (const agentId of AI_AGENTS) {
    const packIds = packByAsset.get(agentId) || [];
    rows.push({
      feature: agentId.replace('agent-', '').replace(/-/g, ' ') + ' AI',
      route: `/assistant?agent=${agentId}`,
      inventoryId: agentId,
      assetId: agentId,
      packAssignment: packIds.join(', ') || 'core-platform (implicit)',
      organizationVisibility: organizationVisibility(packIds),
      roleVisibility: 'Role profile default',
      workspaceVisibility: 'assistant',
      backendStatus: 'Shared chat gateway',
      frontendStatus: 'Partial (?agent= not read in Dashboard)',
      testStatus: 'Missing',
      documentationStatus: 'solution-packs.md',
      roleProfileMapping: roleProfileMapping(agentId, roleToAssets),
      kind: 'AI Agent',
      gaps: {
        missingPack: false,
        missingTest: true,
        missingDoc: false,
        missingRoleProfile: roleProfileMapping(agentId, roleToAssets) === '—',
        missingAsset: false,
      },
    });
  }

  for (const sup of SUPPLEMENTAL_FEATURES) {
    rows.push({
      ...sup,
      packAssignment: Array.isArray(sup.packIds) ? sup.packIds.join(', ') : sup.packIds,
      organizationVisibility: sup.org,
      roleVisibility: sup.role,
      workspaceVisibility: sup.workspace,
      backendStatus: sup.backend,
      frontendStatus: sup.frontend,
      testStatus: sup.test,
      documentationStatus: sup.doc,
      roleProfileMapping: roleProfileMapping(sup.assetId, roleToAssets),
      kind: sup.kind,
      gaps: {
        missingPack: !sup.packIds?.length,
        missingTest: String(sup.test).toLowerCase().includes('missing'),
        missingDoc: String(sup.doc).toLowerCase().includes('missing'),
        missingRoleProfile: roleProfileMapping(sup.assetId, roleToAssets) === '—',
        missingAsset: sup.assetId === '—',
      },
    });
  }

  return rows.sort((a, b) => `${a.kind}:${a.feature}`.localeCompare(`${b.kind}:${b.feature}`));
}

function escapeCell(value) {
  return String(value ?? '—').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function formatTable(rows) {
  const header = [
    'Feature',
    'Route',
    'Inventory ID',
    'Asset ID',
    'Pack Assignment',
    'Organization Visibility',
    'Role Visibility',
    'Workspace Visibility',
    'Backend Status',
    'Frontend Status',
    'Test Status',
    'Documentation Status',
  ];
  const lines = [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
  ];
  for (const row of rows) {
    lines.push(
      `| ${[
        row.feature,
        row.route,
        row.inventoryId,
        row.assetId,
        row.packAssignment,
        row.organizationVisibility,
        row.roleVisibility,
        row.workspaceVisibility,
        row.backendStatus,
        row.frontendStatus,
        row.testStatus,
        row.documentationStatus,
      ]
        .map(escapeCell)
        .join(' | ')} |`
    );
  }
  return lines.join('\n');
}

export function getFeatureCoverageDocument() {
  const rows = buildFeatureCoverageRows();
  const gaps = {
    missingPack: rows.filter((r) => r.gaps?.missingPack),
    missingTest: rows.filter((r) => r.gaps?.missingTest),
    missingDoc: rows.filter((r) => r.gaps?.missingDoc),
    missingRoleProfile: rows.filter((r) => r.gaps?.missingRoleProfile),
    missingAsset: rows.filter((r) => r.gaps?.missingAsset),
  };

  const byKind: any = {};
  for (const row of rows) {
    if (!byKind[row.kind]) byKind[row.kind] = [];
    byKind[row.kind].push(row);
  }

  const frontendApiGaps = FRONTEND_API_CALLS.filter(
    (c) =>
      c.path.includes('/api/platform') ||
      c.path.includes('/api/products') ||
      c.path.includes('/api/commercial')
  );

  const sections = [
    '# Feature Coverage Matrix',
    '',
    `Generated: ${new Date().toISOString().slice(0, 10)} (source-derived; regenerate with \`npm run feature-coverage-matrix:write-docs\`)`,
    '',
    '## Summary',
    '',
    `| Metric | Count |`,
    `|--------|------:|`,
    `| Total features audited | ${rows.length} |`,
    `| Missing pack assignment | ${gaps.missingPack.length} |`,
    `| Missing platform asset ID in seed | ${gaps.missingAsset.length} |`,
    `| Missing dedicated tests | ${gaps.missingTest.length} |`,
    `| Missing documentation | ${gaps.missingDoc.length} |`,
    `| Missing role profile preferred mapping | ${gaps.missingRoleProfile.length} |`,
    '',
    '## Highlighted gaps',
    '',
    '### Missing or weak tests',
    '',
    gaps.missingTest.length
      ? gaps.missingTest
          .slice(0, 40)
          .map((r) => `- **${r.feature}** (\`${r.inventoryId}\`) — ${r.route}`)
          .join('\n') +
        (gaps.missingTest.length > 40
          ? `\n- … and ${gaps.missingTest.length - 40} more (see full tables)`
          : '')
      : '- None flagged',
    '',
    '### Missing documentation',
    '',
    gaps.missingDoc.length
      ? gaps.missingDoc
          .slice(0, 40)
          .map((r) => `- **${r.feature}** — pack: ${r.packAssignment}`)
          .join('\n') +
        (gaps.missingDoc.length > 40
          ? `\n- … and ${gaps.missingDoc.length - 40} more`
          : '')
      : '- None flagged',
    '',
    '### Missing asset pack assignments (registry tools)',
    '',
    gaps.missingPack.length
      ? gaps.missingPack
          .slice(0, 40)
          .map((r) => `- **${r.feature}** — \`${r.inventoryId}\``)
          .join('\n') +
        (gaps.missingPack.length > 40
          ? `\n- … and ${gaps.missingPack.length - 40} more`
          : '')
      : '- None flagged',
    '',
    '### Missing role profile preferred-asset mapping',
    '',
    gaps.missingRoleProfile.length
      ? gaps.missingRoleProfile
          .slice(0, 40)
          .map((r) => `- **${r.feature}** — asset \`${r.assetId}\`; roles: ${r.roleVisibility}`)
          .join('\n') +
        (gaps.missingRoleProfile.length > 40
          ? `\n- … and ${gaps.missingRoleProfile.length - 40} more`
          : '')
      : '- None flagged',
    '',
    '### Backend/frontend contract inventory gaps',
    '',
    '- `platformAssetsApi.js` and `productCatalogApi.js` calls are now represented in `frontendApiCallsInventory.ts`; current exposure audits should not treat them as under-reported.',
    '- Many operational APIs (hospital-map, fleet, telemetry) are wired in UI but backed by **demo/static** data.',
    '',
    '## Role profile reference (seed)',
    '',
    'Preferred assets are defined in `backend/src/modules/platform-assets/data/platform-asset-seed.data.ts` (`SEED_ROLE_PROFILES`). Segmentation heuristics add role visibility in `profileToolSegmentation.ts` for all inventory tools.',
    '',
  ];

  for (const kind of Object.keys(byKind).sort()) {
    sections.push(`## ${kind}`, '', formatTable(byKind[kind]), '');
  }

  sections.push(
    '## Appendix: Column definitions',
    '',
    '| Column | Source |',
    '|--------|--------|',
    '| Inventory ID | `toolInventory.js` / registry id |',
    '| Asset ID | `platform-asset-seed.data.ts` pack membership |',
    '| Pack Assignment | `SEED_ASSET_PACKS` |',
    '| Organization Visibility | Entitlement via org packs (`platformEntitlements`) |',
    '| Role Visibility | `deriveToolSegmentationMetadata()` |',
    '| Workspace Visibility | Segmentation `workspaceTags` |',
    '| Backend Status | `executorStatus`, `endpoint`, `backendHttpRouteInventory` |',
    '| Frontend Status | `route`, `component`, `catalogVisible` |',
    '| Test Status | `testCoverage` + `*Wiring.test.js` glob |',
    '| Documentation Status | `docs/*.md` keyword / pack docs |',
    ''
  );

  return {
    rows,
    gaps,
    markdown: sections.join('\n'),
  };
}

export function formatFeatureCoverageMatrixMarkdown(doc = getFeatureCoverageDocument()) {
  return doc.markdown;
}

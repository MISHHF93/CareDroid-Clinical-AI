/**
 * Product packaging audit — solution pack, specialty, role, organization type coverage.
 * Regenerate: npm run product-packaging-audit:write-docs
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAssetInventoryProjection } from './assetInventory';
import { getUserFacingToolInventory } from './toolInventory';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../..');

/** Nine sellable solution packs (marketing name → pack id → product slug). */
export const PRODUCT_SOLUTION_PACKS = Object.freeze([
  {
    marketingName: 'Emergency Department Pack',
    packId: 'emergency-department-pack',
    productSlug: 'emergency-department-suite',
    productId: 'product-emergency-department',
  },
  {
    marketingName: 'ICU Pack',
    packId: 'icu-pack',
    productSlug: 'icu-suite',
    productId: 'product-icu',
  },
  {
    marketingName: 'Cardiology Pack',
    packId: 'cardiology-pack',
    productSlug: 'cardiology-suite',
    productId: 'product-cardiology',
  },
  {
    marketingName: 'Laboratory Pack',
    packId: 'laboratory-intelligence',
    productSlug: 'laboratory-suite',
    productId: 'product-laboratory',
  },
  {
    marketingName: 'Medical IoT Pack',
    packId: 'medical-iot-pack',
    productSlug: 'medical-iot-suite',
    productId: 'product-medical-iot',
  },
  {
    marketingName: 'Digital Twin Pack',
    packId: 'digital-twin-pack',
    productSlug: 'digital-twin-suite',
    productId: 'product-digital-twin',
  },
  {
    marketingName: 'Simulation Pack',
    packId: 'simulation-training-pack',
    productSlug: 'simulation-training-suite',
    productId: 'product-simulation-training',
  },
  {
    marketingName: 'Governance Pack',
    packId: 'governance-compliance-pack',
    productSlug: 'governance-compliance-suite',
    productId: 'product-governance',
  },
  {
    marketingName: 'Research Pack',
    packId: 'research-education',
    productSlug: 'research-suite',
    productId: 'product-research',
  },
]);

function readRepo(rel) {
  const full = join(REPO_ROOT, rel);
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

function resolveAssetIdsFromPackBody(body, constArrays) {
  const multiline = body.match(/assetIds:\s*\[([\s\S]*?)\]/);
  if (multiline) {
    const ids = [...multiline[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    if (ids.length) return ids;
  }
  const ref = body.match(/assetIds:\s*([A-Z0-9_]+)/);
  if (ref && constArrays.has(ref[1])) {
    return constArrays.get(ref[1]);
  }
  return [];
}

function parseAssetPacks() {
  const seed = readRepo('backend/src/modules/platform-assets/data/platform-asset-seed.data.ts');
  const constArrays = parseSeedConstArrays(seed);
  const packs = [] as any[];
  const packByAsset = new Map();
  const section =
    seed.split('const RAW_SEED_ASSET_PACKS')[1]?.split('export const SEED_ASSET_PACKS')[0] ||
    seed.split('export const SEED_ASSET_PACKS')[1]?.split('export const DEFAULT_PACKS')[0] ||
    '';

  for (const block of section.matchAll(/\{\s*id:\s*'([^']+)'([\s\S]*?)\n\s*\},/g)) {
    const id = block[1];
    const body = block[2];
    const name = body.match(/name:\s*'([^']+)'/)?.[1] || id;
    const assetIds = resolveAssetIdsFromPackBody(body, constArrays);
    const allOrgTypes = body.includes('Object.values(OrganizationType)');
    const orgTypes = allOrgTypes
      ? ['all']
      : [...body.matchAll(/OrganizationType\.([A-Z_]+)/g)].map((m) =>
          m[1].toLowerCase().replace(/_/g, '_')
        );
    const targetRoles = [...body.matchAll(/targetRoles:\s*\[([^\]]*)\]/g)].flatMap((m) =>
      [...m[1].matchAll(/'([^']+)'/g)].map((r) => r[1])
    );
    const pack = { id, name, assetIds, organizationTypes: orgTypes, targetRoles };
    packs.push(pack);
    for (const assetId of assetIds) {
      const arr = packByAsset.get(assetId) || [];
      if (!arr.includes(id)) arr.push(id);
      packByAsset.set(assetId, arr);
    }
  }

  const agentIds = [...seed.matchAll(/id:\s*'(agent-[^']+)'/g)].map((m) => m[1]);
  for (const agentId of agentIds) {
    const existing = packByAsset.get(agentId) || [];
    for (const packId of ['core-platform', 'ai-workflow-pack']) {
      if (!existing.includes(packId)) existing.push(packId);
    }
    packByAsset.set(agentId, existing);
  }

  const corePack = packs.find((p) => p.id === 'core-platform');
  if (corePack) {
    const coreAssets = new Set([
      ...(constArrays.get('CORE_PLATFORM_ASSET_IDS') || []),
      ...agentIds,
    ]);
    for (const assetId of coreAssets) {
      const arr = packByAsset.get(assetId) || [];
      if (!arr.includes('core-platform')) arr.push('core-platform');
      packByAsset.set(assetId, arr);
    }
  }

  return { packs, packByAsset, seed };
}

function parseRoleProfiles() {
  const seed = readRepo('backend/src/modules/platform-assets/data/platform-asset-seed.data.ts');
  const profiles = [] as any[];
  const assetToRolePacks = new Map();
  const block = seed.split('SEED_ROLE_PROFILES')[1]?.split('];')[0] || '';
  for (const row of block.matchAll(
    /id:\s*'([^']+)'[\s\S]*?intendedRoles:\s*\[([^\]]*)\][\s\S]*?preferredAssetIds:\s*\[([^\]]*)\]/g
  )) {
    const id = row[1];
    const intendedRoles = [...row[2].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    const preferredAssetIds = [...row[3].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    profiles.push({ id, label: id, intendedRoles, preferredAssetIds });
    for (const assetId of preferredAssetIds) {
      const roles = assetToRolePacks.get(assetId) || [];
      roles.push(id);
      assetToRolePacks.set(assetId, roles);
    }
  }
  return { profiles, assetToRolePacks };
}

function parseSpecialties() {
  const seed = readRepo('backend/src/modules/product-catalog/data/product-catalog-seed.data.ts');
  const specialties = [] as any[];
  const assetToSpecialties = new Map();
  const section = seed.split('export const SEED_SPECIALTIES')[1]?.split('export const SEED_CARE_PATHWAYS')[0] || '';
  for (const block of section.matchAll(/id:\s*'([^']+)'[\s\S]*?slug:\s*'([^']+)'[\s\S]*?assetIds:\s*\[([^\]]*)\]/g)) {
    const id = block[1];
    const slug = block[2];
    const assetIds = [...block[3].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    specialties.push({ id, slug, assetIds });
    for (const assetId of assetIds) {
      const arr = assetToSpecialties.get(assetId) || [];
      arr.push(slug);
      assetToSpecialties.set(assetId, arr);
    }
  }
  return { specialties, assetToSpecialties };
}

function parseProducts() {
  const seed = readRepo('backend/src/modules/product-catalog/data/product-catalog-seed.data.ts');
  const products = [] as any[];
  for (const block of seed.matchAll(
    /id:\s*'(product-[^']+)'[\s\S]*?slug:\s*'([^']+)'[\s\S]*?packIds:\s*\[([^\]]*)\]/g
  )) {
    products.push({
      id: block[1],
      slug: block[2],
      packIds: [...block[3].matchAll(/'([^']+)'/g)].map((m) => m[1]),
    });
  }
  return products;
}

function orgTypesForAsset(assetId, packs, packIds) {
  const types = new Set();
  for (const packId of packIds) {
    const pack = packs.find((p) => p.id === packId);
    if (!pack) continue;
    if (pack.organizationTypes.includes('all')) {
      return ['all organization types'];
    }
    pack.organizationTypes.forEach((t) => types.add(t));
  }
  return [...types];
}

function rolePacksForAsset(assetId, packIds, packs, assetToRolePacks) {
  const roles = new Set(assetToRolePacks.get(assetId) || []);
  for (const packId of packIds) {
    const pack = packs.find((p) => p.id === packId);
    if (pack?.targetRoles?.length) {
      pack.targetRoles.forEach((r) => roles.add(`pack:${packId}→${r}`));
    }
  }
  if (assetId.startsWith('agent-')) {
    roles.add('role:ai-agent-default');
  }
  return [...roles];
}

function routeGroupForBacklogTool(tool) {
  const route = tool.route || '';
  if (route.startsWith('/tools/calculators')) return 'calculator tools';
  const toolArea = route.match(/^\/tools\/([^/?]+)/)?.[1];
  if (toolArea && toolArea !== 'catalog') return `${toolArea} tools`;
  if (route.startsWith('/patients')) return 'patient workflow';
  if (route.startsWith('/governance')) return 'governance workflow';
  if (route.startsWith('/operations')) return 'operations workflow';
  if (route.startsWith('/settings')) return 'settings / organization';
  if (route.startsWith('/tools/catalog')) return 'tool catalog';
  if (route.startsWith('/assistant')) return 'assistant workflow';
  return route ? 'other routed tools' : 'unrouted tools';
}

export function buildProductPackagingAudit() {
  const { packs, packByAsset } = parseAssetPacks();
  const { profiles, assetToRolePacks } = parseRoleProfiles();
  const { specialties, assetToSpecialties } = parseSpecialties();
  const products = parseProducts();
  const seededAssetIds = [...packByAsset.keys()].sort();

  const solutionPackChecks = PRODUCT_SOLUTION_PACKS.map((row) => {
    const pack = packs.find((p) => p.id === row.packId);
    const product = products.find((p) => p.id === row.productId);
    return {
      ...row,
      packExists: Boolean(pack),
      packName: pack?.name,
      assetCount: pack?.assetIds?.length ?? 0,
      productExists: Boolean(product),
      productPackIds: product?.packIds ?? [],
      productLinksPack: product?.packIds?.includes(row.packId) ?? false,
    };
  });

  const assetRows = seededAssetIds.map((assetId) => {
    const packIds = packByAsset.get(assetId) || [];
    const specialtySlugs = assetToSpecialties.get(assetId) || [];
    const roleMappings = rolePacksForAsset(assetId, packIds, packs, assetToRolePacks);
    const orgTypes = orgTypesForAsset(assetId, packs, packIds);
    const violations = [] as any[];
    if (!packIds.length) violations.push('missing-solution-pack');
    if (!specialtySlugs.length) violations.push('missing-specialty-pack');
    if (!roleMappings.length) violations.push('missing-role-pack');
    if (!orgTypes.length) violations.push('missing-organization-type');
    return {
      assetId,
      solutionPacks: packIds.join(', ') || '—',
      specialtyPacks: specialtySlugs.join(', ') || '—',
      rolePacks: roleMappings.join('; ') || '—',
      organizationTypes: orgTypes.join(', ') || '—',
      violations,
      compliant: violations.length === 0,
    };
  });

  const userFacingInventory = getUserFacingToolInventory();
  const mountedAssetIds = new Set(buildAssetInventoryProjection().map((asset) => asset.id));
  const backendSeedBacklog = userFacingInventory
    .filter((t) => !packByAsset.has(t.id))
    .map((t) => ({ id: t.id, label: t.label, route: t.route, mounted: mountedAssetIds.has(t.id) }));
  const unmountedInventory = backendSeedBacklog.filter((t) => !t.mounted);
  const backendSeedBacklogByRouteGroup = Object.entries(
    backendSeedBacklog.reduce((acc, tool) => {
      const group = routeGroupForBacklogTool(tool);
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  )
    .map(([group, count]) => ({ group, count }))
    .sort((a, b) => b.count - a.count || a.group.localeCompare(b.group));

  const nonCompliant = assetRows.filter((r) => !r.compliant);
  const specialtyGaps = assetRows.filter((r) => r.violations.includes('missing-specialty-pack'));
  const roleGaps = assetRows.filter((r) => r.violations.includes('missing-role-pack'));

  return {
    generated: new Date().toISOString().slice(0, 10),
    solutionPackChecks,
    assetRows,
    packs,
    profiles,
    specialties,
    summary: {
      seededAssetCount: seededAssetIds.length,
      compliantAssets: assetRows.filter((r) => r.compliant).length,
      nonCompliantAssets: nonCompliant.length,
      specialtyGaps: specialtyGaps.length,
      roleGaps: roleGaps.length,
      frontendMountedRegistryTools: userFacingInventory.filter((t) => mountedAssetIds.has(t.id)).length,
      backendSeedBacklogCount: backendSeedBacklog.length,
      inventoryOnlyCount: unmountedInventory.length,
      solutionPacksDefined: solutionPackChecks.filter((p) => p.packExists).length,
    },
    nonCompliant,
    specialtyGaps,
    roleGaps,
    backendSeedBacklog: backendSeedBacklog.slice(0, 50),
    backendSeedBacklogTotal: backendSeedBacklog.length,
    backendSeedBacklogByRouteGroup,
    inventoryOnly: unmountedInventory.slice(0, 50),
    inventoryOnlyTotal: unmountedInventory.length,
  };
}

function escapeCell(v) {
  return String(v ?? '—').replace(/\|/g, '\\|');
}

export function formatProductPackagingAuditMarkdown(audit = buildProductPackagingAudit()) {
  const lines = [
    '# Product Packaging Audit',
    '',
    `Generated: ${audit.generated} (regenerate with \`npm run product-packaging-audit:write-docs\`)`,
    '',
    '## Productization model',
    '',
    'CareDroid productization uses four packaging dimensions for every **seeded platform asset**:',
    '',
    '| Dimension | Canonical source | Purpose |',
    '|-----------|------------------|---------|',
    '| **Solution pack** | `asset_packs` / `SEED_ASSET_PACKS` | Sellable entitlement bundle (install per org) |',
    '| **Specialty pack** | `specialty_catalog` / `SEED_SPECIALTIES` | Specialty marketplace and discovery filters |',
    '| **Role pack** | `role_profiles` + pack `targetRoles` | Role profile preferred assets and pack role targeting |',
    '| **Organization type** | `asset_packs.organizationTypes` | Which tenant segments may install the pack |',
    '',
    'Commercial **products** (`product-catalog`) map 1:1 to solution pack ids for the nine hospital suites below.',
    '',
    '## Executive summary',
    '',
    '| Metric | Count |',
    '|--------|------:|',
    `| Seeded platform assets | ${audit.summary.seededAssetCount} |`,
    `| Fully packaged (all four dimensions) | ${audit.summary.compliantAssets} |`,
    `| Packaging violations (seeded assets) | ${audit.summary.nonCompliantAssets} |`,
    `| Missing specialty mapping | ${audit.summary.specialtyGaps} |`,
    `| Missing role mapping | ${audit.summary.roleGaps} |`,
    `| User-facing registry tools frontend-mounted | ${audit.summary.frontendMountedRegistryTools} |`,
    `| Frontend-mounted registry tools awaiting backend seed rows | ${audit.summary.backendSeedBacklogCount} |`,
    `| User-facing registry tools without mounted asset projection | ${audit.summary.inventoryOnlyCount} |`,
    `| Nine solution packs present in seed | ${audit.summary.solutionPacksDefined}/9 |`,
    '',
    '### Strategy verdict',
    '',
    audit.summary.nonCompliantAssets === 0
      ? '**PASS (seed catalog):** All seeded platform assets have solution pack, specialty, role, and organization-type coverage.'
      : `**PARTIAL:** ${audit.summary.nonCompliantAssets} seeded asset(s) fail one or more packaging dimensions — see violations below.`,
    '',
    audit.summary.backendSeedBacklogCount > 0
      ? `**Backend seed backlog:** ${audit.summary.backendSeedBacklogCount} user-facing tools are covered by the frontend mounted asset projection but are not yet direct backend \`platform_assets\` seed rows.`
      : '',
    audit.summary.inventoryOnlyCount > 0
      ? `**Projection gap:** ${audit.summary.inventoryOnlyCount} user-facing tools are missing from both backend seed packs and the frontend mounted asset projection.`
      : '**Projection coverage:** All user-facing registry tools have mounted asset projection coverage.',
    '',
    '## Nine solution packs (generated catalog)',
    '',
    '| Marketing name | Pack ID | Product slug | Assets in pack | Linked in product |',
    '|---------------|---------|--------------|---------------:|-------------------|',
  ];

  for (const row of audit.solutionPackChecks) {
    lines.push(
      `| ${row.marketingName} | \`${row.packId}\` | \`${row.productSlug}\` | ${row.assetCount} | ${row.productLinksPack ? 'Yes' : 'No'} |`
    );
  }

  lines.push(
    '',
    'Supporting packs (also seeded): `core-platform`, `emergency-medicine`, `hospital-operations`, `fleet-logistics`, `ai-workflow-pack`.',
    '',
    '## Canonical sources (recommended)',
    '',
    '| Concern | Canonical | Consumers |',
    '|---------|-----------|-----------|',
    '| Solution pack definitions | `backend/.../platform-asset-seed.data.ts` → `SEED_ASSET_PACKS` | DB seed, entitlements, marketplace |',
    '| Platform asset rows | `SEED_PLATFORM_ASSETS` (derived from packs) | `platform_assets` table |',
    '| Sellable products | `backend/.../product-catalog-seed.data.ts` → `SEED_PRODUCTS` | `/api/products`, commercial UI |',
    '| Specialty packs | `SEED_SPECIALTIES` | `/api/specialties`, specialty pages |',
    '| Role packs | `SEED_ROLE_PROFILES` + pack `targetRoles` | `/api/platform/me/role-profile`, recommendations |',
    '| Org-type defaults | `DEFAULT_PACKS_BY_ORGANIZATION_TYPE` | Org onboarding, default entitlements |',
    '| SPA tool launch (pre-asset) | `src/data/toolInventory.js` | Routes, calculators, sidebar |',
    '',
    '## Packaging violations (seeded assets)',
    ''
  );

  if (!audit.nonCompliant.length) {
    lines.push('_None — all seeded assets satisfy four dimensions._', '');
  } else {
    lines.push('| Asset ID | Solution packs | Specialty | Role | Org types | Violations |', '| --- | --- | --- | --- | --- | --- |');
    for (const row of audit.nonCompliant) {
      lines.push(
        `| ${escapeCell(row.assetId)} | ${escapeCell(row.solutionPacks)} | ${escapeCell(row.specialtyPacks)} | ${escapeCell(row.rolePacks)} | ${escapeCell(row.organizationTypes)} | ${row.violations.join(', ')} |`
      );
    }
    lines.push('');
  }

  if (audit.specialtyGaps.length) {
    lines.push('### Missing specialty pack', '');
    audit.specialtyGaps.slice(0, 30).forEach((r) => {
      lines.push(`- \`${r.assetId}\` — packs: ${r.solutionPacks}`);
    });
    if (audit.specialtyGaps.length > 30) {
      lines.push(`- … and ${audit.specialtyGaps.length - 30} more`);
    }
    lines.push('');
  }

  if (audit.roleGaps.length) {
    lines.push('### Missing role pack', '');
    audit.roleGaps.slice(0, 30).forEach((r) => {
      lines.push(`- \`${r.assetId}\` — packs: ${r.solutionPacks}`);
    });
    if (audit.roleGaps.length > 30) {
      lines.push(`- … and ${audit.roleGaps.length - 30} more`);
    }
    lines.push('');
  }

  lines.push(
    '## Full seeded asset matrix',
    '',
    '| Asset ID | Solution pack(s) | Specialty pack(s) | Role pack(s) | Organization type(s) | Status |',
    '| --- | --- | --- | --- | --- | --- |'
  );
  for (const row of audit.assetRows) {
    lines.push(
      `| ${escapeCell(row.assetId)} | ${escapeCell(row.solutionPacks)} | ${escapeCell(row.specialtyPacks)} | ${escapeCell(row.rolePacks)} | ${escapeCell(row.organizationTypes)} | ${row.compliant ? 'OK' : row.violations.join(', ')} |`
    );
  }

  lines.push(
    '',
    '## Frontend-mounted registry tools awaiting backend seed rows (sample)',
    '',
    '### Backlog by route area',
    '',
    '| Route area | Count |',
    '| --- | ---: |'
  );
  for (const row of audit.backendSeedBacklogByRouteGroup) {
    lines.push(`| ${escapeCell(row.group)} | ${row.count} |`);
  }

  lines.push(
    '',
    '### Sample rows',
    '',
    `Total: ${audit.backendSeedBacklogTotal} user-facing tools have frontend mounted asset projection coverage but are not direct backend \`platform_assets\` seed rows.`,
    ''
  );
  if (audit.backendSeedBacklog.length) {
    audit.backendSeedBacklog.forEach((t) => {
      lines.push(`- **${t.label}** (\`${t.id}\`) — ${t.route || 'no route'}${t.mounted ? ' — mounted projection OK' : ''}`);
    });
    if (audit.backendSeedBacklogTotal > audit.backendSeedBacklog.length) {
      lines.push(`- … and ${audit.backendSeedBacklogTotal - audit.backendSeedBacklog.length} more`);
    }
  }

  if (audit.inventoryOnly.length) {
    lines.push('', '### Registry tools missing mounted projection', '');
    audit.inventoryOnly.forEach((t) => {
      lines.push(`- **${t.label}** (\`${t.id}\`) — ${t.route || 'no route'}`);
    });
  }

  lines.push(
    '',
    '## Remediation playbook',
    '',
    '1. **Solution pack** — Add asset id to appropriate `SEED_ASSET_PACKS[].assetIds` (or `core-platform` for universal tools).',
    '2. **Specialty pack** — Add asset id to `SEED_SPECIALTIES[].assetIds` for each relevant specialty slug.',
    '3. **Role pack** — Add to `SEED_ROLE_PROFILES[].preferredAssetIds` and/or pack `targetRoles` for role targeting.',
    '4. **Organization type** — Ensure at least one containing pack lists the tenant segment in `organizationTypes`.',
    '5. **Backend seed backlog** — Promote high-value mounted projection rows into backend `platform_assets` seed rows when they need entitlement enforcement, billing, or marketplace ownership.',
    '',
    '## Appendix',
    '',
    '- Validation service: `ProductCatalogValidationService` (post-seed reference checks)',
    '- Related: [solution-packs.md](./solution-packs.md), [saas-compliance-audit.md](./saas-compliance-audit.md)',
    '- Generator: `src/data/productPackagingAudit.ts`',
    ''
  );

  return lines.join('\n');
}

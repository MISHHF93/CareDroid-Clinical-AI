/**
 * SaaS bottleneck architecture implementation scanner.
 *
 * Regenerate: npm run saas-bottleneck-audit:write-docs
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildProductPackagingAudit } from './productPackagingAudit';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../..');

export const AUDIT_STATUSES = Object.freeze({
  PASS: 'pass',
  PARTIAL: 'partial',
  FAIL: 'fail',
});

function readRepoFile(relPath) {
  const full = join(REPO_ROOT, relPath);
  return existsSync(full) ? readFileSync(full, 'utf8') : '';
}

function has(relPath, pattern) {
  const content = readRepoFile(relPath);
  if (!content) return false;
  return pattern instanceof RegExp ? pattern.test(content) : content.includes(pattern);
}

function hasAll(relPath, patterns) {
  return patterns.every((pattern) => has(relPath, pattern));
}

function check(id, title, category, status, evidence, nextStep = '') {
  return {
    id,
    title,
    category,
    status,
    evidence,
    nextStep,
  };
}

function statusFromBoolean(value) {
  return value ? AUDIT_STATUSES.PASS : AUDIT_STATUSES.FAIL;
}

function statusFromCounts(passed, total) {
  if (passed === total) return AUDIT_STATUSES.PASS;
  if (passed > 0) return AUDIT_STATUSES.PARTIAL;
  return AUDIT_STATUSES.FAIL;
}

function formatStatus(status) {
  return status.toUpperCase();
}

function escapeCell(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, '<br>');
}

function implementationChecks() {
  const packagingAudit = buildProductPackagingAudit();
  const seededAssetsFullyPackaged =
    packagingAudit.summary.seededAssetCount > 0 &&
    packagingAudit.summary.nonCompliantAssets === 0;
  const inventoryBackfillComplete = packagingAudit.summary.backendSeedBacklogCount === 0;

  const strictBackend = hasAll('backend/src/modules/platform-assets/platform-assets.service.ts', [
    'isStrictSaasEntitlementsEnabled',
    'CAREDROID_STRICT_SAAS_ENTITLEMENTS',
    'strictEntitlements',
    /!\(strictEntitlements && hasOrganizationScope\)/,
  ]);
  const strictFrontend = hasAll('src/config/appConfig.ts', [
    'VITE_STRICT_SAAS_ENTITLEMENTS',
    'VITE_ASSET_AWARE_NAVIGATION',
    'VITE_ORG_SCOPED_PLATFORM_READS',
  ]) && hasAll('src/config/featureFlags.config.ts', [
    'strictSaasEntitlements',
    'assetAwareNavigation',
    'orgScopedPlatformReads',
  ]);
  const strictAccessProjection = hasAll('src/data/assetEntitlements.ts', [
    'isStrictSaasEntitlementsEnabled',
    'return !isStrictSaasEntitlementsEnabled(context)',
  ]) && hasAll('src/data/assetAccess.ts', [
    'isStrictSaasEntitlementsEnabled',
    'strictEntitlements',
    "reasons: ['workspace']",
  ]);

  const platformController = 'backend/src/modules/platform-assets/platform-assets.controller.ts';
  const orgScopedReads = hasAll(platformController, [
    'assertOrgMember',
    'orgEntitlements(@Req() req',
    'organizationAnalytics(@Req() req',
    'digitalTwin(@Req() req',
  ]);
  const lifecycleAdminOnly = hasAll(platformController, [
    'Platform admin access required',
    'req.user.role !== UserRole.ADMIN',
  ]);

  const workspaceAuthority = hasAll('backend/src/modules/workspaces/workspaces.service.ts', [
    'options: { organizationId?: string | null }',
    'organizationId: options.organizationId || null',
  ]) && hasAll('backend/src/modules/organizations/organization-onboarding.service.ts', [
    'enabledToolIds: ws.enabledToolIds',
    '{ organizationId: org.id }',
  ]);
  const onboardingWorkspaceType = hasAll('src/pages/commercial/CommercialPages.jsx', [
    "type: 'hospital'",
    'enabledToolIds',
  ]) && !has('src/pages/commercial/CommercialPages.jsx', "type: 'clinical'");

  const roleSegmentation = hasAll('backend/src/modules/platform-assets/entities/role-profile.entity.ts', [
    'preferredAssetIds',
    'hiddenAssetIds',
    'defaultDashboard',
    'defaultAiAgentId',
  ]) && hasAll('backend/src/modules/platform-assets/platform-context.service.ts', [
    'roleProfile',
    'defaultAiAgentId',
    'strictSaasEntitlements',
  ]);

  const productTierPackaging = hasAll('backend/src/modules/product-catalog/entities/product.entity.ts', [
    'packIds',
    'highlightAssetIds',
    'commercialPlanIds',
  ]) && hasAll('backend/src/modules/product-catalog/entities/commercial-plan.entity.ts', [
    'includedProductIds',
    'includedPackIds',
    'maxPackIds',
    'pricingTier',
  ]);

  const centralizedLaunch = hasAll('src/navigation/registryToolLaunch.ts', [
    'resolveRegistryToolLaunchAccess',
    'resolveAssetAccessState',
    'ASSET_ACCESS_STATES.ALLOWED',
    'entitlement=denied',
  ]);

  const tests = hasAll('src/data/assetAccess.test.ts', [
    'strict SaaS mode',
    'active workspace',
  ]) && hasAll('src/data/assetEntitlements.test.ts', [
    'strict SaaS mode',
  ]) && hasAll('backend/src/modules/platform-assets/platform-assets.service.spec.ts', [
    'strict organization entitlements',
    'narrows entitled assets by workspace scope',
  ]);

  const profileCompiler =
    has('src/config/userProfileCompiler.ts', 'compileUserProfile') &&
    has('src/config/profilePackTaxonomy.ts', 'isStrictPackEnforcementForRole') &&
    has('src/hooks/useCompiledUserProfile.ts', 'useCompiledUserProfile') &&
    has('src/data/toolInventory.js', 'REGISTRY_PACK_ID');

  const catalogSegregationComplete =
    has('src/config/user-profile-catalog.data.json', '"assignableOrganizationTypes"') &&
    has('src/config/user-profile-catalog.data.json', '"requiredEntitlementPacks"') &&
    has('src/config/user-profile-catalog.data.json', '"heart-score"');

  return [
    check(
      'plan-doc',
      'SaaS bottleneck architecture plan exists',
      'Phase 0',
      statusFromBoolean(has('docs/saas-bottleneck-architecture-plan.md', '# SaaS Bottleneck Architecture Plan')),
      '`docs/saas-bottleneck-architecture-plan.md`',
      'Keep this focused plan linked from future implementation tickets.',
    ),
    check(
      'seed-packaging',
      'Seeded platform assets are fully packaged',
      'Phase 1',
      statusFromBoolean(seededAssetsFullyPackaged),
      `${packagingAudit.summary.compliantAssets}/${packagingAudit.summary.seededAssetCount} seeded assets compliant; ${packagingAudit.summary.nonCompliantAssets} violations`,
      'Fix seeded asset pack/specialty/role/org mappings before expanding strict rollout.',
    ),
    check(
      'inventory-backfill',
      'All user-facing inventory tools are platform assets',
      'Phase 1',
      inventoryBackfillComplete ? AUDIT_STATUSES.PASS : AUDIT_STATUSES.PARTIAL,
      `${packagingAudit.summary.backendSeedBacklogCount} frontend-mounted registry tools await backend seed rows; ${packagingAudit.summary.inventoryOnlyCount} lack mounted projection`,
      'Promote high-value mounted projection rows into backend `platform_assets` when they need entitlement enforcement, billing, or marketplace ownership.',
    ),
    check(
      'strict-backend-entitlements',
      'Backend strict SaaS entitlement mode is implemented',
      'Phase 2',
      statusFromBoolean(strictBackend),
      '`PlatformAssetsService.resolveEntitledAssetIds` supports strict organization behavior',
      'Keep fallback behavior feature-flagged and disabled for strict org tenants.',
    ),
    check(
      'workspace-authority',
      'Onboarding workspaces are backend authoritative and org-linked',
      'Phase 2',
      statusFromBoolean(workspaceAuthority && onboardingWorkspaceType),
      '`WorkspacesService.createWorkspace` accepts organization scope; onboarding sends supported workspace type and enabled tool IDs',
      'Migrate remaining localStorage workspace filters behind compatibility mode.',
    ),
    check(
      'tenant-scoped-platform-reads',
      'Organization-scoped platform reads enforce membership',
      'Phase 2',
      statusFromBoolean(orgScopedReads),
      '`platform-assets.controller.ts` checks organization membership for entitlements, analytics, and digital twin reads',
      'Extend the same assertion pattern to new organization-scoped endpoints.',
    ),
    check(
      'admin-lifecycle',
      'Asset lifecycle changes require platform admin role',
      'Phase 3',
      statusFromBoolean(lifecycleAdminOnly),
      '`PATCH /platform/assets/:assetId/lifecycle` checks `UserRole.ADMIN`',
      'Add audit logging when lifecycle state changes.',
    ),
    check(
      'frontend-strict-access',
      'Frontend access projection honors strict entitlements and workspace scope',
      'Phase 3',
      statusFromBoolean(strictFrontend && strictAccessProjection),
      '`assetEntitlements.ts` and `assetAccess.ts` expose strict and workspace-restricted access behavior',
      'Route more commercial/product launch actions through the same access projection.',
    ),
    check(
      'centralized-launch',
      'Registry launch path checks entitlement and workspace scope',
      'Phase 3',
      statusFromBoolean(centralizedLaunch),
      '`registryToolLaunch.js` gates launch through `resolveRegistryToolLaunchAccess` / `resolveAssetAccessState` and redirects denied launches',
      'Audit direct `navigate(asset.route)` product surfaces and replace bypasses.',
    ),
    check(
      'product-tier-packaging',
      'Products and commercial plans map to packs',
      'Phase 4',
      statusFromBoolean(productTierPackaging),
      '`Product` and `CommercialPlan` entities include pack/product/tier mappings',
      'Reconcile future billing events into organization entitlements.',
    ),
    check(
      'role-profile-segmentation',
      'Role profiles feed platform context and segmentation',
      'Phase 4',
      statusFromBoolean(roleSegmentation),
      '`RoleProfile` stores preferred/hidden assets and defaults; platform context returns role profile/default agent',
      'Make role profile authoritative across every recommendation and dashboard surface.',
    ),
    check(
      'profile-compiler',
      'User profile compiler unifies routes, tools, and launch policy',
      'Phase 4',
      statusFromBoolean(profileCompiler),
      '`userProfileCompiler.ts`, `profilePackTaxonomy.ts`, `useCompiledUserProfile`, and registry pack metadata in `toolInventory.js`',
      'Route remaining direct launch bypasses through `compileUserProfile` / `isToolAllowedForCompiledProfile`.',
    ),
    check(
      'catalog-segregation',
      'SaaS catalog has explicit segregation and curated required tools',
      'Phase 4',
      statusFromBoolean(catalogSegregationComplete),
      '`user-profile-catalog.data.json` includes assignable org types, entitlement packs, and profile-specific required tools',
      'Keep backend `saas-profile-rbac.config.ts` pack IDs aligned with frontend taxonomy.',
    ),
    check(
      'tests',
      'Strict entitlement and workspace behavior has targeted tests',
      'Phase 5',
      statusFromBoolean(tests),
      'Frontend asset tests and backend platform asset service spec cover strict and workspace behavior',
      'Add controller tests for organization membership checks and lifecycle admin checks.',
    ),
  ];
}

function groupedChecks(checks) {
  return checks.reduce((acc: Record<string, any[]>, row) => {
    if (!acc[row.category]) acc[row.category] = [];
    acc[row.category].push(row);
    return acc;
  }, {});
}

export function buildSaasBottleneckImplementationAudit() {
  const checks = implementationChecks();
  const summary: any = {
    total: checks.length,
    pass: checks.filter((row) => row.status === AUDIT_STATUSES.PASS).length,
    partial: checks.filter((row) => row.status === AUDIT_STATUSES.PARTIAL).length,
    fail: checks.filter((row) => row.status === AUDIT_STATUSES.FAIL).length,
  };
  summary.score = Math.round(((summary.pass + summary.partial * 0.5) / summary.total) * 100);

  return {
    generatedAt: new Date().toISOString(),
    sourcePlan: 'docs/saas-bottleneck-architecture-plan.md',
    summary,
    checks,
    grouped: groupedChecks(checks),
  };
}

export function formatSaasBottleneckImplementationAuditMarkdown(
  audit = buildSaasBottleneckImplementationAudit(),
) {
  const lines = [] as any[];
  lines.push('# SaaS Bottleneck Implementation Audit');
  lines.push('');
  lines.push(`Generated: ${audit.generatedAt}`);
  lines.push('');
  lines.push('## Purpose');
  lines.push('');
  lines.push(
    'This scanner checks whether the implementation matches the architecture plan in `docs/saas-bottleneck-architecture-plan.md`.',
  );
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Score: **${audit.summary.score} / 100**`);
  lines.push(`- Passing checks: **${audit.summary.pass} / ${audit.summary.total}**`);
  lines.push(`- Partial checks: **${audit.summary.partial}**`);
  lines.push(`- Failing checks: **${audit.summary.fail}**`);
  lines.push('');
  lines.push('## Checks');
  lines.push('');
  lines.push('| Phase | Check | Status | Evidence | Next step |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const row of audit.checks) {
    lines.push(
      `| ${escapeCell(row.category)} | ${escapeCell(row.title)} | **${formatStatus(row.status)}** | ${escapeCell(row.evidence)} | ${escapeCell(row.nextStep)} |`,
    );
  }
  lines.push('');
  lines.push('## Phase View');
  lines.push('');
  for (const [phase, rows] of Object.entries(audit.grouped) as any) {
    lines.push(`### ${phase}`);
    lines.push('');
    for (const row of rows) {
      lines.push(`- **${formatStatus(row.status)}:** ${row.title}`);
    }
    lines.push('');
  }
  lines.push('## Interpretation');
  lines.push('');
  lines.push(
    '- `PASS` means the scanner found concrete implementation evidence for the plan item.',
  );
  lines.push(
    '- `PARTIAL` means the capability exists but is not complete enough to claim the full plan is implemented.',
  );
  lines.push(
    '- `FAIL` means expected implementation evidence was not found in the current tree.',
  );
  lines.push('');
  lines.push('## Regenerate');
  lines.push('');
  lines.push('```bash');
  lines.push('npm run saas-bottleneck-audit:write-docs');
  lines.push('```');
  return lines.join('\n');
}


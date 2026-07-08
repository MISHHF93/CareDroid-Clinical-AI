import {
  TARGET_FEATURE_MODULE_CONTRACTS_BY_ID,
  type FeatureModuleId,
  isFeatureModuleId,
} from '../features/featureModuleContract';

export const PAGE_INVENTORY_EXPECTED_TOTAL = 240;
export const PAGE_SOURCE_EXPECTED_TOTAL = 150;
export const PAGE_STYLE_EXPECTED_TOTAL = 90;
export const PAGE_TOOLS_INVENTORY_EXPECTED_TOTAL = 57;
export const PAGE_TOOLS_SOURCE_EXPECTED_TOTAL = 47;

export type PageDisposition =
  | 'active-module-backed'
  | 'active-domain-wrapper'
  | 'compatibility-redirect'
  | 'tool-compatibility'
  | 'retire-archive';

export type PageInventoryFileRole = 'route-source' | 'support-source' | 'support-style';

export type PageDispositionFixture = Readonly<{
  path: string;
  sourceFile: string;
  ownerModule: FeatureModuleId;
  disposition: PageDisposition;
  fileRole: PageInventoryFileRole;
  roles: readonly string[];
  backendCapabilities: readonly string[];
  testIds: readonly string[];
  reason: string;
}>;

type OwnerRule = Readonly<{
  ownerModule: FeatureModuleId;
  roles: readonly string[];
  reason: string;
}>;

const PAGE_FILE_MODULES = import.meta.glob('../pages/**/*.{ts,tsx,css}');

const MODULE_ROLE_FIXTURES: Readonly<Record<FeatureModuleId, readonly string[]>> = Object.freeze({
  reception: ['registration-clerk', 'triage-nurse', 'ed-manager'],
  triage: ['triage-nurse', 'charge-nurse', 'physician'],
  whiteboard: ['physician', 'charge-nurse', 'ed-manager', 'public-display'],
  'waiting-room': ['charge-nurse', 'triage-nurse', 'public-display'],
  ems: ['ems-user', 'registration-clerk', 'charge-nurse'],
  command: ['ed-manager', 'charge-nurse', 'administrator'],
  copilot: ['physician', 'nurse', 'medical-student', 'administrator'],
  tools: ['physician', 'nurse', 'pharmacist', 'medical-student'],
  calculators: ['physician', 'nurse', 'pharmacist', 'medical-student'],
  shift: ['charge-nurse', 'physician', 'ed-manager'],
  admin: ['administrator', 'ed-manager'],
  platform: ['administrator', 'quality-safety-officer', 'it-administrator'],
  team: ['administrator', 'ed-manager'],
  settings: ['administrator', 'it-administrator', 'profile-owner'],
  auth: ['profile-owner', 'administrator'],
});

const ROOT_PAGE_OWNER_RULES: Readonly<Record<string, OwnerRule>> = Object.freeze({
  AutomationAuditTrail: owner('platform', 'Root audit trail belongs to the platform governance module.'),
  BillingPage: owner('platform', 'Billing is a platform/account surface.'),
  ClinicalAlertsPage: owner('command', 'Clinical alerts are command-center operational signals.'),
  ClinicalDocumentationAssistant: owner('copilot', 'Documentation assistant is an AI/copilot workflow.'),
  GDPRNotice: owner('platform', 'GDPR notice is a platform legal/compliance surface.'),
  HelpCenter: owner('platform', 'General help is a platform support surface.'),
  HIPAANotice: owner('platform', 'HIPAA notice is a platform privacy/compliance surface.'),
  NotificationPreferences: owner('settings', 'Notification preferences are settings-owned.'),
  Patients: owner('whiteboard', 'Root patients page maps to the ED whiteboard/patient board surface.'),
  Profile: owner('auth', 'Profile pages belong to identity and account workflows.'),
  ProfileSettings: owner('auth', 'Profile settings belong to identity and account workflows.'),
  Settings: owner('settings', 'Root settings page belongs to the settings module.'),
  SystemHealth: owner('platform', 'System health belongs to platform operations.'),
  UsagePage: owner('platform', 'Usage metering is a platform/account surface.'),
  Version: owner('platform', 'Version/build information belongs to platform operations.'),
});

const DIRECTORY_OWNER_RULES: Readonly<Record<string, OwnerRule>> = Object.freeze({
  admin: owner('admin', 'Admin pages are owned by the admin module.'),
  ai: owner('copilot', 'AI dashboards are owned by the copilot/AI module.'),
  analytics: owner('command', 'Analytics pages are command-center operational views.'),
  clinical: owner('tools', 'Clinical reference pages are tool and clinical support surfaces.'),
  commercial: owner('platform', 'Commercial pages are platform packaging surfaces.'),
  executive: owner('command', 'Executive dashboards are command-center operational summaries.'),
  fleet: owner('command', 'Fleet pages are operational command surfaces.'),
  governance: owner('platform', 'Governance pages are platform governance surfaces.'),
  integrations: owner('platform', 'Integration hub belongs to platform operations.'),
  legal: owner('platform', 'Legal pages are platform compliance surfaces.'),
  operations: owner('command', 'Operations pages are command-center operational surfaces.'),
  organization: owner('platform', 'Organization pages are platform tenant surfaces.'),
  platform: owner('platform', 'Platform pages are owned by the platform module.'),
  profile: owner('auth', 'Profile subpages are identity and account surfaces.'),
  saas: owner('platform', 'SaaS operations pages are platform surfaces.'),
  settings: owner('settings', 'Settings pages are owned by the settings module.'),
  team: owner('team', 'Team pages are owned by the team module.'),
  tools: owner('tools', 'Clinical tool pages are owned by the tools module unless calculator-specific.'),
  training: owner('platform', 'Training pages are platform education surfaces until a dedicated module is activated.'),
});

export const PAGE_INVENTORY_FILE_PATHS = Object.freeze(
  Object.keys(PAGE_FILE_MODULES)
    .map(normalizePageGlobPath)
    .filter(isInventoryPageFile)
    .sort(),
);

export const PAGE_DISPOSITION_FIXTURES = Object.freeze(
  PAGE_INVENTORY_FILE_PATHS.map(buildPageDispositionFixture),
);

export function getPageInventorySummary(fixtures = PAGE_DISPOSITION_FIXTURES) {
  const byOwner = countBy(fixtures, (fixture) => fixture.ownerModule);
  const byDisposition = countBy(fixtures, (fixture) => fixture.disposition);
  const byFileRole = countBy(fixtures, (fixture) => fixture.fileRole);

  return Object.freeze({
    total: fixtures.length,
    sourceFiles: fixtures.filter((fixture) => fixture.fileRole !== 'support-style').length,
    styleFiles: fixtures.filter((fixture) => fixture.fileRole === 'support-style').length,
    toolsInventoryFiles: fixtures.filter((fixture) => fixture.sourceFile.startsWith('src/pages/tools/')).length,
    toolsSourceFiles: fixtures.filter(
      (fixture) =>
        fixture.sourceFile.startsWith('src/pages/tools/') && fixture.fileRole !== 'support-style',
    ).length,
    byOwner,
    byDisposition,
    byFileRole,
  });
}

export function getPageDispositionGaps(fixtures = PAGE_DISPOSITION_FIXTURES) {
  return fixtures
    .filter((fixture) => {
      if (!fixture.path.startsWith('/')) return true;
      if (!fixture.sourceFile.startsWith('src/pages/')) return true;
      if (!isFeatureModuleId(fixture.ownerModule)) return true;
      if (!TARGET_FEATURE_MODULE_CONTRACTS_BY_ID[fixture.ownerModule]) return true;
      if (!fixture.roles.length) return true;
      return false;
    })
    .map((fixture) => fixture.sourceFile);
}

function buildPageDispositionFixture(sourceFile: string): PageDispositionFixture {
  const ownerRule = deriveOwnerRule(sourceFile);
  const fileRole = deriveFileRole(sourceFile);
  const ownerModule = ownerRule.ownerModule;
  const contract = TARGET_FEATURE_MODULE_CONTRACTS_BY_ID[ownerModule];

  return Object.freeze({
    path: deriveInventoryPath(sourceFile),
    sourceFile,
    ownerModule,
    disposition: deriveDisposition(sourceFile, ownerModule, fileRole),
    fileRole,
    roles: ownerRule.roles,
    backendCapabilities: contract.backendCapabilities,
    testIds: Object.freeze([`${ownerModule}:page-inventory`, `${ownerModule}:${fileRole}`]),
    reason: ownerRule.reason,
  });
}

function owner(ownerModule: FeatureModuleId, reason: string): OwnerRule {
  return Object.freeze({
    ownerModule,
    roles: MODULE_ROLE_FIXTURES[ownerModule],
    reason,
  });
}

function deriveOwnerRule(sourceFile: string): OwnerRule {
  const relative = sourceFile.replace('src/pages/', '');
  const [directory] = relative.split('/');
  const basename = stripExtension(relative.split('/').at(-1) || relative);
  const lower = sourceFile.toLowerCase();

  if (lower.startsWith('src/pages/tools/')) {
    if (isCalculatorSource(lower)) {
      return owner('calculators', 'Calculator page inventory is owned by the calculators module.');
    }
    return DIRECTORY_OWNER_RULES.tools;
  }

  if (lower.startsWith('src/pages/emergency/')) {
    if (lower.includes('/shift/')) return owner('shift', 'Emergency shift pages are owned by the shift module.');
    if (lower.includes('reception') || lower.includes('smartintake') || lower.includes('selfarrival')) {
      return owner('reception', 'Emergency intake and reception pages are owned by the reception module.');
    }
    if (lower.includes('dispatch') || lower.includes('ems')) {
      return owner('ems', 'Emergency dispatch and EMS pages are owned by the EMS module.');
    }
    if (lower.includes('calculator')) {
      return owner('calculators', 'Emergency calculator hubs are owned by the calculators module.');
    }
    if (lower.includes('analytics') || lower.includes('pulse')) {
      return owner('command', 'Emergency analytics and pulse pages are owned by the command module.');
    }
    if (lower.includes('settings') || lower.includes('help')) {
      return owner('settings', 'Emergency settings and help pages are owned by settings/support surfaces.');
    }
    return owner('whiteboard', 'Emergency core pages default to the whiteboard module.');
  }

  if (directory && DIRECTORY_OWNER_RULES[directory]) {
    return DIRECTORY_OWNER_RULES[directory];
  }

  return ROOT_PAGE_OWNER_RULES[basename] || owner('platform', 'Unscoped root page defaults to platform ownership.');
}

function deriveDisposition(
  sourceFile: string,
  ownerModule: FeatureModuleId,
  fileRole: PageInventoryFileRole,
): PageDisposition {
  const lower = sourceFile.toLowerCase();
  if (lower.includes('redirect')) return 'compatibility-redirect';
  if (fileRole !== 'route-source') return 'active-domain-wrapper';
  if (ownerModule === 'tools' || ownerModule === 'calculators') return 'tool-compatibility';
  return 'active-module-backed';
}

function deriveFileRole(sourceFile: string): PageInventoryFileRole {
  if (sourceFile.endsWith('.css')) return 'support-style';
  const basename = stripExtension(sourceFile.split('/').at(-1) || sourceFile).toLowerCase();
  if (
    basename.includes('shared') ||
    basename.includes('data') ||
    basename.includes('primitives') ||
    sourceFile.includes('/components/')
  ) {
    return 'support-source';
  }
  return 'route-source';
}

function deriveInventoryPath(sourceFile: string) {
  const withoutRoot = sourceFile.replace('src/pages/', '');
  const withoutExtension = stripExtension(withoutRoot);
  const parts = withoutExtension.split('/');
  const last = parts.at(-1);
  const routeParts = last === 'index' ? parts.slice(0, -1) : parts;
  return `/${routeParts.map(toKebabRouteSegment).filter(Boolean).join('/') || 'index'}`;
}

function normalizePageGlobPath(globPath: string) {
  return globPath.replace(/^\.\.\//, 'src/').replace(/\\/g, '/');
}

function isInventoryPageFile(sourceFile: string) {
  return (
    sourceFile.startsWith('src/pages/') &&
    /\.(ts|tsx|css)$/.test(sourceFile) &&
    !/(\.test\.|\.spec\.|\.d\.ts$)/.test(sourceFile)
  );
}

function stripExtension(value: string) {
  return value.replace(/\.(tsx|ts|css)$/, '');
}

function isCalculatorSource(lowerSourceFile: string) {
  return (
    lowerSourceFile.includes('calculator') ||
    lowerSourceFile.includes('calculators') ||
    lowerSourceFile.endsWith('/abcd2calculator.tsx')
  );
}

function toKebabRouteSegment(segment: string) {
  return segment
    .replace(/Page$/, '')
    .replace(/Dashboard$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

function countBy<T>(items: readonly T[], getKey: (item: T) => string) {
  return Object.freeze(
    items.reduce<Record<string, number>>((acc, item) => {
      const key = getKey(item);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
  );
}

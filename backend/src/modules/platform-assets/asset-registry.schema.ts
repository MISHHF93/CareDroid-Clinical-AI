import { BadRequestException } from '@nestjs/common';
import { PlatformAsset } from './entities/platform-asset.entity';
import {
  OrganizationType,
  PlatformAssetLifecycle,
  PlatformAssetType,
  PricingTier,
} from './enums/platform-asset.enums';

export enum AssetRegistryType {
  CALCULATOR = 'calculator',
  CLINICAL_TOOL = 'clinical-tool',
  DASHBOARD = 'dashboard',
  WORKFLOW = 'workflow',
  PROTOCOL = 'protocol',
  SIMULATION = 'simulation',
  AI_AGENT = 'AI agent',
  MAP = 'map',
  IOT_MODULE = 'IoT module',
  FLEET_MODULE = 'fleet module',
  REPORT = 'report',
  INTEGRATION = 'integration',
  TEMPLATE = 'template',
}

export enum AssetDemoLiveStatus {
  DEMO = 'demo',
  DEMO_READY = 'demo-ready',
  DEMO_ONLY = 'demo-only',
  LIVE = 'live',
}

export enum AssetRegistryRiskLevel {
  INFORMATIONAL = 'informational',
  OPERATIONAL = 'operational',
  CLINICAL_DECISION_SUPPORT = 'clinical-decision-support',
  HIGH_RISK = 'high-risk',
  GOVERNANCE_REQUIRED = 'governance-required',
}

export interface AssetRegistryMetadata {
  assetId: string;
  title: string;
  type: AssetRegistryType;
  category: string;
  route: string;
  organizationTypes: string[];
  workspaceTags: string[];
  intendedRoles: string[];
  lifecycleStatus: PlatformAssetLifecycle;
  subscriptionTier: PricingTier;
  riskLevel: AssetRegistryRiskLevel;
  demoStatus: AssetDemoLiveStatus;
}

export type AssetRegistryValidationIssue = {
  field: keyof AssetRegistryMetadata | 'assetType';
  message: string;
};

export const REQUIRED_ASSET_METADATA_FIELDS: Array<keyof AssetRegistryMetadata> = [
  'assetId',
  'title',
  'type',
  'category',
  'route',
  'organizationTypes',
  'workspaceTags',
  'intendedRoles',
  'lifecycleStatus',
  'subscriptionTier',
  'riskLevel',
  'demoStatus',
];

const REGISTRY_TYPES = new Set(Object.values(AssetRegistryType));
const LIFECYCLE_STATUSES = new Set(Object.values(PlatformAssetLifecycle));
const SUBSCRIPTION_TIERS = new Set(Object.values(PricingTier));
const RISK_LEVELS = new Set(Object.values(AssetRegistryRiskLevel));
const DEMO_STATUSES = new Set(Object.values(AssetDemoLiveStatus));
const ORGANIZATION_TYPES = new Set(Object.values(OrganizationType));

const TYPE_ALIASES: Record<string, AssetRegistryType> = {
  [PlatformAssetType.TOOL]: AssetRegistryType.CLINICAL_TOOL,
  [PlatformAssetType.CLINICAL_TOOL]: AssetRegistryType.CLINICAL_TOOL,
  [PlatformAssetType.CALCULATOR]: AssetRegistryType.CALCULATOR,
  [PlatformAssetType.PROTOCOL]: AssetRegistryType.PROTOCOL,
  [PlatformAssetType.SIMULATION]: AssetRegistryType.SIMULATION,
  [PlatformAssetType.WORKFLOW]: AssetRegistryType.WORKFLOW,
  [PlatformAssetType.DASHBOARD]: AssetRegistryType.DASHBOARD,
  [PlatformAssetType.MAP]: AssetRegistryType.MAP,
  [PlatformAssetType.IOT]: AssetRegistryType.IOT_MODULE,
  [PlatformAssetType.FLEET]: AssetRegistryType.FLEET_MODULE,
  [PlatformAssetType.REPORT]: AssetRegistryType.REPORT,
  [PlatformAssetType.INTEGRATION]: AssetRegistryType.INTEGRATION,
  [PlatformAssetType.TEMPLATE]: AssetRegistryType.TEMPLATE,
  [PlatformAssetType.AI_AGENT]: AssetRegistryType.AI_AGENT,
  [PlatformAssetType.LABORATORY]: AssetRegistryType.CLINICAL_TOOL,
  [PlatformAssetType.GOVERNANCE]: AssetRegistryType.REPORT,
  [PlatformAssetType.PLUGIN]: AssetRegistryType.TEMPLATE,
  'ai-agent': AssetRegistryType.AI_AGENT,
  'AI agent': AssetRegistryType.AI_AGENT,
  'iot-module': AssetRegistryType.IOT_MODULE,
  'IoT module': AssetRegistryType.IOT_MODULE,
  'fleet-module': AssetRegistryType.FLEET_MODULE,
  'fleet module': AssetRegistryType.FLEET_MODULE,
};

const ENTITY_TYPE_BY_REGISTRY_TYPE: Record<AssetRegistryType, PlatformAssetType> = {
  [AssetRegistryType.CALCULATOR]: PlatformAssetType.CALCULATOR,
  [AssetRegistryType.CLINICAL_TOOL]: PlatformAssetType.CLINICAL_TOOL,
  [AssetRegistryType.DASHBOARD]: PlatformAssetType.DASHBOARD,
  [AssetRegistryType.WORKFLOW]: PlatformAssetType.WORKFLOW,
  [AssetRegistryType.PROTOCOL]: PlatformAssetType.PROTOCOL,
  [AssetRegistryType.SIMULATION]: PlatformAssetType.SIMULATION,
  [AssetRegistryType.AI_AGENT]: PlatformAssetType.AI_AGENT,
  [AssetRegistryType.MAP]: PlatformAssetType.MAP,
  [AssetRegistryType.IOT_MODULE]: PlatformAssetType.IOT,
  [AssetRegistryType.FLEET_MODULE]: PlatformAssetType.FLEET,
  [AssetRegistryType.REPORT]: PlatformAssetType.REPORT,
  [AssetRegistryType.INTEGRATION]: PlatformAssetType.INTEGRATION,
  [AssetRegistryType.TEMPLATE]: PlatformAssetType.TEMPLATE,
};

const RISK_ALIASES: Record<string, AssetRegistryRiskLevel> = {
  low: AssetRegistryRiskLevel.INFORMATIONAL,
  medium: AssetRegistryRiskLevel.CLINICAL_DECISION_SUPPORT,
  high: AssetRegistryRiskLevel.HIGH_RISK,
  critical: AssetRegistryRiskLevel.HIGH_RISK,
};

const DEMO_STATUS_ALIASES: Record<string, AssetDemoLiveStatus> = {
  demo: AssetDemoLiveStatus.DEMO,
  'demo-guideline-support': AssetDemoLiveStatus.DEMO,
  'demo-training': AssetDemoLiveStatus.DEMO_READY,
  'demo-ready': AssetDemoLiveStatus.DEMO_READY,
  'draft-ready': AssetDemoLiveStatus.DEMO_READY,
  'demo-only': AssetDemoLiveStatus.DEMO_ONLY,
  live: AssetDemoLiveStatus.LIVE,
  production: AssetDemoLiveStatus.LIVE,
};

export function normalizeRegistryType(value: unknown): AssetRegistryType | null {
  if (!value) return null;
  const raw = String(value).trim();
  return TYPE_ALIASES[raw] || (REGISTRY_TYPES.has(raw as AssetRegistryType) ? (raw as AssetRegistryType) : null);
}

export function registryTypeToEntityAssetType(type: AssetRegistryType): PlatformAssetType {
  return ENTITY_TYPE_BY_REGISTRY_TYPE[type];
}

export function normalizeAssetLifecycle(value: unknown): PlatformAssetLifecycle | null {
  if (!value) return null;
  const raw = String(value).trim();
  if (raw === 'admin-only') return PlatformAssetLifecycle.ADMIN_ONLY;
  return LIFECYCLE_STATUSES.has(raw as PlatformAssetLifecycle)
    ? (raw as PlatformAssetLifecycle)
    : null;
}

export function normalizeSubscriptionTier(value: unknown): PricingTier | null {
  if (!value) return null;
  const raw = String(value).trim();
  return SUBSCRIPTION_TIERS.has(raw as PricingTier) ? (raw as PricingTier) : null;
}

export function normalizeRiskLevel(value: unknown): AssetRegistryRiskLevel | null {
  if (!value) return null;
  const raw = String(value).trim();
  return (
    RISK_ALIASES[raw] ||
    (RISK_LEVELS.has(raw as AssetRegistryRiskLevel) ? (raw as AssetRegistryRiskLevel) : null)
  );
}

export function normalizeDemoStatus(value: unknown): AssetDemoLiveStatus | null {
  if (!value) return null;
  const raw = String(value).trim();
  return (
    DEMO_STATUS_ALIASES[raw] ||
    (DEMO_STATUSES.has(raw as AssetDemoLiveStatus) ? (raw as AssetDemoLiveStatus) : null)
  );
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
}

export function platformAssetToRegistryMetadata(asset: PlatformAsset): AssetRegistryMetadata {
  const type = normalizeRegistryType(asset.assetType) || AssetRegistryType.CLINICAL_TOOL;
  return {
    assetId: asset.id,
    title: asset.title,
    type,
    category: asset.category,
    route: asset.route,
    organizationTypes: asStringArray(asset.organizationTypes),
    workspaceTags: asStringArray(asset.workspaceTags),
    intendedRoles: asStringArray(asset.intendedRoles),
    lifecycleStatus: normalizeAssetLifecycle(asset.lifecycle) || PlatformAssetLifecycle.DRAFT,
    subscriptionTier: normalizeSubscriptionTier(asset.pricingTier) || PricingTier.STANDARD,
    riskLevel: normalizeRiskLevel(asset.riskLevel) || AssetRegistryRiskLevel.CLINICAL_DECISION_SUPPORT,
    demoStatus: normalizeDemoStatus(asset.demoStatus) || AssetDemoLiveStatus.DEMO,
  };
}

export function validateAssetRegistryMetadata(
  metadata: Partial<AssetRegistryMetadata>,
): AssetRegistryValidationIssue[] {
  const issues: AssetRegistryValidationIssue[] = [];
  const stringFields: Array<keyof AssetRegistryMetadata> = ['assetId', 'title', 'category', 'route'];

  for (const field of REQUIRED_ASSET_METADATA_FIELDS) {
    const value = metadata[field];
    if (Array.isArray(value) && !value.length) {
      issues.push({ field, message: 'is required and must contain at least one value' });
    } else if (value === undefined || value === null || value === '') {
      issues.push({ field, message: 'is required' });
    }
  }

  for (const field of stringFields) {
    const value = metadata[field];
    if (typeof value === 'string' && !value.trim()) {
      issues.push({ field, message: 'must not be blank' });
    }
  }

  if (metadata.assetId && !/^[a-z0-9][a-z0-9-:]*$/.test(metadata.assetId)) {
    issues.push({ field: 'assetId', message: 'must use lowercase registry id syntax' });
  }
  if (metadata.route && !metadata.route.startsWith('/')) {
    issues.push({ field: 'route', message: 'must start with /' });
  }
  if (metadata.type && !REGISTRY_TYPES.has(metadata.type)) {
    issues.push({ field: 'type', message: `must be one of ${[...REGISTRY_TYPES].join(', ')}` });
  }
  if (metadata.lifecycleStatus && !LIFECYCLE_STATUSES.has(metadata.lifecycleStatus)) {
    issues.push({ field: 'lifecycleStatus', message: 'is not a supported lifecycle status' });
  }
  if (metadata.subscriptionTier && !SUBSCRIPTION_TIERS.has(metadata.subscriptionTier)) {
    issues.push({ field: 'subscriptionTier', message: 'is not a supported subscription tier' });
  }
  if (metadata.riskLevel && !RISK_LEVELS.has(metadata.riskLevel)) {
    issues.push({ field: 'riskLevel', message: 'is not a supported risk level' });
  }
  if (metadata.demoStatus && !DEMO_STATUSES.has(metadata.demoStatus)) {
    issues.push({ field: 'demoStatus', message: 'is not a supported demo/live status' });
  }

  for (const organizationType of metadata.organizationTypes || []) {
    if (!ORGANIZATION_TYPES.has(organizationType as OrganizationType)) {
      issues.push({
        field: 'organizationTypes',
        message: `contains unsupported organization type ${organizationType}`,
      });
    }
  }

  return issues;
}

export function assertValidAssetRegistryMetadata(metadata: Partial<AssetRegistryMetadata>, label = 'asset') {
  const issues = validateAssetRegistryMetadata(metadata);
  if (issues.length) {
    throw new BadRequestException({
      message: `Invalid asset registry metadata for ${label}`,
      issues,
    });
  }
}

export function assertNoDuplicateAssetIds(assetIds: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const assetId of assetIds) {
    if (seen.has(assetId)) duplicates.add(assetId);
    seen.add(assetId);
  }
  if (duplicates.size) {
    throw new BadRequestException({
      message: 'Duplicate asset registry ids',
      duplicates: [...duplicates],
    });
  }
}

import { SubscriptionTier } from './entities/subscription.entity';

export enum UsageEventType {
  AI_CALL = 'ai_call',
  TOOL_LAUNCH = 'tool_launch',
  CALCULATOR_LAUNCH = 'calculator_launch',
  SIMULATION = 'simulation',
  MAP_USAGE = 'map_usage',
  IOT_TELEMETRY = 'iot_telemetry',
  STORAGE = 'storage',
  API_CALL = 'api_call',
  ACTIVE_USER = 'active_user',
  INTEGRATION = 'integration',
}

export type UsageUnit =
  | 'call'
  | 'launch'
  | 'run'
  | 'view'
  | 'event'
  | 'gb'
  | 'request'
  | 'user'
  | 'execution';

export interface UsageLimitDefinition {
  eventType: UsageEventType;
  label: string;
  unit: UsageUnit;
  limit: number | null;
}

export interface SubscriptionPlanDefinition {
  id: SubscriptionTier;
  name: string;
  description: string;
  priceMonthly: number | null;
  features: string[];
  limits: UsageLimitDefinition[];
}

export const BILLABLE_USAGE_METERS: UsageLimitDefinition[] = [
  { eventType: UsageEventType.AI_CALL, label: 'AI calls', unit: 'call', limit: 0 },
  { eventType: UsageEventType.TOOL_LAUNCH, label: 'Tool launches', unit: 'launch', limit: 0 },
  { eventType: UsageEventType.CALCULATOR_LAUNCH, label: 'Calculator launches', unit: 'launch', limit: 0 },
  { eventType: UsageEventType.SIMULATION, label: 'Simulations', unit: 'run', limit: 0 },
  { eventType: UsageEventType.MAP_USAGE, label: 'Map usage', unit: 'view', limit: 0 },
  { eventType: UsageEventType.IOT_TELEMETRY, label: 'IoT telemetry usage', unit: 'event', limit: 0 },
  { eventType: UsageEventType.STORAGE, label: 'Storage', unit: 'gb', limit: 0 },
  { eventType: UsageEventType.API_CALL, label: 'API calls', unit: 'request', limit: 0 },
  { eventType: UsageEventType.ACTIVE_USER, label: 'Active users', unit: 'user', limit: 0 },
];

const limits = (values: Partial<Record<UsageEventType, number | null>>): UsageLimitDefinition[] =>
  BILLABLE_USAGE_METERS.map((meter) => ({
    ...meter,
    limit: values[meter.eventType] ?? meter.limit,
  }));

export const SUBSCRIPTION_PLAN_DEFINITIONS: SubscriptionPlanDefinition[] = [
  {
    id: SubscriptionTier.STARTER,
    name: 'Starter',
    description: 'Small team access for initial clinical operations pilots.',
    priceMonthly: 99,
    features: ['Core clinical tools', 'Basic analytics', 'Tenant usage metering'],
    limits: limits({
      [UsageEventType.AI_CALL]: 1000,
      [UsageEventType.TOOL_LAUNCH]: 2500,
      [UsageEventType.CALCULATOR_LAUNCH]: 1500,
      [UsageEventType.SIMULATION]: 25,
      [UsageEventType.MAP_USAGE]: 500,
      [UsageEventType.IOT_TELEMETRY]: 10000,
      [UsageEventType.STORAGE]: 25,
      [UsageEventType.API_CALL]: 10000,
      [UsageEventType.ACTIVE_USER]: 25,
    }),
  },
  {
    id: SubscriptionTier.PROFESSIONAL,
    name: 'Professional',
    description: 'Operational departments with higher AI, map, and integration usage.',
    priceMonthly: 399,
    features: ['Advanced tools', 'Department workspaces', 'Priority usage limits'],
    limits: limits({
      [UsageEventType.AI_CALL]: 10000,
      [UsageEventType.TOOL_LAUNCH]: 25000,
      [UsageEventType.CALCULATOR_LAUNCH]: 10000,
      [UsageEventType.SIMULATION]: 250,
      [UsageEventType.MAP_USAGE]: 5000,
      [UsageEventType.IOT_TELEMETRY]: 250000,
      [UsageEventType.STORAGE]: 250,
      [UsageEventType.API_CALL]: 100000,
      [UsageEventType.ACTIVE_USER]: 250,
    }),
  },
  {
    id: SubscriptionTier.ENTERPRISE,
    name: 'Enterprise',
    description: 'Health system deployment with broad operational and governance coverage.',
    priceMonthly: null,
    features: ['Enterprise asset packs', 'Governance controls', 'Custom usage terms'],
    limits: limits({
      [UsageEventType.AI_CALL]: null,
      [UsageEventType.TOOL_LAUNCH]: null,
      [UsageEventType.CALCULATOR_LAUNCH]: null,
      [UsageEventType.SIMULATION]: null,
      [UsageEventType.MAP_USAGE]: null,
      [UsageEventType.IOT_TELEMETRY]: null,
      [UsageEventType.STORAGE]: null,
      [UsageEventType.API_CALL]: null,
      [UsageEventType.ACTIVE_USER]: null,
    }),
  },
  {
    id: SubscriptionTier.ACADEMIC,
    name: 'Academic',
    description: 'Research and teaching programs with simulation and study support.',
    priceMonthly: 199,
    features: ['Research workflows', 'Simulation training', 'Academic governance profile'],
    limits: limits({
      [UsageEventType.AI_CALL]: 5000,
      [UsageEventType.TOOL_LAUNCH]: 15000,
      [UsageEventType.CALCULATOR_LAUNCH]: 7500,
      [UsageEventType.SIMULATION]: 1000,
      [UsageEventType.MAP_USAGE]: 1500,
      [UsageEventType.IOT_TELEMETRY]: 50000,
      [UsageEventType.STORAGE]: 500,
      [UsageEventType.API_CALL]: 50000,
      [UsageEventType.ACTIVE_USER]: 500,
    }),
  },
  {
    id: SubscriptionTier.GOVERNMENT,
    name: 'Government',
    description: 'Public-sector and EMS deployments with compliance-forward controls.',
    priceMonthly: null,
    features: ['Government compliance profile', 'EMS operations', 'Custom procurement terms'],
    limits: limits({
      [UsageEventType.AI_CALL]: 25000,
      [UsageEventType.TOOL_LAUNCH]: 100000,
      [UsageEventType.CALCULATOR_LAUNCH]: 50000,
      [UsageEventType.SIMULATION]: 2500,
      [UsageEventType.MAP_USAGE]: 25000,
      [UsageEventType.IOT_TELEMETRY]: 1000000,
      [UsageEventType.STORAGE]: 2000,
      [UsageEventType.API_CALL]: 500000,
      [UsageEventType.ACTIVE_USER]: 2500,
    }),
  },
];

export function normalizeSubscriptionTier(tier?: SubscriptionTier | string | null): SubscriptionTier {
  if (tier === SubscriptionTier.FREE) return SubscriptionTier.STARTER;
  if (tier === SubscriptionTier.INSTITUTIONAL) return SubscriptionTier.ENTERPRISE;
  if (
    tier === SubscriptionTier.STARTER ||
    tier === SubscriptionTier.PROFESSIONAL ||
    tier === SubscriptionTier.ENTERPRISE ||
    tier === SubscriptionTier.ACADEMIC ||
    tier === SubscriptionTier.GOVERNMENT
  ) {
    return tier;
  }
  return SubscriptionTier.STARTER;
}

export function getSubscriptionPlanDefinition(
  tier?: SubscriptionTier | string | null,
): SubscriptionPlanDefinition {
  const normalized = normalizeSubscriptionTier(tier);
  return (
    SUBSCRIPTION_PLAN_DEFINITIONS.find((plan) => plan.id === normalized) ||
    SUBSCRIPTION_PLAN_DEFINITIONS[0]
  );
}

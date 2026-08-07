/**
 * Unified service registry configuration — canonical health probes, categories, and obsolete redirects.
 */

export const UNIFIED_SERVICE_REGISTRY_VERSION = '2026.06.30';

export const UNIFIED_SERVICE_HEALTH_ENDPOINTS = Object.freeze({
  backendProbe: '/health',
  systemHealth: '/api/system-health',
  saasHealth: '/api/saas-health',
  observabilityHealth: '/api/observability/health',
  observabilityDiagnostics: '/api/observability/diagnostics',
  observabilityPerformance: '/api/observability/performance',
  observabilityTraces: '/api/observability/traces',
} as const);

export const SERVICE_REGISTRY_DOMAINS = Object.freeze([
  'clinical',
  'operational',
  'integration',
  'platform',
  'ai',
  'notification',
] as const);

export type ServiceRegistryDomain = (typeof SERVICE_REGISTRY_DOMAINS)[number];

/** Services superseded by a canonical orchestrator — kept for audit, not runtime dispatch. */
export const OBSOLETE_SERVICE_REDIRECTS = Object.freeze({
  'src/services/advancedRecommendationService.ts': 'src/services/aiChiefOrchestrator.ts',
  'backend/src/modules/ai/foundation/ai-routing-engine.service.ts':
    'backend/src/modules/moe-router/moe-router.service.ts',
  'backend/src/modules/ai/foundation/ai-gateway.service.ts':
    'backend/src/modules/ai-gateway/ai-gateway.service.ts',
  'src/pages/executive/ExecutiveCommandCenter.tsx': 'src/pages/emergency/HospitalCommandCenter.tsx',
  'src/components/emergency/CommandDashboard.tsx':
    'src/pages/emergency/HospitalCommandCenter.tsx',
} as const);

/** Runtime surfaces that must consume the unified registry snapshot. */
export const UNIFIED_SERVICE_REGISTRY_CONSUMERS = Object.freeze([
  'HospitalCommandCenter',
  'EmergencyAnalytics',
  'CommandDashboard',
  'SystemHealth',
  'SaasHealthCenter',
  'CopilotPanel',
  'aiChiefOrchestrator',
  'careDroidCentralNode',
  'emergencyOperatingSystemService',
] as const);

export function inferServiceDomain(filePath: string): ServiceRegistryDomain {
  const path = filePath.toLowerCase();
  if (path.includes('/ai/') || path.includes('aichief') || path.includes('copilot') || path.includes('native-ai')) {
    return 'ai';
  }
  if (path.includes('notification') || path.includes('alert')) {
    return 'notification';
  }
  if (path.includes('interoperab') || path.includes('fhir') || path.includes('ehr') || path.includes('ems')) {
    return 'integration';
  }
  if (path.includes('api') || path.includes('store') || path.includes('config') || path.includes('central-node')) {
    return 'platform';
  }
  if (path.includes('clinical') || path.includes('triage') || path.includes('patient')) {
    return 'clinical';
  }
  return 'operational';
}
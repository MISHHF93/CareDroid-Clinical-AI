import { AI_CHIEF_MONITORING_DOMAINS } from '../config/aiChiefOrchestrationModel';
import { CARE_DROID_PAGE_ARCHITECTURE } from '../config/caredroidPageArchitecture.config';
import { EMERGENCY_PLATFORM_CONTRACT } from '../config/emergencyPlatform.config';
import {
  LIVING_REUSABLE_COMPONENTS,
  SUPERSEDED_STATIC_DOCUMENTATION,
  type LivingDocumentationEntry,
  type LivingDocumentationPageContext,
  type LivingDocumentationSection,
  type LivingDocumentationSnapshot,
} from '../config/livingDocumentationModel';
import {
  EMERGENCY_PERMISSION_REGISTRY,
  listPermissionsForRole,
} from '../config/emergencyPermissionRegistry';
import { EMERGENCY_ROLE_LABELS } from '../config/emergencyRolePermissions';
import { PAGE_API_BINDINGS } from '../config/pageApiBinding.registry';
import {
  ACTIVE_EMERGENCY_OS_API_ENDPOINT_KEYS,
  EMERGENCY_OS_API_ENDPOINTS,
} from '../services/emergencyOsApi';
import { getRouteByPath, ROUTE_RECORDS } from '../config/routes.config';
import {
  listPatientWorkflowSteps,
  PATIENT_WORKFLOW_STEPS,
} from '../config/unifiedPatientWorkflowModel';
import { WORKFLOW_AUTOMATION_DOMAINS } from '../config/unifiedWorkflowAutomationModel';
import { getBackendCapabilityStatus } from '../config/backendApiCapabilities';
import {
  CANONICAL_CONFIGURATION_REGISTRY,
  CANONICAL_ENV_VAR_REGISTRY,
} from '../config/canonicalConfigurationModel';
import { buildCanonicalConfigurationAuditSnapshot } from './canonicalConfigurationAudit';
import { listUnifiedOperationalIntelligenceDomains } from '../config/unifiedOperationalIntelligenceModel';
import { KNOWLEDGE_GRAPH_ENTITY_TYPES } from '../config/unifiedApplicationKnowledgeGraphModel';

function buildRouteEntries(): LivingDocumentationEntry[] {
  return CARE_DROID_PAGE_ARCHITECTURE.map((page) =>
    Object.freeze({
      id: `route-${page.id}`,
      section: 'routes' as const,
      label: page.label,
      summary: `${page.purpose} Owner: ${page.ownerRole}.`,
      sourceModule: 'caredroidPageArchitecture.config.ts',
      route: page.path,
      helpTopicId: getRouteByPath(page.path)?.helpTopicId,
      roles: page.roles,
      workflows: [page.workflow],
    }),
  );
}

function buildApiEntries(): LivingDocumentationEntry[] {
  const endpointEntries = ACTIVE_EMERGENCY_OS_API_ENDPOINT_KEYS.map((key) =>
    Object.freeze({
      id: `api-${key}`,
      section: 'apis' as const,
      label: key,
      summary: `Emergency OS endpoint: ${EMERGENCY_OS_API_ENDPOINTS[key]}`,
      sourceModule: 'emergencyOsApi.ts',
      endpoints: [EMERGENCY_OS_API_ENDPOINTS[key]],
      status: getBackendCapabilityStatus(key),
    }),
  );

  const bindingEntries = PAGE_API_BINDINGS.map((binding) =>
    Object.freeze({
      id: `page-api-${binding.pageId}`,
      section: 'apis' as const,
      label: binding.pageId,
      summary: binding.notes || `Page API binding (${binding.mode})`,
      sourceModule: 'pageApiBinding.registry.ts',
      route: binding.path,
      endpoints: binding.endpoints,
      status: binding.mode,
    }),
  );

  return [...endpointEntries, ...bindingEntries];
}

function buildRoleEntries(): LivingDocumentationEntry[] {
  return Object.entries(EMERGENCY_ROLE_LABELS).map(([roleId, label]) =>
    Object.freeze({
      id: `role-${roleId}`,
      section: 'roles' as const,
      label,
      summary: `Emergency role: ${roleId}`,
      sourceModule: 'emergencyRolePermissions.ts',
      permissions: listPermissionsForRole(roleId),
      route: undefined,
    }),
  );
}

function buildWorkflowEntries(): LivingDocumentationEntry[] {
  const patientSteps = listPatientWorkflowSteps().map((step) =>
    Object.freeze({
      id: `workflow-step-${step.id}`,
      section: 'workflows' as const,
      label: step.label,
      summary: step.primaryAction,
      sourceModule: 'unifiedPatientWorkflowModel.ts',
      route: step.route,
      roles: [step.ownerRole],
      workflows: [step.id],
    }),
  );

  const automationDomains = WORKFLOW_AUTOMATION_DOMAINS.map((domain) =>
    Object.freeze({
      id: `workflow-domain-${domain.id}`,
      section: 'workflows' as const,
      label: domain.label,
      summary: domain.description,
      sourceModule: 'unifiedWorkflowAutomationModel.ts',
      route: domain.route,
      roles: [domain.ownerRole],
      workflows: [...domain.triggerEvents],
    }),
  );

  return [...patientSteps, ...automationDomains];
}

function buildServiceEntries(): LivingDocumentationEntry[] {
  const platformEntries = Object.entries(EMERGENCY_PLATFORM_CONTRACT).map(([key, value]) =>
    Object.freeze({
      id: `service-${key}`,
      section: 'services' as const,
      label: key,
      summary: String(value),
      sourceModule: 'emergencyPlatform.config.ts',
      workflows: [String(value)],
    }),
  );

  const oiDomains = listUnifiedOperationalIntelligenceDomains().map((domain) =>
    Object.freeze({
      id: `oi-domain-${domain.id}`,
      section: 'services' as const,
      label: `OI: ${domain.label}`,
      summary: domain.description,
      sourceModule: 'unifiedOperationalIntelligenceModel.ts',
      roles: [domain.ownerRole],
      workflows: [...domain.triggerEvents],
    }),
  );

  const kgEntities = KNOWLEDGE_GRAPH_ENTITY_TYPES.map((entityType) =>
    Object.freeze({
      id: `kg-entity-${entityType}`,
      section: 'services' as const,
      label: `KG: ${entityType.replace(/_/g, ' ')}`,
      summary: `Knowledge graph entity type connected via unifiedApplicationKnowledgeGraphService.`,
      sourceModule: 'unifiedApplicationKnowledgeGraphModel.ts',
      workflows: [entityType],
    }),
  );

  return [...platformEntries, ...oiDomains, ...kgEntities];
}

function buildAiEntries(): LivingDocumentationEntry[] {
  return AI_CHIEF_MONITORING_DOMAINS.map((domain) =>
    Object.freeze({
      id: `ai-${domain.id}`,
      section: 'ai' as const,
      label: domain.label,
      summary: domain.description,
      sourceModule: 'aiChiefOrchestrationModel.ts',
      roles: [domain.ownerRole],
      endpoints: domain.backendEndpoints,
      workflows: [...domain.signalSources],
    }),
  );
}

function buildPermissionEntries(): LivingDocumentationEntry[] {
  return EMERGENCY_PERMISSION_REGISTRY.map((permission) =>
    Object.freeze({
      id: `permission-${permission.key}`,
      section: 'permissions' as const,
      label: permission.label,
      summary: permission.description,
      sourceModule: 'emergencyPermissionRegistry.ts',
      permissions: [permission.key],
    }),
  );
}

function buildConfigurationEntries(): LivingDocumentationEntry[] {
  const audit = buildCanonicalConfigurationAuditSnapshot();
  const registryEntries = CANONICAL_CONFIGURATION_REGISTRY.map((entry) =>
    Object.freeze({
      id: `config-${entry.id}`,
      section: 'configuration' as const,
      label: entry.id,
      summary: `${entry.purpose} [${entry.layer}]`,
      sourceModule: entry.path,
      status: entry.layer === 'compat' ? ('redirect' as const) : ('active' as const),
      roles: entry.supersedes?.length ? [...entry.supersedes] : undefined,
    }),
  );

  const envEntries = CANONICAL_ENV_VAR_REGISTRY.slice(0, 12).map((entry) =>
    Object.freeze({
      id: `env-${entry.key}`,
      section: 'configuration' as const,
      label: entry.key,
      summary: `${entry.purpose} (parser: ${entry.parserModule})`,
      sourceModule: '.env.example',
      status: entry.documentedIn === 'env.example' ? ('active' as const) : ('partial' as const),
    }),
  );

  const auditSummary = Object.freeze({
    id: 'config-audit-snapshot',
    section: 'configuration' as const,
    label: 'Configuration audit',
    summary: `${audit.registryEntryCount} registry entries, ${audit.envVarCount} env vars, ${audit.conflicts.length} conflicts (${audit.compatShims.length} compat shims).`,
    sourceModule: 'canonicalConfigurationAudit.ts',
    status: audit.conflicts.some((c) => c.severity === 'error') ? ('partial' as const) : ('active' as const),
  });

  return [...registryEntries, ...envEntries, auditSummary];
}

function buildComponentEntries(): LivingDocumentationEntry[] {
  return LIVING_REUSABLE_COMPONENTS.map((component) =>
    Object.freeze({
      id: `component-${component.id}`,
      section: 'components' as const,
      label: component.label,
      summary: component.purpose,
      sourceModule: component.path,
      components: [component.id],
    }),
  );
}

export function buildLivingDocumentationSnapshot(
  now: Date = new Date(),
): LivingDocumentationSnapshot {
  const sections = Object.freeze({
    routes: Object.freeze(buildRouteEntries()),
    apis: Object.freeze(buildApiEntries()),
    roles: Object.freeze(buildRoleEntries()),
    workflows: Object.freeze(buildWorkflowEntries()),
    services: Object.freeze(buildServiceEntries()),
    ai: Object.freeze(buildAiEntries()),
    permissions: Object.freeze(buildPermissionEntries()),
    components: Object.freeze(buildComponentEntries()),
    configuration: Object.freeze(buildConfigurationEntries()),
  });

  return Object.freeze({
    engineId: 'living-documentation',
    generatedAt: now.toISOString(),
    sourceRevision: EMERGENCY_PLATFORM_CONTRACT.apiFacade,
    sections,
    metrics: Object.freeze({
      routes: sections.routes.length,
      apis: sections.apis.length,
      roles: sections.roles.length,
      workflows: sections.workflows.length,
      services: sections.services.length,
      aiCapabilities: sections.ai.length,
      permissions: sections.permissions.length,
      components: sections.components.length,
      configuration: sections.configuration.length,
    }),
    supersededDocs: SUPERSEDED_STATIC_DOCUMENTATION,
  });
}

export function resolveLivingDocumentationForPath(
  pathname: string,
  snapshot: LivingDocumentationSnapshot = buildLivingDocumentationSnapshot(),
): LivingDocumentationPageContext | null {
  const normalized = pathname.split('?')[0];
  const routeRecord = getRouteByPath(normalized);
  const architecturePage = CARE_DROID_PAGE_ARCHITECTURE.find(
    (page) => normalized === page.path || normalized.startsWith(`${page.path}/`),
  );
  const apiBinding = PAGE_API_BINDINGS.find(
    (binding) =>
      normalized === binding.path.split('?')[0] ||
      normalized.startsWith(binding.path.split('?')[0]),
  );

  if (!architecturePage && !apiBinding && !routeRecord) return null;

  const workflowStep = PATIENT_WORKFLOW_STEPS.find(
    (step) => normalized.startsWith(step.route.split('?')[0]),
  );

  const relatedRoutes = ROUTE_RECORDS.filter(
    (record) =>
      record.navGroup === routeRecord?.navGroup &&
      record.path !== normalized &&
      record.status !== 'future',
  )
    .slice(0, 6)
    .map((record) => record.path);

  const pagePermissions = routeRecord?.requiredPermissions?.length
    ? [...routeRecord.requiredPermissions]
    : [];

  return Object.freeze({
    path: normalized,
    pageId: architecturePage?.id || apiBinding?.pageId,
    label: architecturePage?.label || routeRecord?.id || normalized,
    purpose: architecturePage?.purpose,
    ownerRole: architecturePage?.ownerRole,
    helpTopicId: routeRecord?.helpTopicId,
    endpoints: apiBinding?.endpoints || [],
    permissions: pagePermissions,
    workflows: Object.freeze([
      ...(architecturePage ? [architecturePage.workflow] : []),
      ...(workflowStep ? [workflowStep.id] : []),
    ]),
    components: snapshot.sections.components
      ?.filter((entry) => entry.summary.toLowerCase().includes(architecturePage?.id || ''))
      .map((entry) => entry.label)
      .slice(0, 4) || [],
    relatedRoutes,
  });
}

export function listLivingDocumentationBySection(
  section: LivingDocumentationSection,
  snapshot: LivingDocumentationSnapshot = buildLivingDocumentationSnapshot(),
): readonly LivingDocumentationEntry[] {
  return snapshot.sections[section] || [];
}

export default {
  buildLivingDocumentationSnapshot,
  resolveLivingDocumentationForPath,
  listLivingDocumentationBySection,
};
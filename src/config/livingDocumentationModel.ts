/**
 * Living documentation model — implementation-derived docs that stay synchronized
 * with routes, APIs, roles, workflows, services, AI capabilities, permissions,
 * and reusable components.
 */

export type LivingDocumentationSection =
  | 'routes'
  | 'apis'
  | 'roles'
  | 'workflows'
  | 'services'
  | 'ai'
  | 'permissions'
  | 'components'
  | 'configuration';

export type LivingDocumentationEntry = Readonly<{
  id: string;
  section: LivingDocumentationSection;
  label: string;
  summary: string;
  sourceModule: string;
  route?: string;
  helpTopicId?: string;
  roles?: readonly string[];
  permissions?: readonly string[];
  endpoints?: readonly string[];
  workflows?: readonly string[];
  components?: readonly string[];
  status?: 'active' | 'redirect' | 'local-only' | 'partial' | 'wired';
}>;

export type LivingDocumentationPageContext = Readonly<{
  path: string;
  pageId?: string;
  label: string;
  purpose?: string;
  ownerRole?: string;
  helpTopicId?: string;
  endpoints: readonly string[];
  permissions: readonly string[];
  workflows: readonly string[];
  components: readonly string[];
  relatedRoutes: readonly string[];
}>;

export type SupersededDocumentationRecord = Readonly<{
  path: string;
  replacedBy: string;
  reason: string;
}>;

export type LivingDocumentationSnapshot = Readonly<{
  engineId: 'living-documentation';
  generatedAt: string;
  sourceRevision: string;
  sections: Readonly<Partial<Record<LivingDocumentationSection, readonly LivingDocumentationEntry[]>>>;
  metrics: Readonly<{
    routes: number;
    apis: number;
    roles: number;
    workflows: number;
    services: number;
    aiCapabilities: number;
    permissions: number;
    components: number;
    configuration: number;
  }>;
  supersededDocs: readonly SupersededDocumentationRecord[];
}>;

export type LivingContextualHelpEntry = Readonly<{
  pathPrefix: string;
  guidanceId: string;
  title: string;
  detail: string;
  helpTopicId: string;
  tone?: 'info' | 'warning' | 'ai';
  workflowStepId?: string;
}>;

export const LIVING_DOCUMENTATION_SECTIONS: readonly LivingDocumentationSection[] = Object.freeze([
  'routes',
  'apis',
  'roles',
  'workflows',
  'services',
  'ai',
  'permissions',
  'components',
  'configuration',
]);

/** Static docs superseded by generated living documentation. */
export const SUPERSEDED_STATIC_DOCUMENTATION: readonly SupersededDocumentationRecord[] = Object.freeze([
  Object.freeze({
    path: 'docs/specs/page-map.md',
    replacedBy: 'docs/generated/routes.md',
    reason: 'Route records now derive from src/config/routes.config.ts and caredroidPageArchitecture.config.ts',
  }),
  Object.freeze({
    path: 'docs/specs/role-permission-map.md',
    replacedBy: 'docs/generated/permissions.md',
    reason: 'Permissions derive from emergencyPermissionRegistry.ts',
  }),
  Object.freeze({
    path: 'docs/architecture/endpoint-to-frontend-matrix.md',
    replacedBy: 'docs/generated/apis.md',
    reason: 'API bindings derive from pageApiBinding.registry.ts and emergencyOsApi.ts',
  }),
  Object.freeze({
    path: 'docs/specs/ai-chief-spec.md',
    replacedBy: 'docs/generated/ai-capabilities.md',
    reason: 'AI Chief domains derive from aiChiefOrchestrationModel.ts',
  }),
  Object.freeze({
    path: 'docs/workflows/patient-journey.md',
    replacedBy: 'docs/generated/workflows.md',
    reason: 'Workflow steps derive from unifiedPatientWorkflowModel.ts',
  }),
  Object.freeze({
    path: 'docs/services/service-catalog.md',
    replacedBy: 'docs/generated/services.md',
    reason: 'Platform services derive from emergencyPlatform.config.ts',
  }),
  Object.freeze({
    path: 'docs/specs/route-map.md',
    replacedBy: 'docs/generated/routes.md',
    reason: 'Runtime routes derive from routes.config.ts and caredroidPageArchitecture.config.ts',
  }),
  Object.freeze({
    path: 'docs/specs/full-emergency-care-journey.md',
    replacedBy: 'docs/generated/workflows.md',
    reason: 'Journey phases derive from hospitalOperatingSystemModel and unifiedPatientWorkflowModel',
  }),
  Object.freeze({
    path: 'docs/architecture/endpoint-to-frontend-matrix.md',
    replacedBy: 'docs/generated/apis.md',
    reason: 'Endpoint matrix is generated from emergencyOsApi and pageApiBinding.registry',
  }),
]);

export const LIVING_DOCUMENTATION_CONTRACT = Object.freeze({
  engineId: 'living-documentation',
  sectionCount: LIVING_DOCUMENTATION_SECTIONS.length,
  generatedOutputDir: 'docs/generated',
  sourceOfTruth: 'src/config and src/services registries',
  autoSync: true,
});

export const LIVING_REUSABLE_COMPONENTS = Object.freeze([
  Object.freeze({
    id: 'ContextualGuidance',
    label: 'Contextual guidance banner',
    path: 'src/components/ui/ContextualGuidance.tsx',
    purpose: 'Dismissible in-page hints linked to HelpHub topics.',
  }),
  Object.freeze({
    id: 'HelpHub',
    label: 'Help hub drawer',
    path: 'src/components/help/HelpHub.tsx',
    purpose: 'Role and page procedures with living implementation reference.',
  }),
  Object.freeze({
    id: 'CopilotPanel',
    label: 'CareDroid Copilot panel',
    path: 'src/components/CopilotPanel.tsx',
    purpose: 'Case-aware AI decision support with human review.',
  }),
  Object.freeze({
    id: 'ConfirmDialogProvider',
    label: 'Confirm dialog provider',
    path: 'src/components/ui/ConfirmDialogProvider.tsx',
    purpose: 'Standardized confirmation flows across clinical actions.',
  }),
  Object.freeze({
    id: 'PatientDetailPanel',
    label: 'Patient detail panel',
    path: 'src/components/PatientDetailPanel.tsx',
    purpose: 'Patient card drawer with timeline, vitals, and journey actions.',
  }),
  Object.freeze({
    id: 'AdministrativeAutomationReviewPanel',
    label: 'Automation review panel',
    path: 'src/components/emergency/AdministrativeAutomationReviewPanel.tsx',
    purpose: 'Human oversight queue for workflow automations.',
  }),
  Object.freeze({
    id: 'HospitalJourneyCommandBar',
    label: 'Hospital journey command bar',
    path: 'src/components/emergency/HospitalJourneyCommandBar.tsx',
    purpose: 'Operational command bars for journey and workflow surfaces.',
  }),
  Object.freeze({
    id: 'AiChiefOrchestrationBar',
    label: 'AI Chief orchestration bar',
    path: 'src/components/ai/AiChiefOrchestrationBar.tsx',
    purpose: 'Continuous monitoring recommendations with explainable rationale.',
  }),
  Object.freeze({
    id: 'LivingContextualHelpBanner',
    label: 'Living contextual help banner',
    path: 'src/components/help/LivingContextualHelpBanner.tsx',
    purpose: 'Route-linked guidance synced from livingDocumentationContextualHelp.ts.',
  }),
  Object.freeze({
    id: 'UnifiedOperationalIntelligencePanel',
    label: 'Unified operational intelligence panel',
    path: 'src/components/emergency/UnifiedOperationalIntelligencePanel.tsx',
    purpose: 'Backend-event-driven operational insights across seven domains.',
  }),
  Object.freeze({
    id: 'UnifiedApplicationKnowledgeGraphPanel',
    label: 'Application knowledge graph panel',
    path: 'src/components/emergency/UnifiedApplicationKnowledgeGraphPanel.tsx',
    purpose: 'Connected entity graph for patients, staff, alerts, workflows, and services.',
  }),
  Object.freeze({
    id: 'UnifiedWorkflowAutomationCommandBar',
    label: 'Workflow automation command bar',
    path: 'src/components/emergency/WorkflowAutomationCommandBar.tsx',
    purpose: 'Pending automation review queue with human oversight actions.',
  }),
]);
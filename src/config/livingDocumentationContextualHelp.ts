import { CANONICAL_ROUTES } from './routes.config';
import type { LivingContextualHelpEntry } from './livingDocumentationModel';

/** Route-prefix contextual help linked to HelpHub topics and living documentation. */
export const LIVING_CONTEXTUAL_HELP_ENTRIES: readonly LivingContextualHelpEntry[] = Object.freeze([
  Object.freeze({
    pathPrefix: CANONICAL_ROUTES.emergencyReception,
    guidanceId: 'reception-workspace-intake-hint',
    title: 'One-step intake routing',
    detail: 'Capture complaint and identity, then route — triage assist, encounter, and queue placement sync automatically.',
    helpTopicId: 'reception',
    tone: 'info',
    workflowStepId: 'registration',
  }),
  Object.freeze({
    pathPrefix: CANONICAL_ROUTES.emergencyCommandCenter,
    guidanceId: 'command-center-intelligence-hint',
    title: 'Unified operational intelligence',
    detail: 'Metrics, bottlenecks, AI recommendations, and knowledge-graph connections refresh from backend events in real time.',
    helpTopicId: 'command-center',
    tone: 'ai',
  }),
  Object.freeze({
    pathPrefix: CANONICAL_ROUTES.emergencyWhiteboard,
    guidanceId: 'whiteboard-journey-hint',
    title: 'Shared patient journey board',
    detail: 'Patient cards reflect reception intake, triage acuity, assignments, and disposition — select a card for timeline and Copilot context.',
    helpTopicId: 'whiteboard',
    tone: 'info',
    workflowStepId: 'assessment',
  }),
  Object.freeze({
    pathPrefix: CANONICAL_ROUTES.emergencyQueues,
    guidanceId: 'queues-flow-hint',
    title: 'Queue movement',
    detail: 'Advance patients through canonical workflow steps. Queue breaches trigger alerts and operational intelligence refresh.',
    helpTopicId: 'queue',
    tone: 'info',
    workflowStepId: 'waiting',
  }),
  Object.freeze({
    pathPrefix: CANONICAL_ROUTES.emergencyCopilot,
    guidanceId: 'copilot-advisory-hint',
    title: 'Advisory AI Chief',
    detail: 'Copilot suggestions require clinician review. Recommendations link to patient context, protocols, and calculators.',
    helpTopicId: 'copilot',
    tone: 'ai',
  }),
  Object.freeze({
    pathPrefix: CANONICAL_ROUTES.emergencyAlerts,
    guidanceId: 'alerts-escalation-hint',
    title: 'Alert acknowledgement',
    detail: 'Critical alerts escalate through the alert lifecycle orchestrator. Acknowledge or assign before advancing patient workflow.',
    helpTopicId: 'alerts',
    tone: 'warning',
  }),
  Object.freeze({
    pathPrefix: CANONICAL_ROUTES.emergencyEms,
    guidanceId: 'ems-handoff-hint',
    title: 'EMS pre-arrival pipeline',
    detail: 'Inbound units, offload timing, and handoff checklists connect to reception and ED readiness surfaces.',
    helpTopicId: 'ems',
    tone: 'info',
    workflowStepId: 'arrival',
  }),
  Object.freeze({
    pathPrefix: CANONICAL_ROUTES.emergencyAnalytics,
    guidanceId: 'analytics-living-docs-hint',
    title: 'Live analytics reference',
    detail: 'Charts and KPIs derive from central node, knowledge graph, and operational intelligence — regenerate docs with npm run docs:generate.',
    helpTopicId: 'analytics',
    tone: 'info',
  }),
  Object.freeze({
    pathPrefix: CANONICAL_ROUTES.emergencyCapacity,
    guidanceId: 'capacity-surge-hint',
    title: 'Capacity and boarding',
    detail: 'Bed occupancy, boarding load, and surge posture feed operational intelligence and knowledge-graph capacity nodes.',
    helpTopicId: 'capacity',
    tone: 'warning',
    workflowStepId: 'disposition',
  }),
  Object.freeze({
    pathPrefix: CANONICAL_ROUTES.emergencyPatients,
    guidanceId: 'patients-timeline-hint',
    title: 'Patient timeline context',
    detail: 'Patient cards link alerts, workflows, AI recommendations, and knowledge-graph neighbors into one timeline.',
    helpTopicId: 'patients',
    tone: 'info',
    workflowStepId: 'assessment',
  }),
  Object.freeze({
    pathPrefix: CANONICAL_ROUTES.emergencyReferrals,
    guidanceId: 'referrals-workflow-hint',
    title: 'Referral coordination',
    detail: 'Open referrals appear as workflow nodes in the application knowledge graph and route to specialty owners.',
    helpTopicId: 'referrals',
    tone: 'info',
    workflowStepId: 'disposition',
  }),
  Object.freeze({
    pathPrefix: CANONICAL_ROUTES.emergencySettings,
    guidanceId: 'settings-config-hint',
    title: 'Configuration source of truth',
    detail: 'Tenant thresholds and operational intelligence settings are documented in docs/generated/configuration.md.',
    helpTopicId: 'settings',
    tone: 'info',
  }),
  Object.freeze({
    pathPrefix: '/workflows',
    guidanceId: 'workflows-automation-hint',
    title: 'Unified workflow automation',
    detail: 'Automation queue items require human review before advancing patient journey or routing actions.',
    helpTopicId: 'tools',
    tone: 'ai',
  }),
  Object.freeze({
    pathPrefix: CANONICAL_ROUTES.triage,
    guidanceId: 'triage-acuity-hint',
    title: 'Triage and acuity',
    detail: 'Acuity assignment stays clinician-controlled. AI triage assist is advisory and links to patient workflow step assessment.',
    helpTopicId: 'triage',
    tone: 'warning',
    workflowStepId: 'triage',
  }),
]);

export function resolveLivingContextualHelpForPath(pathname: string): LivingContextualHelpEntry | null {
  const normalized = pathname.split('?')[0];
  const match = [...LIVING_CONTEXTUAL_HELP_ENTRIES]
    .sort((left, right) => right.pathPrefix.length - left.pathPrefix.length)
    .find(
      (entry) =>
        normalized === entry.pathPrefix || normalized.startsWith(`${entry.pathPrefix}/`),
    );
  return match ?? null;
}

export function getLivingContextualHelpById(guidanceId: string): LivingContextualHelpEntry | null {
  return LIVING_CONTEXTUAL_HELP_ENTRIES.find((entry) => entry.guidanceId === guidanceId) ?? null;
}
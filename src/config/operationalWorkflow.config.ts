import { CANONICAL_ROUTES } from './routes.config';

export type OperationalWorkflowActionId =
  | 'dispatch-echo-delta'
  | 'ed-readiness-overdue'
  | 'ack-critical-alerts'
  | 'review-ai-chief'
  | 'clear-service-bottleneck'
  | 'route-staff';

export type OperationalWorkflowActionTone = 'critical' | 'warning' | 'info' | 'success';

export type OperationalWorkflowActionDefinition = Readonly<{
  id: OperationalWorkflowActionId;
  label: string;
  owner: string;
  route: string;
  defaultDeadlineMinutes: number | null;
  priority: number;
  tone: OperationalWorkflowActionTone;
  emptyState: string;
  nextAction: string;
}>;

export type OperationalWorkflowAction = OperationalWorkflowActionDefinition &
  Readonly<{
    count: number;
    deadlineLabel: string;
    reason: string;
    active: boolean;
  }>;

export type OperationalWorkflowActionContext = Readonly<{
  dispatch?: {
    echoCount?: number;
    deltaCount?: number;
    transporting?: number;
  };
  readiness?: {
    pendingCount?: number;
    overdueCount?: number;
  };
  metrics?: {
    unacknowledgedCriticalAlerts?: number;
    criticalAlerts?: number;
    p1p2Patients?: number;
    inboundEms?: number;
  };
  staffRouting?: {
    pendingAcknowledgement?: number;
  };
  bottlenecks?: {
    analytics?: {
      activeCount?: number;
    };
    activeBottlenecks?: readonly unknown[];
  };
}>;

export const COMMAND_CENTER_WORKFLOW_ACTIONS: readonly OperationalWorkflowActionDefinition[] =
  Object.freeze([
    {
      id: 'dispatch-echo-delta',
      label: 'Dispatch Echo/Delta calls',
      owner: 'Dispatcher',
      route: CANONICAL_ROUTES.emergencyDispatch,
      defaultDeadlineMinutes: 3,
      priority: 1,
      tone: 'critical',
      emptyState: 'No Echo or Delta calls waiting.',
      nextAction: 'Assign unit and send hospital pre-alert',
    },
    {
      id: 'ed-readiness-overdue',
      label: 'Prepare ED readiness',
      owner: 'Charge nurse',
      route: CANONICAL_ROUTES.emergencyEdReadiness,
      defaultDeadlineMinutes: 3,
      priority: 2,
      tone: 'critical',
      emptyState: 'No overdue readiness plans.',
      nextAction: 'Confirm bed, team, equipment, and specialty activation',
    },
    {
      id: 'ack-critical-alerts',
      label: 'Acknowledge critical alerts',
      owner: 'Assigned clinician',
      route: CANONICAL_ROUTES.emergencyAlerts,
      defaultDeadlineMinutes: 3,
      priority: 3,
      tone: 'critical',
      emptyState: 'No unacknowledged critical alerts.',
      nextAction: 'Review alert, accept owner, and document response',
    },
    {
      id: 'review-ai-chief',
      label: 'Review AI Chief recommendations',
      owner: 'Triage nurse / physician',
      route: CANONICAL_ROUTES.emergencyCopilot,
      defaultDeadlineMinutes: 5,
      priority: 4,
      tone: 'warning',
      emptyState: 'No high-acuity recommendation review pending.',
      nextAction: 'Accept, modify, dismiss, or escalate with reason',
    },
    {
      id: 'clear-service-bottleneck',
      label: 'Clear service bottlenecks',
      owner: 'Patient flow coordinator',
      route: CANONICAL_ROUTES.emergencyReports,
      defaultDeadlineMinutes: 10,
      priority: 5,
      tone: 'warning',
      emptyState: 'No active service bottlenecks.',
      nextAction: 'Assign owner, choose fallback, and update analytics',
    },
    {
      id: 'route-staff',
      label: 'Route pending staff assignments',
      owner: 'Charge nurse',
      route: CANONICAL_ROUTES.emergencyWhiteboard,
      defaultDeadlineMinutes: 5,
      priority: 6,
      tone: 'info',
      emptyState: 'No pending staff acknowledgements.',
      nextAction: 'Notify owner or backup role',
    },
  ]);

const countByAction = (
  actionId: OperationalWorkflowActionId,
  context: OperationalWorkflowActionContext,
): number => {
  switch (actionId) {
    case 'dispatch-echo-delta':
      return Number(context.dispatch?.echoCount || 0) + Number(context.dispatch?.deltaCount || 0);
    case 'ed-readiness-overdue':
      return (
        Number(context.readiness?.overdueCount || 0) || Number(context.readiness?.pendingCount || 0)
      );
    case 'ack-critical-alerts':
      return Number(
        context.metrics?.unacknowledgedCriticalAlerts ?? context.metrics?.criticalAlerts ?? 0,
      );
    case 'review-ai-chief':
      return Number(context.metrics?.p1p2Patients || 0) + Number(context.metrics?.inboundEms || 0);
    case 'clear-service-bottleneck':
      return Number(
        context.bottlenecks?.analytics?.activeCount ??
          context.bottlenecks?.activeBottlenecks?.length ??
          0,
      );
    case 'route-staff':
      return Number(context.staffRouting?.pendingAcknowledgement || 0);
    default:
      return 0;
  }
};

const reasonByAction = (
  action: OperationalWorkflowActionDefinition,
  context: OperationalWorkflowActionContext,
  count: number,
): string => {
  if (count <= 0) return action.emptyState;
  switch (action.id) {
    case 'dispatch-echo-delta':
      return `${context.dispatch?.echoCount || 0} Echo and ${context.dispatch?.deltaCount || 0} Delta calls need dispatch review.`;
    case 'ed-readiness-overdue':
      return `${context.readiness?.overdueCount || 0} overdue and ${context.readiness?.pendingCount || 0} pending readiness plans.`;
    case 'ack-critical-alerts':
      return `${count} critical alerts require acknowledgement-first review.`;
    case 'review-ai-chief':
      return `${context.metrics?.p1p2Patients || 0} P1/P2 patients and ${context.metrics?.inboundEms || 0} inbound EMS cases need recommendation review.`;
    case 'clear-service-bottleneck':
      return `${count} active bottleneck signals are affecting patient flow.`;
    case 'route-staff':
      return `${count} staff assignments are waiting for acknowledgement.`;
    default:
      return action.emptyState;
  }
};

export function buildCommandCenterWorkflowActions(
  context: OperationalWorkflowActionContext,
  limit = 5,
): readonly OperationalWorkflowAction[] {
  return COMMAND_CENTER_WORKFLOW_ACTIONS.map((definition) => {
    const count = countByAction(definition.id, context);
    return Object.freeze({
      ...definition,
      count,
      active: count > 0,
      deadlineLabel: definition.defaultDeadlineMinutes
        ? `${definition.defaultDeadlineMinutes} min target`
        : 'No fixed target',
      reason: reasonByAction(definition, context, count),
    });
  })
    .sort((a, b) => Number(b.active) - Number(a.active) || a.priority - b.priority)
    .slice(0, limit);
}

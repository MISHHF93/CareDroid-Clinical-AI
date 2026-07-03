import { CANONICAL_ROUTES } from '../config/routes.config';
import type { WorkflowAutomationItem } from '../config/unifiedWorkflowAutomationModel';

export type UnifiedWorkflowCommandAction = Readonly<{
  id: string;
  label: string;
  count: number;
  reason: string;
  owner: string;
  deadlineLabel: string;
  nextAction: string;
  tone: 'critical' | 'warning' | 'info' | 'success';
  active: boolean;
  route: string;
  linkedItemId?: string;
  oneClickAction?: WorkflowAutomationItem['oneClickAction'];
}>;

function toneForItem(item: WorkflowAutomationItem): UnifiedWorkflowCommandAction['tone'] {
  if (item.priority === 'critical') return 'critical';
  if (item.priority === 'high') return 'warning';
  return 'info';
}

function deadlineForItem(item: WorkflowAutomationItem): string {
  if (item.source === 'three_minute_mission') return '3 min target';
  if (item.priority === 'critical') return 'Now';
  return 'Review';
}

export function mapUnifiedWorkflowItemsToCommandActions(
  items: readonly WorkflowAutomationItem[],
  limit = 6,
): readonly UnifiedWorkflowCommandAction[] {
  return Object.freeze(
    items.slice(0, limit).map((item) =>
      Object.freeze({
        id: item.id,
        label: item.title,
        count: 1,
        reason: item.summary,
        owner: item.ownerRole,
        deadlineLabel: deadlineForItem(item),
        nextAction: item.proposedAction,
        tone: toneForItem(item),
        active: item.status === 'pending_review' || item.status === 'active',
        route: item.route || CANONICAL_ROUTES.emergencyCommandCenter,
        linkedItemId: item.id,
        oneClickAction: item.oneClickAction,
      }),
    ),
  );
}
import { describe, expect, it } from 'vitest';
import { mapUnifiedWorkflowItemsToCommandActions } from './unifiedWorkflowPresentation';
import type { WorkflowAutomationItem } from '../config/unifiedWorkflowAutomationModel';

const sampleItem: WorkflowAutomationItem = {
  id: 'uwa-admin-1',
  domain: 'patient_routing',
  source: 'admin_automation',
  status: 'pending_review',
  priority: 'critical',
  title: 'Route patient to triage',
  summary: 'Registration complete.',
  proposedAction: 'Send to triage queue.',
  route: '/emergency/queues',
  ownerRole: 'triage_nurse',
  humanReviewRequired: true,
  oneClickAction: 'approve',
  linkedTaskId: 'auto-route-1',
  updatedAt: '2026-07-01T12:00:00.000Z',
};

describe('unifiedWorkflowPresentation', () => {
  it('maps unified workflow items to command center actions', () => {
    const actions = mapUnifiedWorkflowItemsToCommandActions([sampleItem], 4);
    expect(actions).toHaveLength(1);
    expect(actions[0]?.label).toBe('Route patient to triage');
    expect(actions[0]?.tone).toBe('critical');
    expect(actions[0]?.oneClickAction).toBe('approve');
  });
});
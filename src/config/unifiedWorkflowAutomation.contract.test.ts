import { describe, expect, it } from 'vitest';
import {
  UNIFIED_WORKFLOW_AUTOMATION_CONTRACT,
  UNIFIED_WORKFLOW_SAFETY_STATEMENT,
  WORKFLOW_AUTOMATION_DOMAINS,
  listWorkflowAutomationBackendEndpoints,
} from './unifiedWorkflowAutomationModel';
import { buildUnifiedWorkflowAutomationSnapshot } from '../services/unifiedWorkflowAutomationService';

describe('unifiedWorkflowAutomation contract', () => {
  it('covers all eleven workflow domains with routes and trigger events', () => {
    expect(WORKFLOW_AUTOMATION_DOMAINS).toHaveLength(11);
    for (const domain of WORKFLOW_AUTOMATION_DOMAINS) {
      expect(domain.route.length).toBeGreaterThan(0);
      expect(domain.ownerRole.length).toBeGreaterThan(0);
    }
    expect(listWorkflowAutomationBackendEndpoints().length).toBeGreaterThanOrEqual(8);
  });

  it('requires human oversight on every unified workflow item', () => {
    const snapshot = buildUnifiedWorkflowAutomationSnapshot();
    expect(UNIFIED_WORKFLOW_SAFETY_STATEMENT.humanReviewRequired).toBe(true);
    expect(UNIFIED_WORKFLOW_SAFETY_STATEMENT.replacesClinicianJudgment).toBe(false);
    expect(snapshot.items.every((item) => item.humanReviewRequired)).toBe(true);
  });

  it('publishes event-driven automation contract metadata', () => {
    expect(UNIFIED_WORKFLOW_AUTOMATION_CONTRACT.eventDriven).toBe(true);
    expect(UNIFIED_WORKFLOW_AUTOMATION_CONTRACT.humanOversightRequired).toBe(true);
    expect(UNIFIED_WORKFLOW_AUTOMATION_CONTRACT.domainCount).toBe(11);
  });
});

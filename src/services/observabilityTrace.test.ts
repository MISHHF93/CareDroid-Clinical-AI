import { describe, expect, it } from 'vitest';
import { registerAIAuditSink, logAIAuditEvent, buildAIAuditEvent } from '../../lib/ai/auditLogger';
import observabilityService from './observabilityService';
import { startWorkflowTrace } from './observabilityTrace';

describe('observabilityTrace', () => {
  it('records AI audit events through the observability sink', () => {
    observabilityService.initialize();
    const auditEvents: string[] = [];
    registerAIAuditSink((event) => {
      auditEvents.push(event.action);
      observabilityService.recordAuditEvent({
        module: event.module,
        action: event.action,
        result: event.result,
        patientId: event.patientId,
        purpose: event.purpose,
        requestType: event.requestType,
        blocked: event.safety.blocked,
        requiresHumanReview: event.safety.requiresHumanReview,
      });
    });
    logAIAuditEvent(
      buildAIAuditEvent({
        userId: 'user-1',
        tenantId: 'tenant-1',
        module: 'copilot',
        action: 'recommendation_generated',
        purpose: 'Clinical decision support',
        result: 'success',
        requestType: 'COPILOT_CHAT',
        inputPreview: 'chest pain',
        safety: {
          requiresHumanReview: true,
          blocked: false,
          reasons: [],
        },
      }),
    );
    expect(auditEvents).toContain('recommendation_generated');
    const snapshot = observabilityService.buildDiagnosticsSnapshot();
    expect(snapshot.eventCounts.audit).toBeGreaterThan(0);
  });

  it('measures workflow span duration on end', () => {
    observabilityService.initialize();
    const trace = startWorkflowTrace('workflow-automation-refresh', {
      source: 'test',
      summary: 'Automation refresh',
    });
    trace.end('success');
    const snapshot = observabilityService.buildDiagnosticsSnapshot();
    expect(snapshot.performanceMarks['workflow:workflow-automation-refresh']).toBeDefined();
  });
});
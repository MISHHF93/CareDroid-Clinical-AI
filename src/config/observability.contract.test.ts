import { describe, expect, it } from 'vitest';
import { EMERGENCY_PLATFORM_CONTRACT } from './emergencyPlatform.config';
import {
  CRITICAL_WORKFLOW_TRACE_IDS,
  OBSERVABILITY_CONTRACT,
} from './observabilityModel';
import { UNIFIED_SERVICE_HEALTH_ENDPOINTS } from './unifiedServiceRegistry.config';
import { startWorkflowTrace } from '../services/observabilityTrace';
import observabilityService from '../services/observabilityService';

describe('observability contract', () => {
  it('registers observability in the emergency platform contract', () => {
    expect(EMERGENCY_PLATFORM_CONTRACT.observabilityEngine).toBe('caredroid-observability');
  });

  it('exposes health and diagnostics endpoints in the service registry', () => {
    expect(UNIFIED_SERVICE_HEALTH_ENDPOINTS.observabilityHealth).toBe('/api/observability/health');
    expect(UNIFIED_SERVICE_HEALTH_ENDPOINTS.observabilityDiagnostics).toBe(
      '/api/observability/diagnostics',
    );
  });

  it('traces critical workflows end-to-end with correlation ids', () => {
    observabilityService.initialize();
    const trace = startWorkflowTrace('patient-workflow-transition', {
      patientId: 'patient-42',
      source: 'test',
      summary: 'Test transition',
    });
    expect(CRITICAL_WORKFLOW_TRACE_IDS).toContain('patient-workflow-transition');
    expect(trace.traceId).toBe(observabilityService.getCorrelationId());
    trace.end('success', { toState: 'Triage' });
    const snapshot = observabilityService.buildDiagnosticsSnapshot();
    expect(snapshot.recentWorkflowSpans[0]?.workflowType).toBe('patient-workflow-transition.success');
    expect(OBSERVABILITY_CONTRACT.criticalWorkflows).toContain('patient-intake-handoff');
    expect(OBSERVABILITY_CONTRACT.criticalWorkflows).toContain('knowledge-graph-refresh');
    expect(OBSERVABILITY_CONTRACT.criticalWorkflows).toContain('living-documentation-refresh');
    expect(OBSERVABILITY_CONTRACT.criticalWorkflows).toContain('ai-chief-request');
    expect(OBSERVABILITY_CONTRACT.criticalWorkflows).toContain('emergency-realtime-session');
    expect(UNIFIED_SERVICE_HEALTH_ENDPOINTS.observabilityPerformance).toBe(
      '/api/observability/performance',
    );
    expect(CRITICAL_WORKFLOW_TRACE_IDS.length).toBe(12);
  });
});
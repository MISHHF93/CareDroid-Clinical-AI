import { describe, expect, it } from 'vitest';
import {
  ACTIVE_EMERGENCY_OS_API_ENDPOINT_KEYS,
  EMERGENCY_PLATFORM_CONTRACT,
  LIVING_DOCUMENTATION_CONTRACT,
  UNIFIED_APPLICATION_KNOWLEDGE_GRAPH_CONTRACT,
  UNIFIED_OPERATIONAL_INTELLIGENCE_CONTRACT,
  UNIFIED_WORKFLOW_AUTOMATION_CONTRACT,
} from './emergencyPlatform.config';

describe('emergencyPlatform.config', () => {
  it('publishes platform contract metadata', () => {
    expect(EMERGENCY_PLATFORM_CONTRACT.humanOversightRequired).toBe(true);
    expect(EMERGENCY_PLATFORM_CONTRACT.apiFacade).toBe('emergencyOsApi');
    expect(EMERGENCY_PLATFORM_CONTRACT.operationalIntelligenceEngine).toBe(
      'unified-operational-intelligence',
    );
    expect(UNIFIED_WORKFLOW_AUTOMATION_CONTRACT.domainCount).toBe(11);
    expect(UNIFIED_OPERATIONAL_INTELLIGENCE_CONTRACT.domainCount).toBe(7);
    expect(EMERGENCY_PLATFORM_CONTRACT.knowledgeGraphEngine).toBe(
      'unified-application-knowledge-graph',
    );
    expect(UNIFIED_APPLICATION_KNOWLEDGE_GRAPH_CONTRACT.entityTypeCount).toBe(12);
    expect(EMERGENCY_PLATFORM_CONTRACT.livingDocumentationEngine).toBe('living-documentation');
    expect(LIVING_DOCUMENTATION_CONTRACT.autoSync).toBe(true);
  });

  it('exports active emergency API endpoint keys', () => {
    expect(ACTIVE_EMERGENCY_OS_API_ENDPOINT_KEYS).toContain('workflowOrchestration');
    expect(ACTIVE_EMERGENCY_OS_API_ENDPOINT_KEYS).toContain('patientFlow');
    expect(ACTIVE_EMERGENCY_OS_API_ENDPOINT_KEYS).toContain('operatingSurface');
  });
});

import { describe, expect, it } from 'vitest';
import {
  UNIFIED_OPERATIONAL_INTELLIGENCE_CONTRACT,
  UNIFIED_OPERATIONAL_INTELLIGENCE_DOMAINS,
  UNIFIED_OPERATIONAL_INTELLIGENCE_SAFETY_STATEMENT,
  UNIFIED_OPERATIONAL_INTELLIGENCE_TRIGGER_EVENTS,
  isUnifiedOperationalIntelligenceTriggerEvent,
  listUnifiedOperationalIntelligenceBackendEndpoints,
  listUnifiedOperationalIntelligenceDomains,
  resolveDomainForAnomalyCategory,
} from './unifiedOperationalIntelligenceModel';

describe('unifiedOperationalIntelligenceModel', () => {
  it('defines seven consolidated operational intelligence domains', () => {
    expect(UNIFIED_OPERATIONAL_INTELLIGENCE_DOMAINS).toHaveLength(7);
    expect(listUnifiedOperationalIntelligenceDomains().map((domain) => domain.id)).toEqual(
      expect.arrayContaining([
        'patient_flow',
        'staffing',
        'capacity',
        'alerts',
        'workflow',
        'service_health',
        'ai_recommendations',
      ]),
    );
  });

  it('requires human oversight and backend-authoritative intelligence', () => {
    expect(UNIFIED_OPERATIONAL_INTELLIGENCE_SAFETY_STATEMENT.humanReviewRequired).toBe(true);
    expect(UNIFIED_OPERATIONAL_INTELLIGENCE_SAFETY_STATEMENT.advisoryOnly).toBe(true);
    expect(UNIFIED_OPERATIONAL_INTELLIGENCE_SAFETY_STATEMENT.backendAuthoritative).toBe(true);
  });

  it('lists backend events that drive operational intelligence refresh', () => {
    expect(UNIFIED_OPERATIONAL_INTELLIGENCE_TRIGGER_EVENTS.length).toBeGreaterThanOrEqual(20);
    expect(isUnifiedOperationalIntelligenceTriggerEvent('journey_state_changed')).toBe(true);
    expect(isUnifiedOperationalIntelligenceTriggerEvent('central_node_snapshot')).toBe(true);
    expect(isUnifiedOperationalIntelligenceTriggerEvent('operational_intelligence_updated')).toBe(
      true,
    );
    expect(isUnifiedOperationalIntelligenceTriggerEvent('unknown_event')).toBe(false);
  });

  it('maps anomaly categories to unified operational domains', () => {
    expect(resolveDomainForAnomalyCategory('capacity_surge')).toBe('capacity');
    expect(resolveDomainForAnomalyCategory('staff_routing_delay')).toBe('staffing');
    expect(resolveDomainForAnomalyCategory('queue_bottleneck')).toBe('patient_flow');
  });

  it('publishes event-driven contract metadata and backend endpoints', () => {
    expect(UNIFIED_OPERATIONAL_INTELLIGENCE_CONTRACT.domainCount).toBe(7);
    expect(UNIFIED_OPERATIONAL_INTELLIGENCE_CONTRACT.eventDriven).toBe(true);
    expect(UNIFIED_OPERATIONAL_INTELLIGENCE_CONTRACT.backendAuthoritative).toBe(true);
    expect(listUnifiedOperationalIntelligenceBackendEndpoints()).toEqual(
      expect.arrayContaining([
        '/api/emergency/operational-intelligence/snapshot',
        '/api/emergency/operational-intelligence/evaluate',
        '/api/emergency/patient-flow',
      ]),
    );
  });
});

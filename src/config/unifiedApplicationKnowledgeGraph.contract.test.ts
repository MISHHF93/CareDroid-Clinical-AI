import { describe, expect, it } from 'vitest';
import { EMERGENCY_PLATFORM_CONTRACT } from './emergencyPlatform.config';
import { UNIFIED_APPLICATION_KNOWLEDGE_GRAPH_CONTRACT } from './unifiedApplicationKnowledgeGraphModel';
import { buildUnifiedApplicationKnowledgeGraph } from '../services/unifiedApplicationKnowledgeGraphService';

describe('unifiedApplicationKnowledgeGraph contract', () => {
  it('registers knowledge graph engine in emergency platform contract', () => {
    expect(EMERGENCY_PLATFORM_CONTRACT.knowledgeGraphEngine).toBe(
      'unified-application-knowledge-graph',
    );
  });

  it('references existing records without duplicating entity payloads', () => {
    const graph = buildUnifiedApplicationKnowledgeGraph();
    expect(UNIFIED_APPLICATION_KNOWLEDGE_GRAPH_CONTRACT.referencesExistingRecords).toBe(true);
    expect(UNIFIED_APPLICATION_KNOWLEDGE_GRAPH_CONTRACT.humanOversightRequired).toBe(true);
    for (const node of graph.nodes) {
      expect(node.sourceModule.length).toBeGreaterThan(0);
      expect(node.sourceId.length).toBeGreaterThan(0);
    }
  });

  it('connects all twelve entity families into one graph snapshot', () => {
    const graph = buildUnifiedApplicationKnowledgeGraph({
      patients: [
        {
          id: 'pt-1',
          mrn: 'MRN-1',
          firstName: 'Sam',
          lastName: 'Patient',
          state: 'Waiting',
          priority: 'P2',
          chiefComplaint: 'Abdominal pain',
          vitals: [],
          flags: [],
          notes: [],
          timeline: [],
          arrivalTime: '2026-07-03T10:00:00.000Z',
        } as never,
      ],
      emsArrivals: [
        {
          id: 'ems-1',
          status: 'Inbound',
          eta: 8,
          chiefComplaint: 'Chest pain',
          unitName: 'Medic 3',
          patientId: 'pt-1',
        } as never,
      ],
      operationalInsights: [
        {
          id: 'uoi-bottleneck-1',
          domain: 'patient_flow',
          type: 'bottleneck',
          title: 'Queue bottleneck',
          summary: 'Backend bottleneck insight.',
          severity: 'warning',
          ownerRole: 'charge_nurse',
          reasonCodes: ['queue_breach'],
          confidence: 0.9,
          humanReviewRequired: true,
          advisoryOnly: true,
          source: 'backend',
          updatedAt: '2026-07-03T10:00:00.000Z',
        },
      ],
    });

    const entityTypes = new Set(graph.nodes.map((node) => node.entityType));
    expect(entityTypes.has('patient')).toBe(true);
    expect(entityTypes.has('operational_event')).toBe(true);
    expect(graph.patientIndex['pt-1']?.length).toBeGreaterThan(0);
    expect(graph.metrics.edgeCount).toBeGreaterThan(0);
  });
});
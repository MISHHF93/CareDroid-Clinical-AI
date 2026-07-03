import { describe, expect, it } from 'vitest';
import {
  KNOWLEDGE_GRAPH_ENTITY_TYPES,
  KNOWLEDGE_GRAPH_RELATIONSHIP_TYPES,
  UNIFIED_APPLICATION_KNOWLEDGE_GRAPH_CONTRACT,
  UNIFIED_APPLICATION_KNOWLEDGE_GRAPH_SAFETY,
  knowledgeGraphNodeId,
  listKnowledgeGraphEntities,
  parseKnowledgeGraphNodeId,
} from './unifiedApplicationKnowledgeGraphModel';

describe('unifiedApplicationKnowledgeGraphModel', () => {
  it('defines twelve operational entity types', () => {
    expect(KNOWLEDGE_GRAPH_ENTITY_TYPES).toHaveLength(12);
    expect(listKnowledgeGraphEntities()).toHaveLength(12);
    expect(listKnowledgeGraphEntities().map((entry) => entry.entityType)).toEqual(
      expect.arrayContaining([
        'patient',
        'staff',
        'department',
        'alert',
        'workflow',
        'ai_recommendation',
        'service',
        'queue',
        'room',
        'bed',
        'diagnostic',
        'operational_event',
      ]),
    );
  });

  it('defines thirteen relationship types for connected entities', () => {
    expect(KNOWLEDGE_GRAPH_RELATIONSHIP_TYPES).toHaveLength(13);
    expect(KNOWLEDGE_GRAPH_RELATIONSHIP_TYPES).toContain('assigned_to');
    expect(KNOWLEDGE_GRAPH_RELATIONSHIP_TYPES).toContain('recommends');
    expect(KNOWLEDGE_GRAPH_RELATIONSHIP_TYPES).toContain('waiting_in');
  });

  it('requires human oversight and references existing records only', () => {
    expect(UNIFIED_APPLICATION_KNOWLEDGE_GRAPH_SAFETY.humanReviewRequired).toBe(true);
    expect(UNIFIED_APPLICATION_KNOWLEDGE_GRAPH_SAFETY.referencesExistingRecords).toBe(true);
    expect(UNIFIED_APPLICATION_KNOWLEDGE_GRAPH_CONTRACT.referencesExistingRecords).toBe(true);
  });

  it('encodes and parses canonical graph node ids', () => {
    const nodeId = knowledgeGraphNodeId('patient', 'pt-123');
    expect(nodeId).toBe('kg:patient:pt-123');
    expect(parseKnowledgeGraphNodeId(nodeId)).toEqual({
      entityType: 'patient',
      sourceId: 'pt-123',
    });
    expect(parseKnowledgeGraphNodeId('invalid')).toBeNull();
  });
});
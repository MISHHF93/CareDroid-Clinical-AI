import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handleUnifiedApplicationKnowledgeGraphBackendEvent,
  isKnowledgeGraphTriggerEvent,
  refreshUnifiedApplicationKnowledgeGraph,
} from './unifiedApplicationKnowledgeGraphEngine';
import { getUnifiedApplicationKnowledgeGraphStoreState } from '../store/unifiedApplicationKnowledgeGraphStore';

describe('unifiedApplicationKnowledgeGraphEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('recognizes operational websocket events as graph refresh triggers', () => {
    expect(isKnowledgeGraphTriggerEvent('journey_state_changed')).toBe(true);
    expect(isKnowledgeGraphTriggerEvent('operational_intelligence_updated')).toBe(true);
    expect(isKnowledgeGraphTriggerEvent('unknown_event')).toBe(false);
  });

  it('builds and stores a unified application knowledge graph snapshot', () => {
    refreshUnifiedApplicationKnowledgeGraph('engine_start');
    const snapshot = getUnifiedApplicationKnowledgeGraphStoreState().snapshot;
    expect(snapshot?.engineId).toBe('unified-application-knowledge-graph');
    expect(snapshot?.metrics.nodeCount).toBeGreaterThan(0);
  });

  it('schedules refresh for backend events', () => {
    handleUnifiedApplicationKnowledgeGraphBackendEvent('patient_flow_updated');
    vi.runAllTimers();
    expect(getUnifiedApplicationKnowledgeGraphStoreState().lastTriggerEvent).toBe(
      'patient_flow_updated',
    );
  });
});

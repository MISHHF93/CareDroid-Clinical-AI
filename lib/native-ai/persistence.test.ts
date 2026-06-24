import { beforeEach, describe, expect, it } from 'vitest';
import { Priority } from '../../src/types/emergency';
import {
  loadPersistedDriftHistory,
  loadPersistedTriageRules,
  loadRoutingAuditLog,
  persistDriftHistory,
  persistTriageRules,
  appendRoutingAuditEntry,
} from './persistence';

describe('native AI persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists and reloads triage rules', () => {
    const rules = [
      {
        id: 'rule-test',
        label: 'Test rule',
        naturalLanguageSource: 'Test',
        priority: Priority.P2,
        conditions: [{ field: 'complaint', operator: 'contains' as const, value: 'pain' }],
        confidence: 0.8,
        requiresHumanReview: true as const,
        createdAt: '2026-06-24T00:00:00.000Z',
      },
    ];
    persistTriageRules(rules);
    expect(loadPersistedTriageRules()).toEqual(rules);
  });

  it('persists drift history by model id', () => {
    persistDriftHistory({
      'native-ai-router': [
        {
          modelId: 'native-ai-router',
          version: '1.0.0',
          metric: 'f1',
          value: 0.82,
          evaluatedAt: '2026-06-24T00:00:00.000Z',
          sampleSize: 100,
          sourceState: 'live',
        },
      ],
    });
    const history = loadPersistedDriftHistory();
    expect(history['native-ai-router']).toHaveLength(1);
  });

  it('appends routing audit entries', () => {
    appendRoutingAuditEntry({ runId: 'route-1', patientId: 'p1' });
    expect(loadRoutingAuditLog()).toHaveLength(1);
  });
});
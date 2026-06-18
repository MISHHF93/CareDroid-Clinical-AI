import { describe, expect, it } from 'vitest';
import { Priority } from '../../src/types/emergency';
import {
  buildOperationalContextFromCounts,
  buildTriageAssistEnvelope,
  mapPriorityToSuggestedQueue,
  mergeLlmTriageEnrichment,
} from './triageAssist';

describe('buildTriageAssistEnvelope', () => {
  it('suggests P1 for critical vitals with human-review disclaimer', () => {
    const envelope = buildTriageAssistEnvelope({
      complaintCategory: 'Respiratory',
      complaintText: 'severe breathlessness',
      vitals: { spo2: 85 },
    });

    expect(envelope.suggestedPriority).toBe(Priority.P1);
    expect(envelope.requiresHumanReview).toBe(true);
    expect(envelope.disclaimers.length).toBeGreaterThan(0);
    expect(envelope.suggestedQueue).toBe('Resuscitation');
  });

  it('includes operational intelligence context in rationale', () => {
    const envelope = buildTriageAssistEnvelope(
      { complaintCategory: 'Other', complaintText: 'ankle sprain' },
      {
        operationalContext: buildOperationalContextFromCounts({
          triageCount: 8,
          waitingCount: 14,
          emsInboundCount: 2,
          capacityBand: 'Yellow',
        }),
      },
    );

    expect(envelope.source).toBe('rules+oi');
    expect(envelope.rationale.some((line) => line.includes('awaiting triage'))).toBe(true);
    expect(envelope.operationalContext?.queuePressure).toBe('high');
  });

  it('merges optional LLM enrichment without removing rule baseline', () => {
    const base = buildTriageAssistEnvelope({
      complaintCategory: 'Cardiac',
      complaintText: 'chest pain',
      vitals: { hr: 125 },
    });
    const merged = mergeLlmTriageEnrichment(base, {
      summary: 'Consider ECG and reassessment in 15 minutes.',
      additionalRationale: ['EMS handoff noted diaphoresis — confirm with patient.'],
    });

    expect(merged.source).toBe('rules+llm');
    expect(merged.rationale.some((line) => line.includes('EMS handoff'))).toBe(true);
    expect(merged.llmEnrichment?.summary).toContain('ECG');
  });

  it('maps priority bands to queue recommendations', () => {
    expect(mapPriorityToSuggestedQueue(Priority.P2)).toBe('Emergent');
    expect(mapPriorityToSuggestedQueue(Priority.P5)).toBe('Standard waiting');
  });
});

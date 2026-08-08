import { describe, expect, it } from 'vitest';
import {
  AI_RESPONSE_SOURCE_CATEGORIES,
  buildAiResponseProvenance,
  isAiResponseProvenance,
  isAiResponseSourceCategory,
  PROVENANCE_CONTRACT_VERSION,
} from './provenanceContract';
import { runCareDroidAI } from './careDroidAI';

describe('buildAiResponseProvenance', () => {
  it('always requires clinician review and fills defaults', () => {
    const p = buildAiResponseProvenance({ responseSource: 'LLM_GENERATED', confidence: 0.8 });
    expect(p.contractVersion).toBe(PROVENANCE_CONTRACT_VERSION);
    expect(p.requiresClinicianReview).toBe(true);
    expect(p.confidence).toBe(0.8);
    expect(p.limitations.length).toBeGreaterThan(0);
    expect(p.uncertainty.length).toBeGreaterThan(0);
    expect(p.applicablePopulation.length).toBeGreaterThan(0);
    expect(isAiResponseProvenance(p)).toBe(true);
  });

  it('maps RAG chunks and sources into evidence', () => {
    const p = buildAiResponseProvenance({
      responseSource: 'RAG_ASSISTED',
      ragChunks: [
        {
          id: 'c1',
          text: 'Antibiotics within 1 hour for sepsis.',
          score: 0.9,
          metadata: {
            sourceId: 'kn-sepsis-hour-1-v1',
            title: 'Sepsis Hour-1',
            metadata: { evidenceGrade: 'summary', artifactId: 'kn-sepsis-hour-1-v1' },
          },
        },
      ],
      missingInformation: ['lactate'],
    });
    expect(p.evidence.some((e) => e.artifactId === 'kn-sepsis-hour-1-v1')).toBe(true);
    expect(p.missingInformation).toContain('lactate');
    expect(p.sourceVersions.length).toBeGreaterThan(0);
  });

  // 2026-08-08: responseSource is the canonical AI Core Node provenance
  // category (LLM_GENERATED/MODEL_PREDICTION/RAG_ASSISTED/TOOL_RESULT/
  // DETERMINISTIC_RULE/STATIC_CONTENT/FIXTURE_DEMO/UNAVAILABLE), required on
  // every caller rather than inferred -- this codebase's own audit history
  // found silent/inferred provenance defaults repeatedly wrong for a
  // specific path.
  it('carries the caller-declared responseSource through to the output', () => {
    for (const category of AI_RESPONSE_SOURCE_CATEGORIES) {
      const p = buildAiResponseProvenance({ responseSource: category });
      expect(p.responseSource).toBe(category);
      expect(isAiResponseSourceCategory(p.responseSource)).toBe(true);
    }
  });

  it('defaults confidence to 0 for sources with no real result to be confident about', () => {
    expect(buildAiResponseProvenance({ responseSource: 'UNAVAILABLE' }).confidence).toBe(0);
    expect(buildAiResponseProvenance({ responseSource: 'STATIC_CONTENT' }).confidence).toBe(0);
    expect(buildAiResponseProvenance({ responseSource: 'FIXTURE_DEMO' }).confidence).toBe(0);
  });

  it('an explicit confidence always overrides the responseSource-based default', () => {
    expect(
      buildAiResponseProvenance({ responseSource: 'UNAVAILABLE', confidence: 0.4 }).confidence,
    ).toBe(0.4);
  });

  it('isAiResponseProvenance rejects a payload with an invalid responseSource', () => {
    const p = buildAiResponseProvenance({ responseSource: 'LLM_GENERATED', confidence: 0.5 });
    expect(isAiResponseProvenance({ ...p, responseSource: 'not_a_real_category' })).toBe(false);
    expect(isAiResponseProvenance({ ...p, responseSource: undefined })).toBe(false);
  });
});

describe('CareDroid AI provenance contract', () => {
  it('attaches provenance on structured success responses', async () => {
    const response = await runCareDroidAI({
      intent: 'patient_intake_assist',
      input: {
        symptoms: ['chest pain'],
        arrivalMode: 'EMS',
      },
    });
    expect(response.requiresClinicianReview).toBe(true);
    expect(response.provenance).toBeDefined();
    expect(response.provenance.requiresClinicianReview).toBe(true);
    expect(response.provenance.contractVersion).toBe(PROVENANCE_CONTRACT_VERSION);
    // Structured CareDroid AI intents are rule/heuristic handlers, never a
    // foundation-model call -- see buildSuccessResponse in careDroidAI.ts.
    expect(response.provenance.responseSource).toBe('DETERMINISTIC_RULE');
    expect(Array.isArray(response.provenance.evidence)).toBe(true);
    expect(Array.isArray(response.provenance.limitations)).toBe(true);
  });
});

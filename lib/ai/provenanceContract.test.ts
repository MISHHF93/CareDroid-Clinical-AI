import { describe, expect, it } from 'vitest';
import {
  buildAiResponseProvenance,
  isAiResponseProvenance,
  PROVENANCE_CONTRACT_VERSION,
} from './provenanceContract';
import { runCareDroidAI } from './careDroidAI';

describe('buildAiResponseProvenance', () => {
  it('always requires clinician review and fills defaults', () => {
    const p = buildAiResponseProvenance({ confidence: 0.8 });
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
    expect(response.provenance.contractVersion).toBe('1.0.0');
    expect(Array.isArray(response.provenance.evidence)).toBe(true);
    expect(Array.isArray(response.provenance.limitations)).toBe(true);
  });
});

import {
  extractClassifiableText,
  fuseUnifiedHeadConfidence,
  mapRouterArtifactTypeToArtifactEntity,
  resolveExecutorToolId,
  shouldAcceptUnifiedNodeResult,
} from './routing-maps';

describe('routing-maps', () => {
  it('maps NLU intents to executor tool ids', () => {
    expect(resolveExecutorToolId('sofa_score_calculation')).toBe('sofa-calculator');
    expect(resolveExecutorToolId('drug_interaction_check')).toBe('drug-interactions');
    expect(resolveExecutorToolId('lab_interpretation')).toBe('lab-interpreter');
    expect(resolveExecutorToolId('diagnosis_support')).toBe('differential-diagnosis');
    expect(resolveExecutorToolId('clinical_guideline_lookup')).toBe('protocol-lookup');
  });

  it('does not treat general_clinical_query as a tool id', () => {
    expect(resolveExecutorToolId('general_clinical_query', undefined, 'hello')).toBeUndefined();
  });

  it('infers executor from message text without coarse artifact default', () => {
    expect(
      resolveExecutorToolId('general_clinical_query', 'calculator', 'Calculate SOFA score for sepsis'),
    ).toBe('sofa-calculator');
    expect(
      resolveExecutorToolId(undefined, 'tool', 'Check warfarin and aspirin interaction'),
    ).toBe('drug-interactions');
  });

  it('does not force sofa-calculator for unrelated calculator artifact type', () => {
    expect(
      resolveExecutorToolId('general_clinical_query', 'calculator', 'Tell me about pneumonia'),
    ).toBeUndefined();
  });

  it('fuses dual-head confidence when calculator agrees with clinical tool', () => {
    const fused = fuseUnifiedHeadConfidence({
      intentConfidence: 0.62,
      artifactType: 'calculator',
      artifactConfidence: 0.9,
      primaryIsClinicalTool: true,
    });
    expect(fused).toBeGreaterThan(0.7);
    expect(fused).toBeLessThanOrEqual(0.98);
  });

  it('accepts unified node on dual-head agreement below 0.7 intent', () => {
    expect(
      shouldAcceptUnifiedNodeResult({
        intentConfidence: 0.6,
        artifactType: 'calculator',
        artifactConfidence: 0.8,
        primaryIsClinicalTool: true,
      }),
    ).toBe(true);
    expect(
      shouldAcceptUnifiedNodeResult({
        intentConfidence: 0.5,
        artifactType: 'tool',
        artifactConfidence: 0.5,
        primaryIsClinicalTool: false,
      }),
    ).toBe(false);
  });

  it('maps router artifact types to artifact entity categories', () => {
    expect(mapRouterArtifactTypeToArtifactEntity('calculator')).toBe('calculator');
    expect(mapRouterArtifactTypeToArtifactEntity('route')).toBe('workflow');
    expect(mapRouterArtifactTypeToArtifactEntity('unknown')).toBe('ai_output');
  });

  it('extracts classifiable text from structured AI node input', () => {
    expect(extractClassifiableText({ chiefComplaint: 'Chest pain for 2 hours' })).toBe(
      'Chest pain for 2 hours',
    );
  });
});
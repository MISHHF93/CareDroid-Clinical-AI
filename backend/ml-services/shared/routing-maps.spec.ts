import {
  extractClassifiableText,
  mapRouterArtifactTypeToArtifactEntity,
  resolveExecutorToolId,
} from './routing-maps';

describe('routing-maps', () => {
  it('maps NLU intents to executor tool ids', () => {
    expect(resolveExecutorToolId('sofa_score_calculation')).toBe('sofa-calculator');
    expect(resolveExecutorToolId('drug_interaction_check')).toBe('drug-interactions');
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
    expect(resolveExecutorToolId('general_clinical_query', 'calculator', 'Tell me about pneumonia')).toBe(
      'general_clinical_query',
    );
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
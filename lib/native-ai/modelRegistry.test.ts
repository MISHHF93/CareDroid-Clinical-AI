import { listRegisteredModels } from './modelRegistry';

describe('modelRegistry (P0.4 audit)', () => {
  const HEURISTIC_IDS = [
    'native-ai-router',
    'post-ed-orientation',
    'prolonged-stay',
    'admission-likelihood',
    'nlp-triage-expert',
    'native-ai-cardiac-vascular-v1',
    'native-ai-pulmonary-v1',
  ];

  it('reports "rules" for every entry confirmed by direct source inspection to be heuristic/rule-based, not a trained model', () => {
    const models = listRegisteredModels();
    for (const id of HEURISTIC_IDS) {
      const model = models.find((entry) => entry.id === id);
      expect(model, `expected a registry entry for ${id}`).toBeDefined();
      expect(model!.algorithm).toBe('rules');
    }
  });

  it('leaves the one not-yet-traced entry (multi-channel-text) untouched rather than guessing', () => {
    const model = listRegisteredModels().find((entry) => entry.id === 'multi-channel-text');
    expect(model?.algorithm).toBe('nlp_hybrid');
  });

  it('still exposes maturity and requiresHumanReview for every entry, unchanged by the algorithm-field correction', () => {
    for (const model of listRegisteredModels()) {
      expect(model.requiresHumanReview).toBe(true);
      expect(['live', 'demo', 'simulated', 'shadow']).toContain(model.maturity);
    }
  });
});

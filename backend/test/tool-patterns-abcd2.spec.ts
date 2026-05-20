import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

describe('matchToolPatterns — ABCD²', () => {
  it('matches abcd2 and TIA stroke risk phrases', () => {
    const a = matchToolPatterns('calculate abcd2 score for tia');
    expect(a.some((m) => m.toolId === 'abcd2')).toBe(true);

    const b = matchToolPatterns('tia stroke risk abcd squared');
    expect(b.find((m) => m.toolId === 'abcd2')).toBeDefined();
  });
});

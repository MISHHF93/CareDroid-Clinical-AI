import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

describe('matchToolPatterns — STOP-Bang', () => {
  it('matches stop bang and sleep apnea score phrases', () => {
    const a = matchToolPatterns('calculate stop bang score');
    expect(a.some((m) => m.toolId === 'stop-bang')).toBe(true);

    const b = matchToolPatterns('sleep apnea score screening');
    expect(b.some((m) => m.toolId === 'stop-bang')).toBe(true);
  });

  it('prefers stop-bang over unrelated calculators for osa risk wording', () => {
    const matches = matchToolPatterns('osa risk stop bang questionnaire');
    expect(matches[0]?.toolId).toBe('stop-bang');
  });
});

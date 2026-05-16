import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

describe('matchToolPatterns — Ottawa Ankle Rule', () => {
  it('matches ottawa ankle and ankle xray rule phrases', () => {
    const a = matchToolPatterns('ottawa ankle rule');
    expect(a.some((m) => m.toolId === 'ottawa-ankle')).toBe(true);

    const b = matchToolPatterns('ankle injury imaging decision');
    expect(b.some((m) => m.toolId === 'ottawa-ankle')).toBe(true);
  });

  it('prefers ottawa-ankle for ottawa ankle rule wording', () => {
    const matches = matchToolPatterns('apply ottawa ankle rule');
    expect(matches[0]?.toolId).toBe('ottawa-ankle');
  });
});

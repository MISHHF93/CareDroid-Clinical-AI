import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

describe('matchToolPatterns — ASCVD risk', () => {
  it('matches ascvd and cardiovascular risk phrases', () => {
    const a = matchToolPatterns('calculate ascvd 10 year risk');
    expect(a.some((m) => m.toolId === 'ascvd-risk')).toBe(true);

    const b = matchToolPatterns('cardiovascular risk pooled cohort');
    expect(b.some((m) => m.toolId === 'ascvd-risk')).toBe(true);
  });

  it('prefers ascvd-risk over cha2ds2vasc for ascvd wording', () => {
    const matches = matchToolPatterns('ascvd score primary prevention');
    expect(matches[0]?.toolId).toBe('ascvd-risk');
    expect(matches.some((m) => m.toolId === 'cha2ds2vasc-calculator')).toBe(false);
  });

  it('prefers cha2ds2vasc over ascvd-risk for atrial fibrillation stroke wording', () => {
    const matches = matchToolPatterns('cha2ds2vasc atrial fibrillation stroke risk');
    expect(matches[0]?.toolId).toBe('cha2ds2vasc-calculator');
    expect(matches.some((m) => m.toolId === 'ascvd-risk')).toBe(false);
  });
});

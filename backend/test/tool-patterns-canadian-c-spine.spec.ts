import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

describe('matchToolPatterns — Canadian C-Spine Rule', () => {
  it('matches canadian c-spine and cervical spine rule phrases', () => {
    const a = matchToolPatterns('apply canadian c-spine rule');
    expect(a.some((m) => m.toolId === 'canadian-c-spine')).toBe(true);

    const b = matchToolPatterns('cervical spine rule neck trauma');
    expect(b.some((m) => m.toolId === 'canadian-c-spine')).toBe(true);
  });

  it('prefers canadian-c-spine for neck trauma imaging rule', () => {
    const matches = matchToolPatterns('neck trauma imaging rule');
    expect(matches[0]?.toolId).toBe('canadian-c-spine');
  });
});

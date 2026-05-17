import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

describe('matchToolPatterns — Rome IV IBS', () => {
  it('matches rome iv and ibs criteria phrases', () => {
    const a = matchToolPatterns('rome iv ibs criteria');
    expect(a.some((m) => m.toolId === 'rome-iv-ibs')).toBe(true);

    const b = matchToolPatterns('irritable bowel syndrome criteria checklist');
    expect(b.some((m) => m.toolId === 'rome-iv-ibs')).toBe(true);
  });

  it('prefers rome-iv-ibs for ibs criteria wording', () => {
    const matches = matchToolPatterns('apply ibs criteria rome iv');
    expect(matches[0]?.toolId).toBe('rome-iv-ibs');
  });
});

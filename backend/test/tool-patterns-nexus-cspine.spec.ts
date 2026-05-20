import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

describe('matchToolPatterns — NEXUS C-Spine', () => {
  it('matches nexus c-spine and cervical spine phrases', () => {
    const a = matchToolPatterns('apply nexus c spine rule for neck trauma');
    expect(a.some((m) => m.toolId === 'nexus-cspine')).toBe(true);

    const b = matchToolPatterns('nexus criteria cervical spine imaging');
    expect(b.find((m) => m.toolId === 'nexus-cspine')).toBeDefined();
  });
});

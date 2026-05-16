import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

describe('matchToolPatterns — TIMI UA/NSTEMI', () => {
  it('matches timi and timi score phrases', () => {
    const a = matchToolPatterns('calculate timi score for nstemi');
    expect(a.some((m) => m.toolId === 'timi-ua-nstemi')).toBe(true);

    const b = matchToolPatterns('timi unstable angina risk');
    expect(b.some((m) => m.toolId === 'timi-ua-nstemi')).toBe(true);
  });

  it('matches timi acs and timi nstemi aliases', () => {
    const a = matchToolPatterns('timi acs chest pain');
    expect(a.some((m) => m.toolId === 'timi-ua-nstemi')).toBe(true);

    const b = matchToolPatterns('timi nstemi 14 day risk');
    expect(b.some((m) => m.toolId === 'timi-ua-nstemi')).toBe(true);
  });
});

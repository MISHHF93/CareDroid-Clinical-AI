import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

describe('matchToolPatterns — AUDIT-C', () => {
  it('matches audit c and alcohol screen phrases', () => {
    const a = matchToolPatterns('run audit c alcohol screen');
    expect(a.some((m) => m.toolId === 'audit-c')).toBe(true);

    const b = matchToolPatterns('drinking screen questionnaire');
    expect(b.some((m) => m.toolId === 'audit-c')).toBe(true);
  });

  it('prefers audit-c for alcohol use screen wording', () => {
    const matches = matchToolPatterns('alcohol use screen audit c');
    expect(matches[0]?.toolId).toBe('audit-c');
  });
});

import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

describe('matchToolPatterns — GAD-7', () => {
  it('matches gad7 and anxiety screen phrases', () => {
    const a = matchToolPatterns('open gad7 anxiety screen');
    expect(a.some((m) => m.toolId === 'gad7')).toBe(true);

    const b = matchToolPatterns('generalized anxiety screen questionnaire');
    expect(b.some((m) => m.toolId === 'gad7')).toBe(true);
  });

  it('prefers gad7 for anxiety questionnaire wording', () => {
    const matches = matchToolPatterns('anxiety questionnaire gad 7');
    expect(matches[0]?.toolId).toBe('gad7');
  });
});

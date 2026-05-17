import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

describe('matchToolPatterns — PHQ-9', () => {
  it('matches phq9 and depression screen phrases', () => {
    const a = matchToolPatterns('open phq9 depression screen');
    expect(a.some((m) => m.toolId === 'phq9')).toBe(true);

    const b = matchToolPatterns('mood screen questionnaire');
    expect(b.some((m) => m.toolId === 'phq9')).toBe(true);
  });

  it('prefers phq9 for depression questionnaire wording', () => {
    const matches = matchToolPatterns('depression questionnaire phq 9');
    expect(matches[0]?.toolId).toBe('phq9');
  });
});

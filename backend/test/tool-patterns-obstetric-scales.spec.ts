import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

describe('matchToolPatterns — obstetric scales', () => {
  it('matches Bishop score and cervical favourability phrases', () => {
    const a = matchToolPatterns('bishop score cervical favourability induction');
    expect(a.some((m) => m.toolId === 'bishop-score')).toBe(true);

    const b = matchToolPatterns('cervical bishop score');
    expect(b.find((m) => m.toolId === 'bishop-score')).toBeDefined();
  });

  it('matches Apgar newborn assessment phrases', () => {
    const a = matchToolPatterns('apgar score newborn 1 minute 5 minute');
    expect(a.some((m) => m.toolId === 'apgar-score')).toBe(true);

    const b = matchToolPatterns('neonatal apgar');
    expect(b.find((m) => m.toolId === 'apgar-score')).toBeDefined();
  });
});

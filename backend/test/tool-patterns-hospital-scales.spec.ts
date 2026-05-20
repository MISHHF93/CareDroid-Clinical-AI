import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

describe('matchToolPatterns — inpatient hospital scales', () => {
  it('matches Braden scale and pressure injury phrases', () => {
    const a = matchToolPatterns('braden scale for pressure ulcer risk');
    expect(a.some((m) => m.toolId === 'braden-scale')).toBe(true);

    const b = matchToolPatterns('nursing skin risk score inpatient');
    expect(b.find((m) => m.toolId === 'braden-scale')).toBeDefined();
  });

  it('matches Morse fall scale including morse-fall alias phrasing', () => {
    const a = matchToolPatterns('morse fall risk score inpatient');
    expect(a.some((m) => m.toolId === 'morse-fall-scale')).toBe(true);

    const b = matchToolPatterns('nursing fall assessment morse-fall');
    expect(b.find((m) => m.toolId === 'morse-fall-scale')).toBeDefined();
  });
});

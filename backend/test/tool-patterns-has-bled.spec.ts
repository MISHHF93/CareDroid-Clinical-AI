import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

describe('matchToolPatterns — HAS-BLED', () => {
  it('matches has-bled and anticoagulation bleeding risk phrases', () => {
    const a = matchToolPatterns('calculate has-bled score for afib');
    expect(a.some((m) => m.toolId === 'has-bled')).toBe(true);

    const b = matchToolPatterns('anticoagulation bleeding risk assessment');
    expect(b.find((m) => m.toolId === 'has-bled')).toBeDefined();
  });
});

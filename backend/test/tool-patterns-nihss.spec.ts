import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

const NIHSS_REQUIRED_PHRASES = [
  'nihss',
  'nih stroke scale',
  'national institutes of health stroke scale',
  'stroke scale',
  'stroke severity score',
] as const;

describe('matchToolPatterns — NIHSS', () => {
  it.each(NIHSS_REQUIRED_PHRASES)('matches required phrase "%s"', (phrase) => {
    const matches = matchToolPatterns(`calculate ${phrase}`);
    expect(matches.some((m) => m.toolId === 'nihss')).toBe(true);
  });

  it('prefers nihss over gcs-calculator for nihss wording', () => {
    const matches = matchToolPatterns('nih stroke scale assessment');
    expect(matches[0]?.toolId).toBe('nihss');
  });

  it('prefers nihss for stroke severity score', () => {
    const matches = matchToolPatterns('stroke severity score');
    expect(matches.some((m) => m.toolId === 'nihss')).toBe(true);
  });
});

import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

const CANADIAN_C_SPINE_REQUIRED_PHRASES = [
  'canadian c spine',
  'canadian c-spine rule',
  'c spine rule',
  'cervical spine rule',
  'neck trauma imaging rule',
] as const;

describe('matchToolPatterns — Canadian C-Spine Rule', () => {
  it.each(CANADIAN_C_SPINE_REQUIRED_PHRASES)('matches required phrase "%s"', (phrase) => {
    const matches = matchToolPatterns(`apply ${phrase}`);
    expect(matches.some((m) => m.toolId === 'canadian-c-spine')).toBe(true);
  });

  it('prefers canadian-c-spine for neck trauma imaging rule', () => {
    const matches = matchToolPatterns('neck trauma imaging rule');
    expect(matches[0]?.toolId).toBe('canadian-c-spine');
  });
});

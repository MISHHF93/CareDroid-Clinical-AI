import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

const OTTAWA_ANKLE_REQUIRED_PHRASES = [
  'ottawa ankle',
  'ottawa ankle rule',
  'ankle xray rule',
  'ankle injury imaging',
  'foot xray rule',
] as const;

describe('matchToolPatterns — Ottawa Ankle Rule', () => {
  it.each(OTTAWA_ANKLE_REQUIRED_PHRASES)('matches required phrase "%s"', (phrase) => {
    const matches = matchToolPatterns(`apply ${phrase}`);
    expect(matches.some((m) => m.toolId === 'ottawa-ankle')).toBe(true);
  });

  it('prefers ottawa-ankle for ottawa ankle rule wording', () => {
    const matches = matchToolPatterns('apply ottawa ankle rule');
    expect(matches[0]?.toolId).toBe('ottawa-ankle');
  });
});

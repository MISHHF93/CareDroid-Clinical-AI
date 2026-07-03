// Port of _deprecated-python/tests/test_utils.py

import { hashText, truncateText, splitIntoChunks, normalizeText } from './nlu.utils';

describe('nlu.utils', () => {
  it('hashText is stable', () => {
    expect(hashText('abc')).toBe(hashText('abc'));
  });

  it('truncateText truncates long text', () => {
    const text = 'a'.repeat(10);
    expect(truncateText(text, 5).startsWith('aaaaa')).toBe(true);
  });

  it('splitIntoChunks splits long text into multiple chunks', () => {
    const text = 'word '.repeat(200);
    const chunks = splitIntoChunks(text, 50, 10);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('normalizeText collapses whitespace', () => {
    expect(normalizeText('  hello   world  ')).toBe('hello world');
  });
});

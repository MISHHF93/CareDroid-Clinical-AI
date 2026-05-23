import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('PublicShell footer links', () => {
  it('does not use dead public hash anchors for compliance links', () => {
    const source = readFileSync(join(process.cwd(), 'src/layout/PublicShell.jsx'), 'utf8');

    expect(source).not.toContain('href="#security"');
    expect(source).not.toContain('href="#audit"');
    expect(source).toContain('to="/hipaa"');
    expect(source).toContain('to="/privacy"');
  });
});

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function packageJson(path) {
  return JSON.parse(readFileSync(join(process.cwd(), path), 'utf8'));
}

describe('package script hygiene', () => {
  it('does not keep the obsolete backend seed script pointing at a missing runner', () => {
    const backendPackage = packageJson('backend/package.json');

    expect(backendPackage.scripts.seed).toBeUndefined();
    expect(existsSync(join(process.cwd(), 'backend/src/database/seeds/run-seeds.ts'))).toBe(false);
  });
});

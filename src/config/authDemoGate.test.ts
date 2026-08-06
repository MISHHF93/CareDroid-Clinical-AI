import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('duplicate-system-audit: Demo/dev auth -- single gate, no independent bypass definitions', () => {
  // "Bypass enabled via multiple flags" -- docs/duplicate-system-audit.md's stated risk
  // for this finding. The recommended chain is featureFlags.config -> env.config ->
  // auth.config demo.exposed. Source-scans both files rather than trusting import
  // statements alone, so a future raw import.meta.env/process.env read reintroducing an
  // independent bypass path fails this test instead of silently drifting.
  it('env.config demo/bypass fields all read FEATURE_FLAGS, never raw env vars directly', () => {
    const source = readFileSync(join(__dirname, 'env.config.ts'), 'utf8');
    const fieldNames = ['demoMode', 'allowLocalDemoAuth', 'enableDevAuthBypass', 'showDemoAuth'];
    for (const field of fieldNames) {
      const match = source.match(new RegExp(`${field}:\\s*([^,\\n]+)`));
      expect(match, field).toBeTruthy();
      expect(match![1], field).toMatch(/^FEATURE_FLAGS\./);
    }
    expect(source).not.toMatch(/import\.meta\.env\.\w*(?:DEMO|BYPASS|AUTH)/i);
  });

  it('auth.config demo getters read only ENV_CONFIG/shouldExposeDemoAuth, never a second bypass source', () => {
    const source = readFileSync(join(__dirname, 'auth.config.ts'), 'utf8');
    const demoBlock = source.slice(source.indexOf('demo: Object.freeze({'));
    expect(demoBlock).toMatch(/ENV_CONFIG\.demoMode/);
    expect(demoBlock).toMatch(/ENV_CONFIG\.enableDevAuthBypass/);
    expect(demoBlock).toMatch(/ENV_CONFIG\.showDemoAuth/);
    expect(demoBlock).toMatch(/ENV_CONFIG\.allowLocalDemoAuth/);
    expect(demoBlock).toMatch(/shouldExposeDemoAuth\(\)/);
    expect(source).not.toMatch(/devAuthBypass/);
  });
});

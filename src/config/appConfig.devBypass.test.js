import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appConfigSource = readFileSync(join(__dirname, 'appConfig.js'), 'utf8');

describe('dev auth bypass production guard', () => {
  it('defaults on for local dev and allows explicit hosted demo exposure', () => {
    expect(appConfigSource).toContain('VITE_ENABLE_DEV_AUTH_BYPASS');
    expect(appConfigSource).toMatch(
      /enableDevAuthBypass:\s*toBoolean\(\s*getEnvValue\('VITE_ENABLE_DEV_AUTH_BYPASS', isProductionBuild\(\) \? 'false' : 'true'\)/
    );
    expect(appConfigSource).toContain("isProductionBuild() ? 'false' : 'true'");
    expect(appConfigSource).toContain('VITE_DEMO_MODE');
    expect(appConfigSource).toContain('VITE_SHOW_DEMO_AUTH');
  });
});

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appConfigSource = readFileSync(join(__dirname, 'appConfig.js'), 'utf8');

describe('dev auth bypass production guard', () => {
  it('requires the explicit env flag and disables the bypass in production bundles', () => {
    expect(appConfigSource).toContain('VITE_ENABLE_DEV_AUTH_BYPASS');
    expect(appConfigSource).toContain('enableDevAuthBypass: !isProductionBuild()');
  });
});

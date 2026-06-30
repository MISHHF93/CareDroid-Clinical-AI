import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from '../config/routes.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');

function expectCanonicalRouteMounted(routeName) {
  expect(appSource, routeName).toContain(`path={CANONICAL_ROUTES.${routeName}}`);
}

describe('Codex issue card route mounts', () => {
  it('mounts platform card destinations that have real page implementations', () => {
    [
      'profile',
      'profileSettings',
      'profileToolPreferences',
      'executive',
      'predictiveAnalytics',
      'medical3dViewer',
      'developerCatalog',
      'featureFlags',
      'aiCommandCenter',
      'hospitalMap',
      'medicalIot',
      'devices',
      'fleetCommand',
      'fleetMap',
      'billing',
      'usage',
      'audit',
    ].forEach(expectCanonicalRouteMounted);
  });

  it('keeps legacy card destinations wired to active mounted routes', () => {
    [
      '/profile/activity',
      '/profile/preferences',
      '/profile/security',
      '/profile/workspaces',
      '/profile-settings',
      '/audit-logs',
    ].forEach((path) => {
      expect(appSource, path).toContain(`path="${path}"`);
    });
  });

  it('keeps route constants available for card authors', () => {
    expect(CANONICAL_ROUTES.featureFlags).toBe('/feature-flags');
    expect(CANONICAL_ROUTES.aiCommandCenter).toBe('/ai-command-center');
    expect(CANONICAL_ROUTES.predictiveAnalytics).toBe('/predictive-analytics');
  });
});
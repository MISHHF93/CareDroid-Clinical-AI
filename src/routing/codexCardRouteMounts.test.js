import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from '../config/routes.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');

function expectCanonicalRouteMounted(routeName) {
  expect(appSource, routeName).toContain(`path={CANONICAL_ROUTES.${routeName}}`);
}

describe('Codex issue card route mounts', () => {
  it('mounts platform card destinations that have real page implementations', () => {
    [
      'plans',
      'profile',
      'profileSettings',
      'profileToolPreferences',
      'aiModels',
      'governanceRegistry',
      'audit',
      'protocols',
      'clinicalDecisionSupport',
      'simulation',
      'simulationOutcomes',
      'competencies',
      'credentials',
    ].forEach(expectCanonicalRouteMounted);
  });

  it('keeps legacy card destinations wired to active mounted routes', () => {
    [
      '/profile/activity',
      '/profile/preferences',
      '/profile/security',
      '/profile/workspaces',
      '/profile-settings',
      '/two-factor-setup',
      '/biometric-setup',
      '/audit-logs',
    ].forEach((path) => {
      expect(appSource, path).toContain(`path="${path}"`);
    });
  });

  it('keeps route constants available for card authors', () => {
    expect(CANONICAL_ROUTES.plans).toBe('/plans');
    expect(CANONICAL_ROUTES.aiModels).toBe('/ai-models');
    expect(CANONICAL_ROUTES.clinicalDecisionSupport).toBe('/clinical-decision-support');
  });
});

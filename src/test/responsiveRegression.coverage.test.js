/**
 * Documents automated vs manual responsive coverage; guards route inventory drift.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RESPONSIVE_QA_VIEWPORTS,
  RESPONSIVE_QA_BROWSER_PROJECTS,
  buildResponsiveQaPages,
} from '../data/responsiveQaMatrix.js';
import {
  CALCULATOR_ROUTE_PATHS,
  CORE_ROUTE_SMOKE,
  getAllTierARoutePaths,
} from './responsiveRegression.routes.js';
import { REQUIRED_PRODUCTION_TOOL_PATHS } from '../routes/clinicalToolRoutes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsPath = join(__dirname, '../../docs/responsive-regression-coverage.md');

describe('Responsive regression coverage inventory', () => {
  it('documents manual visual checks', () => {
    const doc = readFileSync(docsPath, 'utf8');
    expect(doc).toContain('Manual visual checks');
    expect(doc).toContain('Playwright');
    expect(doc).toContain('320');
  });

  it('core smoke routes are subset of responsive QA pages', () => {
    const qaPaths = new Set(buildResponsiveQaPages().map((p) => p.path));
    for (const { path } of CORE_ROUTE_SMOKE) {
      expect(qaPaths.has(path)).toBe(true);
    }
  });

  it('production required paths are covered by QA matrix or calculator routes', () => {
    const qaPaths = new Set(buildResponsiveQaPages().map((p) => p.path));
    const calcPaths = new Set(CALCULATOR_ROUTE_PATHS);
    for (const path of REQUIRED_PRODUCTION_TOOL_PATHS) {
      expect(qaPaths.has(path) || calcPaths.has(path)).toBe(true);
    }
  });

  it('Tier-A route paths match calculator route defs count', () => {
    const tierA = getAllTierARoutePaths();
    expect(tierA.length).toBeGreaterThanOrEqual(13);
    for (const path of tierA) {
      expect(CALCULATOR_ROUTE_PATHS).toContain(path);
    }
  });

  it('Playwright matrix dimensions match product spec', () => {
    expect(RESPONSIVE_QA_VIEWPORTS).toHaveLength(9);
    expect(RESPONSIVE_QA_BROWSER_PROJECTS.map((b) => b.id)).toEqual([
      'chromium',
      'firefox',
      'webkit',
      'msedge',
    ]);
    expect(buildResponsiveQaPages().length).toBeGreaterThanOrEqual(31);
  });
});

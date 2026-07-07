/**
 * Documents automated vs manual responsive coverage; guards route inventory drift.
 */

import { describe, it, expect } from 'vitest';
import {
  MOBILE_WEB_QA_VIEWPORT_WIDTHS,
  RESPONSIVE_QA_VIEWPORTS,
  RESPONSIVE_QA_BROWSER_PROJECTS,
  RESPONSIVE_QA_ZOOM_LEVELS,
  buildResponsiveQaPages,
} from '../data/responsiveQaMatrix';
import {
  CALCULATOR_ROUTE_PATHS,
  CORE_ROUTE_SMOKE,
  getAllTierARoutePaths,
} from './responsiveRegression.routes';
import { REQUIRED_PRODUCTION_TOOL_PATHS } from '../routes/clinicalToolRoutes';

describe('Responsive regression coverage inventory', () => {
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
    expect(MOBILE_WEB_QA_VIEWPORT_WIDTHS).toContain(412);
    expect(RESPONSIVE_QA_VIEWPORTS).toHaveLength(15);
    expect(RESPONSIVE_QA_VIEWPORTS.map((v) => v.width)).toEqual(
      expect.arrayContaining([320, 360, 390, 412, 430, 768, 1024, 1280, 1440, 1920])
    );
    expect(RESPONSIVE_QA_ZOOM_LEVELS).toEqual([80, 90, 100, 110, 125, 150]);
    expect(RESPONSIVE_QA_BROWSER_PROJECTS.map((b) => b.id)).toEqual([
      'chromium',
      'firefox',
      'webkit',
      'msedge',
    ]);
    expect(buildResponsiveQaPages().length).toBeGreaterThanOrEqual(31);
  });
});

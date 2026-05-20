import { describe, it, expect } from 'vitest';
import {
  ANDROID_QA_VIEWPORT_WIDTHS,
  MOBILE_FIRST_VIEWPORT_WIDTHS,
  RESPONSIVE_QA_PAGES,
  RESPONSIVE_QA_VIEWPORTS,
  RESPONSIVE_QA_BROWSER_PROJECTS,
  TIER_A_CALCULATOR_PATH_BY_REGISTRY_ID,
  countResponsiveQaCells,
  buildResponsiveQaPages,
} from './responsiveQaMatrix.js';
import { MOBILE_FIRST_BREAKPOINTS } from '../layout/breakpoints.js';
import {
  CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS,
  CLINICAL_TIER_B_CHAT_REGISTRY_IDS,
  FLEET_TIER_B_CHAT_REGISTRY_IDS,
} from './clinicalToolIdContract.js';

describe('responsiveQaMatrix', () => {
  it('defines mobile-first phone + tablet widths and full QA viewports including desktop', () => {
    expect(MOBILE_FIRST_VIEWPORT_WIDTHS).toEqual([
      ...MOBILE_FIRST_BREAKPOINTS.phone,
      ...MOBILE_FIRST_BREAKPOINTS.tablet,
    ]);
    expect(ANDROID_QA_VIEWPORT_WIDTHS).toBe(MOBILE_FIRST_VIEWPORT_WIDTHS);
    expect(RESPONSIVE_QA_VIEWPORTS).toHaveLength(11);
    expect(RESPONSIVE_QA_VIEWPORTS.map((v) => v.width)).toEqual(
      expect.arrayContaining([375, 412, 768, 1024, 1280, 1920])
    );
    expect(RESPONSIVE_QA_BROWSER_PROJECTS).toHaveLength(4);
  });

  it('includes dashboard, catalog, calculators hub, all Tier A routes, Tier B launches, and fleet pages', () => {
    const pages = buildResponsiveQaPages();
    const ids = pages.map((p) => p.id);
    expect(ids).toContain('dashboard');
    expect(ids).toContain('tools-catalog');
    expect(ids).toContain('calculators-hub');
    expect(ids).toContain('fleet-command');
    expect(ids).toContain('fleet-route-optimizer');
    expect(ids).toContain('fleet-predictive-maintenance');

    for (const registryId of CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS) {
      expect(ids).toContain(`tier-a-${registryId}`);
    }
    for (const registryId of CLINICAL_TIER_B_CHAT_REGISTRY_IDS) {
      expect(ids).toContain(`tier-b-${registryId}`);
    }
    for (const registryId of FLEET_TIER_B_CHAT_REGISTRY_IDS) {
      expect(ids).toContain(`tier-b-${registryId}`);
    }
    expect(ids).toContain('tier-b-dispatch-ai');
  });

  it('has a positive cell count', () => {
    expect(countResponsiveQaCells()).toBeGreaterThan(0);
    expect(RESPONSIVE_QA_PAGES.length).toBeGreaterThanOrEqual(20);
  });

  it('maps every Tier A registry id to a dedicated route', () => {
    for (const registryId of CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS) {
      expect(TIER_A_CALCULATOR_PATH_BY_REGISTRY_ID[registryId]).toMatch(/^\/tools\//);
    }
  });
});

/**
 * Android device QA matrix contracts.
 */

import { describe, it, expect } from 'vitest';
import {
  ANDROID_QA_DEVICES,
  ANDROID_QA_ROUTE_PAGES,
  ANDROID_QA_SCENARIOS,
  countAndroidQaOverflowCells,
  formatAndroidQaMatrixMarkdown,
  viewportForDevice,
} from './androidDeviceQaMatrix.js';

describe('androidDeviceQaMatrix', () => {
  it('defines Pixel 7, Pro, Samsung S/A, OnePlus, Motorola, tablet', () => {
    const ids = ANDROID_QA_DEVICES.map((d) => d.id);
    expect(ids).toContain('pixel-7');
    expect(ids).toContain('pixel-7-pro');
    expect(ids).toContain('samsung-galaxy-s');
    expect(ids).toContain('samsung-galaxy-a');
    expect(ids).toContain('oneplus');
    expect(ids).toContain('motorola');
    expect(ids).toContain('tablet');
  });

  it('each device has portrait and landscape viewports', () => {
    for (const d of ANDROID_QA_DEVICES) {
      expect(d.portrait.width).toBeLessThan(d.portrait.height);
      expect(d.landscape.width).toBeGreaterThan(d.landscape.height);
      expect(viewportForDevice(d, 'landscape').width).toBe(d.landscape.width);
    }
  });

  it('covers seven QA scenarios', () => {
    const cats = ANDROID_QA_SCENARIOS.map((s) => s.category);
    expect(cats).toEqual(
      expect.arrayContaining([
        'routes',
        'calculators',
        'catalog',
        'sidebar',
        'backend',
        'landscape',
        'touch',
      ])
    );
  });

  it('includes core route pages for overflow grid', () => {
    const ids = ANDROID_QA_ROUTE_PAGES.map((p) => p.id);
    expect(ids).toContain('dashboard');
    expect(ids).toContain('tools-catalog');
    expect(ids).toContain('tier-a-has-bled');
  });

  it('formats markdown matrix doc', () => {
    const md = formatAndroidQaMatrixMarkdown();
    expect(md).toContain('Pixel 7');
    expect(md).toContain('Samsung Galaxy');
    expect(countAndroidQaOverflowCells()).toBeGreaterThan(50);
  });
});

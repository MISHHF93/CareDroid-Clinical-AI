/**
 * Clinical tools catalog — mobile visibility and launchability contracts.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';

const __dirname = dirname(fileURLToPath(import.meta.url));
const catalogJsx = readFileSync(join(__dirname, '../pages/tools/ClinicalToolCatalog.tsx'), 'utf8');
const catalogCss = readFileSync(join(__dirname, '../pages/tools/ClinicalToolCatalog.css'), 'utf8');
const catalogMobileCss = readFileSync(join(__dirname, '../styles/catalog-mobile.css'), 'utf8');

describe('catalog mobile stylesheet', () => {
  it('is imported from ClinicalToolCatalog.jsx', () => {
    expect(catalogJsx).toContain("import '../../styles/catalog-mobile.css'");
  });

  it('uses stacked card rows up to 900px so launch buttons are not clipped', () => {
    expect(catalogMobileCss).toMatch(
      /@media \(max-width: 900px\)[\s\S]*\.catalog-table--stacked tbody tr[\s\S]*display:\s*block/,
    );
    expect(catalogMobileCss).toMatch(
      /\.catalog-table--stacked \.catalog-actions \.catalog-btn[\s\S]*min-height:\s*var\(--touch-target-min/,
    );
  });

  it('wraps category chips and descriptions on narrow viewports', () => {
    expect(catalogMobileCss).toMatch(/\.catalog-category-chips[\s\S]*flex-wrap:\s*wrap/);
    expect(catalogMobileCss).toMatch(/\.catalog-tool-desc[\s\S]*overflow-wrap:\s*anywhere/);
  });

  it('defines 320px compaction', () => {
    expect(catalogMobileCss).toMatch(/@media \(max-width: 320px\)/);
  });
});

describe('catalog layout — desktop sticky column guard', () => {
  it('only applies sticky actions on wide non-stacked tables', () => {
    expect(catalogCss).toMatch(
      /@media \(min-width: 901px\)[\s\S]*\.catalog-table-wrap:not\(\.catalog-table-wrap--stacked\)/,
    );
  });
});

describe('catalog visibility — search, categories, launch', () => {
  it('exposes expanded category quick filters including platform APIs', () => {
    expect(catalogJsx).toContain("{ value: 'interpreter', label: 'Interpreters' }");
    expect(catalogJsx).toContain("{ value: 'apis', label: 'All APIs' }");
    expect(catalogJsx).toContain('id="catalog-platform-apis"');
  });

  it('shows tool descriptions in medical table rows', () => {
    expect(catalogJsx).toContain('catalog-tool-desc');
    expect(catalogCss).toContain('.catalog-tool-desc');
  });

  it('keeps medical empty state visible when search has no hits', () => {
    expect(catalogJsx).toMatch(/hideEmpty=\{showCategoryEmpty\}/);
  });

  it('marks shipped registry tools with pages as launchable', () => {
    const rows = getMedicalToolsCatalogRows();
    const withPage = rows.filter((r) => r.pagePath);
    expect(withPage.length).toBeGreaterThan(10);
    const notLaunchable = withPage.filter((r) => !r.launchable);
    expect(notLaunchable).toEqual([]);
  });
});

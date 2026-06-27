/**
 * Clinical tools catalog — responsive layout contracts (CSS + markup).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const catalogJsx = readFileSync(join(__dirname, 'ClinicalToolCatalog.tsx'), 'utf8');
const catalogCss = readFileSync(join(__dirname, 'ClinicalToolCatalog.css'), 'utf8');

describe('ClinicalToolCatalog responsive layout', () => {
  it('uses stacked table markup for primary medical and discovery tables', () => {
    expect(catalogJsx).toContain('catalog-table--stacked');
    expect(catalogJsx).toContain('catalog-table-wrap--stacked');
    expect(catalogJsx).toContain('data-label="Actions"');
    expect(catalogJsx).toContain('catalog-actions-cell');
  });

  it('stacks toolbar controls on mobile', () => {
    expect(catalogCss).toMatch(/@media \(max-width: 640px\)[\s\S]*\.catalog-toolbar[\s\S]*flex-direction:\s*column/);
    expect(catalogCss).toMatch(/\.catalog-search[\s\S]*min-width:\s*0/);
  });

  it('uses responsive stats grid without fixed card width', () => {
    expect(catalogCss).toContain('grid-template-columns: repeat(auto-fill, minmax(min(140px, 100%), 1fr))');
    expect(catalogCss).toMatch(/\.catalog-stat[\s\S]*min-width:\s*0/);
  });

  it('wraps category badges and tool names safely', () => {
    expect(catalogCss).toMatch(/\.catalog-badge[\s\S]*overflow-wrap:\s*anywhere/);
    expect(catalogCss).toContain('.catalog-tool-name-cell');
    expect(catalogCss).toMatch(/\.catalog-inline-badge[\s\S]*white-space:\s*normal/);
  });

  it('keeps launch actions visible with touch-friendly buttons on mobile', () => {
    expect(catalogCss).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.catalog-btn[\s\S]*min-height:\s*var\(--touch-target-min\)/
    );
    expect(catalogCss).toMatch(/\.catalog-table--stacked \.catalog-actions/);
  });

  it('provides mobile-friendly global empty state', () => {
    expect(catalogJsx).toContain('catalog-empty-actions');
    expect(catalogCss).toContain('.catalog-empty-actions');
    expect(catalogCss).toMatch(/\.catalog-empty--global[\s\S]*padding:/);
  });

  it('converts stacked tables to card rows at 640px and 900px via catalog-mobile.css', () => {
    const catalogMobileCss = readFileSync(
      join(__dirname, '../../styles/catalog-mobile.css'),
      'utf8'
    );
    expect(catalogCss).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.catalog-table--stacked tbody tr[\s\S]*display:\s*block/
    );
    expect(catalogMobileCss).toMatch(
      /@media \(max-width: 900px\)[\s\S]*\.catalog-table--stacked tbody tr[\s\S]*display:\s*block/
    );
    expect(catalogCss).toMatch(/\.catalog-table--stacked td::before[\s\S]*attr\(data-label\)/);
  });

  it('scopes catalog container to full width with safe box sizing', () => {
    expect(catalogCss).toMatch(/\.clinical-tool-catalog[\s\S]*width:\s*100%/);
    expect(catalogCss).toMatch(/\.clinical-tool-catalog[\s\S]*box-sizing:\s*border-box/);
    expect(catalogCss).toMatch(/\.clinical-tool-catalog[\s\S]*overflow-x:\s*clip/);
  });

  it('uses wrapping category quick-filter chips', () => {
    expect(catalogJsx).toContain('catalog-category-chips');
    expect(catalogJsx).toContain('CATEGORY_QUICK_FILTERS');
    expect(catalogCss).toMatch(/\.catalog-category-chips[\s\S]*flex-wrap:\s*wrap/);
  });

  it('stacks all catalog tables on mobile with data-label cards', () => {
    expect(catalogJsx).toMatch(/catalog-table-wrap catalog-table-wrap--stacked/);
    expect(catalogJsx).toContain('data-label="Actions"');
    expect(catalogCss).toMatch(/@media \(max-width: 320px\)/);
  });

  it('avoids fixed unsafe widths on source cells', () => {
    expect(catalogCss).toContain('max-width: min(280px, 100%)');
  });
});

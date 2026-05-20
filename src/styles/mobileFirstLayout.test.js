import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { MOBILE_FIRST_BREAKPOINTS, MOBILE_FIRST_VIEWPORT_WIDTHS } from '../layout/breakpoints.js';
import {
  MOBILE_FIRST_VIEWPORT_WIDTHS as QA_PHONE_TABLET_WIDTHS,
  RESPONSIVE_QA_VIEWPORTS,
} from '../data/responsiveQaMatrix.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');
const indexHtml = readFileSync(join(root, 'index.html'), 'utf8');
const mainJsx = readFileSync(join(__dirname, '../main.jsx'), 'utf8');
const mobileFirstCss = readFileSync(join(__dirname, 'mobile-first-layout.css'), 'utf8');
const calculatorsCss = readFileSync(join(__dirname, '../pages/tools/Calculators.css'), 'utf8');
const labCss = readFileSync(join(__dirname, '../pages/tools/LabInterpreter.css'), 'utf8');
const toolPageCss = readFileSync(join(__dirname, '../pages/tools/ToolPageLayout.css'), 'utf8');

describe('mobile-first layout architecture', () => {
  it('sets viewport meta for device-width and safe areas', () => {
    expect(indexHtml).toMatch(/name="viewport"[^>]+width=device-width/);
    expect(indexHtml).toContain('viewport-fit=cover');
  });

  it('loads mobile-first-layout.css from main.jsx', () => {
    expect(mainJsx).toContain("import './styles/mobile-first-layout.css'");
  });

  it('defines acceptance breakpoints in JS', () => {
    expect(MOBILE_FIRST_BREAKPOINTS.phone).toEqual([320, 360, 375, 390, 412, 430, 480]);
    expect(MOBILE_FIRST_BREAKPOINTS.tablet).toEqual([600, 768, 1024]);
    expect(MOBILE_FIRST_BREAKPOINTS.desktop).toEqual([1280, 1440, 1920]);
    expect(MOBILE_FIRST_VIEWPORT_WIDTHS).toHaveLength(13);
  });

  it('uses mobile-first split forms (1 col default, 2 col min-width 1024px)', () => {
    expect(mobileFirstCss).toMatch(
      /\.calculator-interface[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/
    );
    expect(mobileFirstCss).toMatch(
      /@media \(min-width: 1024px\)[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\) minmax\(0,\s*1fr\)/
    );
    expect(calculatorsCss).not.toMatch(
      /\.calculator-interface[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\) minmax\(0,\s*1fr\)/
    );
  });

  it('uses fluid auto-fit grids without desktop-only track minimums in key tool CSS', () => {
    expect(mobileFirstCss).toContain('minmax(min(100%, 220px), 1fr)');
    expect(toolPageCss).toContain('minmax(min(100%, 220px), 1fr)');
    expect(calculatorsCss).toContain('repeat(auto-fit, minmax(min(100%, 220px), 1fr))');
  });

  it('does not require max-width to collapse lab interpreter to one column', () => {
    expect(labCss).not.toMatch(/@media \(max-width: 1024px\)[\s\S]*lab-interpreter-content/);
  });

  it('QA matrix includes phone, tablet, and desktop smoke viewports', () => {
    expect(QA_PHONE_TABLET_WIDTHS).toEqual([...MOBILE_FIRST_BREAKPOINTS.phone, ...MOBILE_FIRST_BREAKPOINTS.tablet]);
    const widths = RESPONSIVE_QA_VIEWPORTS.map((v) => v.width);
    expect(widths).toEqual(expect.arrayContaining([375, 412, 480, 600, 768, 1280, 1920]));
    expect(RESPONSIVE_QA_VIEWPORTS).toHaveLength(13);
  });

  it('exposes fluid spacing and typography tokens via design-tokens.css', () => {
    const designTokensCss = readFileSync(join(__dirname, 'design-tokens.css'), 'utf8');
    expect(designTokensCss).toContain('--app-fluid-page-gutter:');
    expect(designTokensCss).toContain('--bp-phone-md: 375px');
    const indexCss = readFileSync(join(__dirname, '../index.css'), 'utf8');
    expect(indexCss).toContain('--space-fluid-4:');
    expect(indexCss).toContain('--text-title-fluid:');
    expect(mainJsx).toContain("import './styles/design-tokens.css'");
  });
});

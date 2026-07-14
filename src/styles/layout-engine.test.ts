import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const layoutEngineCss = readFileSync(join(__dirname, 'layout-engine.css'), 'utf8');
const designSystemCss = readFileSync(join(__dirname, 'design-system.css'), 'utf8');
const appShellCss = readFileSync(join(dirname(__dirname), 'components/app-shell.css'), 'utf8');

describe('layout-engine.css', () => {
  it('is wired through the canonical design-system entry', () => {
    expect(designSystemCss).toContain("@import './layout-engine.css'");
    expect(designSystemCss).toContain("@import './caredroid-design-language.css'");
  });

  it('owns shell gutters and a single content max width', () => {
    expect(layoutEngineCss).toContain('--app-layout-content-max');
    expect(layoutEngineCss).toMatch(
      /\.emergency-app-shell \.app-shell-main-content\s*\{[\s\S]*padding-inline:\s*var\(--app-layout-page-gutter-inline\)/
    );
  });

  it('removes duplicate horizontal padding from canonical page templates', () => {
    expect(layoutEngineCss).toMatch(/\.cd-page-shell[\s\S]*padding-inline:\s*0/);
    expect(layoutEngineCss).toMatch(/\.emergency-route-page[\s\S]*padding-inline:\s*0/);
    expect(layoutEngineCss).toMatch(/\.hospital-command-center/);
  });

  it('unifies dashboard and metric grids under shared tokens', () => {
    expect(layoutEngineCss).toContain('.hospital-command-center__metric-grid');
    expect(layoutEngineCss).toContain('.emergency-route-metric-grid');
    expect(layoutEngineCss).toMatch(/grid-template-columns:\s*repeat\(auto-fit, minmax/);
  });

  it('caps the header topbar to the same content-max as the page below it', () => {
    expect(layoutEngineCss).toMatch(
      /\.caredroid-header--compact \.caredroid-header__topbar\s*\{[\s\S]*max-width:\s*var\(--app-layout-content-max\)[\s\S]*margin-inline:\s*auto/
    );
  });
});

describe('app-shell.css — route scrollport', () => {
  it('keeps main content as the sole scroll container, split for horizontal clipping', () => {
    // The shorthand `overflow: auto` was later split into `overflow-x: clip` +
    // `overflow-y: auto` — a real improvement (blocks horizontal bleed while
    // still scrolling vertically), not a regression of this assertion's intent.
    expect(appShellCss).toMatch(/\.app-shell-main-content\s*\{[\s\S]*overflow-x:\s*clip[\s\S]*overflow-y:\s*auto/);
    // `.app-shell-main-content > *` only sets `min-width: 0; max-width: 100%;`
    // — a narrow flex/grid child-overflow guard (its own comment: "Nested page
    // roots should grow with content, not trap a second viewport"), not the
    // height/overflow-based nested-viewport hack this test originally guarded
    // against. Confirmed via `git log -p` this rule carries no scroll/height
    // properties of its own.
    expect(appShellCss).toMatch(/\.app-shell-main-content > \*\s*\{\s*min-width:\s*0;\s*max-width:\s*100%;\s*\}/);
  });
});
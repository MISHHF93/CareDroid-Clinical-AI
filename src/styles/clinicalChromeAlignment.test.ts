import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

const designSystemCss = readFileSync(join(__dirname, 'design-system.css'), 'utf8');
const chromeAlignmentCss = readFileSync(join(__dirname, 'clinical-chrome-alignment.css'), 'utf8');
const ultrawideCss = readFileSync(join(__dirname, 'clinical-ultrawide-layer.css'), 'utf8');

describe('clinical chrome alignment layer', () => {
  it('loads after shell-header-polish in design system', () => {
    const polishIndex = designSystemCss.indexOf("@import './shell-header-polish.css'");
    const alignIndex = designSystemCss.indexOf("@import './clinical-chrome-alignment.css'");
    expect(polishIndex).toBeGreaterThan(-1);
    expect(alignIndex).toBeGreaterThan(polishIndex);
  });

  it('binds chrome and page to one main-column track', () => {
    expect(chromeAlignmentCss).toContain('.emergency-app-shell__main-column');
    expect(chromeAlignmentCss).toContain('--app-layout-page-gutter-inline');
    expect(chromeAlignmentCss).toContain('--app-layout-content-max');
    expect(chromeAlignmentCss).toContain('.app-shell-main-content');
    expect(chromeAlignmentCss).toContain('padding-inline: 0');
  });

  it('does not override chrome padding separately on ultrawide', () => {
    expect(ultrawideCss).not.toContain('.caredroid-header--slim');
    expect(ultrawideCss).not.toContain('.shell-route-tab');
  });
});

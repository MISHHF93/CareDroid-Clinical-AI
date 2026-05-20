/**
 * App shell layout contracts — scrollport, sidebar inset, compact chrome offset.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  COMPACT_CHROME_HEIGHT_LANDSCAPE_PX,
  COMPACT_CHROME_HEIGHT_PX,
  COMPACT_MEDIA_QUERY,
} from './breakpoints';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appShellCss = readFileSync(join(__dirname, 'AppShell.css'), 'utf8');
const layoutTokensCss = readFileSync(join(__dirname, '../styles/layout-breakpoints.css'), 'utf8');
const indexCss = readFileSync(join(__dirname, '../index.css'), 'utf8');
const appShellJsx = readFileSync(join(__dirname, 'AppShell.jsx'), 'utf8');

describe('App shell layout — root and scroll', () => {
  it('locks document scroll and allows app shell to manage overflow', () => {
    expect(indexCss).toMatch(/html[\s\S]*overflow:\s*hidden/);
    expect(indexCss).toMatch(/#root[\s\S]*overflow:\s*hidden/);
    expect(indexCss).toMatch(/#root[\s\S]*min-width:\s*0/);
  });

  it('defines compact chrome height tokens', () => {
    expect(layoutTokensCss).toContain('--app-compact-chrome-height');
    expect(layoutTokensCss).toContain('--app-compact-content-offset-top');
    expect(COMPACT_CHROME_HEIGHT_PX).toBe(52);
    expect(COMPACT_CHROME_HEIGHT_LANDSCAPE_PX).toBe(44);
  });
});

describe('App shell layout — main column', () => {
  it('main wrap uses flex min-width 0 and clips horizontal overflow', () => {
    expect(appShellCss).toMatch(/\.app-shell-main-wrap[\s\S]*min-width:\s*0/);
    expect(appShellCss).toMatch(/\.app-shell-main-wrap[\s\S]*width:\s*100%/);
    expect(appShellCss).toMatch(/\.app-shell-main-wrap[\s\S]*overflow-x:\s*clip/);
  });

  it('sidebar inset uses CSS variable from AppShell.jsx', () => {
    expect(appShellCss).toContain('margin-left: var(--app-main-inset');
    expect(appShellJsx).toContain('--app-main-inset');
  });

  it('compact mode clears sidebar margin', () => {
    expect(appShellCss).toMatch(
      /\.app-shell--compact \.app-shell-main-wrap[\s\S]*margin-left:\s*0/
    );
    expect(appShellCss).toMatch(
      /@media \(max-width: 900px\)[\s\S]*\.app-shell-main-wrap[\s\S]*margin-left:\s*0/
    );
  });
});

describe('App shell layout — page scrollport', () => {
  it('page body scrolls vertically with min-width 0', () => {
    expect(appShellCss).toMatch(/\.app-shell-page-body[\s\S]*overflow-y:\s*auto/);
    expect(appShellCss).toMatch(/\.app-shell-page-body[\s\S]*overflow-x:\s*clip/);
    expect(appShellCss).toMatch(/\.app-shell-page-body[\s\S]*min-width:\s*0/);
  });

  it('reserves compact chrome offset on scrollport (not hidden behind menu/theme)', () => {
    expect(appShellCss).toMatch(
      /\.app-shell--compact\.app-shell--authed \.app-shell-page-body[\s\S]*padding-top:\s*var\(--app-compact-content-offset-top/
    );
    expect(appShellCss).toMatch(
      /\.app-shell--compact\.app-shell--authed \.app-shell-page-body[\s\S]*scroll-padding-top/
    );
  });

  it('conversation viewport keeps internal scroll and compact top inset', () => {
    expect(appShellCss).toMatch(/\.app-shell-page-body--conversation[\s\S]*overflow:\s*hidden/);
    expect(appShellCss).toMatch(
      /\.app-shell--compact\.app-shell--authed \.app-shell-page-body--conversation[\s\S]*padding-top/
    );
  });

  it('page roots fill width without exceeding scrollport', () => {
    expect(appShellCss).toMatch(/\.app-shell-page-body > \*[\s\S]*min-width:\s*0/);
    expect(appShellCss).toMatch(/\.app-shell-page-body > \*[\s\S]*max-width:\s*100%/);
  });

  it('scroll routes grow with content instead of clipping inside page-body', () => {
    expect(appShellCss).toMatch(
      /\.app-shell-page-body:not\(\.app-shell-page-body--conversation\) > \*[\s\S]*min-height:\s*min-content/
    );
    expect(appShellCss).toMatch(
      /\.app-shell-page-body:not\(\.app-shell-page-body--conversation\) > \*[\s\S]*overflow:\s*visible/
    );
  });
});

describe('App shell layout — JS/CSS alignment', () => {
  it('compact breakpoint matches CSS media queries', () => {
    expect(COMPACT_MEDIA_QUERY).toBe('(max-width: 900px)');
    expect(appShellCss).toContain('max-width: 900px');
  });
});

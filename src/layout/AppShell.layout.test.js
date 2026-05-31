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
const authShellCss = readFileSync(join(__dirname, 'AuthShell.css'), 'utf8');
const layoutTokensCss = readFileSync(join(__dirname, '../styles/layout-breakpoints.css'), 'utf8');
const indexCss = readFileSync(join(__dirname, '../index.css'), 'utf8');
const appShellJsx = readFileSync(join(__dirname, 'AppShell.jsx'), 'utf8');

describe('App shell layout — root and scroll', () => {
  it('allows document scroll and uses explicit overlay scroll locks only', () => {
    expect(indexCss).toMatch(/html[\s\S]*overflow-y:\s*auto/);
    expect(indexCss).toMatch(/body[\s\S]*overflow-y:\s*auto/);
    expect(indexCss).toMatch(/#root[\s\S]*overflow-y:\s*visible/);
    expect(indexCss).toMatch(/html\s*\{[\s\S]*height:\s*auto/);
    expect(indexCss).toMatch(/body\s*\{[\s\S]*height:\s*auto/);
    expect(indexCss).toMatch(/#root\s*\{[\s\S]*height:\s*auto/);
    expect(indexCss).toMatch(
      /html\.app-scroll-locked,\s*body\.app-scroll-locked[\s\S]*overflow:\s*hidden/
    );
    expect(indexCss).toMatch(/#root[\s\S]*min-width:\s*0/);
  });

  it('defines compact chrome height tokens', () => {
    expect(layoutTokensCss).toContain('--app-compact-chrome-height');
    expect(layoutTokensCss).toContain('--app-compact-content-offset-top');
    expect(COMPACT_CHROME_HEIGHT_PX).toBe(52);
    expect(COMPACT_CHROME_HEIGHT_LANDSCAPE_PX).toBe(44);
  });

  it('auth shell can scroll vertically without fixed viewport clipping', () => {
    expect(authShellCss).toMatch(/\.auth-shell[\s\S]*height:\s*auto/);
    expect(authShellCss).toMatch(/\.auth-shell[\s\S]*max-height:\s*none/);
    expect(authShellCss).toMatch(/\.auth-shell[\s\S]*overflow-y:\s*auto/);
    expect(authShellCss).toMatch(/\.auth-shell[\s\S]*overflow-x:\s*clip/);
    expect(authShellCss).toMatch(/\.auth-shell-card[\s\S]*min-width:\s*0/);
  });
});

describe('App shell layout — main column', () => {
  it('main wrap uses flex min-width 0 and clips horizontal overflow', () => {
    expect(appShellCss).toMatch(/\.app-shell-main-wrap[\s\S]*min-width:\s*0/);
    expect(appShellCss).toMatch(
      /\.app-shell-main-wrap[\s\S]*width:\s*calc\(100% - var\(--app-main-inset/
    );
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
  it('MainContent is the primary vertical scrollport with min-width 0', () => {
    expect(appShellCss).toMatch(/\.app-shell-main-content\s*\{[\s\S]*overflow-y:\s*auto/);
    expect(appShellCss).toMatch(/\.app-shell-main-content\s*\{[\s\S]*overflow-x:\s*clip/);
    expect(appShellCss).toMatch(/\.app-shell-main-content\s*\{[\s\S]*min-width:\s*0/);
    expect(appShellCss).toMatch(
      /\.app-shell-main-content\s*\{[\s\S]*-webkit-overflow-scrolling:\s*touch/
    );
    expect(appShellCss).toMatch(/\.app-shell-page-body[\s\S]*overflow-y:\s*auto/);
    expect(appShellCss).toMatch(/\.app-shell-page-body[\s\S]*overflow-x:\s*clip/);
    expect(appShellCss).toMatch(/\.app-shell-page-body[\s\S]*min-width:\s*0/);
    expect(appShellCss).toMatch(/\.app-shell-page-body[\s\S]*height:\s*auto/);
    expect(appShellCss).toMatch(/\.app-shell-page-body[\s\S]*scrollbar-gutter:\s*auto/);
    expect(appShellCss).toMatch(/\.app-shell-page-body[\s\S]*scroll-padding-bottom/);
  });

  it('reserves compact chrome offset on scrollport (not hidden behind menu/command controls)', () => {
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

  it('renders an explicit dev/demo mode banner without changing the scrollport', () => {
    expect(appShellJsx).toContain('app-shell-dev-mode-banner');
    expect(appShellJsx).toContain('isDevAuthBypass');
    expect(appShellCss).toMatch(/\.app-shell-dev-mode-banner[\s\S]*flex:\s*0 0 auto/);
  });

  it('gates Quick Command behind authenticated app shell state', () => {
    expect(appShellJsx).toContain('QuickCommandLauncher');
    expect(appShellJsx).toContain('isAuthed && (');
    expect(appShellJsx).toContain('aria-label="Open Quick Command"');
    expect(appShellJsx).not.toContain('app-shell-theme-fab');
  });

  it('uses the sidebar/drawer as the only authenticated navigation system', () => {
    expect(appShellJsx).toContain('<Sidebar');
    expect(appShellJsx).not.toContain('app-shell-bottom-nav');
    expect(appShellJsx).not.toContain('PRIMARY_MOBILE_NAV_ITEMS.map');
    expect(appShellCss).not.toContain('app-shell-bottom-nav');
    expect(appShellCss).not.toContain('var(--app-bottom-nav-height, 56px)');
  });

  it('defines one authenticated app shell header before route content', () => {
    expect(appShellJsx).toContain('<header className="app-shell-header"');
    expect(appShellJsx.match(/<header className="app-shell-header"/g)).toHaveLength(1);
    expect(appShellCss).toMatch(/\.app-shell-header[\s\S]*position:\s*sticky/);
    expect(appShellCss).toMatch(/\.app-shell-header[\s\S]*pointer-events:\s*none/);
  });

  it('scroll routes grow with content instead of clipping inside page-body', () => {
    expect(appShellCss).toMatch(
      /\.app-shell-page-body:not\(\.app-shell-page-body--conversation\) > \*[\s\S]*min-height:\s*auto/
    );
    expect(appShellCss).toMatch(
      /\.app-shell-page-body:not\(\.app-shell-page-body--conversation\) > \*[\s\S]*overflow:\s*visible/
    );
  });

  it('main content owns viewport width beside the fixed sidebar', () => {
    expect(appShellJsx).toContain('data-layout-role="MainContent"');
    expect(appShellJsx).toContain(
      '<main className={mainContentClassName} data-layout-role="MainContent"'
    );
    expect(appShellJsx.match(/data-layout-role="MainContent"/g)).toHaveLength(1);
    expect(appShellCss).toMatch(/\.app-shell-main-content\s*\{[\s\S]*overflow-y:\s*auto/);
    expect(appShellCss).toMatch(/\.app-shell\s*\{[\s\S]*height:\s*var\(--app-viewport-height/);
    expect(appShellCss).toMatch(
      /\.app-shell-main-wrap[\s\S]*width:\s*calc\(100% - var\(--app-main-inset/
    );
    expect(appShellCss).toMatch(/\.app-shell-main-wrap[\s\S]*overflow:\s*hidden/);
  });

  it('keeps command dashboard out of the conversation-only scroll container', () => {
    expect(appShellJsx).toContain(
      "const isConversationViewport = ['/chat', '/assistant'].includes(location.pathname)"
    );
    expect(readFileSync(join(__dirname, '../App.jsx'), 'utf8')).not.toContain(
      'app-shell-page-body--conversation'
    );
  });
});

describe('App shell layout — JS/CSS alignment', () => {
  it('compact breakpoint matches CSS media queries', () => {
    expect(COMPACT_MEDIA_QUERY).toBe('(max-width: 900px)');
    expect(appShellCss).toContain('max-width: 900px');
  });
});

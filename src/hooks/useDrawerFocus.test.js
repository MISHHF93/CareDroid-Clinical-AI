/**
 * Drawer focus hook contracts (source-level).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const hookSource = readFileSync(join(__dirname, 'useDrawerFocus.js'), 'utf8');
const appShellSource = readFileSync(join(__dirname, '../layout/AppShell.jsx'), 'utf8');
const sidebarSource = readFileSync(join(__dirname, '../components/Sidebar.jsx'), 'utf8');
const sidebarCss = readFileSync(join(__dirname, '../components/Sidebar.css'), 'utf8');

describe('useDrawerFocus — mobile nav accessibility', () => {
  it('traps Tab within the drawer container', () => {
    expect(hookSource).toContain("event.key !== 'Tab'");
    expect(hookSource).toContain('FOCUSABLE_SELECTOR');
  });

  it('locks body scroll and restores focus on close', () => {
    expect(hookSource).toContain("document.body.style.overflow = 'hidden'");
    expect(hookSource).toContain('restore?.focus');
  });

  it('is wired from AppShell when compact nav opens', () => {
    expect(appShellSource).toContain('useDrawerFocus');
    expect(appShellSource).toContain('menuButtonRef');
    expect(appShellSource).toContain('sidebarRef');
  });
});

describe('Sidebar — responsive drawer contracts', () => {
  it('uses forwardRef for focus trap target', () => {
    expect(sidebarSource).toContain('forwardRef');
    expect(sidebarSource).toContain('ref={ref}');
  });

  it('exposes dialog semantics and close control on compact drawer', () => {
    expect(sidebarSource).toContain("aria-modal={layoutCompact && mobileNavOpen ? 'true' : undefined}");
    expect(sidebarSource).toContain("aria-label={layoutCompact ? 'Close menu'");
    expect(sidebarSource).toContain('CHROME_ICONS.close');
  });

  it('hides closed drawer from assistive tech and blocks pointer events', () => {
    expect(sidebarSource).toContain('aria-hidden={layoutCompact && !mobileNavOpen ? true : undefined}');
    expect(sidebarCss).toContain('pointer-events: none');
    expect(sidebarCss).toContain('translateX(-100%)');
  });

  it('keeps main content inset at zero on compact', () => {
    expect(readFileSync(join(__dirname, '../layout/AppShell.css'), 'utf8')).toContain(
      '.app-shell--compact .app-shell-main-wrap'
    );
    expect(readFileSync(join(__dirname, '../layout/AppShell.css'), 'utf8')).toContain('margin-left: 0');
  });

  it('allows nav labels to wrap without horizontal overflow', () => {
    expect(sidebarCss).toContain('.nav-label');
    expect(sidebarCss).toMatch(/\.nav-label[\s\S]*overflow-wrap:\s*anywhere/);
  });
});

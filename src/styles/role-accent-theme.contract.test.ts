import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CSS_PATH = join(__dirname, 'role-accent-theme.css');
const css = readFileSync(CSS_PATH, 'utf8');

// The 6 roles that hardcode a hex accent hue (Reception uses the already
// theme-aware --medical-sky-* tokens instead, so it's excluded here).
const HARDCODED_HUE_ROLES = ['triage', 'nurse', 'physician', 'ems', 'operations', 'admin'];

function extractBlock(selector: string): string | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
}

describe('role-accent-theme.css dark-mode contrast', () => {
  // Found live (2026-08-23): the header account-menu avatar's initials, and
  // the Sidebar's own active-nav highlight (this file's own doc comment
  // names both --nav-item-active-bg/--nav-fg-active as consumers of this
  // exact token chain), were unreadable in dark mode -- every role block
  // only ever defined --medical-accent-hover/--medical-accent-tint once,
  // via html[data-theme][data-role-theme='x'] (matches BOTH themes), using
  // a color-mix(...black) recipe that only has contrast against a light
  // page background. This suite guards the fix (a same-specificity,
  // later-in-source html[data-theme='dark'][data-role-theme='x'] block per
  // role) so a future edit can't silently drop a role's dark variant or
  // revert to a darkening recipe without a real browser to notice.
  for (const role of HARDCODED_HUE_ROLES) {
    it(`${role}: has a dark-mode block that lightens rather than darkens the hover/link tokens`, () => {
      const lightBlock = extractBlock(`html[data-theme][data-role-theme='${role}']`);
      expect(lightBlock, `expected a theme-agnostic block for role "${role}"`).not.toBeNull();

      const darkBlock = extractBlock(`html[data-theme='dark'][data-role-theme='${role}']`);
      expect(darkBlock, `expected a dark-mode block for role "${role}"`).not.toBeNull();

      for (const token of [
        '--medical-accent-hover',
        '--medical-accent-tint',
        '--medical-text-link',
        '--medical-text-link-hover',
      ]) {
        expect(darkBlock, `dark block for "${role}" is missing ${token}`).toContain(token);
      }

      // The light block's hover/link tokens darken toward black (correct
      // for text on a pale tint background); the dark block's must lighten
      // toward white instead (correct for text on a dark page background).
      // A block that darkens in both themes is exactly the bug this guards.
      const hoverLine = darkBlock!
        .split('\n')
        .find((line) => line.includes('--medical-accent-hover:'));
      expect(hoverLine, `dark block for "${role}" has no --medical-accent-hover line`).toBeTruthy();
      expect(hoverLine).toMatch(/,\s*white\)/);
      expect(hoverLine).not.toMatch(/,\s*black\)/);
    });
  }

  it('places every dark-mode block after its theme-agnostic counterpart (source-order tiebreak, not selector specificity, is what makes dark mode win)', () => {
    for (const role of HARDCODED_HUE_ROLES) {
      const lightIndex = css.indexOf(`html[data-theme][data-role-theme='${role}']`);
      const darkIndex = css.indexOf(`html[data-theme='dark'][data-role-theme='${role}']`);
      expect(lightIndex, `theme-agnostic block for "${role}" not found`).toBeGreaterThanOrEqual(0);
      expect(darkIndex, `dark block for "${role}" not found`).toBeGreaterThanOrEqual(0);
      expect(darkIndex).toBeGreaterThan(lightIndex);
    }
  });
});

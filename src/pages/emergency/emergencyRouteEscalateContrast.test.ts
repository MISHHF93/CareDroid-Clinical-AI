import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, 'emergency-route.css'), 'utf8');

describe('emergency-route-queue-row__escalate-btn contrast (Cycle 214)', () => {
  // Regression guard for a real axe-core color-contrast violation (serious
  // impact), measured live at 3.76:1 — white text on #ef4444 (Tailwind
  // red-500), short of WCAG AA's 4.5:1 for a 10px/800-weight label. Fixed by
  // switching to --cdl-critical (#dc2626 fallback), the same
  // already-verified-safe critical-red used by ReceptionSkillStrip.css's
  // --critical tone (4.83:1 with white text). Originally referenced as
  // --cdl-danger-600, which doesn't exist in the cdl-v2 design system (the
  // tone is named "critical", not "danger", with no numbered scale) -- that
  // name always silently fell back to the same #dc2626 literal, so this was
  // never actually theme-aware until the token name was corrected.

  it('escalate-btn uses --cdl-critical, not the failing #ef4444', () => {
    const rule = css.match(/\.emergency-route-queue-row__escalate-btn\s*\{[\s\S]*?\}/)?.[0];
    expect(rule).toBeDefined();
    expect(rule).toContain('background: var(--cdl-critical, #dc2626);');
    expect(rule).not.toContain('#ef4444');
  });
});

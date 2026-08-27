import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('practitioner-compact.css backend-unavailable exemption', () => {
  it('does not blanket-hide the safety-relevant backend-unavailable banner', () => {
    const css = readFileSync(join(__dirname, 'practitioner-compact.css'), 'utf8');

    // AppShell.tsx sets data-practitioner-compact="true" on <main> for
    // essentially every route under the default pilot-customer config
    // (PRACTITIONER_CLEANUP.enabled && PILOT_CUSTOMER_MODE.enabled, both
    // hardcoded true). If this stylesheet blanket-hid .ed-data-source, the
    // showBackendUnavailableIndicator fix in EdDataSourceBanner.tsx --
    // always-visible at the React level -- would still render invisible in
    // the actual browser via `display: none`. Only the plain/stale note
    // (no genuine outage) is allowed to stay hidden here.
    expect(css).toContain(
      '[data-practitioner-compact] .ed-data-source:not(.ed-data-source--error),',
    );
    expect(css).not.toContain('[data-practitioner-compact] .ed-data-source,');
  });
});

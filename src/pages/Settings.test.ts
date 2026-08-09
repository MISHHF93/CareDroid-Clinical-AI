import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

/**
 * Regression coverage for a repository-convergence wiring audit finding
 * (2026-08-08): this page rendered two settings toggles ("Notifications",
 * "Safety banner") bound to purely local `useState` with zero other reader
 * anywhere in the codebase -- confirmed via exhaustive grep. Toggling either
 * had no effect on anything: the real clinical disclaimer is enforced
 * unconditionally elsewhere (appendRequiredDisclaimer/HUMAN_REVIEW_DISCLAIMER),
 * independent of any user preference, and a real, separate notification
 * preferences mechanism already exists at /notification-preferences
 * (src/pages/NotificationPreferences.tsx, backed by NotificationService.ts).
 * Removed the decorative "Safety banner" toggle outright -- there is no safe
 * way to wire a real disclaimer-suppression control, and one should not
 * exist -- and replaced the "Notifications" toggle with a link to the real,
 * canonical preferences page instead of a fake local duplicate.
 */
describe('Settings page — no decorative toggles that silently do nothing', () => {
  const source = readFileSync(join(__dirname, 'Settings.tsx'), 'utf8');

  it('does not reintroduce the inert local "notifications"/"safetyBanner" toggle state', () => {
    expect(source).not.toContain('setNotifications');
    expect(source).not.toContain('setSafetyBanner');
    expect(source).not.toContain('checked={notifications}');
    expect(source).not.toContain('checked={safetyBanner}');
  });

  it('links to the real, canonical notification preferences page instead of a fake toggle', () => {
    expect(source).toContain('to="/notification-preferences"');
  });

  it('no longer claims a user-configurable "Safety banner" / clinical disclaimer control', () => {
    expect(source).not.toContain('Safety banner');
    expect(source).not.toContain('Always show clinical disclaimer');
  });
});

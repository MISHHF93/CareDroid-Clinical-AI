import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, '..');
const read = (path) => readFileSync(join(srcRoot, path), 'utf8');

describe('visual and mobile entropy guardrails', () => {
  it('keeps legacy public notices shell-safe without 100vw viewport overflow', () => {
    ['pages/GDPRNotice.tsx', 'pages/HIPAANotice.tsx', 'pages/HelpCenter.tsx'].forEach((path) => {
      const source = read(path);

      expect(source).not.toContain("width: '100vw'");
      expect(source).toContain("width: '100%'");
      expect(source).toContain("overflowX: 'clip'");
    });
  });

  it('keeps notification preferences inside the app shell instead of owning a viewport shell', () => {
    const css = read('components/NotificationPreferences.css');

    expect(css).toMatch(/\.notification-preferences\s*\{[\s\S]*width:\s*min\(100%,\s*900px\)/);
    expect(css).toMatch(/\.notification-preferences\s*\{[\s\S]*min-width:\s*0/);
    expect(css).not.toMatch(/\.notification-preferences\s*\{[\s\S]*min-height:\s*100vh/);
  });

  it('keeps team management tables and modals locally scrollable without fixed viewport shells', () => {
    const css = read('pages/team/TeamManagement.css');

    expect(css).toMatch(/\.team-management\s*\{[\s\S]*min-height:\s*auto/);
    expect(css).toMatch(/\.user-table-wrapper\s*\{[\s\S]*overflow-x:\s*auto/);
    expect(css).toMatch(/\.user-table\s*\{[\s\S]*min-width:\s*720px/);
    expect(css).toMatch(/\.edit-user-modal,[\s\S]*\.invite-user-modal\s*\{[\s\S]*max-height:\s*min\(90dvh,\s*calc\(100dvh - 32px\)\)/);
  });

  it('keeps platform admin scorecards from forcing mobile overflow', () => {
    const css = read('pages/PlatformAdminPage.css');

    expect(css).toMatch(/\.platform-admin-page\s*\{[\s\S]*min-width:\s*0/);
    expect(css).toMatch(/\.platform-admin-health-card\s*\{[\s\S]*min-width:\s*min\(190px,\s*100%\)/);
    expect(css).toMatch(/@media \(max-width:\s*720px\)[\s\S]*\.platform-admin-health-card\s*\{[\s\S]*min-width:\s*0/);
  });
});

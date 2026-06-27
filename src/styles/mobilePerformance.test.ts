/**
 * Mobile performance contracts — defer startup, lazy routes, CLS helpers.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');

function read(rel) {
  return readFileSync(join(repoRoot, rel), 'utf8');
}

describe('mobile performance — startup deferral', () => {
  it('main.jsx schedules deferred startup instead of sync service imports', () => {
    const main = read('src/main.tsx');
    expect(main).toContain('scheduleDeferredStartupTasks');
    expect(main).not.toMatch(/import\s+.*from\s+['"].*offlineService/);
    expect(main).not.toMatch(/import\s+.*from\s+['"].*crashReportingService/);
    expect(main).toContain('mobile-performance.css');
  });

  it('deferStartupTasks dynamically imports heavy services', () => {
    const defer = read('src/utils/deferStartupTasks.ts');
    expect(defer).toContain("import('../services/offlineService')");
    expect(defer).toContain("import('../services/crashReportingService')");
    expect(defer).toMatch(/runAfterFirstPaint/);
  });
});

describe('mobile performance — routing & bundles', () => {
  it('keeps Copilot persistent instead of mounting a duplicate assistant page', () => {
    const app = read('src/app/router.tsx');
    const appShell = read('src/components/AppShell.tsx');
    expect(app).not.toMatch(/pages\/Dashboard/);
    expect(appShell).toContain('<CopilotPanel />');
    expect(app).toContain('path={CANONICAL_ROUTES.emergencyCopilot}');
    expect(app).toContain('EmergencyAliasRedirect to={CANONICAL_ROUTES.emergencyCopilot}');
  });

  it('vite manualChunks isolates calculators, catalog, dashboard, dexie, firebase', () => {
    const vite = read('vite.config.ts');
    expect(vite).toContain("'calculators'");
    expect(vite).toContain("'clinical-catalog'");
    expect(vite).toContain("'dashboard'");
    expect(vite).toContain("'vendor-idb'");
    expect(vite).toContain("'vendor-firebase'");
  });

  it('does not use artificial auth gates in the flattened app shell', () => {
    const app = read('src/app/router.tsx');
    expect(app).not.toContain('setIsChecking(false), 500');
    expect(app).not.toContain('setIsChecking(false), 150');
  });
});

describe('mobile performance — CLS & images', () => {
  it('reserves loader height and uses content-visibility', () => {
    const css = read('src/styles/mobile-performance.css');
    expect(css).toMatch(/\.page-loader[\s\S]*min-height:\s*min\(100dvh/);
    expect(css).toContain('content-visibility: auto');
    expect(css).toContain('touch-action: manipulation');
  });

  it('images use lazy loading where avatars are rendered', () => {
    const workloadPanel = read('src/components/WorkloadBalancePanel.tsx');
    expect(workloadPanel).toContain('loading="lazy"');
  });
});

describe('mobile performance — render & interaction', () => {
  it('memoizes ToolCard and removes the duplicate assistant dashboard page', () => {
    expect(read('src/components/ToolCard.tsx')).toContain('React.memo');
    const app = read('src/app/router.tsx');
    expect(app).not.toContain("import Dashboard from './pages/Dashboard'");
  });

  it('documents audit in docs/mobile-performance-audit.md', () => {
    const doc = read('docs/mobile-performance-audit.md');
    expect(doc).toContain('LCP');
    expect(doc).toContain('CLS');
    expect(doc).toContain('INP');
  });
});

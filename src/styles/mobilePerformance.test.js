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
    const main = read('src/main.jsx');
    expect(main).toContain('scheduleDeferredStartupTasks');
    expect(main).not.toMatch(/import\s+.*from\s+['"].*offlineService/);
    expect(main).not.toMatch(/import\s+.*from\s+['"].*crashReportingService/);
    expect(main).toContain('mobile-performance.css');
  });

  it('deferStartupTasks dynamically imports heavy services', () => {
    const defer = read('src/utils/deferStartupTasks.js');
    expect(defer).toContain("import('../services/offlineService')");
    expect(defer).toContain("import('../services/crashReportingService')");
    expect(defer).toMatch(/runAfterFirstPaint/);
  });
});

describe('mobile performance — routing & bundles', () => {
  it('keeps the removed assistant page out of the initial chunk', () => {
    const app = read('src/App.jsx');
    expect(app).not.toMatch(/pages\/Dashboard/);
    expect(app).toContain('EmergencyCopilotRoute');
  });

  it('vite manualChunks isolates calculators, catalog, dashboard, dexie, firebase', () => {
    const vite = read('vite.config.js');
    expect(vite).toContain("'calculators'");
    expect(vite).toContain("'clinical-catalog'");
    expect(vite).toContain("'dashboard'");
    expect(vite).toContain("'vendor-idb'");
    expect(vite).toContain("'vendor-firebase'");
  });

  it('does not use artificial 500ms auth gate', () => {
    const app = read('src/App.jsx');
    expect(app).not.toContain('setIsChecking(false), 500');
    expect(app).toContain('setIsChecking(false), 150');
  });
});

describe('mobile performance — CLS & images', () => {
  it('reserves loader height and uses content-visibility', () => {
    const css = read('src/styles/mobile-performance.css');
    expect(css).toMatch(/\.page-loader[\s\S]*min-height:\s*min\(100dvh/);
    expect(css).toContain('content-visibility: auto');
    expect(css).toContain('touch-action: manipulation');
  });

  it('images use lazy decode and dimensions', () => {
    const avatar = read('src/components/PatientCard.jsx');
    expect(avatar).toContain('loading="lazy"');
    const tfa = read('src/pages/TwoFactorSetup.jsx');
    expect(tfa).toMatch(/width=\{280\}/);
    expect(tfa).toMatch(/height=\{280\}/);
    expect(tfa).toContain('decoding="async"');
  });
});

describe('mobile performance — render & interaction', () => {
  it('memoizes ToolCard and removes the duplicate assistant dashboard page', () => {
    expect(read('src/components/ToolCard.jsx')).toContain('React.memo');
    const app = read('src/App.jsx');
    expect(app).not.toContain("import Dashboard from './pages/Dashboard'");
  });

  it('documents audit in docs/mobile-performance-audit.md', () => {
    const doc = read('docs/mobile-performance-audit.md');
    expect(doc).toContain('LCP');
    expect(doc).toContain('CLS');
    expect(doc).toContain('INP');
  });
});

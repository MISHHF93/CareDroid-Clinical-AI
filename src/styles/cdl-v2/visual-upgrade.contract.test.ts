import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');

describe('visual upgrade waves V3–V4', () => {
  it('emergency route metrics use semantic tones not raw hex colors', () => {
    const pages = readFileSync(join(root, 'pages/emergency/emergencyRoutePages.tsx'), 'utf8');
    expect(pages).not.toMatch(/color:\s*'#EF4444'/i);
    expect(pages).not.toMatch(/color:\s*'#F59E0B'/i);
    expect(pages).not.toMatch(/color:\s*'#10B981'/i);
    expect(pages).not.toMatch(/color:\s*'#F97316'/i);
    expect(pages).toMatch(/tone:\s*'critical'|tone:\s*[^,]+\?\s*'critical'/);
    expect(pages).toMatch(/tone:\s*'warning'|tone:\s*[^,]+\?\s*'warning'/);
    expect(pages).toMatch(/tone:\s*'success'|tone:\s*[^,]+\?\s*'success'/);
    expect(pages).toContain("tone: 'info'");
  });

  it('MetricGrid maps hex fallbacks to tones', () => {
    const shared = readFileSync(join(root, 'pages/emergency/emergencyRouteShared.tsx'), 'utf8');
    expect(shared).toContain('resolveMetricTone');
    expect(shared).toContain('EF4444');
  });

  it('top emergency CSS files avoid pale grey hex', () => {
    const files = [
      'pages/emergency/emergency-whiteboard-cleanup.css',
      'pages/ClinicalAlertsPage.css',
      'components/Header.css',
      'components/Sidebar.css',
    ];
    for (const rel of files) {
      const css = readFileSync(join(root, rel), 'utf8');
      expect(css, rel).not.toContain('#9ca3af');
    }
  });
});

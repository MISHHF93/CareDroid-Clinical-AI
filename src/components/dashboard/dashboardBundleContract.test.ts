/**
 * Cycle 68 — MetricCard / light primitives must not import recharts.
 * Chart components live in DashboardCharts.tsx so operations surfaces that only
 * need MetricCard do not download vendor-charts.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('dashboard visualization bundle contract', () => {
  it('DashboardVisualizations.tsx does not import recharts', () => {
    const source = readFileSync(join(dir, 'DashboardVisualizations.tsx'), 'utf8');
    expect(source).not.toMatch(/from ['"]recharts['"]/);
    expect(source).toContain('export function MetricCard');
    expect(source).toContain('export function VisualizationPanel');
  });

  it('DashboardCharts.tsx owns the recharts dependency', () => {
    const source = readFileSync(join(dir, 'DashboardCharts.tsx'), 'utf8');
    expect(source).toMatch(/from ['"]recharts['"]/);
    expect(source).toContain('export function CategoryBarChart');
    expect(source).toContain('export function TrendChart');
    expect(source).toContain('export function DistributionDonutChart');
  });
});

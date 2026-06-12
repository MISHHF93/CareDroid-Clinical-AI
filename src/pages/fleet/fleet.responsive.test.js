/**
 * Fleet & admin dashboard responsive layout contracts.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fleetUxShared = readFileSync(join(__dirname, 'fleetUxShared.css'), 'utf8');
const fleetDashboardCss = readFileSync(join(__dirname, 'FleetDashboard.css'), 'utf8');
const pmCss = readFileSync(join(__dirname, 'PredictiveMaintenance.css'), 'utf8');
const roCss = readFileSync(join(__dirname, 'RouteOptimizer.css'), 'utf8');
const analyticsCss = readFileSync(join(__dirname, '../AnalyticsDashboard.css'), 'utf8');
const settingsCss = readFileSync(join(__dirname, '../Settings.css'), 'utf8');
const costCss = readFileSync(join(__dirname, '../CostAnalyticsDashboard.css'), 'utf8');
const catalogCss = readFileSync(join(__dirname, '../tools/ClinicalToolCatalog.css'), 'utf8');

describe('Fleet pages — responsive grids', () => {
  it('uses minmax(min(100%, …)) metric grids on fleet dashboard', () => {
    expect(fleetDashboardCss).toContain('minmax(min(100%, 140px), 1fr)');
    expect(fleetDashboardCss).toMatch(/\.fleet-stat-grid[\s\S]*minmax\(min\(100%, 140px\)/);
  });

  it('stacks fleet dashboard stat grid on very narrow viewports', () => {
    expect(fleetDashboardCss).toMatch(/@media \(max-width: 380px\)[\s\S]*\.fleet-stat-grid[\s\S]*1fr/);
  });

  it('uses two-column minmax layout for PM and route optimizer at desktop', () => {
    expect(pmCss).toMatch(/@media \(min-width: 900px\)[\s\S]*minmax\(0,\s*1fr\)/);
    expect(roCss).toMatch(/@media \(min-width: 900px\)[\s\S]*minmax\(0,\s*1fr\)/);
  });

  it('collapses PM telemetry and route savings grids on mobile', () => {
    expect(pmCss).toMatch(/@media \(max-width: 640px\)[\s\S]*\.predictive-maintenance-telemetry[\s\S]*1fr/);
    expect(roCss).toMatch(/@media \(max-width: 640px\)[\s\S]*\.route-optimizer-savings[\s\S]*1fr/);
  });
});

describe('Fleet pages — tables, addresses, states', () => {
  it('defines shared scrollable table wrap with sticky headers', () => {
    expect(fleetUxShared).toContain('.fleet-data-table-wrap');
    expect(fleetUxShared).toMatch(/\.fleet-data-table-wrap thead th[\s\S]*position:\s*sticky/);
  });

  it('wraps route destination labels and meta', () => {
    expect(roCss).toMatch(/\.route-optimizer-route-title[\s\S]*overflow-wrap:\s*anywhere/);
    expect(roCss).toMatch(/\.route-optimizer-route-meta[\s\S]*overflow-wrap:\s*anywhere/);
  });

  it('clips horizontal overflow on fleet page roots', () => {
    expect(fleetUxShared).toMatch(/\.fleet-dashboard[\s\S]*overflow-x:\s*clip/);
    expect(pmCss).toContain('overflow-x: clip');
    expect(roCss).toContain('overflow-x: clip');
  });

  it('sizes empty and loading panels for narrow screens', () => {
    expect(fleetDashboardCss).toMatch(/\.fleet-dashboard-empty[\s\S]*max-width:\s*100%/);
    expect(pmCss).toMatch(/\.predictive-maintenance-empty[\s\S]*overflow-wrap:\s*anywhere/);
    expect(roCss).toMatch(/\.route-optimizer-empty[\s\S]*overflow-wrap:\s*anywhere/);
  });
});

describe('Admin dashboards & catalog tables', () => {
  it('uses responsive summary grids on analytics dashboard', () => {
    expect(analyticsCss).toContain('minmax(min(100%, 220px), 1fr)');
    expect(analyticsCss).toContain('overflow-x: clip');
  });

  it('keeps settings audit log cards wrapped without breaking page width', () => {
    expect(settingsCss).toContain('overflow-x: clip');
    expect(settingsCss).toMatch(/\.settings-audit-log-item[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*auto/);
    expect(settingsCss).toMatch(/\.settings-audit-log-item strong[\s\S]*overflow-wrap:\s*anywhere/);
    expect(settingsCss).toMatch(/\.settings-audit-log-item span,[\s\S]*\.settings-audit-log-item time[\s\S]*overflow-wrap:\s*anywhere/);
  });

  it('makes cost analytics chart host scrollable and cards wrap', () => {
    expect(costCss).toContain('minmax(min(100%, 220px), 1fr)');
    expect(costCss).toMatch(/\.cost-chart[\s\S]*overflow-x:\s*auto/);
  });

  it('keeps clinical catalog tables in stacked card mode on mobile', () => {
    expect(catalogCss).toMatch(/@media \(max-width: 640px\)[\s\S]*\.catalog-table--stacked/);
  });
});

/**
 * UX & accessibility contracts for PR-FLEET Tier-A pages and dispatch hub wiring.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { fleetChatAssistedLaunchAriaLabel } from '../../data/chatAssistedHubGroups';
import { dispatchAiChatConfig } from '../../data/chatAssistedFleet/dispatchAi';

const __dirname = dirname(fileURLToPath(import.meta.url));

const fleetDashboard = readFileSync(join(__dirname, 'FleetDashboard.jsx'), 'utf8');
const fleetDashboardWidgets = readFileSync(join(__dirname, 'FleetDashboardWidgets.jsx'), 'utf8');
const predictiveMaintenance = readFileSync(join(__dirname, 'PredictiveMaintenance.jsx'), 'utf8');
const predictiveMaintenanceWidgets = readFileSync(
  join(__dirname, 'PredictiveMaintenanceWidgets.jsx'),
  'utf8'
);
const routeOptimizer = readFileSync(join(__dirname, 'RouteOptimizer.jsx'), 'utf8');
const routeOptimizerWidgets = readFileSync(join(__dirname, 'RouteOptimizerWidgets.jsx'), 'utf8');
const fleetPageChrome = readFileSync(join(__dirname, 'FleetPageChrome.jsx'), 'utf8');
const fleetUxShared = readFileSync(join(__dirname, 'fleetUxShared.css'), 'utf8');
const calculators = readFileSync(join(__dirname, '../tools/Calculators.jsx'), 'utf8');
const chatHubGroups = readFileSync(join(__dirname, '../../data/chatAssistedHubGroups.js'), 'utf8');

describe('Fleet shared chrome — keyboard & landmarks', () => {
  it('exposes skip link, back control, and main landmark', () => {
    expect(fleetPageChrome).toContain('fleet-skip-link');
    expect(fleetPageChrome).toContain('Skip to main content');
    expect(fleetPageChrome).toContain('main.focus');
    expect(fleetPageChrome).toContain('aria-label="Back to tools catalog"');
    expect(fleetPageChrome).toContain('<main id={mainId}');
    expect(fleetPageChrome).toContain('tabIndex={-1}');
  });

  it('styles focus-visible and reduced-motion for loading', () => {
    expect(fleetUxShared).toContain(':focus-visible');
    expect(fleetUxShared).toContain('prefers-reduced-motion');
    expect(fleetUxShared).toContain('min-height: 44px');
    expect(fleetUxShared).toContain('fleet-live-region');
    expect(fleetUxShared).toContain('tabular-nums');
    expect(fleetUxShared).toContain('aria-invalid');
  });
});

describe('Fleet Command Dashboard — states & safety', () => {
  it('implements loading, empty, error, and operational alert patterns', () => {
    expect(fleetDashboard).toContain("phase === 'loading'");
    expect(fleetDashboard).toContain('aria-busy="true"');
    expect(fleetDashboard).toContain('fleet-dashboard-empty');
    expect(fleetDashboard).toContain('role="alert"');
    expect(fleetDashboard).toContain('fleet-operational-warning');
    expect(fleetDashboard).toContain('fleet-no-automation-note');
    expect(fleetDashboard).toContain('fleet-live-region');
    expect(fleetDashboard).toContain('isRefreshing');
    expect(fleetDashboardWidgets).toContain('fleet-sr-only');
  });

  it('widgets expose energy meters and maintenance breakdown', () => {
    expect(fleetDashboardWidgets).toContain('role="meter"');
    expect(fleetDashboardWidgets).toContain('FleetMaintenanceWidget');
    expect(fleetDashboardWidgets).toContain('FleetEnergyMeter');
  });
});

describe('Predictive Maintenance — form a11y & automation guardrails', () => {
  it('uses FleetPageChrome, labeled inputs, and anti-automation copy', () => {
    expect(predictiveMaintenance).toContain('FleetPageChrome');
    expect(predictiveMaintenance).toContain('noValidate');
    expect(predictiveMaintenance).toContain('htmlFor=');
    expect(predictiveMaintenance).toContain('fleet-operational-warning');
    expect(predictiveMaintenance).toContain('fleet-no-automation-note');
    expect(predictiveMaintenance).toContain('aria-label="Calculate maintenance risk score"');
    expect(predictiveMaintenance).toContain('aria-invalid={validationError');
    expect(predictiveMaintenance).toContain('getMaintenanceOpsWarningItems');
  });

  it('widgets expose risk, inspection, and anomaly sections', () => {
    expect(predictiveMaintenanceWidgets).toContain('PredictiveMaintenanceRiskCard');
    expect(predictiveMaintenanceWidgets).toContain('PredictiveMaintenanceInspectionList');
    expect(predictiveMaintenanceWidgets).toContain('PredictiveMaintenanceAnomalyList');
    expect(predictiveMaintenanceWidgets).toContain('shouldShowMaintenanceOpsWarning');
    expect(predictiveMaintenanceWidgets).toContain('getMaintenanceOpsWarningItems');
    expect(predictiveMaintenanceWidgets).toContain('role="status"');
  });
});

describe('Route Optimizer — form a11y & window-risk alerts', () => {
  it('uses FleetPageChrome, stop removal labels, and route warnings', () => {
    expect(routeOptimizer).toContain('FleetPageChrome');
    expect(routeOptimizer).toContain('aria-label={`Remove stop');
    expect(routeOptimizer).toContain('fleet-operational-warning');
    expect(routeOptimizer).toContain('fleet-no-automation-note');
    expect(routeOptimizer).toContain('role="alert"');
    expect(routeOptimizer).toContain('getRouteOpsWarningItems');
    expect(routeOptimizer).toContain('type="time"');
  });

  it('widgets expose savings, sequence, and warning helpers', () => {
    expect(routeOptimizerWidgets).toContain('RouteSavingsWidget');
    expect(routeOptimizerWidgets).toContain('RouteSequenceList');
    expect(routeOptimizerWidgets).toContain('shouldShowRouteOpsWarning');
    expect(routeOptimizerWidgets).toContain('getRouteOpsWarningItems');
    expect(routeOptimizerWidgets).toContain('aria-label="Optimized stop sequence"');
  });
});

describe('Dispatch Intelligence — hub & chat safety', () => {
  it('fleet hub group warns against auto-assign and uses fleet aria label', () => {
    expect(chatHubGroups).toMatch(/fleet-dispatch[\s\S]*does not auto-assign/i);
    expect(calculators).toContain('fleetChatAssistedLaunchAriaLabel');
    expect(calculators).toContain('calc-chat-assisted-group--fleet');
    expect(calculators).toContain('calc-chat-assisted-safety-pill');
    expect(calculators).toContain('Human approval required');
    const label = fleetChatAssistedLaunchAriaLabel('Dispatch Intelligence');
    expect(label).toMatch(/does not auto-assign/i);
    expect(label).toMatch(/Human dispatcher approval/i);
  });

  it('chat seed states dispatcher authority and no live-system control', () => {
    expect(dispatchAiChatConfig.chatSeed).toMatch(/human dispatcher must approve/i);
    expect(dispatchAiChatConfig.chatSeed).toMatch(/do NOT have authority/i);
    expect(dispatchAiChatConfig.description).toMatch(/Does not auto-assign/i);
  });
});

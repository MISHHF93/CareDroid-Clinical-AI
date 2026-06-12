import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FEATURE_REGISTRY, FEATURE_REGISTRY_BY_ID } from '../lib/features/featureRegistry';
import { buildDefaultFlags } from '../store/featureStore';
import { buildSidebarItems } from './layout/AppShell';

const __dirname = dirname(fileURLToPath(import.meta.url));

const readSource = (relativePath) => readFileSync(join(__dirname, relativePath), 'utf8');

describe('feature flag UI coverage', () => {
  it('removes disabled feature icons from the live AppShell sidebar builder', () => {
    const sidebarItems = buildSidebarItems((featureId) => featureId !== 'ems_pipeline');

    expect(sidebarItems.map((item) => item.featureId)).not.toContain('ems_pipeline');
    expect(sidebarItems.map((item) => item.featureId)).toEqual(
      expect.arrayContaining([
        'emergency_whiteboard',
        'emergency_patients',
        'smart_intake',
        'queue_intelligence',
        'reassessment_engine',
        'referral_intelligence',
        'capacity_intelligence',
        'boarding_intelligence',
        'ed_copilot',
        'emergency_analytics',
        'emergency_settings',
      ])
    );
  });

  it('keeps first-load defaults on for core and professional features while environment-gating simulation', () => {
    const defaults = buildDefaultFlags('professional');

    for (const feature of FEATURE_REGISTRY) {
      if (feature.id === 'simulation_engine') continue;
      if (feature.tier === 'core') {
        expect(defaults[feature.id], feature.id).toBe(true);
      }
      if (feature.tier === 'professional') {
        expect(defaults[feature.id], feature.id).toBe(import.meta.env.DEV ? true : feature.defaultEnabled);
      }
      if (feature.tier === 'enterprise') {
        expect(defaults[feature.id], feature.id).toBe(false);
      }
    }

    expect(defaults.simulation_engine).toBe(Boolean(import.meta.env.DEV));
  });

  it('guards canonical route panels with their owning feature flags', () => {
    const appSource = readSource('App.jsx');

    expect(appSource).toContain('<FeatureRouteGuard feature="ems_pipeline">');
    expect(appSource).toContain('<FeatureRouteGuard feature="queue_intelligence">');
    expect(appSource).toContain('<FeatureRouteGuard feature="referral_intelligence">');
    expect(appSource).toContain('<FeatureRouteGuard feature="capacity_intelligence">');
  });

  it('guards patient detail backend sections and calculator cards', () => {
    const patientDetailSource = readSource('components/PatientCard.jsx');
    const calculatorHubSource = readSource('pages/emergency/ClinicalCalculatorHub.jsx');

    expect(patientDetailSource).toContain('<FeatureGate feature="vitals_history_chart"');
    expect(patientDetailSource).toContain('feature={BACKEND_DATA_FEATURE_BY_TAB.medications}');
    expect(patientDetailSource).toContain('feature={BACKEND_DATA_FEATURE_BY_TAB.orders}');
    expect(patientDetailSource).toContain('feature={BACKEND_DATA_FEATURE_BY_TAB.labs}');
    expect(calculatorHubSource).toContain('feature={featureForTool(tool.id)}');
    expect(calculatorHubSource).toContain('<FeatureGate feature={activeToolFeature} showPlaceholder>');
  });

  it('guards audit log, simulation autostart, and Copilot tool actions', () => {
    const settingsSource = readSource('pages/Settings.jsx');
    const mainSource = readSource('main.jsx');
    const chatSource = readSource('components/ChatInterface.jsx');

    expect(settingsSource).toContain('<FeatureGate feature="audit_log">');
    expect(mainSource).toContain("isEnabled('simulation_engine')");
    expect(mainSource).toContain('startEmergencySimulation();');
    expect(chatSource).toContain('copilotToolActionsEnabled && actionSuggestion');
    expect(chatSource).toContain('enabledFeatures: enabledCopilotFeatures');
    expect(chatSource).toContain('emsPipelineEnabled ? buildEMSPressureCopilotContext(emsPressure) : null');
  });

  it('keeps requested feature ids registered for gated surfaces', () => {
    expect(FEATURE_REGISTRY_BY_ID.ems_pipeline.sidebarRoute).toBe('/emergency/ems');
    expect(FEATURE_REGISTRY_BY_ID.smart_intake.sidebarRoute).toBe('/emergency/intake');
    expect(FEATURE_REGISTRY_BY_ID.clinical_calculator_hub.sidebarRoute).toBe('/emergency/copilot');
    expect(FEATURE_REGISTRY_BY_ID.queue_intelligence.sidebarRoute).toBe('/emergency/queues');
    expect(FEATURE_REGISTRY_BY_ID.reassessment_engine.sidebarRoute).toBe('/emergency/reassessment');
    expect(FEATURE_REGISTRY_BY_ID.referral_intelligence.sidebarRoute).toBe('/emergency/referrals');
    expect(FEATURE_REGISTRY_BY_ID.capacity_intelligence.sidebarRoute).toBe('/emergency/capacity');
    expect(FEATURE_REGISTRY_BY_ID.boarding_intelligence.sidebarRoute).toBe('/emergency/boarding');
    expect(FEATURE_REGISTRY_BY_ID.emergency_analytics.sidebarRoute).toBe('/emergency/analytics');
    expect(FEATURE_REGISTRY_BY_ID.emergency_settings.sidebarRoute).toBe('/emergency/settings');
    expect(FEATURE_REGISTRY_BY_ID.vitals_history_chart).toBeTruthy();
    expect(FEATURE_REGISTRY_BY_ID.lab_results_panel).toBeTruthy();
    expect(FEATURE_REGISTRY_BY_ID.medication_history).toBeTruthy();
    expect(FEATURE_REGISTRY_BY_ID.imaging_orders).toBeTruthy();
    expect(FEATURE_REGISTRY_BY_ID.audit_log).toBeTruthy();
    expect(FEATURE_REGISTRY_BY_ID.copilot_tool_actions).toBeTruthy();
  });
});

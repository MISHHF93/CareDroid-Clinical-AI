import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FEATURE_REGISTRY, FEATURE_REGISTRY_BY_ID } from '../lib/features/featureRegistry';
import { buildDefaultFlags } from './store/emergencyStore';
import { APP_SHELL_NAV_ITEMS } from './config/navigation.config';
import { buildSidebarItems } from './config/navigation.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

const readSource = (relativePath) => readFileSync(join(__dirname, relativePath), 'utf8');

describe('feature flag UI coverage', () => {
  it('removes disabled feature icons from the live AppShell sidebar builder', () => {
    const sidebarItems = buildSidebarItems((featureId) => featureId !== 'ems_pipeline');

    expect(sidebarItems.map((item) => item.featureId)).not.toContain('ems_pipeline');
    expect(sidebarItems.map((item) => item.featureId)).toEqual(
      expect.arrayContaining([
        'emergency_whiteboard',
        'referral_intelligence',
        'capacity_intelligence',
      ])
    );
    expect(sidebarItems).toHaveLength(
      APP_SHELL_NAV_ITEMS.filter((item) => !(item.featureGate && item.featureId === 'ems_pipeline')).length
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

  it('mounts canonical route panels through the consolidated CareDroid router', () => {
    const appSource = readSource('app/router.tsx');

    expect(appSource).toContain('path={CANONICAL_ROUTES.emergencyEms}');
    expect(appSource).toContain('path={CANONICAL_ROUTES.emergencyQueues}');
    expect(appSource).toContain('path={CANONICAL_ROUTES.emergencyReferrals}');
    expect(appSource).toContain('path={CANONICAL_ROUTES.emergencyCapacity}');
  });

  it('keeps patient detail actions local and calculator cards gated', () => {
    const patientDetailSource = readSource('components/PatientDetailPanel.tsx');
    const calculatorHubSource = readSource('components/ClinicalCalculatorHub.tsx');

    expect(patientDetailSource).toContain('<HEARTScore patientId={selectedPatient.id}');
    expect(patientDetailSource).toContain('<QSOFA patientId={selectedPatient.id}');
    expect(patientDetailSource).toContain('<PediatricDrugCalc patientId={selectedPatient.id}');
    expect(calculatorHubSource).toContain('export const CALCULATORS');
    expect(calculatorHubSource).toContain('component:');
  });

  it('guards audit log, simulation autostart, and Copilot mount', () => {
    const settingsSource = readSource('pages/Settings.tsx');
    const appShellSource = readSource('components/AppShell.tsx');

    expect(settingsSource).toContain('<FeatureGate feature="audit_log">');
    expect(appShellSource).toContain('startReassessmentEngine()');
    expect(appShellSource).toContain('startCapacityEngine()');
    expect(appShellSource).toContain('startContinuousPatientFlowEngine()');
    expect(appShellSource).toContain('startAdministrativeAutomationEngine()');
    expect(appShellSource).toContain('copilotOpen ?');
    expect(appShellSource).toContain('<CopilotPanel />');
  });

  it('keeps requested feature ids registered for gated surfaces', () => {
    expect(FEATURE_REGISTRY_BY_ID.ems_pipeline.sidebarRoute).toBe('/emergency/ems');
    expect(FEATURE_REGISTRY_BY_ID.smart_intake.sidebarRoute).toBe('/emergency/intake');
    expect(FEATURE_REGISTRY_BY_ID.clinical_calculator_hub.sidebarRoute).toBe('/emergency/whiteboard');
    expect(FEATURE_REGISTRY_BY_ID.queue_intelligence.sidebarRoute).toBe('/emergency/queues');
    expect(FEATURE_REGISTRY_BY_ID.reassessment_engine.sidebarRoute).toBe('/emergency/reassessment');
    expect(FEATURE_REGISTRY_BY_ID.referral_intelligence.sidebarRoute).toBe('/emergency/referrals');
    expect(FEATURE_REGISTRY_BY_ID.capacity_intelligence.sidebarRoute).toBe('/emergency/capacity');
    expect(FEATURE_REGISTRY_BY_ID.boarding_intelligence.sidebarRoute).toBe(
      '/emergency/capacity?view=boarding',
    );
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

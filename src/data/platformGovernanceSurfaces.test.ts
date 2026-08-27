import { describe, expect, it } from 'vitest';
import {
  buildModelInventoryCards,
  buildPlatformGovernanceSurfaceView,
  inferPlatformGovernanceSurface,
  resolvePlatformGovernanceCopy,
} from './platformGovernanceSurfaces';

describe('platformGovernanceSurfaces', () => {
  it('infers enterprise governance surfaces from pathname', () => {
    expect(inferPlatformGovernanceSurface('/ai-governance')).toBe('governance');
    expect(inferPlatformGovernanceSurface('/security')).toBe('ai-security');
    expect(inferPlatformGovernanceSurface('/equity')).toBe('equity');
    expect(inferPlatformGovernanceSurface('/privacy')).toBe('privacy');
    expect(inferPlatformGovernanceSurface('/integrations')).toBe('interoperability');
  });

  it('resolves enterprise route copy', () => {
    expect(resolvePlatformGovernanceCopy('/ai-governance').title).toBe('AI Governance Center');
    expect(resolvePlatformGovernanceCopy('/security').title).toBe('LLM Security Dashboard');
    expect(resolvePlatformGovernanceCopy('/privacy').title).toBe('Consent + Privacy Center');
  });

  it('builds demo panel views when API panels are missing', () => {
    const view = buildPlatformGovernanceSurfaceView({
      surface: 'governance',
      pathname: '/ai-governance',
      apiData: { status: 'local_fallback', readiness: { blocked: true } },
      sourceStatus: 'fallback',
    });

    expect(view.metrics).toHaveLength(4);
    expect(Object.keys(view.panels).length).toBeGreaterThan(0);
    expect(view.panelChart.length).toBeGreaterThan(0);
    expect(view.controls.length).toBeGreaterThan(0);
  });

  // Regression coverage for the 2026-08-27 fix: PlatformGovernanceService's
  // real getConsent()/getPrivacyAccessLog() responses shape their record
  // arrays as `records`/`accessLog` -- neither key was recognized by the
  // "Records" metric's counting logic, so the consent and privacy surfaces
  // always showed "Records: 0" no matter how many real records existed.
  it('counts real consent records under the "records" response key', () => {
    const view = buildPlatformGovernanceSurfaceView({
      surface: 'consent',
      pathname: '/consent/patient-1',
      apiData: {
        patientId: 'patient-1',
        effectiveStatus: 'granted',
        records: [
          { id: 'c1', status: 'granted' },
          { id: 'c2', status: 'revoked' },
        ],
      },
      sourceStatus: 'live',
    });

    const recordsMetric = view.metrics.find((metric) => metric.label === 'Records');
    expect(recordsMetric?.value).toBe('2');
  });

  it('counts real privacy access-log entries under the "accessLog" response key', () => {
    const view = buildPlatformGovernanceSurfaceView({
      surface: 'privacy',
      pathname: '/privacy',
      apiData: {
        patientId: 'patient-1',
        accessLog: [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }],
        safety: { failClosed: true },
      },
      sourceStatus: 'live',
    });

    const recordsMetric = view.metrics.find((metric) => metric.label === 'Records');
    expect(recordsMetric?.value).toBe('3');
  });

  // GET /api/ai-governance/summary's panels.modelInventory serves real, human-curated
  // model cards (data/model-registry/entries/*.json via ModelRegistryService.listModels()
  // in backend/src/modules/governance/governance.module.ts) -- previously the generic
  // controls mapping collapsed this to a fallback score, a "5 records" summary, and a
  // 220-char JSON.stringify slice, none of which surfaced the real fields an admin needs.
  it('extracts real, readable model-card fields from a modelInventory panel', () => {
    const rawModel = {
      modelId: 'mdl-claude-sonnet-4-6-v1',
      modelName: 'Anthropic Claude Sonnet 4.6 (CareDroid default generation)',
      version: 'claude-sonnet-4-6',
      status: 'approved',
      purpose: 'Conversational ED copilot / chat under human confirmation.',
      regulatoryClass: 'informational_cds',
      owner: 'Clinical Informatics',
      knownLimitations: ['Requires human review on all clinical outputs (provenance contract).'],
      expiresAt: '2027-07-11',
      retirementPlan: 'Rotate to next approved model via registry entry + canary; never silent swap.',
    };

    const cards = buildModelInventoryCards([rawModel]);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      modelId: 'mdl-claude-sonnet-4-6-v1',
      modelName: 'Anthropic Claude Sonnet 4.6 (CareDroid default generation)',
      modelIdentifier: 'claude-sonnet-4-6',
      status: 'approved',
      purpose: 'Conversational ED copilot / chat under human confirmation.',
      regulatoryClass: 'informational_cds',
      owner: 'Clinical Informatics',
      expiresAt: '2027-07-11',
      retirementPlan: 'Rotate to next approved model via registry entry + canary; never silent swap.',
    });
    expect(cards[0].limitations).toEqual([
      'Requires human review on all clinical outputs (provenance contract).',
    ]);
  });

  it('labels missing model-card fields honestly instead of fabricating them', () => {
    const cards = buildModelInventoryCards([{ modelId: 'mdl-incomplete' }]);
    expect(cards).toHaveLength(1);
    expect(cards[0].purpose).toBe('Not documented');
    expect(cards[0].owner).toBe('Not documented');
    expect(cards[0].limitations).toEqual([]);
  });

  it('returns an empty array for a non-array panel value (never throws)', () => {
    expect(buildModelInventoryCards(undefined)).toEqual([]);
    expect(buildModelInventoryCards({ notAnArray: true })).toEqual([]);
  });

  it('wires modelInventory cards into buildPlatformGovernanceSurfaceView controls, keyed by panel id', () => {
    const view = buildPlatformGovernanceSurfaceView({
      surface: 'governance',
      pathname: '/ai-governance',
      apiData: {
        status: 'guarded',
        readiness: { blocked: false },
        panels: {
          modelInventory: [
            {
              modelId: 'mdl-x',
              modelName: 'Model X',
              version: 'model-x-v1',
              status: 'approved',
              purpose: 'Testing purpose.',
              regulatoryClass: 'informational_cds',
              owner: 'Test Owner',
              knownLimitations: ['Test limitation.'],
              expiresAt: '2027-01-01',
              retirementPlan: 'Test retirement plan.',
            },
          ],
          riskClassification: { level: 'high', category: 'high_risk_cds', score: 82 },
        },
      },
      sourceStatus: 'live',
    });

    const modelInventoryControl = view.controls.find((control) => control.id === 'modelInventory');
    expect(modelInventoryControl?.modelInventory).toHaveLength(1);
    expect(modelInventoryControl?.modelInventory?.[0].modelIdentifier).toBe('model-x-v1');

    // Every other panel's control must NOT get a modelInventory array (stays null),
    // so the generic renderer's existing behavior for other panels is unaffected.
    const otherControls = view.controls.filter((control) => control.id !== 'modelInventory');
    expect(otherControls.length).toBeGreaterThan(0);
    for (const control of otherControls) {
      expect(control.modelInventory).toBeNull();
    }
  });
});
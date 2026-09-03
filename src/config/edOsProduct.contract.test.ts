import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CDL_PAGE_ZONES, CDL_PRINCIPLES } from './caredroidDesignLanguage';
import { ALERT_LIFECYCLE_STATES, ALERT_RECORD_CONTRACT } from './alertLifecycleModel';
import {
  PAGE_UX_ZONES,
  DEFAULT_ED_PAGE_UX_CONTRACT,
  PUBLIC_DISPLAY_UX_CONTRACT,
} from './pageUxContract';
import { PAGE_REBUILD_REGISTRY, getNextPageRebuildTarget } from './pageRebuildRegistry';
import { UNIFIED_OPERATIONAL_METRICS } from './unifiedOperationalIntelligence.registry';
import { CAREDROID_PRODUCT } from './caredroidProduct.config';
import { getCommandCenterAuthorityPath } from './commandCenterScreenModel';
import { CANONICAL_ROUTES } from './routes.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const emergencyRouteShared = readFileSync(
  join(__dirname, '../pages/emergency/emergencyRouteShared.tsx'),
  'utf8',
);

describe('ED OS product contract', () => {
  it('defines the four at-a-glance questions in CDL zones and situation brief', () => {
    const fourQuestions = [
      CDL_PAGE_ZONES.operationalSummary.question,
      CDL_PAGE_ZONES.activeWork.question,
      'Who owns it?',
      CDL_PAGE_ZONES.primaryActions.question,
    ];
    expect(fourQuestions.every((q) => typeof q === 'string' && q.length > 10)).toBe(true);
    expect(emergencyRouteShared).toContain('Happening now');
    expect(emergencyRouteShared).toContain('Needs attention');
    expect(emergencyRouteShared).toContain('Owner');
    expect(emergencyRouteShared).toContain('Next action');
  });

  it('aligns page UX zones with CDL composition', () => {
    expect(DEFAULT_ED_PAGE_UX_CONTRACT.requiredZones).toContain(PAGE_UX_ZONES.situationBrief);
    expect(DEFAULT_ED_PAGE_UX_CONTRACT.requiredZones).toContain(PAGE_UX_ZONES.primaryWorkspace);
    expect(DEFAULT_ED_PAGE_UX_CONTRACT.usesEdRouteTemplate).toBe(true);
  });

  it('unifies alert lifecycle states and record contract fields', () => {
    expect(ALERT_LIFECYCLE_STATES).toContain('acknowledged');
    expect(ALERT_LIFECYCLE_STATES).toContain('escalated');
    expect(ALERT_RECORD_CONTRACT.owner).toContain('responsible');
    expect(ALERT_RECORD_CONTRACT.recommendedAction).toContain('next step');
  });

  it('tracks page rebuild progress across the patient journey', () => {
    expect(PAGE_REBUILD_REGISTRY.length).toBeGreaterThan(20);
    expect(getNextPageRebuildTarget()).toBeDefined();
  });

  it('exposes unified operational intelligence for command surfaces', () => {
    expect(UNIFIED_OPERATIONAL_METRICS.length).toBeGreaterThan(14);
  });

  it('defines public display UX with PHI-safe situation brief zone', () => {
    expect(PUBLIC_DISPLAY_UX_CONTRACT.requiredZones).toContain('situation-brief');
    expect(PUBLIC_DISPLAY_UX_CONTRACT.phiTier).toBe('public_redacted');
  });

  it('consolidates command authority on Hospital Command Center', () => {
    expect(getCommandCenterAuthorityPath()).toBe(CANONICAL_ROUTES.emergencyCommandCenter);
  });

  it('anchors product mission on three-minute operational awareness', () => {
    expect(CDL_PRINCIPLES.some((p) => p.toLowerCase().includes('operational'))).toBe(true);
    expect(CAREDROID_PRODUCT.firstResolutionLine.toLowerCase()).toMatch(/patient|emergency|care/);
  });
});

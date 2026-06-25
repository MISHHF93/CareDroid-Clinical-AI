import { describe, expect, it, vi, afterEach } from 'vitest';
import * as cleanupConfig from './practitionerCleanup.config';
import { getPractitionerSurfaceVisibility, practitionerShows } from './practitionerSurfaceVisibility';

describe('practitionerSurfaceVisibility', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns full visibility when pilot cleanup is off', () => {
    vi.spyOn(cleanupConfig, 'isPractitionerCleanupEnabled').mockReturnValue(false);
    const surfaces = getPractitionerSurfaceVisibility();
    expect(surfaces.active).toBe(false);
    expect(surfaces.whiteboard.showRoleStrips).toBe(true);
    expect(surfaces.reception.showAlertRail).toBe(true);
    expect(surfaces.patientCard.badgeLimit).toBe(2);
  });

  it('returns flattened pilot surfaces when cleanup is active', () => {
    const surfaces = getPractitionerSurfaceVisibility();
    expect(surfaces.active).toBe(true);
    expect(surfaces.compactLayout).toBe(true);
    expect(surfaces.whiteboard.showHeroChrome).toBe(false);
    expect(surfaces.whiteboard.showRoleStrips).toBe(false);
    expect(surfaces.whiteboard.showAlertRails).toBe(false);
    expect(surfaces.reception.showThroughputCluster).toBe(false);
    expect(surfaces.reception.showAlertRail).toBe(false);
    expect(surfaces.patientCard.badgeLimit).toBe(1);
    expect(surfaces.chrome.copilotAutoOpen).toBe(false);
    expect(surfaces.profile.showAccessSummary).toBe(false);
    expect(surfaces.tools.showClinicalIntelligencePanel).toBe(false);
    expect(surfaces.settings.showPlatformStrip).toBe(false);
    expect(surfaces.chrome.showHeaderSubtitle).toBe(false);
    expect(surfaces.analytics.showPlatformLayers).toBe(false);
    expect(surfaces.analytics.showDepartmentShortcuts).toBe(false);
    expect(surfaces.admin.showSurveillanceDetailList).toBe(false);
    expect(surfaces.admin.showSecondaryLinks).toBe(false);
    expect(surfaces.copilot.showContextTab).toBe(false);
    expect(surfaces.copilot.showSafetyTab).toBe(false);
    expect(surfaces.copilot.showMultimodalInput).toBe(false);
  });

  it('practitionerShows reads nested keys', () => {
    expect(practitionerShows('whiteboard', 'showCardKey')).toBe(false);
    expect(practitionerShows('reception', 'showProcessEducation')).toBe(false);
    expect(practitionerShows('tools', 'showPageBreadcrumbs')).toBe(false);
    expect(practitionerShows('profile', 'showCompetencyCard')).toBe(false);
  });
});
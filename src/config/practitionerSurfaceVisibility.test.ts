import { describe, expect, it, vi, afterEach } from 'vitest';
import * as cleanupConfig from './practitionerCleanup.config';
import { EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';
import { CARE_DROID_SCREEN_MODES } from './careDroidScreenModes';
import { getPractitionerSurfaceVisibility, practitionerShows } from './practitionerSurfaceVisibility';

describe('practitionerSurfaceVisibility', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns full visibility when pilot cleanup is off', () => {
    vi.spyOn(cleanupConfig, 'isPractitionerCleanupEnabled').mockReturnValue(false as unknown as true);
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
    // Deprecated surface, always false now — the sidebar nav `copilot` item
    // is the sole entry point (see useCopilotChromeAccess.ts).
    expect(surfaces.chrome.showSessionCopilot).toBe(false);
    expect(surfaces.profile.showAccessSummary).toBe(false);
    expect(surfaces.tools.showClinicalIntelligencePanel).toBe(false);
    expect(surfaces.settings.showPlatformStrip).toBe(false);
    expect(surfaces.chrome.showHeaderSubtitle).toBe(false);
    expect(surfaces.chrome.showEdDataSourceBanner).toBe(false);
    expect(surfaces.chrome.showSessionSimulation).toBe(false);
    expect(surfaces.chrome.showPageEyebrow).toBe(false);
    expect(surfaces.chrome.showEntryHubBackendSync).toBe(false);
    expect(surfaces.analytics.showPlatformLayers).toBe(false);
    expect(surfaces.analytics.showDepartmentShortcuts).toBe(false);
    expect(surfaces.admin.showSurveillanceDetailList).toBe(false);
    expect(surfaces.admin.showSecondaryLinks).toBe(false);
    expect(surfaces.copilot.showContextTab).toBe(false);
    expect(surfaces.copilot.showSafetyTab).toBe(false);
    expect(surfaces.copilot.showMultimodalInput).toBe(false);
    expect(surfaces.copilot.compactLayout).toBe(true);
    expect(surfaces.copilot.showSafetyBadge).toBe(false);
    expect(surfaces.emergencyRoutes.showDescriptions).toBe(false);
    expect(surfaces.emergencyRoutes.showMetricCards).toBe(false);
    expect(surfaces.emergencyRoutes.showCrossLinks).toBe(false);
    expect(surfaces.emergencyRoutes.showCapacityUpgradeHarness).toBe(false);
    expect(surfaces.ems.showOffloadTrackerPanel).toBe(false);
    expect(surfaces.shift.showSecondarySections).toBe(false);
    expect(surfaces.pulse.showStatCards).toBe(false);
    expect(surfaces.pulse.showQueuePanel).toBe(false);
    expect(surfaces.settings.showGovernanceSections).toBe(false);
    expect(surfaces.settings.showAuditSections).toBe(false);
    expect(surfaces.reception.showTriageRuleBuilder).toBe(false);
    expect(surfaces.intake.showHeroDescription).toBe(false);
    expect(surfaces.intake.showVerificationWarnings).toBe(false);
    expect(surfaces.analytics.showKpiCards).toBe(false);
    expect(surfaces.analytics.showSecondaryCharts).toBe(false);
    expect(surfaces.calculatorHub.showCardDescriptions).toBe(false);
    expect(surfaces.calculatorHub.compactPatientBar).toBe(true);
    // DigitalDoorSign's hideCareTeam prop (applied at the render site) already
    // removes the one part that duplicated the whiteboard, so pilot mode keeps
    // the door sign's unique safety flags (isolation, fall risk, allergies) visible.
    expect(surfaces.patientRoom.showDoorSignDuplicate).toBe(true);
  });

  it('practitionerShows reads nested keys', () => {
    expect(practitionerShows('whiteboard', 'showCardKey')).toBe(false);
    expect(practitionerShows('reception', 'showProcessEducation')).toBe(false);
    expect(practitionerShows('tools', 'showPageBreadcrumbs')).toBe(false);
    expect(practitionerShows('profile', 'showCompetencyCard')).toBe(false);
  });

  it('keeps charge nurse on the same trimmed whiteboard shell during pilot', () => {
    const surfaces = getPractitionerSurfaceVisibility({
      role: EMERGENCY_ROLE_IDS.chargeNurse,
      screenMode: CARE_DROID_SCREEN_MODES.chargeNurse,
    });

    expect(surfaces.whiteboard.showCommandDashboard).toBe(false);
    expect(surfaces.whiteboard.showRoleStrips).toBe(false);
    expect(surfaces.whiteboard.showWhoNextPanel).toBe(false);
    expect(surfaces.chrome.showEdDataSourceBanner).toBe(false);
    expect(surfaces.chrome.showPageEyebrow).toBe(false);
    expect(surfaces.reception.showPatientAnswersPanel).toBe(false);
  });

  it('restores physician copilot tabs during pilot', () => {
    const surfaces = getPractitionerSurfaceVisibility({
      role: EMERGENCY_ROLE_IDS.physician,
      screenMode: CARE_DROID_SCREEN_MODES.physician,
    });

    expect(surfaces.copilot.showContextTab).toBe(true);
    expect(surfaces.copilot.showSafetyTab).toBe(true);
    expect(surfaces.patientCard.badgeLimit).toBe(2);
  });
});
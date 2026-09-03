import { describe, expect, it } from 'vitest';
import {
  getWalkthroughActiveCensus,
  isPractitionerCleanupEnabled,
  shouldForceOperationalAwareness,
  shouldHidePatientJourneyEngineCard,
  shouldShowDeveloperApiBanners,
  shouldSuppressExtensionPaletteCommands,
  shouldSuppressSessionChromeDevSegments,
  shouldShowWalkthroughActionOnEmptyBoard,
  shouldSuppressAnalyticsPlatformLayers,
  shouldSuppressCopilotAutoOpen,
  shouldSuppressCopilotRouteMetrics,
  shouldSuppressDeveloperToolCatalog,
  shouldSuppressWhiteboardMissionControl,
  shouldForceCompactPractitionerLayout,
  shouldSuppressWhiteboardHeroChrome,
  shouldSuppressReceptionThroughputCluster,
  shouldSuppressWhiteboardRoleStrips,
  shouldSuppressReceptionAlertRail,
  getPractitionerPatientCardBadgeLimit,
  shouldSuppressEmergencyRouteDescriptions,
  shouldSuppressEmergencyRouteMetricCards,
  shouldSuppressEmergencyRouteCrossLinks,
  shouldSuppressCapacityUpgradeHarness,
  shouldSuppressEmsOffloadTrackerPanel,
  shouldSuppressShiftSecondarySections,
  shouldSuppressDepartmentPulseStatCards,
  shouldSuppressEmergencySettingsGovernanceSections,
  shouldSuppressReceptionTriageRuleBuilder,
  shouldSuppressAnalyticsKpiCards,
  shouldSuppressAnalyticsSecondaryCharts,
  shouldSuppressCalculatorHubCardDescriptions,
  shouldSuppressSmartIntakeVerificationWarnings,
  shouldSuppressEdDataSourceBanner,
  shouldSuppressSessionChromeSimulation,
  shouldSuppressPageEyebrows,
  shouldSuppressEntryHubBackendSync,
  shouldSuppressEmergencyRouteMetrics,
  shouldSuppressReceptionPatientAnswersPanel,
  shouldForceSlimReceptionDeskForAllRoles,
  shouldForceCompactCopilotLayout,
  shouldSuppressCopilotSafetyBadge,
  getMaxCopilotQuickActions,
} from './practitionerCleanup.config';
import { mergePractitionerDensityProfile } from './practitionerRoleSurfacePolicy';
import { PILOT_CUSTOMER_MODE } from './unified-navigation.config';

describe('practitionerCleanup.config', () => {
  it('is active while pilot customer mode is enabled', () => {
    expect(PILOT_CUSTOMER_MODE.enabled).toBe(true);
    expect(isPractitionerCleanupEnabled()).toBe(true);
  });

  it('caps walkthrough census for practitioner review', () => {
    expect(getWalkthroughActiveCensus()).toBe(18);
  });

  it('suppresses developer chrome on clinical surfaces', () => {
    expect(shouldShowDeveloperApiBanners()).toBe(false);
    expect(shouldHidePatientJourneyEngineCard()).toBe(true);
    expect(shouldForceOperationalAwareness()).toBe(true);
    expect(shouldSuppressExtensionPaletteCommands()).toBe(true);
    expect(shouldSuppressSessionChromeDevSegments()).toBe(true);
    expect(shouldShowWalkthroughActionOnEmptyBoard()).toBe(true);
    expect(shouldSuppressCopilotAutoOpen()).toBe(true);
    expect(shouldSuppressCopilotRouteMetrics()).toBe(true);
    expect(shouldSuppressDeveloperToolCatalog()).toBe(true);
    expect(shouldSuppressWhiteboardMissionControl()).toBe(true);
    expect(shouldSuppressAnalyticsPlatformLayers()).toBe(true);
    expect(shouldForceCompactPractitionerLayout()).toBe(true);
    expect(shouldSuppressWhiteboardHeroChrome()).toBe(true);
    expect(shouldSuppressReceptionThroughputCluster()).toBe(true);
    expect(shouldSuppressWhiteboardRoleStrips()).toBe(true);
    expect(shouldSuppressReceptionAlertRail()).toBe(true);
    expect(getPractitionerPatientCardBadgeLimit()).toBe(1);
    expect(shouldSuppressEmergencyRouteDescriptions()).toBe(true);
    expect(shouldSuppressEmergencyRouteMetricCards()).toBe(true);
    expect(shouldSuppressEmergencyRouteCrossLinks()).toBe(true);
    expect(shouldSuppressCapacityUpgradeHarness()).toBe(true);
    expect(shouldSuppressEmsOffloadTrackerPanel()).toBe(true);
    expect(shouldSuppressShiftSecondarySections()).toBe(true);
    expect(shouldSuppressDepartmentPulseStatCards()).toBe(true);
    expect(shouldSuppressEmergencySettingsGovernanceSections()).toBe(true);
    expect(shouldSuppressReceptionTriageRuleBuilder()).toBe(true);
    expect(shouldSuppressAnalyticsKpiCards()).toBe(true);
    expect(shouldSuppressAnalyticsSecondaryCharts()).toBe(true);
    expect(shouldSuppressCalculatorHubCardDescriptions()).toBe(true);
    expect(shouldSuppressSmartIntakeVerificationWarnings()).toBe(true);
    expect(shouldSuppressEdDataSourceBanner()).toBe(true);
    expect(shouldSuppressSessionChromeSimulation()).toBe(true);
    expect(shouldSuppressPageEyebrows()).toBe(true);
    expect(shouldSuppressEntryHubBackendSync()).toBe(true);
    expect(shouldSuppressEmergencyRouteMetrics()).toBe(true);
    expect(shouldSuppressReceptionPatientAnswersPanel()).toBe(true);
    expect(shouldForceSlimReceptionDeskForAllRoles()).toBe(true);
    expect(shouldForceCompactCopilotLayout()).toBe(true);
    expect(shouldSuppressCopilotSafetyBadge()).toBe(true);
    expect(getMaxCopilotQuickActions()).toBe(2);
  });

  it('merges a lean whiteboard density profile for practitioner review', () => {
    const merged = mergePractitionerDensityProfile(
      {
        id: 'high-operational',
        whiteboard: {
          showMissionControl: true,
          showQueueIntelligence: true,
          showSecondaryStats: true,
          showWaitingRoomSafety: true,
          showAttentionStrips: true,
          preferOperationalStrips: true,
          maxVisibleCards: 32,
          gridMinCardWidth: 280,
          gridGap: 12,
        },
        patientCard: {
          showExperienceBadge: true,
          showWhatHappensNext: true,
          showLwbsAndDeterioration: true,
          showCommunicationBadge: true,
          showScores: true,
          showQueueReason: true,
          showSafetyFlags: true,
          showSignalsRow: true,
          showVitalsGrid: true,
          showReassessmentTimer: true,
          showMetaGrid: true,
        },
      },
      { role: 'registration_clerk', screenMode: 'RECEPTION_SCREEN' },
    );

    expect(merged.whiteboard.showMissionControl).toBe(false);
    expect(merged.whiteboard.maxVisibleCards).toBe(18);
    expect(merged.whiteboard.gridMinCardWidth).toBe(220);
    expect(merged.whiteboard.gridGap).toBe(8);
    expect(merged.patientCard.showScores).toBe(false);
  });

  it('flattens operational density for charge nurse during pilot', () => {
    const merged = mergePractitionerDensityProfile(
      {
        id: 'high-operational',
        whiteboard: {
          showMissionControl: true,
          showQueueIntelligence: true,
          showSecondaryStats: true,
          showWaitingRoomSafety: true,
          showAttentionStrips: true,
          preferOperationalStrips: true,
          maxVisibleCards: 48,
          gridMinCardWidth: 250,
          gridGap: 10,
        },
        patientCard: {
          showScores: true,
          showSafetyFlags: true,
          showSignalsRow: true,
          showVitalsGrid: true,
          showExperienceBadge: true,
          showWhatHappensNext: true,
          showQueueReason: true,
          showMetaGrid: true,
          showReassessmentTimer: true,
        },
      },
      { role: 'charge_nurse', screenMode: 'CHARGE_NURSE_SCREEN' },
    );

    expect(merged.whiteboard.showMissionControl).toBe(false);
    expect(merged.whiteboard.showQueueIntelligence).toBe(false);
    expect(merged.patientCard.showScores).toBe(false);
    expect(merged.whiteboard.maxVisibleCards).toBe(18);
  });
});

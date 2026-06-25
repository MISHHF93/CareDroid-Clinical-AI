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
  mergePractitionerDensityProfile,
} from './practitionerCleanup.config';
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
  });

  it('merges a lean whiteboard density profile for practitioner review', () => {
    const merged = mergePractitionerDensityProfile({
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
    });

    expect(merged.whiteboard.showMissionControl).toBe(false);
    expect(merged.whiteboard.maxVisibleCards).toBe(18);
    expect(merged.whiteboard.gridMinCardWidth).toBe(220);
    expect(merged.whiteboard.gridGap).toBe(8);
    expect(merged.patientCard.showScores).toBe(false);
  });
});
/**
 * Practitioner cleanup — reduces data noise, developer chrome, and extension surfaces
 * while Pilot Customer Mode is active.
 *
 * Pages should prefer `getPractitionerSurfaceVisibility()` from
 * `practitionerSurfaceVisibility.js` over calling many shouldSuppress* helpers.
 * User-facing documentation: `docs/USER-MANUAL.md` §4.5 and §10.
 */
import { PILOT_CUSTOMER_MODE, PILOT_EXTENSION_NAV_ITEM_IDS } from './unified-navigation.config';
import {
  PRACTITIONER_COPILOT_NOTES_LIMIT,
  PRACTITIONER_COPILOT_ORCHESTRATION_LIMIT,
  PRACTITIONER_COPILOT_RECOMMENDATION_LIMIT,
  PRACTITIONER_PATIENT_CARD_BADGE_LIMIT,
  PRACTITIONER_WALKTHROUGH_ACTIVE_CENSUS,
  PRACTITIONER_WHITEBOARD_CARD_LIMIT,
} from './practitionerCleanup.constants';

export const PRACTITIONER_CLEANUP = Object.freeze({
  enabled: true,
  /** Active census on the whiteboard when walkthrough dataset is loaded */
  walkthroughActiveCensus: PRACTITIONER_WALKTHROUGH_ACTIVE_CENSUS,
  /** Max patient cards rendered on the whiteboard grid */
  maxWhiteboardVisibleCards: PRACTITIONER_WHITEBOARD_CARD_LIMIT,
  /** Copilot recommendation / context budgets */
  maxCopilotRecommendations: PRACTITIONER_COPILOT_RECOMMENDATION_LIMIT,
  maxCopilotOrchestrationRecs: PRACTITIONER_COPILOT_ORCHESTRATION_LIMIT,
  maxCopilotRecentNotes: PRACTITIONER_COPILOT_NOTES_LIMIT,
  /** Hide ApiStateBanner / journey-engine cards on frontline ED routes */
  suppressDeveloperApiBanners: true,
  hidePatientJourneyEngineCard: true,
  /** Collapse whiteboard hero into operational-awareness layout by default */
  forceOperationalAwareness: true,
  /** Command palette: hide extension/platform nav duplicates */
  suppressExtensionPaletteCommands: true,
  /** Registration clerk: patient search only (no platform artifact hits) */
  limitOperationalSearchForClerk: true,
  /** Hide Dev/API segments in session chrome during practitioner review */
  suppressSessionChromeDevSegments: true,
  /** Offer walkthrough load action on empty whiteboard */
  showWalkthroughActionOnEmptyBoard: true,
  /** Keep copilot collapsed until clinician opens it */
  suppressCopilotAutoOpen: true,
  /** Hide deep platform panels on the whiteboard — patient grid + primary stats only */
  suppressWhiteboardMissionControl: true,
  suppressWhiteboardQueueIntelligence: true,
  suppressWhiteboardOpsDetail: true,
  suppressWhiteboardNativeAiPanels: true,
  suppressWhiteboardDiagnosticDashboard: true,
  suppressWhiteboardWhoNextPanel: true,
  /** Reception — queues only; audit/data-quality stays in Settings */
  suppressReceptionOperationalHistory: true,
  suppressReceptionDataQualityAudits: true,
  /** Patient cards — operational signals only, no predictive/AI chips */
  suppressPatientCardPredictiveBadges: true,
  suppressPatientCardToolChips: true,
  suppressPatientCardNativeAiBadges: true,
  suppressPatientCardDataQualitySignals: true,
  /** Analytics — leadership charts only; hide upgrade harness + central-node grid */
  suppressAnalyticsPlatformLayers: true,
  /** Flatten nested chrome — one stats row + board, minimal hero copy */
  forceCompactLayout: true,
  suppressWhiteboardHeroChrome: true,
  suppressWhiteboardCardKey: true,
  suppressWhiteboardAwarenessSubtitle: true,
  suppressWhiteboardCommunicationPanel: true,
  /** Role strips duplicate primary stats + awareness chips */
  suppressWhiteboardRoleStrips: true,
  suppressWhiteboardAlertRails: true,
  suppressWhiteboardCommandDashboard: true,
  suppressReceptionIntroDescription: true,
  /** Alert rail duplicates operational strip on triage reception */
  suppressReceptionAlertRail: true,
  suppressReceptionStatusMessagingStrip: true,
  suppressReceptionProcessEducation: true,
  suppressReceptionThroughputCluster: true,
  suppressReceptionCommunicationPanel: true,
  /** Profile — identity nav + summary only */
  suppressProfileShellEyebrow: true,
  suppressProfileAccessSummary: true,
  suppressProfileNestedSubtitles: true,
  suppressProfileCompetencyCard: true,
  suppressProfilePhiActivity: true,
  /** Copilot route — docked panel is primary; hide upgrade harness cards */
  suppressCopilotRouteUpgradeSignals: true,
  /** Copilot route — hint only; metrics duplicate docked panel context */
  suppressCopilotRouteMetrics: true,
  /** Developer tool catalog — practitioners use Tools overview */
  suppressDeveloperToolCatalog: true,
  /** Docked copilot — chat-first; hide secondary tabs and platform chrome */
  suppressCopilotContextTab: true,
  suppressCopilotSafetyTab: true,
  suppressCopilotStatusStrip: true,
  suppressCopilotMultimodalInput: true,
  suppressCopilotOrchestrationActions: true,
  /** Tools — search + grid; hide platform education chrome */
  suppressToolsOverviewContextRow: true,
  suppressToolsOverviewExecutionLegend: true,
  suppressToolsOverviewHeaderStats: true,
  suppressToolPageBreadcrumbs: true,
  suppressToolPageMetaBadges: true,
  suppressToolClinicalIntelligencePanel: true,
  suppressToolShareLocalSession: true,
  /** Settings — preferences only during pilot */
  suppressSettingsPlatformStrip: true,
  suppressSettingsEnterpriseSections: true,
  suppressSettingsNestedSubtitles: true,
  /** App chrome */
  suppressHeaderPageSubtitle: true,
  /** Admin home — primary links only; hide API status laundry lists */
  suppressAdminSurveillanceDetailList: true,
  suppressAdminSecondaryLinks: true,
});

export const PILOT_EXTENSION_NAV_ITEM_ID_SET = new Set(PILOT_EXTENSION_NAV_ITEM_IDS);

export function isPractitionerCleanupEnabled() {
  return PRACTITIONER_CLEANUP.enabled && PILOT_CUSTOMER_MODE.enabled;
}

export function shouldShowDeveloperApiBanners() {
  return !isPractitionerCleanupEnabled() || !PRACTITIONER_CLEANUP.suppressDeveloperApiBanners;
}

export function shouldHidePatientJourneyEngineCard() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.hidePatientJourneyEngineCard;
}

export function shouldForceOperationalAwareness() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.forceOperationalAwareness;
}

export function getWalkthroughActiveCensus() {
  return PRACTITIONER_CLEANUP.walkthroughActiveCensus;
}

export function getMaxWhiteboardVisibleCards() {
  return isPractitionerCleanupEnabled()
    ? PRACTITIONER_CLEANUP.maxWhiteboardVisibleCards
    : 24;
}

export function getCopilotRecommendationLimit() {
  return isPractitionerCleanupEnabled() ? PRACTITIONER_CLEANUP.maxCopilotRecommendations : 8;
}

export function getCopilotOrchestrationRecLimit() {
  return isPractitionerCleanupEnabled() ? PRACTITIONER_CLEANUP.maxCopilotOrchestrationRecs : 6;
}

export function getCopilotRecentNotesLimit() {
  return isPractitionerCleanupEnabled() ? PRACTITIONER_CLEANUP.maxCopilotRecentNotes : 5;
}

export function shouldSuppressExtensionPaletteCommands() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressExtensionPaletteCommands;
}

export function shouldLimitOperationalSearchForClerk(emergencyRoleId) {
  return (
    isPractitionerCleanupEnabled() &&
    PRACTITIONER_CLEANUP.limitOperationalSearchForClerk &&
    emergencyRoleId === 'registration_clerk'
  );
}

export function isPilotExtensionNavItem(navItemId) {
  return PILOT_EXTENSION_NAV_ITEM_ID_SET.has(navItemId);
}

export function shouldSuppressSessionChromeDevSegments() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressSessionChromeDevSegments;
}

export function shouldShowWalkthroughActionOnEmptyBoard() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.showWalkthroughActionOnEmptyBoard;
}

export function shouldSuppressCopilotAutoOpen() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressCopilotAutoOpen;
}

export function shouldSuppressCopilotRouteUpgradeSignals() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressCopilotRouteUpgradeSignals;
}

export function shouldSuppressCopilotRouteMetrics() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressCopilotRouteMetrics;
}

export function shouldSuppressDeveloperToolCatalog() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressDeveloperToolCatalog;
}

export function shouldSuppressWhiteboardMissionControl() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressWhiteboardMissionControl;
}

export function shouldSuppressWhiteboardQueueIntelligence() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressWhiteboardQueueIntelligence;
}

export function shouldSuppressWhiteboardOpsDetail() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressWhiteboardOpsDetail;
}

export function shouldSuppressWhiteboardNativeAiPanels() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressWhiteboardNativeAiPanels;
}

export function shouldSuppressWhiteboardDiagnosticDashboard() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressWhiteboardDiagnosticDashboard;
}

export function shouldSuppressWhiteboardWhoNextPanel() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressWhiteboardWhoNextPanel;
}

export function shouldSuppressReceptionOperationalHistory() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressReceptionOperationalHistory;
}

export function shouldSuppressReceptionDataQualityAudits() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressReceptionDataQualityAudits;
}

export function shouldSuppressPatientCardPredictiveBadges() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressPatientCardPredictiveBadges;
}

export function shouldSuppressPatientCardToolChips() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressPatientCardToolChips;
}

export function shouldSuppressPatientCardNativeAiBadges() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressPatientCardNativeAiBadges;
}

export function shouldSuppressPatientCardDataQualitySignals() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressPatientCardDataQualitySignals;
}

export function shouldSuppressAnalyticsPlatformLayers() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressAnalyticsPlatformLayers;
}

export function shouldForceCompactPractitionerLayout() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.forceCompactLayout;
}

export function shouldSuppressWhiteboardHeroChrome() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressWhiteboardHeroChrome;
}

export function shouldSuppressWhiteboardCardKey() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressWhiteboardCardKey;
}

export function shouldSuppressWhiteboardAwarenessSubtitle() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressWhiteboardAwarenessSubtitle;
}

export function shouldSuppressWhiteboardCommunicationPanel() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressWhiteboardCommunicationPanel;
}

export function shouldSuppressWhiteboardRoleStrips() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressWhiteboardRoleStrips;
}

export function shouldSuppressWhiteboardAlertRails() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressWhiteboardAlertRails;
}

export function shouldSuppressWhiteboardCommandDashboard() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressWhiteboardCommandDashboard;
}

export function shouldSuppressReceptionAlertRail() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressReceptionAlertRail;
}

export function shouldSuppressReceptionIntroDescription() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressReceptionIntroDescription;
}

export function shouldSuppressReceptionStatusMessagingStrip() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressReceptionStatusMessagingStrip;
}

export function shouldSuppressReceptionProcessEducation() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressReceptionProcessEducation;
}

export function shouldSuppressReceptionThroughputCluster() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressReceptionThroughputCluster;
}

export function shouldSuppressReceptionCommunicationPanel() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressReceptionCommunicationPanel;
}

export function getPractitionerPatientCardBadgeLimit() {
  return isPractitionerCleanupEnabled() ? PRACTITIONER_PATIENT_CARD_BADGE_LIMIT : 2;
}

/**
 * Merges practitioner cleanup density caps into the active screen density profile.
 * @param {import('./screenDensityModeModel').ScreenDensityProfile | null | undefined} profile
 */
export function mergePractitionerDensityProfile(profile) {
  if (!isPractitionerCleanupEnabled() || !profile) {
    return profile ?? null;
  }

  return {
    ...profile,
    whiteboard: {
      ...profile.whiteboard,
      showMissionControl: false,
      showQueueIntelligence: false,
      showSecondaryStats: false,
      showWaitingRoomSafety: false,
      showAttentionStrips: false,
      preferOperationalStrips: false,
      maxVisibleCards: PRACTITIONER_CLEANUP.maxWhiteboardVisibleCards,
      gridMinCardWidth: 220,
      gridGap: 8,
    },
    patientCard: {
      ...profile.patientCard,
      showExperienceBadge: false,
      showWhatHappensNext: false,
      showLwbsAndDeterioration: false,
      showCommunicationBadge: false,
      showScores: false,
      showQueueReason: false,
    },
  };
}
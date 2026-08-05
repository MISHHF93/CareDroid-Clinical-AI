/**
 * Practitioner cleanup — reduces data noise, developer chrome, and extension surfaces
 * while Pilot Customer Mode is active.
 *
 * Pages should prefer `usePractitionerSurfaceVisibility()` from
 * `contexts/PractitionerVisibilityContext.tsx` (or `getPractitionerSurfaceVisibility({ role, screenMode })`
 * outside React) over calling many shouldSuppress* helpers.
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
  /** Keep AI Chief, three-minute mission, and workflow command bars visible during pilot cleanup */
  showOperationalCommandBars: true as boolean,
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
  /** Narrow docked panel + hide safety badge row for chat-first pilot */
  forceCompactCopilotLayout: true,
  suppressCopilotSafetyBadge: true,
  maxCopilotQuickActions: 2,
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
  /** Emergency satellite routes — patients, queues, reassessment, capacity */
  suppressEmergencyRouteDescriptions: true,
  suppressEmergencyRouteMetricCards: true,
  suppressEmergencyRouteCrossLinks: true,
  suppressCapacityUpgradeHarness: true,
  /** EMS — handoff rows first; hide demo fleet grid and duplicate offload panel */
  suppressEmsFleetUnitGrid: true,
  suppressEmsOffloadTrackerPanel: true,
  /** Shift summary — volume/queue/handoff only during pilot */
  suppressShiftSecondarySections: true,
  /** Department Pulse — attention-first; hide duplicate queue/staff dashboards */
  suppressDepartmentPulseDescriptions: true,
  suppressDepartmentPulseStatCards: true,
  suppressDepartmentPulseQueuePanel: true,
  suppressDepartmentPulseStaffPanel: true,
  /** Emergency settings — walkthrough + thresholds only during pilot */
  suppressEmergencySettingsAuditSections: true,
  suppressEmergencySettingsGovernanceSections: true,
  suppressEmergencySettingsScreenModes: true,
  suppressEmergencySettingsWalkthroughDetail: true,
  /** TR / triage expert — nurse workflow + copilot drawer; not reception admin UI */
  suppressReceptionTriageRuleBuilder: true,
  /** Smart intake embedded hero copy */
  suppressSmartIntakeHeroDescription: true,
  suppressSmartIntakeVerificationWarnings: true,
  suppressSmartIntakeVerificationAuditLog: true,
  /** Analytics — shift KPI strip + primary chart only */
  suppressAnalyticsDescriptions: true,
  suppressAnalyticsKpiCards: true,
  suppressAnalyticsSecondaryCharts: true,
  /** Clinical calculator hub — search + grid; trim hero and card prose */
  suppressCalculatorHubHeroDescription: true,
  suppressCalculatorHubCardDescriptions: true,
  compactCalculatorHubPatientBar: true,
  /** Patient room display — in-room board only; no duplicate door sign */
  suppressPatientRoomDoorSignDuplicate: true,
  /** Hide technical data-source / API freshness lines on frontline screens */
  suppressEdDataSourceBanner: true,
  /** Hide simulation / training banners in session chrome */
  suppressSessionChromeSimulation: true,
  /** Hide page eyebrows ("Patients", "Queues", etc.) — title only */
  suppressPageEyebrows: true,
  /** Entry hub — hide backend wiring status for manual testers */
  suppressEntryHubBackendSync: true,
  /** Satellite ED routes — hide metric strips entirely (not just card layout) */
  suppressEmergencyRouteMetrics: true,
  /** Reception — patient-answers research panel stays in data layer only */
  suppressReceptionPatientAnswersPanel: true,
  /** Keep all roles on the trimmed reception desk layout during pilot */
  forceSlimReceptionDeskForAllRoles: true,
  /** Operational strips — inline chip layout, no command eyebrow */
  forceCompactOperationalStrip: true,
  /** Whiteboard primary stat row — waiting + high risk only */
  maxPrimaryWhiteboardStats: 2,
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

const COPILOT_QUICK_ACTION_LIMIT_FALLBACK = 3;

export function shouldForceCompactCopilotLayout() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.forceCompactCopilotLayout;
}

export function shouldSuppressCopilotSafetyBadge() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressCopilotSafetyBadge;
}

export function getMaxCopilotQuickActions() {
  return isPractitionerCleanupEnabled()
    ? PRACTITIONER_CLEANUP.maxCopilotQuickActions
    : COPILOT_QUICK_ACTION_LIMIT_FALLBACK;
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
export function shouldSuppressEmergencyRouteDescriptions() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressEmergencyRouteDescriptions;
}

export function shouldSuppressEmergencyRouteMetricCards() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressEmergencyRouteMetricCards;
}

export function shouldSuppressEmergencyRouteCrossLinks() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressEmergencyRouteCrossLinks;
}

export function shouldSuppressCapacityUpgradeHarness() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressCapacityUpgradeHarness;
}

export function shouldSuppressEmsFleetUnitGrid() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressEmsFleetUnitGrid;
}

export function shouldSuppressEmsOffloadTrackerPanel() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressEmsOffloadTrackerPanel;
}

export function shouldSuppressShiftSecondarySections() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressShiftSecondarySections;
}

export function shouldSuppressDepartmentPulseDescriptions() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressDepartmentPulseDescriptions;
}

export function shouldSuppressDepartmentPulseStatCards() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressDepartmentPulseStatCards;
}

export function shouldSuppressDepartmentPulseQueuePanel() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressDepartmentPulseQueuePanel;
}

export function shouldSuppressDepartmentPulseStaffPanel() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressDepartmentPulseStaffPanel;
}

export function shouldSuppressEmergencySettingsAuditSections() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressEmergencySettingsAuditSections;
}

export function shouldSuppressEmergencySettingsGovernanceSections() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressEmergencySettingsGovernanceSections;
}

export function shouldSuppressEmergencySettingsScreenModes() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressEmergencySettingsScreenModes;
}

export function shouldSuppressEmergencySettingsWalkthroughDetail() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressEmergencySettingsWalkthroughDetail;
}

export function shouldSuppressReceptionTriageRuleBuilder() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressReceptionTriageRuleBuilder;
}

export function shouldSuppressSmartIntakeHeroDescription() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressSmartIntakeHeroDescription;
}

export function shouldSuppressSmartIntakeVerificationWarnings() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressSmartIntakeVerificationWarnings;
}

export function shouldSuppressSmartIntakeVerificationAuditLog() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressSmartIntakeVerificationAuditLog;
}

export function shouldSuppressAnalyticsDescriptions() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressAnalyticsDescriptions;
}

export function shouldSuppressAnalyticsKpiCards() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressAnalyticsKpiCards;
}

export function shouldSuppressAnalyticsSecondaryCharts() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressAnalyticsSecondaryCharts;
}

export function shouldSuppressCalculatorHubHeroDescription() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressCalculatorHubHeroDescription;
}

export function shouldSuppressCalculatorHubCardDescriptions() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressCalculatorHubCardDescriptions;
}

export function shouldCompactCalculatorHubPatientBar() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.compactCalculatorHubPatientBar;
}

export function shouldSuppressPatientRoomDoorSignDuplicate() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressPatientRoomDoorSignDuplicate;
}

export function shouldSuppressEdDataSourceBanner() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressEdDataSourceBanner;
}

export function shouldSuppressSessionChromeSimulation() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressSessionChromeSimulation;
}

export function shouldSuppressPageEyebrows() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressPageEyebrows;
}

export function shouldSuppressEntryHubBackendSync() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressEntryHubBackendSync;
}

export function shouldSuppressEmergencyRouteMetrics() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressEmergencyRouteMetrics;
}

export function shouldSuppressReceptionPatientAnswersPanel() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.suppressReceptionPatientAnswersPanel;
}

export function shouldForceSlimReceptionDeskForAllRoles() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.forceSlimReceptionDeskForAllRoles;
}

export function shouldForceCompactOperationalStrip() {
  return isPractitionerCleanupEnabled() && PRACTITIONER_CLEANUP.forceCompactOperationalStrip;
}

export function getMaxPrimaryWhiteboardStats() {
  return isPractitionerCleanupEnabled()
    ? PRACTITIONER_CLEANUP.maxPrimaryWhiteboardStats
    : null;
}

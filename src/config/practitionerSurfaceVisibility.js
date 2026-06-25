/**
 * Single visibility map for practitioner / pilot surfaces.
 * Pages read this once instead of scattering shouldSuppress* calls.
 */
import {
  isPractitionerCleanupEnabled,
  PRACTITIONER_CLEANUP,
} from './practitionerCleanup.config';
import { PRACTITIONER_PATIENT_CARD_BADGE_LIMIT } from './practitionerCleanup.constants';
import {
  applyRoleSurfaceOverrides,
  resolvePractitionerPatientCardBadgeLimit,
} from './practitionerRoleSurfacePolicy';

const FULL_VISIBILITY = Object.freeze({
  active: false,
  compactLayout: false,
  whiteboard: Object.freeze({
    showHeroChrome: true,
    showCardKey: true,
    showAwarenessSubtitle: true,
    showCommunicationPanel: true,
    showRoleStrips: true,
    showAlertRails: true,
    showCommandDashboard: true,
    showMissionControl: true,
    showQueueIntelligence: true,
    showOpsDetail: true,
    showNativeAiPanels: true,
    showDiagnosticDashboard: true,
    showWhoNextPanel: true,
  }),
  reception: Object.freeze({
    showIntroDescription: true,
    showProcessEducation: true,
    showStatusMessagingStrip: true,
    showThroughputCluster: true,
    showCommunicationPanel: true,
    showAlertRail: true,
    showOperationalHistory: true,
    showDataQualityAudits: true,
    showTriageRuleBuilder: true,
    showPatientAnswersPanel: true,
  }),
  patientCard: Object.freeze({
    showPredictiveBadges: true,
    showToolChips: true,
    showNativeAiBadges: true,
    showDataQualitySignals: true,
    badgeLimit: 2,
  }),
    copilot: Object.freeze({
      showContextTab: true,
      showSafetyTab: true,
      showStatusStrip: true,
      showMultimodalInput: true,
      showOrchestrationActions: true,
      compactLayout: false,
      showSafetyBadge: true,
    }),
  profile: Object.freeze({
    showShellEyebrow: true,
    showAccessSummary: true,
    showNestedSubtitles: true,
    showCompetencyCard: true,
    showPhiActivity: true,
  }),
  tools: Object.freeze({
    showOverviewContextRow: true,
    showOverviewExecutionLegend: true,
    showOverviewHeaderStats: true,
    showPageBreadcrumbs: true,
    showPageMetaBadges: true,
    showClinicalIntelligencePanel: true,
    showShareLocalSession: true,
    showDeveloperCatalog: true,
  }),
  copilotRoute: Object.freeze({
    showUpgradeSignals: true,
    showRouteMetrics: true,
  }),
  settings: Object.freeze({
    showPlatformStrip: true,
    showEnterpriseSections: true,
    showNestedSubtitles: true,
    showAuditSections: true,
    showGovernanceSections: true,
    showScreenModes: true,
    showWalkthroughDetail: true,
  }),
  pulse: Object.freeze({
    showDescriptions: true,
    showStatCards: true,
    showQueuePanel: true,
    showStaffPanel: true,
  }),
  chrome: Object.freeze({
    showDeveloperApiBanners: true,
    showEdDataSourceBanner: true,
    showSessionDevSegments: true,
    showSessionSimulation: true,
    showSessionCopilot: true,
    showExtensionPaletteCommands: true,
    showHeaderSubtitle: true,
    showPageEyebrow: true,
    showEntryHubBackendSync: true,
    copilotAutoOpen: true,
  }),
  analytics: Object.freeze({
    showPlatformLayers: true,
    showDepartmentShortcuts: true,
    showDescriptions: true,
    showKpiCards: true,
    showSecondaryCharts: true,
  }),
  calculatorHub: Object.freeze({
    showHeroDescription: true,
    showCardDescriptions: true,
    compactPatientBar: false,
  }),
  intake: Object.freeze({
    showHeroDescription: true,
    showVerificationWarnings: true,
    showVerificationAuditLog: true,
  }),
  patientRoom: Object.freeze({
    showDoorSignDuplicate: true,
  }),
  admin: Object.freeze({
    showSurveillanceDetailList: true,
    showSecondaryLinks: true,
  }),
  emergencyRoutes: Object.freeze({
    showDescriptions: true,
    showMetricCards: true,
    showCrossLinks: true,
    showCapacityUpgradeHarness: true,
    showJourneyEngineCard: true,
  }),
  ems: Object.freeze({
    showFleetUnitGrid: true,
    showOffloadTrackerPanel: true,
  }),
  shift: Object.freeze({
    showSecondarySections: true,
  }),
});

/**
 * @typedef {object} PractitionerVisibilityContext
 * @property {string} [role]
 * @property {string} [screenMode]
 */

function buildPilotVisibility(context = {}) {
  const c = PRACTITIONER_CLEANUP;
  const badgeLimit =
    context.role || context.screenMode
      ? resolvePractitionerPatientCardBadgeLimit(context)
      : PRACTITIONER_PATIENT_CARD_BADGE_LIMIT;
  return Object.freeze({
    active: true,
    compactLayout: c.forceCompactLayout,
    whiteboard: Object.freeze({
      showHeroChrome: !c.suppressWhiteboardHeroChrome,
      showCardKey: !c.suppressWhiteboardCardKey,
      showAwarenessSubtitle: !c.suppressWhiteboardAwarenessSubtitle,
      showCommunicationPanel: !c.suppressWhiteboardCommunicationPanel,
      showRoleStrips: !c.suppressWhiteboardRoleStrips,
      showAlertRails: !c.suppressWhiteboardAlertRails,
      showCommandDashboard: !c.suppressWhiteboardCommandDashboard,
      showMissionControl: !c.suppressWhiteboardMissionControl,
      showQueueIntelligence: !c.suppressWhiteboardQueueIntelligence,
      showOpsDetail: !c.suppressWhiteboardOpsDetail,
      showNativeAiPanels: !c.suppressWhiteboardNativeAiPanels,
      showDiagnosticDashboard: !c.suppressWhiteboardDiagnosticDashboard,
      showWhoNextPanel: !c.suppressWhiteboardWhoNextPanel,
    }),
    reception: Object.freeze({
      showIntroDescription: !c.suppressReceptionIntroDescription,
      showProcessEducation: !c.suppressReceptionProcessEducation,
      showStatusMessagingStrip: !c.suppressReceptionStatusMessagingStrip,
      showThroughputCluster: !c.suppressReceptionThroughputCluster,
      showCommunicationPanel: !c.suppressReceptionCommunicationPanel,
      showAlertRail: !c.suppressReceptionAlertRail,
      showOperationalHistory: !c.suppressReceptionOperationalHistory,
      showDataQualityAudits: !c.suppressReceptionDataQualityAudits,
      showTriageRuleBuilder: !c.suppressReceptionTriageRuleBuilder,
      showPatientAnswersPanel: !c.suppressReceptionPatientAnswersPanel,
    }),
    patientCard: Object.freeze({
      showPredictiveBadges: !c.suppressPatientCardPredictiveBadges,
      showToolChips: !c.suppressPatientCardToolChips,
      showNativeAiBadges: !c.suppressPatientCardNativeAiBadges,
      showDataQualitySignals: !c.suppressPatientCardDataQualitySignals,
      badgeLimit,
    }),
    copilot: Object.freeze({
      showContextTab: !c.suppressCopilotContextTab,
      showSafetyTab: !c.suppressCopilotSafetyTab,
      showStatusStrip: !c.suppressCopilotStatusStrip,
      showMultimodalInput: !c.suppressCopilotMultimodalInput,
      showOrchestrationActions: !c.suppressCopilotOrchestrationActions,
      compactLayout: c.forceCompactCopilotLayout,
      showSafetyBadge: !c.suppressCopilotSafetyBadge,
    }),
    profile: Object.freeze({
      showShellEyebrow: !c.suppressProfileShellEyebrow,
      showAccessSummary: !c.suppressProfileAccessSummary,
      showNestedSubtitles: !c.suppressProfileNestedSubtitles,
      showCompetencyCard: !c.suppressProfileCompetencyCard,
      showPhiActivity: !c.suppressProfilePhiActivity,
    }),
    tools: Object.freeze({
      showOverviewContextRow: !c.suppressToolsOverviewContextRow,
      showOverviewExecutionLegend: !c.suppressToolsOverviewExecutionLegend,
      showOverviewHeaderStats: !c.suppressToolsOverviewHeaderStats,
      showPageBreadcrumbs: !c.suppressToolPageBreadcrumbs,
      showPageMetaBadges: !c.suppressToolPageMetaBadges,
      showClinicalIntelligencePanel: !c.suppressToolClinicalIntelligencePanel,
      showShareLocalSession: !c.suppressToolShareLocalSession,
      showDeveloperCatalog: !c.suppressDeveloperToolCatalog,
    }),
    copilotRoute: Object.freeze({
      showUpgradeSignals: !c.suppressCopilotRouteUpgradeSignals,
      showRouteMetrics: !c.suppressCopilotRouteMetrics,
    }),
    settings: Object.freeze({
      showPlatformStrip: !c.suppressSettingsPlatformStrip,
      showEnterpriseSections: !c.suppressSettingsEnterpriseSections,
      showNestedSubtitles: !c.suppressSettingsNestedSubtitles,
      showAuditSections: !c.suppressEmergencySettingsAuditSections,
      showGovernanceSections: !c.suppressEmergencySettingsGovernanceSections,
      showScreenModes: !c.suppressEmergencySettingsScreenModes,
      showWalkthroughDetail: !c.suppressEmergencySettingsWalkthroughDetail,
    }),
    pulse: Object.freeze({
      showDescriptions: !c.suppressDepartmentPulseDescriptions,
      showStatCards: !c.suppressDepartmentPulseStatCards,
      showQueuePanel: !c.suppressDepartmentPulseQueuePanel,
      showStaffPanel: !c.suppressDepartmentPulseStaffPanel,
    }),
    intake: Object.freeze({
      showHeroDescription: !c.suppressSmartIntakeHeroDescription,
      showVerificationWarnings: !c.suppressSmartIntakeVerificationWarnings,
      showVerificationAuditLog: !c.suppressSmartIntakeVerificationAuditLog,
    }),
    chrome: Object.freeze({
      showDeveloperApiBanners: !c.suppressDeveloperApiBanners,
      showEdDataSourceBanner: !c.suppressEdDataSourceBanner,
      showSessionDevSegments: !c.suppressSessionChromeDevSegments,
      showSessionSimulation: !c.suppressSessionChromeSimulation,
      showSessionCopilot: true,
      showExtensionPaletteCommands: !c.suppressExtensionPaletteCommands,
      showHeaderSubtitle: !c.suppressHeaderPageSubtitle,
      showPageEyebrow: !c.suppressPageEyebrows,
      showEntryHubBackendSync: !c.suppressEntryHubBackendSync,
      copilotAutoOpen: !c.suppressCopilotAutoOpen,
    }),
    analytics: Object.freeze({
      showPlatformLayers: !c.suppressAnalyticsPlatformLayers,
      showDepartmentShortcuts: !c.suppressAnalyticsPlatformLayers,
      showDescriptions: !c.suppressAnalyticsDescriptions,
      showKpiCards: !c.suppressAnalyticsKpiCards,
      showSecondaryCharts: !c.suppressAnalyticsSecondaryCharts,
    }),
    calculatorHub: Object.freeze({
      showHeroDescription: !c.suppressCalculatorHubHeroDescription,
      showCardDescriptions: !c.suppressCalculatorHubCardDescriptions,
      compactPatientBar: c.compactCalculatorHubPatientBar,
    }),
    patientRoom: Object.freeze({
      showDoorSignDuplicate: !c.suppressPatientRoomDoorSignDuplicate,
    }),
    admin: Object.freeze({
      showSurveillanceDetailList: !c.suppressAdminSurveillanceDetailList,
      showSecondaryLinks: !c.suppressAdminSecondaryLinks,
    }),
    emergencyRoutes: Object.freeze({
      showDescriptions: !c.suppressEmergencyRouteDescriptions,
      showMetricCards:
        !c.suppressEmergencyRouteMetricCards && !c.suppressEmergencyRouteMetrics,
      showCrossLinks: !c.suppressEmergencyRouteCrossLinks,
      showCapacityUpgradeHarness: !c.suppressCapacityUpgradeHarness,
      showJourneyEngineCard: !c.hidePatientJourneyEngineCard,
    }),
    ems: Object.freeze({
      showFleetUnitGrid: !c.suppressEmsFleetUnitGrid,
      showOffloadTrackerPanel: !c.suppressEmsOffloadTrackerPanel,
    }),
    shift: Object.freeze({
      showSecondarySections: !c.suppressShiftSecondarySections,
    }),
  });
}

/**
 * @param {PractitionerVisibilityContext} [context]
 * @returns {typeof FULL_VISIBILITY}
 */
function hasExplicitVisibilityContext(context = {}) {
  return Boolean(context.role || context.screenMode);
}

function mergeWithFullVisibility(surfaces) {
  if (!surfaces) {
    return FULL_VISIBILITY;
  }
  const merged = { ...surfaces };
  for (const key of Object.keys(FULL_VISIBILITY)) {
    const fallback = FULL_VISIBILITY[key];
    const current = surfaces[key];
    if (fallback && typeof fallback === 'object') {
      merged[key] = Object.freeze({ ...fallback, ...(current || {}) });
    } else if (current === undefined) {
      merged[key] = fallback;
    }
  }
  return Object.freeze(merged);
}

export function getPractitionerSurfaceVisibility(context = {}) {
  if (!isPractitionerCleanupEnabled()) {
    return FULL_VISIBILITY;
  }
  const pilot = buildPilotVisibility(context);
  const resolved = !hasExplicitVisibilityContext(context)
    ? pilot
    : applyRoleSurfaceOverrides(pilot, context);
  return mergeWithFullVisibility(resolved);
}

/** @param {keyof typeof FULL_VISIBILITY} surface @param {string} key @param {PractitionerVisibilityContext} [context] */
export function practitionerShows(surface, key, context = {}) {
  const visibility = getPractitionerSurfaceVisibility(context);
  const section = visibility[surface];
  return section && typeof section === 'object' ? Boolean(section[key]) : false;
}
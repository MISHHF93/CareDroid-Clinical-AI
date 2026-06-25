/**
 * Single visibility map for practitioner / pilot surfaces.
 * Pages read this once instead of scattering shouldSuppress* calls.
 */
import {
  isPractitionerCleanupEnabled,
  PRACTITIONER_CLEANUP,
} from './practitionerCleanup.config';
import { PRACTITIONER_PATIENT_CARD_BADGE_LIMIT } from './practitionerCleanup.constants';

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
  }),
  settings: Object.freeze({
    showPlatformStrip: true,
    showEnterpriseSections: true,
    showNestedSubtitles: true,
  }),
  chrome: Object.freeze({
    showDeveloperApiBanners: true,
    showSessionDevSegments: true,
    showExtensionPaletteCommands: true,
    showHeaderSubtitle: true,
    copilotAutoOpen: true,
  }),
  analytics: Object.freeze({
    showPlatformLayers: true,
    showDepartmentShortcuts: true,
  }),
  admin: Object.freeze({
    showSurveillanceDetailList: true,
    showSecondaryLinks: true,
  }),
});

function buildPilotVisibility() {
  const c = PRACTITIONER_CLEANUP;
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
    }),
    patientCard: Object.freeze({
      showPredictiveBadges: !c.suppressPatientCardPredictiveBadges,
      showToolChips: !c.suppressPatientCardToolChips,
      showNativeAiBadges: !c.suppressPatientCardNativeAiBadges,
      showDataQualitySignals: !c.suppressPatientCardDataQualitySignals,
      badgeLimit: PRACTITIONER_PATIENT_CARD_BADGE_LIMIT,
    }),
    copilot: Object.freeze({
      showContextTab: !c.suppressCopilotContextTab,
      showSafetyTab: !c.suppressCopilotSafetyTab,
      showStatusStrip: !c.suppressCopilotStatusStrip,
      showMultimodalInput: !c.suppressCopilotMultimodalInput,
      showOrchestrationActions: !c.suppressCopilotOrchestrationActions,
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
    }),
    settings: Object.freeze({
      showPlatformStrip: !c.suppressSettingsPlatformStrip,
      showEnterpriseSections: !c.suppressSettingsEnterpriseSections,
      showNestedSubtitles: !c.suppressSettingsNestedSubtitles,
    }),
    chrome: Object.freeze({
      showDeveloperApiBanners: !c.suppressDeveloperApiBanners,
      showSessionDevSegments: !c.suppressSessionChromeDevSegments,
      showExtensionPaletteCommands: !c.suppressExtensionPaletteCommands,
      showHeaderSubtitle: !c.suppressHeaderPageSubtitle,
      copilotAutoOpen: !c.suppressCopilotAutoOpen,
    }),
    analytics: Object.freeze({
      showPlatformLayers: !c.suppressAnalyticsPlatformLayers,
      showDepartmentShortcuts: !c.suppressAnalyticsPlatformLayers,
    }),
    admin: Object.freeze({
      showSurveillanceDetailList: !c.suppressAdminSurveillanceDetailList,
      showSecondaryLinks: !c.suppressAdminSecondaryLinks,
    }),
  });
}

/**
 * @returns {typeof FULL_VISIBILITY}
 */
export function getPractitionerSurfaceVisibility() {
  if (!isPractitionerCleanupEnabled()) {
    return FULL_VISIBILITY;
  }
  return buildPilotVisibility();
}

/** @param {keyof typeof FULL_VISIBILITY} surface */
export function practitionerShows(surface, key) {
  const visibility = getPractitionerSurfaceVisibility();
  const section = visibility[surface];
  return section && typeof section === 'object' ? Boolean(section[key]) : false;
}
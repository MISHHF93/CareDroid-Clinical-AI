/**
 * Role- and screen-mode-aware practitioner layout tiers.
 * Global pilot cleanup stays the default; operational and admin personas restore
 * workflow-critical surfaces without re-enabling demo clutter.
 */
import { EMERGENCY_ROLE_IDS, normalizeEmergencyRole } from './emergencyRolePermissions';
import {
  CARE_DROID_SCREEN_MODES,
  normalizeCareDroidScreenMode,
} from './careDroidScreenModes';
import { isPractitionerCleanupEnabled, PRACTITIONER_CLEANUP } from './practitionerCleanup.config';
import { PRACTITIONER_PATIENT_CARD_BADGE_LIMIT } from './practitionerCleanup.constants';

export const PRACTITIONER_LAYOUT_TIERS = Object.freeze({
  minimal: 'minimal',
  clinical: 'clinical',
  operational: 'operational',
  admin: 'admin',
  display: 'display',
});

const TIER_RANK = Object.freeze({
  display: 0,
  minimal: 1,
  clinical: 2,
  operational: 3,
  admin: 4,
});

const ROLE_LAYOUT_TIER = Object.freeze({
  [EMERGENCY_ROLE_IDS.registrationClerk]: PRACTITIONER_LAYOUT_TIERS.minimal,
  [EMERGENCY_ROLE_IDS.triageNurse]: PRACTITIONER_LAYOUT_TIERS.clinical,
  [EMERGENCY_ROLE_IDS.physician]: PRACTITIONER_LAYOUT_TIERS.clinical,
  [EMERGENCY_ROLE_IDS.chargeNurse]: PRACTITIONER_LAYOUT_TIERS.operational,
  [EMERGENCY_ROLE_IDS.edManager]: PRACTITIONER_LAYOUT_TIERS.operational,
  [EMERGENCY_ROLE_IDS.emsUser]: PRACTITIONER_LAYOUT_TIERS.clinical,
  [EMERGENCY_ROLE_IDS.admin]: PRACTITIONER_LAYOUT_TIERS.admin,
  [EMERGENCY_ROLE_IDS.readOnlyViewer]: PRACTITIONER_LAYOUT_TIERS.display,
  [EMERGENCY_ROLE_IDS.publicDisplay]: PRACTITIONER_LAYOUT_TIERS.display,
});

const SCREEN_MODE_LAYOUT_TIER = Object.freeze({
  [CARE_DROID_SCREEN_MODES.reception]: PRACTITIONER_LAYOUT_TIERS.minimal,
  [CARE_DROID_SCREEN_MODES.triage]: PRACTITIONER_LAYOUT_TIERS.clinical,
  [CARE_DROID_SCREEN_MODES.physician]: PRACTITIONER_LAYOUT_TIERS.clinical,
  [CARE_DROID_SCREEN_MODES.chargeNurse]: PRACTITIONER_LAYOUT_TIERS.operational,
  [CARE_DROID_SCREEN_MODES.commandCenter]: PRACTITIONER_LAYOUT_TIERS.operational,
  [CARE_DROID_SCREEN_MODES.admin]: PRACTITIONER_LAYOUT_TIERS.admin,
  [CARE_DROID_SCREEN_MODES.ems]: PRACTITIONER_LAYOUT_TIERS.clinical,
  [CARE_DROID_SCREEN_MODES.readOnlyWhiteboard]: PRACTITIONER_LAYOUT_TIERS.display,
  [CARE_DROID_SCREEN_MODES.publicWaiting]: PRACTITIONER_LAYOUT_TIERS.display,
});

const OPERATIONAL_WHITEBOARD_RESTORE = Object.freeze({
  showAwarenessSubtitle: true,
  showCommunicationPanel: true,
  showRoleStrips: true,
  showAlertRails: true,
  showCommandDashboard: true,
  showMissionControl: true,
  showQueueIntelligence: true,
  showOpsDetail: true,
  showWhoNextPanel: true,
});

const CLINICAL_COPILOT_RESTORE = Object.freeze({
  showContextTab: true,
  showSafetyTab: true,
});

const TIER_SURFACE_OVERRIDES = Object.freeze({
  [PRACTITIONER_LAYOUT_TIERS.operational]: Object.freeze({
    whiteboard: OPERATIONAL_WHITEBOARD_RESTORE,
    shift: Object.freeze({ showSecondarySections: true }),
  }),
  [PRACTITIONER_LAYOUT_TIERS.admin]: Object.freeze({
    whiteboard: OPERATIONAL_WHITEBOARD_RESTORE,
    settings: Object.freeze({
      showAuditSections: true,
      showGovernanceSections: true,
      showScreenModes: true,
    }),
    admin: Object.freeze({
      showSurveillanceDetailList: true,
      showSecondaryLinks: true,
    }),
    analytics: Object.freeze({ showSecondaryCharts: true }),
  }),
  [PRACTITIONER_LAYOUT_TIERS.clinical]: Object.freeze({
    copilot: CLINICAL_COPILOT_RESTORE,
    patientCard: Object.freeze({
      showToolChips: true,
      badgeLimit: 2,
    }),
  }),
});

const PHYSICIAN_SURFACE_OVERRIDES = Object.freeze({
  patientCard: Object.freeze({
    showToolChips: true,
    badgeLimit: 2,
  }),
});

const ED_MANAGER_SURFACE_OVERRIDES = Object.freeze({
  analytics: Object.freeze({ showSecondaryCharts: true }),
});

/**
 * @param {{ role?: string | null, screenMode?: string | null }} [context]
 */
export function resolvePractitionerLayoutTier(context = {}) {
  const normalizedRole = normalizeEmergencyRole(context.role || EMERGENCY_ROLE_IDS.physician);
  const roleTier = ROLE_LAYOUT_TIER[normalizedRole] || PRACTITIONER_LAYOUT_TIERS.clinical;
  const screenMode = normalizeCareDroidScreenMode(context.screenMode);
  const modeTier = screenMode ? SCREEN_MODE_LAYOUT_TIER[screenMode] : null;

  if (!modeTier) return roleTier;
  return TIER_RANK[modeTier] > TIER_RANK[roleTier] ? modeTier : roleTier;
}

function mergeSection(baseSection, overrideSection) {
  if (!overrideSection) return baseSection;
  return Object.freeze({ ...(baseSection || {}), ...overrideSection });
}

/**
 * @param {Record<string, unknown>} visibility
 * @param {{ role?: string | null, screenMode?: string | null }} [context]
 */
function resolveTierSurfaceOverrides(tier) {
  if (isPractitionerCleanupEnabled()) {
    if (tier === PRACTITIONER_LAYOUT_TIERS.clinical) {
      return TIER_SURFACE_OVERRIDES[PRACTITIONER_LAYOUT_TIERS.clinical];
    }
    return null;
  }
  return TIER_SURFACE_OVERRIDES[tier];
}

export function applyRoleSurfaceOverrides(visibility, context = {}) {
  const tier = resolvePractitionerLayoutTier(context);
  const tierOverrides = resolveTierSurfaceOverrides(tier);
  const normalizedRole = normalizeEmergencyRole(context.role || '');
  const physicianOverrides =
    !isPractitionerCleanupEnabled() && normalizedRole === EMERGENCY_ROLE_IDS.physician
      ? PHYSICIAN_SURFACE_OVERRIDES
      : null;
  const edManagerOverrides =
    !isPractitionerCleanupEnabled() && normalizedRole === EMERGENCY_ROLE_IDS.edManager
      ? ED_MANAGER_SURFACE_OVERRIDES
      : null;

  if (!tierOverrides && !physicianOverrides && !edManagerOverrides) {
    return visibility;
  }

  return Object.freeze({
    ...visibility,
    whiteboard: mergeSection(visibility.whiteboard, tierOverrides?.whiteboard),
    copilot: mergeSection(visibility.copilot, tierOverrides?.copilot),
    patientCard: mergeSection(
      visibility.patientCard,
      tierOverrides?.patientCard || physicianOverrides?.patientCard,
    ),
    shift: mergeSection(visibility.shift, tierOverrides?.shift),
    analytics: mergeSection(
      visibility.analytics,
      tierOverrides?.analytics || edManagerOverrides?.analytics,
    ),
    settings: mergeSection(visibility.settings, tierOverrides?.settings),
    admin: mergeSection(visibility.admin, tierOverrides?.admin),
  });
}

function capVisibleCards(profile) {
  const currentMax = profile?.whiteboard?.maxVisibleCards;
  if (currentMax == null) {
    return PRACTITIONER_CLEANUP.maxWhiteboardVisibleCards;
  }
  return Math.min(currentMax, PRACTITIONER_CLEANUP.maxWhiteboardVisibleCards);
}

/**
 * @param {import('./screenDensityModeModel').ScreenDensityProfile | null | undefined} profile
 * @param {{ role?: string | null, screenMode?: string | null }} [context]
 */
export function mergeRoleAwarePractitionerDensityProfile(profile, context = {}) {
  if (!profile) return null;

  const tier = resolvePractitionerLayoutTier(context);

  if (tier === PRACTITIONER_LAYOUT_TIERS.operational || tier === PRACTITIONER_LAYOUT_TIERS.admin) {
    if (isPractitionerCleanupEnabled()) {
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
          maxVisibleCards: capVisibleCards(profile),
          gridMinCardWidth: 240,
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
    return {
      ...profile,
      whiteboard: {
        ...profile.whiteboard,
        maxVisibleCards: capVisibleCards(profile),
      },
    };
  }

  if (tier === PRACTITIONER_LAYOUT_TIERS.clinical) {
    const normalizedRole = normalizeEmergencyRole(context.role || '');
    const screenMode = normalizeCareDroidScreenMode(context.screenMode);
    const isPhysician =
      normalizedRole === EMERGENCY_ROLE_IDS.physician ||
      screenMode === CARE_DROID_SCREEN_MODES.physician;

    return {
      ...profile,
      whiteboard: {
        ...profile.whiteboard,
        showMissionControl: false,
        showQueueIntelligence: false,
        maxVisibleCards: capVisibleCards(profile),
        gridMinCardWidth: isPhysician
          ? profile.whiteboard.gridMinCardWidth
          : Math.min(profile.whiteboard.gridMinCardWidth || 260, 250),
        gridGap: profile.whiteboard.gridGap ?? 10,
      },
      patientCard: isPhysician
        ? profile.patientCard
        : {
            ...profile.patientCard,
            showExperienceBadge: profile.patientCard.showExperienceBadge,
          },
    };
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

export function resolvePractitionerPatientCardBadgeLimit(context = {}) {
  const tier = resolvePractitionerLayoutTier(context);
  if (
    tier === PRACTITIONER_LAYOUT_TIERS.clinical ||
    tier === PRACTITIONER_LAYOUT_TIERS.operational ||
    tier === PRACTITIONER_LAYOUT_TIERS.admin
  ) {
    return 2;
  }
  return PRACTITIONER_PATIENT_CARD_BADGE_LIMIT;
}
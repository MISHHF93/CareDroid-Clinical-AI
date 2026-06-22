/**
 * Screen-specific density modes — one component set, role-driven variants.
 * Reception: simple/fast · Triage: medium + safety · Charge: high operational
 * Physician: patient clinical · Public: large aggregate · Command: metric-heavy
 */
import {
  CARE_DROID_SCREEN_MODES,
  getScreenModeDensity,
  normalizeCareDroidScreenMode,
  type CareDroidScreenMode,
  type ScreenModeDensity,
} from './careDroidScreenModes';

export type ScreenDensityModeId =
  | 'simple-fast'
  | 'medium-safety'
  | 'high-operational'
  | 'patient-clinical'
  | 'public-aggregate'
  | 'metric-aggregate';

export type PatientCardDensityVariant = 'simple' | 'balanced' | 'operational' | 'clinical';

export type ScreenDensityWhiteboardProfile = {
  showMissionControl: boolean;
  showQueueIntelligence: boolean;
  showSecondaryStats: boolean;
  showWaitingRoomSafety: boolean;
  showAttentionStrips: boolean;
  preferOperationalStrips: boolean;
  maxVisibleCards: number | null;
  gridMinCardWidth: number;
  gridGap: number;
};

export type ScreenDensityPatientCardProfile = {
  showSafetyFlags: boolean;
  showQueueReason: boolean;
  showExperienceBadge: boolean;
  showWhatHappensNext: boolean;
  showLwbsAndDeterioration: boolean;
  showCommunicationBadge: boolean;
  showSignalsRow: boolean;
  showVitalsGrid: boolean;
  showScores: boolean;
  showReassessmentTimer: boolean;
  showMetaGrid: boolean;
};

export type ScreenDensityQueueProfile = {
  compact: boolean;
  showSafetyBadges: boolean;
  showQueueReason: boolean;
};

export type ScreenDensityProfile = {
  id: ScreenDensityModeId;
  label: string;
  description: string;
  registryDensity: ScreenModeDensity;
  patientCardVariant: PatientCardDensityVariant;
  whiteboard: ScreenDensityWhiteboardProfile;
  patientCard: ScreenDensityPatientCardProfile;
  queue: ScreenDensityQueueProfile;
};

const SIMPLE_FAST: ScreenDensityProfile = Object.freeze({
  id: 'simple-fast',
  label: 'Simple and fast',
  description: 'Reception front desk — minimal chrome, fast queue scanning.',
  registryDensity: 'comfortable',
  patientCardVariant: 'simple',
  whiteboard: Object.freeze({
    showMissionControl: false,
    showQueueIntelligence: false,
    showSecondaryStats: false,
    showWaitingRoomSafety: false,
    showAttentionStrips: false,
    preferOperationalStrips: false,
    maxVisibleCards: 24,
    gridMinCardWidth: 260,
    gridGap: 12,
  }),
  patientCard: Object.freeze({
    showSafetyFlags: false,
    showQueueReason: true,
    showExperienceBadge: false,
    showWhatHappensNext: false,
    showLwbsAndDeterioration: false,
    showCommunicationBadge: false,
    showSignalsRow: false,
    showVitalsGrid: false,
    showScores: false,
    showReassessmentTimer: false,
    showMetaGrid: true,
  }),
  queue: Object.freeze({
    compact: true,
    showSafetyBadges: false,
    showQueueReason: true,
  }),
});

const MEDIUM_SAFETY: ScreenDensityProfile = Object.freeze({
  id: 'medium-safety',
  label: 'Medium density with safety flags',
  description: 'Triage desk — balanced detail with safety and breach visibility.',
  registryDensity: 'comfortable',
  patientCardVariant: 'balanced',
  whiteboard: Object.freeze({
    showMissionControl: false,
    showQueueIntelligence: true,
    showSecondaryStats: true,
    showWaitingRoomSafety: true,
    showAttentionStrips: true,
    preferOperationalStrips: false,
    maxVisibleCards: 32,
    gridMinCardWidth: 280,
    gridGap: 12,
  }),
  patientCard: Object.freeze({
    showSafetyFlags: true,
    showQueueReason: true,
    showExperienceBadge: true,
    showWhatHappensNext: false,
    showLwbsAndDeterioration: true,
    showCommunicationBadge: true,
    showSignalsRow: true,
    showVitalsGrid: true,
    showScores: false,
    showReassessmentTimer: true,
    showMetaGrid: true,
  }),
  queue: Object.freeze({
    compact: false,
    showSafetyBadges: true,
    showQueueReason: true,
  }),
});

const HIGH_OPERATIONAL: ScreenDensityProfile = Object.freeze({
  id: 'high-operational',
  label: 'High-density operational view',
  description: 'Charge nurse command — dense metrics, strips, and board awareness.',
  registryDensity: 'compact',
  patientCardVariant: 'operational',
  whiteboard: Object.freeze({
    showMissionControl: true,
    showQueueIntelligence: true,
    showSecondaryStats: true,
    showWaitingRoomSafety: true,
    showAttentionStrips: true,
    preferOperationalStrips: true,
    maxVisibleCards: 48,
    gridMinCardWidth: 250,
    gridGap: 10,
  }),
  patientCard: Object.freeze({
    showSafetyFlags: true,
    showQueueReason: true,
    showExperienceBadge: true,
    showWhatHappensNext: true,
    showLwbsAndDeterioration: true,
    showCommunicationBadge: true,
    showSignalsRow: true,
    showVitalsGrid: true,
    showScores: true,
    showReassessmentTimer: true,
    showMetaGrid: true,
  }),
  queue: Object.freeze({
    compact: true,
    showSafetyBadges: true,
    showQueueReason: true,
  }),
});

const PATIENT_CLINICAL: ScreenDensityProfile = Object.freeze({
  id: 'patient-clinical',
  label: 'Patient-focused clinical workflow',
  description: 'Physician workspace — chart-first cards with clinical signals.',
  registryDensity: 'comfortable',
  patientCardVariant: 'clinical',
  whiteboard: Object.freeze({
    showMissionControl: false,
    showQueueIntelligence: false,
    showSecondaryStats: false,
    showWaitingRoomSafety: false,
    showAttentionStrips: false,
    preferOperationalStrips: false,
    maxVisibleCards: 36,
    gridMinCardWidth: 300,
    gridGap: 14,
  }),
  patientCard: Object.freeze({
    showSafetyFlags: true,
    showQueueReason: true,
    showExperienceBadge: false,
    showWhatHappensNext: true,
    showLwbsAndDeterioration: false,
    showCommunicationBadge: false,
    showSignalsRow: true,
    showVitalsGrid: true,
    showScores: true,
    showReassessmentTimer: true,
    showMetaGrid: true,
  }),
  queue: Object.freeze({
    compact: false,
    showSafetyBadges: false,
    showQueueReason: true,
  }),
});

const PUBLIC_AGGREGATE: ScreenDensityProfile = Object.freeze({
  id: 'public-aggregate',
  label: 'Large simple aggregate view',
  description: 'Public waiting display — PHI-safe aggregates only.',
  registryDensity: 'wall',
  patientCardVariant: 'simple',
  whiteboard: Object.freeze({
    showMissionControl: false,
    showQueueIntelligence: false,
    showSecondaryStats: false,
    showWaitingRoomSafety: false,
    showAttentionStrips: false,
    preferOperationalStrips: false,
    maxVisibleCards: null,
    gridMinCardWidth: 0,
    gridGap: 0,
  }),
  patientCard: Object.freeze({
    showSafetyFlags: false,
    showQueueReason: false,
    showExperienceBadge: false,
    showWhatHappensNext: false,
    showLwbsAndDeterioration: false,
    showCommunicationBadge: false,
    showSignalsRow: false,
    showVitalsGrid: false,
    showScores: false,
    showReassessmentTimer: false,
    showMetaGrid: false,
  }),
  queue: Object.freeze({
    compact: true,
    showSafetyBadges: false,
    showQueueReason: false,
  }),
});

const METRIC_AGGREGATE: ScreenDensityProfile = Object.freeze({
  id: 'metric-aggregate',
  label: 'Metric-heavy aggregate view',
  description: 'Command center — throughput KPIs without patient grid clutter.',
  registryDensity: 'wall',
  patientCardVariant: 'simple',
  whiteboard: Object.freeze({
    showMissionControl: false,
    showQueueIntelligence: false,
    showSecondaryStats: true,
    showWaitingRoomSafety: false,
    showAttentionStrips: true,
    preferOperationalStrips: true,
    maxVisibleCards: null,
    gridMinCardWidth: 0,
    gridGap: 0,
  }),
  patientCard: Object.freeze({
    showSafetyFlags: false,
    showQueueReason: false,
    showExperienceBadge: false,
    showWhatHappensNext: false,
    showLwbsAndDeterioration: false,
    showCommunicationBadge: false,
    showSignalsRow: false,
    showVitalsGrid: false,
    showScores: false,
    showReassessmentTimer: false,
    showMetaGrid: false,
  }),
  queue: Object.freeze({
    compact: true,
    showSafetyBadges: false,
    showQueueReason: false,
  }),
});

const DENSITY_BY_SCREEN_MODE: Readonly<Partial<Record<CareDroidScreenMode, ScreenDensityProfile>>> =
  Object.freeze({
    [CARE_DROID_SCREEN_MODES.reception]: SIMPLE_FAST,
    [CARE_DROID_SCREEN_MODES.triage]: MEDIUM_SAFETY,
    [CARE_DROID_SCREEN_MODES.chargeNurse]: HIGH_OPERATIONAL,
    [CARE_DROID_SCREEN_MODES.physician]: PATIENT_CLINICAL,
    [CARE_DROID_SCREEN_MODES.publicWaiting]: PUBLIC_AGGREGATE,
    [CARE_DROID_SCREEN_MODES.readOnlyWhiteboard]: PUBLIC_AGGREGATE,
    [CARE_DROID_SCREEN_MODES.commandCenter]: METRIC_AGGREGATE,
    [CARE_DROID_SCREEN_MODES.ems]: HIGH_OPERATIONAL,
    [CARE_DROID_SCREEN_MODES.admin]: METRIC_AGGREGATE,
  });

const DEFAULT_PROFILE = HIGH_OPERATIONAL;

export function resolveScreenDensityProfile(
  screenMode: string | CareDroidScreenMode | null | undefined,
): ScreenDensityProfile {
  const normalized = normalizeCareDroidScreenMode(screenMode);
  if (normalized && DENSITY_BY_SCREEN_MODE[normalized]) {
    const profile = DENSITY_BY_SCREEN_MODE[normalized]!;
    return Object.freeze({
      ...profile,
      registryDensity: getScreenModeDensity(normalized),
    });
  }
  return DEFAULT_PROFILE;
}

export function resolvePatientCardDensityVariant(
  screenMode: string | CareDroidScreenMode | null | undefined,
): PatientCardDensityVariant {
  return resolveScreenDensityProfile(screenMode).patientCardVariant;
}

export function screenDensityShellClassName(
  screenMode: string | CareDroidScreenMode | null | undefined,
): string {
  const profile = resolveScreenDensityProfile(screenMode);
  return `emergency-app-shell--density-${profile.registryDensity} emergency-app-shell--screen-density-${profile.id}`;
}

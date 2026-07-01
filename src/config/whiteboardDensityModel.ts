/**
 * Whiteboard density audit — classify surfaces as always-visible vs progressive disclosure.
 * Pairs with whiteboardOperationalLoadModel for load-aware visibility.
 */

import { evaluateWhiteboardOperationalLoad } from '../components/whiteboard/whiteboardOperationalLoadModel';
import { shouldForceOperationalAwareness } from './practitionerCleanup.config';
import { getPractitionerSurfaceVisibility } from './practitionerSurfaceVisibility';

export const WHITEBOARD_DENSITY_TIER = Object.freeze({
  ALWAYS_VISIBLE: 'always_visible',
  PROGRESSIVE: 'progressive_disclosure',
  CONTEXTUAL: 'contextual',
});

export const WHITEBOARD_SURFACE_REGISTRY = Object.freeze([
  Object.freeze({
    id: 'hero-title',
    label: 'Department title',
    tier: WHITEBOARD_DENSITY_TIER.ALWAYS_VISIBLE,
    rationale: 'Orientation anchor — who/where am I.',
  }),
  Object.freeze({
    id: 'hero-detail',
    label: 'Hero status chips',
    tier: WHITEBOARD_DENSITY_TIER.PROGRESSIVE,
    rationale: 'Policy and IoMT badges duplicate stats row under pressure.',
  }),
  Object.freeze({
    id: 'capacity-crisis',
    label: 'Capacity crisis mode',
    tier: WHITEBOARD_DENSITY_TIER.CONTEXTUAL,
    rationale: 'Only when crisis thresholds are active.',
  }),
  Object.freeze({
    id: 'shift-handoff',
    label: 'Shift handoff domain bar',
    tier: WHITEBOARD_DENSITY_TIER.CONTEXTUAL,
    rationale: 'Charge-nurse handoff replaces duplicate domain strips.',
  }),
  Object.freeze({
    id: 'awareness-banner',
    label: 'Pressure awareness banner',
    tier: WHITEBOARD_DENSITY_TIER.CONTEXTUAL,
    rationale: 'Single primary-focus row when department load is elevated.',
  }),
  Object.freeze({
    id: 'primary-stats',
    label: 'Primary stat row',
    tier: WHITEBOARD_DENSITY_TIER.ALWAYS_VISIBLE,
    rationale: 'Waiting, capacity, reassess, EMS ETA — actionable at a glance.',
  }),
  Object.freeze({
    id: 'secondary-stats',
    label: 'Secondary stat cards',
    tier: WHITEBOARD_DENSITY_TIER.PROGRESSIVE,
    rationale: 'Total, high risk, EMS offload detail — drill-down metrics.',
  }),
  Object.freeze({
    id: 'command-layer',
    label: 'Operational command layer',
    tier: WHITEBOARD_DENSITY_TIER.PROGRESSIVE,
    rationale: 'Central snapshot grid — useful when calm, noisy under load.',
  }),
  Object.freeze({
    id: 'ems-attention',
    label: 'EMS attention strip',
    tier: WHITEBOARD_DENSITY_TIER.CONTEXTUAL,
    rationale: 'Show when inbound EMS signal exists and not duplicated elsewhere.',
  }),
  Object.freeze({
    id: 'ems-inbound-banner',
    label: 'Inbound EMS card banner',
    tier: WHITEBOARD_DENSITY_TIER.CONTEXTUAL,
    rationale: 'Unit cards duplicate EMS strip and stats when load is high.',
  }),
  Object.freeze({
    id: 'reassess-attention',
    label: 'Reassessment attention strip',
    tier: WHITEBOARD_DENSITY_TIER.CONTEXTUAL,
    rationale: 'Due reassessments — hidden when handoff or awareness banner covers it.',
  }),
  Object.freeze({
    id: 'referral-attention',
    label: 'Referral attention strip',
    tier: WHITEBOARD_DENSITY_TIER.CONTEXTUAL,
    rationale: 'Pending referrals — hidden when consolidated elsewhere.',
  }),
  Object.freeze({
    id: 'charge-nurse-strip',
    label: 'Charge nurse operational strip',
    tier: WHITEBOARD_DENSITY_TIER.CONTEXTUAL,
    rationale: 'Role-specific queue summary — suppressed under pressure.',
  }),
  Object.freeze({
    id: 'waiting-room-safety',
    label: 'Waiting room safety board',
    tier: WHITEBOARD_DENSITY_TIER.PROGRESSIVE,
    rationale: 'Post-triage waiting patients with vitals, reassessment, and provider/test status.',
  }),
  Object.freeze({
    id: 'mission-control',
    label: 'Mission control panels',
    tier: WHITEBOARD_DENSITY_TIER.PROGRESSIVE,
    rationale: 'Deep workflow cards — collapse when triage bandwidth is scarce.',
  }),
  Object.freeze({
    id: 'queue-intelligence',
    label: 'Queue intelligence panel',
    tier: WHITEBOARD_DENSITY_TIER.PROGRESSIVE,
    rationale: 'Detailed queue analytics — expand on demand.',
  }),
  Object.freeze({
    id: 'ops-detail',
    label: 'Ops detail drawer',
    tier: WHITEBOARD_DENSITY_TIER.PROGRESSIVE,
    rationale: 'Audit history, data quality, queue pressure — one expandable strip.',
  }),
  Object.freeze({
    id: 'filters',
    label: 'Board filters',
    tier: WHITEBOARD_DENSITY_TIER.ALWAYS_VISIBLE,
    rationale: 'Primary navigation for patient grid.',
  }),
  Object.freeze({
    id: 'patient-grid',
    label: 'Patient card grid',
    tier: WHITEBOARD_DENSITY_TIER.ALWAYS_VISIBLE,
    rationale: 'Core work surface — cap count under waiting-wall load.',
  }),
  Object.freeze({
    id: 'department-status-screen',
    label: 'Department status screen',
    tier: WHITEBOARD_DENSITY_TIER.ALWAYS_VISIBLE,
    rationale: 'Read-only wall display — aggregate metrics without PHI.',
  }),
  Object.freeze({
    id: 'public-waiting-screen',
    label: 'Public waiting display',
    tier: WHITEBOARD_DENSITY_TIER.ALWAYS_VISIBLE,
    rationale: 'Patient waiting-area wall — PHI-safe operational guidance only.',
  }),
  Object.freeze({
    id: 'command-center-throughput',
    label: 'Department throughput',
    tier: WHITEBOARD_DENSITY_TIER.ALWAYS_VISIBLE,
    rationale: 'Manager/director throughput dashboard — arrivals, waits, boarding, forecast.',
  }),
]);

/**
 * @param {object} context
 * @param {object} [context.operationalLoad]
 * @param {boolean} [context.displayMode]
 * @param {boolean} [context.publicWaitingDisplay]
 * @param {boolean} [context.commandCenterScreen]
 * @param {boolean} [context.showShiftHandoffStrip]
 * @param {boolean} [context.prioritizeAwareness]
 * @param {boolean} [context.showCapacityCrisis]
 * @param {object} [context.signals]
 * @param {boolean} [context.signals.emsAttention]
 * @param {boolean} [context.signals.reassessAttention]
 * @param {boolean} [context.signals.referralAttention]
 * @param {boolean} [context.signals.chargeNurseStrip]
 * @param {boolean} [context.signals.waitingRoomSafety]
 * @param {boolean} [context.signals.inboundEmsBanner]
 * @param {number} [context.signals.opsDetailCount]
 * @param {string} [context.screenMode]
 * @param {object | null} [context.densityProfile]
 * @param {object} [context.practitionerSurfaces]
 */
export function evaluateWhiteboardDensity(context: any = {}) {
  const practitionerWhiteboard =
    context.practitionerSurfaces?.whiteboard ||
    getPractitionerSurfaceVisibility({
      role: context.role,
      screenMode: context.screenMode,
    }).whiteboard;
  const densityProfile = context.densityProfile || null;
  const operationalLoad =
    context.operationalLoad ||
    evaluateWhiteboardOperationalLoad({
      waitingPatients: context.waitingPatients,
      emsArrivals: context.emsArrivals,
      reassessmentsDue: context.reassessmentsDue,
      referralsPending: context.referralsPending,
      totalPatients: context.totalPatients,
    });

  const displayMode = Boolean(context.displayMode);
  const publicWaitingDisplay = Boolean(context.publicWaitingDisplay);
  const commandCenterScreen = Boolean(context.commandCenterScreen);
  const wallKioskDisplay = displayMode;
  const publicWaitingKiosk = publicWaitingDisplay;
  const showShiftHandoffStrip = Boolean(context.showShiftHandoffStrip);
  const prioritizeAwareness =
    shouldForceOperationalAwareness() ||
    Boolean(context.prioritizeAwareness) ||
    operationalLoad.prioritizeAwareness;
  const signals = context.signals || {};
  const opsDetailCount = Number(signals.opsDetailCount) || 0;
  const duplicateDomainChrome = showShiftHandoffStrip || prioritizeAwareness;
  const departmentScreen = wallKioskDisplay && !publicWaitingDisplay;
  const preferOperationalStrips = Boolean(densityProfile?.whiteboard?.preferOperationalStrips);
  const profileMaxCards = densityProfile?.whiteboard?.maxVisibleCards;
  const suppressMissionControl =
    densityProfile && !densityProfile.whiteboard.showMissionControl;
  const suppressQueueIntelligence =
    densityProfile && !densityProfile.whiteboard.showQueueIntelligence;
  const suppressSecondaryStats =
    densityProfile && !densityProfile.whiteboard.showSecondaryStats;
  const suppressWaitingRoomSafety =
    densityProfile && !densityProfile.whiteboard.showWaitingRoomSafety;
  const suppressAttentionStrips =
    densityProfile && !densityProfile.whiteboard.showAttentionStrips;

  const surfaces = Object.freeze({
    heroTitle: Object.freeze({
      visible: !departmentScreen && !publicWaitingKiosk,
      tier: WHITEBOARD_DENSITY_TIER.ALWAYS_VISIBLE,
    }),
    heroDetail: Object.freeze({
      visible: !wallKioskDisplay && !prioritizeAwareness && !operationalLoad.hideHeroDetail,
      tier: WHITEBOARD_DENSITY_TIER.PROGRESSIVE,
    }),
    capacityCrisis: Object.freeze({
      visible: Boolean(context.showCapacityCrisis) && !departmentScreen && !publicWaitingKiosk,
      tier: WHITEBOARD_DENSITY_TIER.CONTEXTUAL,
    }),
    shiftHandoff: Object.freeze({
      visible: showShiftHandoffStrip && !wallKioskDisplay,
      tier: WHITEBOARD_DENSITY_TIER.CONTEXTUAL,
    }),
    awarenessBanner: Object.freeze({
      visible: prioritizeAwareness && !displayMode,
      tier: WHITEBOARD_DENSITY_TIER.CONTEXTUAL,
    }),
    departmentStatusScreen: Object.freeze({
      visible: departmentScreen,
      tier: WHITEBOARD_DENSITY_TIER.ALWAYS_VISIBLE,
    }),
    publicWaitingScreen: Object.freeze({
      visible: publicWaitingDisplay,
      tier: WHITEBOARD_DENSITY_TIER.ALWAYS_VISIBLE,
    }),
    commandCenterThroughput: Object.freeze({
      visible: commandCenterScreen,
      tier: WHITEBOARD_DENSITY_TIER.ALWAYS_VISIBLE,
    }),
    primaryStats: Object.freeze({
      visible: !wallKioskDisplay,
      compact: prioritizeAwareness,
      tier: WHITEBOARD_DENSITY_TIER.ALWAYS_VISIBLE,
    }),
    secondaryStats: Object.freeze({
      visible:
        !wallKioskDisplay &&
        !prioritizeAwareness &&
        !suppressSecondaryStats,
      tier: WHITEBOARD_DENSITY_TIER.PROGRESSIVE,
    }),
    commandLayer: Object.freeze({
      visible:
        !wallKioskDisplay &&
        !commandCenterScreen &&
        !prioritizeAwareness &&
        !operationalLoad.hideCommandLayer,
      tier: WHITEBOARD_DENSITY_TIER.PROGRESSIVE,
    }),
    emsAttention: Object.freeze({
      visible:
        Boolean(signals.emsAttention) &&
        !showShiftHandoffStrip &&
        (!prioritizeAwareness || preferOperationalStrips) &&
        !displayMode &&
        !suppressAttentionStrips,
      tier: WHITEBOARD_DENSITY_TIER.CONTEXTUAL,
    }),
    emsInboundBanner: Object.freeze({
      visible:
        Boolean(signals.inboundEmsBanner) &&
        !operationalLoad.hideDuplicateEmsBanner &&
        !showShiftHandoffStrip &&
        !prioritizeAwareness &&
        !displayMode,
      tier: WHITEBOARD_DENSITY_TIER.CONTEXTUAL,
    }),
    reassessAttention: Object.freeze({
      visible:
        Boolean(signals.reassessAttention) &&
        !duplicateDomainChrome &&
        !displayMode &&
        !suppressAttentionStrips,
      tier: WHITEBOARD_DENSITY_TIER.CONTEXTUAL,
    }),
    referralAttention: Object.freeze({
      visible:
        Boolean(signals.referralAttention) &&
        !showShiftHandoffStrip &&
        (!prioritizeAwareness || preferOperationalStrips) &&
        !displayMode &&
        !suppressAttentionStrips,
      tier: WHITEBOARD_DENSITY_TIER.CONTEXTUAL,
    }),
    chargeNurseStrip: Object.freeze({
      visible:
        Boolean(signals.chargeNurseStrip) &&
        (!operationalLoad.hideChargeNurseStrip || preferOperationalStrips) &&
        !showShiftHandoffStrip &&
        !displayMode &&
        !commandCenterScreen &&
        practitionerWhiteboard.showRoleStrips,
      tier: WHITEBOARD_DENSITY_TIER.CONTEXTUAL,
    }),
    waitingRoomSafety: Object.freeze({
      visible:
        !wallKioskDisplay &&
        !commandCenterScreen &&
        Boolean(signals.waitingRoomSafety) &&
        !suppressWaitingRoomSafety &&
        (!operationalLoad.hideMissionControl || preferOperationalStrips),
      tier: WHITEBOARD_DENSITY_TIER.PROGRESSIVE,
    }),
    missionControl: Object.freeze({
      visible:
        !wallKioskDisplay &&
        !commandCenterScreen &&
        !suppressMissionControl &&
        (!prioritizeAwareness || preferOperationalStrips) &&
        (!operationalLoad.hideMissionControl || preferOperationalStrips),
      tier: WHITEBOARD_DENSITY_TIER.PROGRESSIVE,
    }),
    queueIntelligence: Object.freeze({
      visible:
        !wallKioskDisplay &&
        !commandCenterScreen &&
        !suppressQueueIntelligence &&
        !prioritizeAwareness &&
        !operationalLoad.collapseQueueIntelligence,
      defaultCollapsed: operationalLoad.collapseQueueIntelligence,
      tier: WHITEBOARD_DENSITY_TIER.PROGRESSIVE,
    }),
    opsDetail: Object.freeze({
      visible:
        !wallKioskDisplay &&
        !commandCenterScreen &&
        !showShiftHandoffStrip &&
        practitionerWhiteboard.showOpsDetail,
      defaultExpanded: !prioritizeAwareness && !operationalLoad.hideMissionControl,
      signalCount: opsDetailCount,
      tier: WHITEBOARD_DENSITY_TIER.PROGRESSIVE,
    }),
    filters: Object.freeze({ visible: !wallKioskDisplay, tier: WHITEBOARD_DENSITY_TIER.ALWAYS_VISIBLE }),
    patientGrid: Object.freeze({
      visible: !wallKioskDisplay && !commandCenterScreen,
      maxVisibleCards:
        densityProfile?.whiteboard != null
          ? profileMaxCards
          : operationalLoad.maxVisibleCards,
      tier: WHITEBOARD_DENSITY_TIER.ALWAYS_VISIBLE,
    }),
  });

  const alwaysVisible = WHITEBOARD_SURFACE_REGISTRY.filter(
    (surface) => surface.tier === WHITEBOARD_DENSITY_TIER.ALWAYS_VISIBLE,
  ).map((surface) => surface.id);

  const progressive = WHITEBOARD_SURFACE_REGISTRY.filter(
    (surface) => surface.tier === WHITEBOARD_DENSITY_TIER.PROGRESSIVE,
  ).map((surface) => surface.id);

  const contextual = WHITEBOARD_SURFACE_REGISTRY.filter(
    (surface) => surface.tier === WHITEBOARD_DENSITY_TIER.CONTEXTUAL,
  ).map((surface) => surface.id);

  const visibleSurfaceCount = Object.values(surfaces).filter((surface) => surface.visible).length;
  const hiddenUnderLoad = [
    !surfaces.heroDetail.visible,
    !surfaces.commandLayer.visible,
    !surfaces.missionControl.visible,
    !surfaces.emsAttention.visible,
    !surfaces.reassessAttention.visible,
    !surfaces.referralAttention.visible,
    !surfaces.secondaryStats.visible,
  ].filter(Boolean).length;

  const clutterScore = Math.max(
    0,
    Math.min(100, Math.round(visibleSurfaceCount * 6 - hiddenUnderLoad * 4)),
  );
  const signalScore = Math.max(
    0,
    Math.min(100, operationalLoad.readabilityScore + hiddenUnderLoad * 3),
  );

  const recommendations = buildRecommendations({
    operationalLoad,
    prioritizeAwareness,
    showShiftHandoffStrip,
    opsDetailCount,
    hiddenUnderLoad,
  });

  return Object.freeze({
    operationalLoad,
    prioritizeAwareness,
    densityProfile,
    surfaces,
    tiers: Object.freeze({
      alwaysVisible: Object.freeze(alwaysVisible),
      progressive: Object.freeze(progressive),
      contextual: Object.freeze(contextual),
    }),
    clutterScore,
    signalScore,
    visibleSurfaceCount,
    hiddenUnderLoad,
    recommendations,
  });
}

function buildRecommendations({
  operationalLoad,
  prioritizeAwareness,
  showShiftHandoffStrip,
  opsDetailCount,
  hiddenUnderLoad,
}) {
  const items = [] as any[];

  if (prioritizeAwareness) {
    items.push('Keep primary stats + awareness banner visible; hide duplicate domain strips.');
  }
  if (showShiftHandoffStrip) {
    items.push('Shift handoff bar replaces EMS/referral/audit strips for this role.');
  }
  if (opsDetailCount > 0) {
    items.push('Fold audit history, data quality, and queue pressure into one ops-detail drawer.');
  }
  if (operationalLoad.maxVisibleCards) {
    items.push(`Cap unfiltered grid at ${operationalLoad.maxVisibleCards} cards with filter prompt.`);
  }
  if (hiddenUnderLoad >= 4) {
    items.push('Progressive disclosure active — expand ops detail or queue intelligence when bandwidth allows.');
  }

  return Object.freeze(items);
}

/**
 * @param {object} [scenario]
 */
export function auditWhiteboardDensity(scenario: any = {}) {
  const stress = evaluateWhiteboardDensity({
    waitingPatients: scenario.waitingPatients ?? 40,
    emsArrivals: scenario.emsArrivals ?? 5,
    reassessmentsDue: scenario.reassessmentsDue ?? 10,
    referralsPending: scenario.referralsPending ?? 8,
    totalPatients: scenario.totalPatients ?? 63,
    showShiftHandoffStrip: false,
    signals: {
      emsAttention: true,
      reassessAttention: true,
      referralAttention: true,
      chargeNurseStrip: true,
      inboundEmsBanner: true,
      opsDetailCount: 3,
    },
  });

  const calm = evaluateWhiteboardDensity({
    waitingPatients: 6,
    emsArrivals: 1,
    reassessmentsDue: 1,
    referralsPending: 1,
    totalPatients: 12,
    signals: {
      emsAttention: true,
      reassessAttention: false,
      referralAttention: false,
      chargeNurseStrip: true,
      inboundEmsBanner: true,
      opsDetailCount: 1,
    },
  });

  return Object.freeze({
    alwaysVisible: stress.tiers.alwaysVisible,
    progressiveDisclosure: stress.tiers.progressive,
    contextual: stress.tiers.contextual,
    stressScenario: Object.freeze({
      clutterScore: stress.clutterScore,
      signalScore: stress.signalScore,
      visibleSurfaceCount: stress.visibleSurfaceCount,
      hiddenUnderLoad: stress.hiddenUnderLoad,
      recommendations: stress.recommendations,
    }),
    calmScenario: Object.freeze({
      clutterScore: calm.clutterScore,
      signalScore: calm.signalScore,
      visibleSurfaceCount: calm.visibleSurfaceCount,
    }),
    mitigations: Object.freeze([
      'Always visible: title, primary stats, filters, patient grid (capped under load).',
      'Progressive: command layer, mission control, queue intelligence, ops-detail drawer.',
      'Contextual: domain attention strips only when signal active and not duplicated.',
    ]),
  });
}

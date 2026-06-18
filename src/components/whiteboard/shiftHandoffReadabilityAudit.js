export const SHIFT_HANDOFF_SIGNAL_IDS = Object.freeze([
  'waiting',
  'highRisk',
  'ems',
  'reassess',
  'boarders',
  'referrals',
]);

export const OPERATIONAL_HANDOFF_DOMAIN_SIGNALS = Object.freeze([
  'patient',
  'ems',
  'referral',
  'admission',
]);

export const SHIFT_HANDOFF_CLINICAL_ROLES = Object.freeze([
  'charge_nurse',
  'physician',
  'triage_nurse',
  'ed_manager',
]);

/**
 * Audits whether a new clinician can read all five shift signals within 60 seconds.
 */
export function evaluateShiftHandoffReadability(surfaces = {}) {
  const {
    shiftHandoffStripVisible = false,
    operationalDomainBarVisible = false,
    chargeNurseStripVisible = false,
    statBarVisible = false,
    awarenessBannerVisible = false,
    headerMetricsVisible = false,
    clickDepthToAllSignals = 3,
  } = surfaces;

  const domainBarVisible = operationalDomainBarVisible || shiftHandoffStripVisible;
  const visibleSignals = [];
  if (domainBarVisible) {
    visibleSignals.push(...SHIFT_HANDOFF_SIGNAL_IDS);
    visibleSignals.push(...OPERATIONAL_HANDOFF_DOMAIN_SIGNALS);
  } else {
    if (statBarVisible) visibleSignals.push('waiting', 'reassess', 'ems');
    if (chargeNurseStripVisible) visibleSignals.push('reassess', 'ems', 'boarders');
    if (awarenessBannerVisible) visibleSignals.push('waiting', 'reassess', 'ems');
    if (headerMetricsVisible) visibleSignals.push('waiting', 'reassess', 'ems', 'boarders');
  }

  const uniqueVisible = new Set(visibleSignals);
  const missing = SHIFT_HANDOFF_SIGNAL_IDS.filter((id) => !uniqueVisible.has(id));

  const passes60SecondTest =
    domainBarVisible && missing.length === 0 && clickDepthToAllSignals <= 1;

  return Object.freeze({
    passes60SecondTest,
    missing,
    visibleCount: uniqueVisible.size,
    requiredCount: SHIFT_HANDOFF_SIGNAL_IDS.length,
    clickDepthToAllSignals,
    recommendation: passes60SecondTest
      ? 'Operational handoff domain bar surfaces Patient, EMS, Referral, and Admission summaries at login.'
      : missing.includes('highRisk')
        ? 'Add high-risk count to the primary shift snapshot — it is buried in filters today.'
        : missing.includes('referrals')
          ? 'Add referral pending/delayed counts to the operational handoff bar.'
          : 'Mount OperationalHandoffDomainBar at the top of the Whiteboard for clinical roles.',
  });
}

export function auditShiftHandoffSurfaces(roleId, options = {}) {
  const isClinical = SHIFT_HANDOFF_CLINICAL_ROLES.includes(roleId);
  const before = evaluateShiftHandoffReadability({
    shiftHandoffStripVisible: false,
    chargeNurseStripVisible: roleId === 'charge_nurse',
    statBarVisible: true,
    awarenessBannerVisible: Boolean(options.operationalLoadElevated),
    headerMetricsVisible: isClinical,
    clickDepthToAllSignals: roleId === 'physician' ? 3 : 2,
  });

  const after = evaluateShiftHandoffReadability({
    operationalDomainBarVisible: isClinical && !options.displayMode,
    clickDepthToAllSignals: 1,
  });

  return Object.freeze({ roleId, before, after });
}

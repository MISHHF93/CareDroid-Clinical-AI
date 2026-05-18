/**
 * Deterministic fixtures for PR3 Tier-B chat-assisted tools
 * (GRACE ACS, NIHSS, Canadian C-Spine, Ottawa Ankle).
 */

import { PR3_TOOL_IDS } from '../pr3TestConstants';

export { PR3_TOOL_IDS };

/** Representative launch aliases per tool (NLU + discovery slugs). */
export const GRACE_ACS_LAUNCH_ALIASES = Object.freeze([
  'grace-acs',
  'grace',
  'grace score',
  'grace acs',
  'grace-score',
  'acs-mortality-risk',
  'acute-coronary-syndrome-risk',
]);

export const NIHSS_LAUNCH_ALIASES = Object.freeze([
  'nihss',
  'nih stroke scale',
  'nih-stroke-scale',
  'stroke scale',
  'stroke-severity-score',
]);

export const CANADIAN_C_SPINE_LAUNCH_ALIASES = Object.freeze([
  'canadian-c-spine',
  'canadian c spine',
  'canadian-c-spine-rule',
  'c-spine-rule',
  'cervical-spine-rule',
  'neck-trauma-imaging-rule',
]);

export const OTTAWA_ANKLE_LAUNCH_ALIASES = Object.freeze([
  'ottawa-ankle',
  'ottawa ankle',
  'ottawa-ankle-rule',
  'ankle-xray-rule',
  'foot-xray-rule',
]);

export const PR3_LAUNCH_ALIASES_BY_REGISTRY_ID = Object.freeze({
  'grace-acs': GRACE_ACS_LAUNCH_ALIASES,
  nihss: NIHSS_LAUNCH_ALIASES,
  'canadian-c-spine': CANADIAN_C_SPINE_LAUNCH_ALIASES,
  'ottawa-ankle': OTTAWA_ANKLE_LAUNCH_ALIASES,
});

/** Favorable GRACE profile — low 6-month mortality band. */
export const GRACE_ACS_LOW_RISK_INPUT = Object.freeze({
  ageYears: 55,
  heartRateBpm: 70,
  systolicBpMmHg: 130,
  creatinineMgDl: 0.9,
  killipClass: 'I',
  cardiacArrestAtAdmission: false,
  stSegmentDeviation: false,
  elevatedCardiacEnzymes: false,
});

/** CCR high-risk inputs — none present. */
export const CANADIAN_C_SPINE_NO_HIGH_RISK = Object.freeze({
  age65OrOlder: false,
  dangerousMechanism: false,
  paresthesiasInExtremities: false,
});

/** CCR low-risk inputs — all met. */
export const CANADIAN_C_SPINE_ALL_LOW_RISK = Object.freeze({
  simpleRearEndMvc: true,
  sittingInEd: true,
  ambulatoryAtAnyTime: true,
  delayedNeckPainOnset: true,
  noMidlineCervicalTenderness: true,
  noDistractingPainfulInjury: true,
});

/** Ottawa ankle exam — malleolar pain + lateral tenderness → radiograph indicated. */
export const OTTAWA_ANKLE_IMAGING_INDICATED = Object.freeze({
  painMalleolarZone: true,
  tendernessLateralMalleolus: true,
  tendernessMedialMalleolus: false,
  painMidfootZone: true,
  tendernessNavicular: false,
  tendernessFifthMetatarsalBase: false,
  unableToBearWeightBothTimes: false,
});

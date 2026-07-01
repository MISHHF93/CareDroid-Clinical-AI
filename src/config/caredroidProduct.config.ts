/**
 * Canonical CareDroid product identity.
 * External-facing copy must use CareDroid only — no alternate product names.
 */

export const CAREDROID_PRODUCT = Object.freeze({
  name: 'CareDroid',
  tagline: 'Emergency Department Operating System',
  platformLine: 'Emergency Department Operating System',
  firstResolutionLine:
    'One ED OS orchestrating the full patient journey — from emergency call or walk-in through reception, triage, treatment, disposition, and analytics.',
  evolutionSummary:
    'Consolidated from fragmented dashboards into one emergency department operating system with reception-first arrival resolution and role-profiled journey stages.',
  copilotBadge: 'Copilot',
  copilotName: 'CareDroid Copilot',
  receptionName: 'Arrival Dashboard',
  receptionRoute: '/emergency/reception',
  receptionSummary:
    'Reception-first front desk: see inbound ambulances before arrival, search, prepare patient cards, verify identity, and hand off to triage.',
  whiteboardName: 'Department Whiteboard',
  whiteboardRoute: '/emergency/whiteboard',
  safetyLine: 'Decision support only. Human review is required for clinical actions.',
  safetyShort: 'Human-reviewed decision support',
  whiteboardSummary:
    'Department operating picture — who-next, flow, capacity, and critical actions after reception prepares each patient card.',
  roleFlowSummary:
    'One journey from call or walk-in through reception, triage, diagnostics, treatment, disposition, and reporting — every surface shows state, owner, and next action.',
  copilotIntro:
    'CareDroid Copilot supports routing, context, evidence, and workflow prompts without making autonomous clinical decisions.',
  copilotRole:
    'Embedded CareDroid Copilot workflow layer — not an autonomous clinician.',
  /** One Screen, One Decision — each surface optimizes for a single primary decision. */
  oneScreenOneDecision:
    'Every screen helps the user make one primary decision quickly. Secondary information is available but must not compete with the primary task.',
  designMission: Object.freeze({
    clarity: 'Signal over noise — only elements that speed safer decisions stay visible.',
    speed: 'First three minutes — reception, triage, and charge paths stay uncluttered.',
    safety: 'Semantic color, unified alerts, human-reviewed AI.',
    cognitiveLoad: 'Progressive disclosure under department pressure.',
  }),
  notPositionedAs: Object.freeze([
    'autonomous diagnosis',
    'prescribing',
    'order entry',
    'autonomous discharge or admission authority',
    'authoritative acuity assignment',
    'unsupervised EHR writeback',
  ]),
} as const);

export type CareDroidProduct = typeof CAREDROID_PRODUCT;
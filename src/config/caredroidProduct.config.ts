/**
 * Canonical CareDroid product identity.
 * External-facing copy must use CareDroid only — no alternate product names.
 */

export const CAREDROID_PRODUCT = Object.freeze({
  name: 'CareDroid',
  tagline: 'Emergency department operating platform',
  platformLine: 'Reception-first emergency department operations',
  copilotBadge: 'Copilot',
  copilotName: 'CareDroid Copilot',
  receptionName: 'Arrival Dashboard',
  receptionRoute: '/emergency/reception',
  receptionSummary:
    'Front-desk command center: see inbound ambulances before arrival, search, prepare patient cards, verify identity, and hand off to triage.',
  whiteboardName: 'Emergency Whiteboard',
  whiteboardRoute: '/emergency/whiteboard',
  safetyLine: 'Decision support only. Human review is required for clinical actions.',
  safetyShort: 'Human-reviewed decision support',
  whiteboardSummary:
    'Operational awareness for charge nurse, physician, and command-center displays after reception prepares each patient card.',
  roleFlowSummary:
    'Reception and registration prepare the patient card first; EMS, triage, charge, and bedside teams consume the shared ED operating picture.',
  copilotIntro:
    'CareDroid Copilot supports routing, context, evidence, and workflow prompts without making autonomous clinical decisions.',
  copilotRole:
    'Embedded CareDroid Copilot workflow layer — not an autonomous clinician.',
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
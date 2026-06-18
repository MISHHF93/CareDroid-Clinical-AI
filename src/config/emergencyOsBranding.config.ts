export const EMERGENCY_OS_BRANDING = Object.freeze({
  productName: 'Emergency OS',
  platformLine: 'Reception-first ED operations powered by AIIOS',
  aiiosName: 'AIIOS',
  copilotName: 'AIIOS ED Copilot',
  receptionName: 'Arrival Dashboard',
  receptionRoute: '/emergency/reception',
  receptionSummary:
    'Front-desk command center: see inbound ambulances before arrival, search, prepare patient cards, verify identity, and hand off to triage.',
  commandCenterName: 'Operations Board',
  commandCenterRoute: '/emergency/whiteboard',
  safetyLine: 'Decision support only. Human review is required for clinical actions.',
  safetyShort: 'Human-reviewed decision support',
  commandCenterSummary:
    'Operational awareness for charge nurse, physician, and command-center displays after reception prepares each patient card.',
  roleFlowSummary:
    'Reception and registration prepare the patient card first; EMS, triage, charge, and bedside teams consume the shared ED operating picture.',
  copilotIntro:
    'AIIOS ED Copilot supports routing, context, evidence, and workflow prompts without making autonomous clinical decisions.',
} as const);

export type EmergencyOsBranding = typeof EMERGENCY_OS_BRANDING;

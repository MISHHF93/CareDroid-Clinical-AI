export const EMERGENCY_OS_BRANDING = Object.freeze({
  productName: 'Emergency OS',
  platformLine: 'Emergency OS powered by AIIOS',
  aiiosName: 'AIIOS',
  copilotName: 'AIIOS ED Copilot',
  commandCenterName: 'Command Center',
  commandCenterRoute: '/emergency/command-center',
  safetyLine: 'Decision support only. Human review is required for clinical actions.',
  safetyShort: 'Human-reviewed decision support',
  commandCenterSummary:
    'Big-screen ED command center for department flow, EMS arrivals, reassessment risk, capacity pressure, and care team coordination.',
  roleFlowSummary:
    'Dispatcher, EMS, device telemetry, triage, charge, and bedside team inputs flow into one shared ED operating picture.',
  copilotIntro:
    'AIIOS ED Copilot supports routing, context, evidence, and workflow prompts without making autonomous clinical decisions.',
} as const);

export type EmergencyOsBranding = typeof EMERGENCY_OS_BRANDING;

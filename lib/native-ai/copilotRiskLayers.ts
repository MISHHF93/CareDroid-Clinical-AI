import type { CopilotRiskLayerId } from './types';

export type CopilotRiskLayerDefinition = {
  id: CopilotRiskLayerId;
  layer: 1 | 2 | 3 | 4 | 5;
  label: string;
  description: string;
  examples: string[];
  allowedInCoreProduct: boolean;
  requiresHumanReview: boolean;
  usesValidatedSpecialists: boolean;
  disclaimer: string;
};

export const COPILOT_RISK_LAYERS: CopilotRiskLayerDefinition[] = [
  {
    id: 'personal_productivity',
    layer: 1,
    label: 'Personal Productivity',
    description: 'Low-risk drafting for non-PHI or staff-only productivity tasks.',
    examples: ['Summarize a non-PHI operations memo', 'Draft break coverage checklist'],
    allowedInCoreProduct: true,
    requiresHumanReview: false,
    usesValidatedSpecialists: false,
    disclaimer: 'General-purpose assistant — not for clinical decisions.',
  },
  {
    id: 'team_operations',
    layer: 2,
    label: 'Team Operations',
    description: 'Operational coordination support for charge and reception teams.',
    examples: ['Draft staffing huddle notes', 'Summarize queue bottlenecks'],
    allowedInCoreProduct: true,
    requiresHumanReview: false,
    usesValidatedSpecialists: false,
    disclaimer: 'Operational support only — verify before acting.',
  },
  {
    id: 'documentation_support',
    layer: 3,
    label: 'Documentation Support',
    description: 'Note generation and chart structuring with mandatory human review.',
    examples: ['Draft triage note from structured inputs', 'Structure EMS handoff summary'],
    allowedInCoreProduct: true,
    requiresHumanReview: true,
    usesValidatedSpecialists: false,
    disclaimer: 'Documentation draft — clinician review required before charting.',
  },
  {
    id: 'clinical_decision_support',
    layer: 4,
    label: 'Clinical Decision Support',
    description: 'Validated specialist models, calculators, and pathway recommendations.',
    examples: ['HEART score support', 'Cardiac-vascular specialist routing', 'Admission likelihood signal'],
    allowedInCoreProduct: true,
    requiresHumanReview: true,
    usesValidatedSpecialists: true,
    disclaimer: 'Clinical decision support only — not a diagnosis. Staff confirmation required.',
  },
  {
    id: 'autonomous_tools',
    layer: 5,
    label: 'Autonomous Tools',
    description: 'Unvalidated autonomous clinical actions are blocked in CareDroid core.',
    examples: ['Auto-triage assignment', 'Autonomous discharge', 'Unreviewed order placement'],
    allowedInCoreProduct: false,
    requiresHumanReview: true,
    usesValidatedSpecialists: false,
    disclaimer: 'Autonomous clinical tools are not permitted in the core product.',
  },
];

export function getCopilotRiskLayer(id: CopilotRiskLayerId): CopilotRiskLayerDefinition {
  return COPILOT_RISK_LAYERS.find((layer) => layer.id === id) || COPILOT_RISK_LAYERS[0];
}

export function resolveCopilotLayerForCapability(capabilityId: string): CopilotRiskLayerDefinition {
  const lower = capabilityId.toLowerCase();
  if (lower.includes('autonomous') || lower.includes('auto_triage') || lower.includes('auto_discharge')) {
    return getCopilotRiskLayer('autonomous_tools');
  }
  if (
    lower.includes('admission') ||
    lower.includes('triage') ||
    lower.includes('specialist') ||
    lower.includes('calculator') ||
    lower.includes('cds')
  ) {
    return getCopilotRiskLayer('clinical_decision_support');
  }
  if (lower.includes('note') || lower.includes('document') || lower.includes('summary')) {
    return getCopilotRiskLayer('documentation_support');
  }
  if (lower.includes('queue') || lower.includes('staffing') || lower.includes('capacity')) {
    return getCopilotRiskLayer('team_operations');
  }
  return getCopilotRiskLayer('personal_productivity');
}
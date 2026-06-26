/**
 * Tier-B chat-assisted configuration for Wells PE (no dedicated Calculators.jsx form).
 * Consumed by clinicalIntentToolCatalog and chat launch flows.
 */

import { NLU, REGISTRY, TOOL_LAUNCH_PATHS } from '../clinicalToolIdContract';

export const WELLS_PE_TOOL_ID = NLU.wellsPe;

export const wellsPeChatConfig = {
  toolId: NLU.wellsPe,
  name: 'Wells PE',
  hubPath: TOOL_LAUNCH_PATHS.calculatorsHub,
  registryId: REGISTRY.wellsPe,
  category: 'calculator',
  description:
    'Wells pulmonary embolism rule — guided chat scoring for pre-test probability only (does not rule in or rule out PE).',
  /** Starter prompt for dashboard / catalog chat launch */
  chatSeed: `Help me calculate the Wells score for suspected pulmonary embolism using a guided step-by-step approach.

STEP 0 — Safety: If the patient is hemodynamically unstable, has arrest, or needs immediate resuscitation, activate emergency PE / critical-care pathways first. Do not delay urgent care to finish this chat.

Ask me about each criterion in turn:
1) Clinical signs or symptoms of DVT
2) Whether PE is the most likely diagnosis
3) Heart rate over 100/min
4) Immobilization ≥3 days or surgery in the past 4 weeks
5) Previous DVT or PE
6) Hemoptysis
7) Active malignancy

After collecting answers, compute the Wells PE score (with fractional points per the validated rule), report low / intermediate / high probability bands in plain language, and clearly state:
- This is clinical decision support only, not a diagnosis
- The score does not rule in or rule out pulmonary embolism
- Do not state that PE is "confirmed", "excluded", or "ruled out"
- Do not recommend a specific imaging study, anticoagulation, or disposition — refer to local PE pathways`,
  guidedCriteria: [
    'clinical signs of DVT',
    'PE most likely diagnosis',
    'heart rate > 100',
    'immobilization or recent surgery',
    'previous DVT or PE',
    'hemoptysis',
    'malignancy',
  ],
};

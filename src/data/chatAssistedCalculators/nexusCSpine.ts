/**
 * Tier-B chat-assisted configuration for NEXUS C-Spine Rule.
 * No dedicated Calculators.jsx form — guided workflow only.
 *
 * Rule logic: `src/utils/nexusCSpineCalculator.ts`.
 * Informational only — does not clear the c-spine or mandate imaging.
 */

import { NLU, REGISTRY, TOOL_LAUNCH_PATHS } from '../clinicalToolIdContract';

export const NEXUS_CSPINE_TOOL_ID = NLU.nexusCspine;

/** Product-required NLU phrases → `nexus-cspine` (also in `NLU_TO_REGISTRY_ID`). */
export const NEXUS_CSPINE_REQUIRED_NLU_ALIASES = Object.freeze([
  'nexus',
  'nexus c spine',
  'nexus c-spine',
  'nexus criteria',
  'nexus cervical spine',
  'c spine nexus',
]);

export const nexusCSpineChatConfig = {
  toolId: NLU.nexusCspine,
  name: 'NEXUS C-Spine Rule',
  hubPath: TOOL_LAUNCH_PATHS.calculatorsHub,
  registryId: REGISTRY.nexusCspine,
  category: 'calculator',
  description:
    'NEXUS criteria for cervical spine imaging in blunt trauma (clinical decision support only; not c-spine clearance).',
  chatSeed: `Help me apply the NEXUS C-Spine Rule using a structured step-by-step workflow for a patient with blunt trauma and possible cervical spine injury.

STEP 0 — Applicability and emergencies (must confirm before using the rule)
- Blunt trauma context with possible cervical spine injury being considered for imaging
- STOP for full trauma evaluation without delay if any are present: hemodynamic instability, GCS <15, suspected spinal cord injury with new focal neurologic deficit requiring urgent intervention, penetrating neck injury, or need for urgent intubation/resuscitation — NEXUS must not delay primary survey, immobilisation, or urgently indicated imaging
- Confirm the patient is not so unstable that the rule should not be used to defer appropriate trauma care
- Note: NEXUS was studied in selected blunt trauma populations — document if the presentation is outside typical validation (e.g. unreliable exam not solely due to listed criteria)

STEP 1 — Collect each NEXUS criterion (ask one at a time)
1) Midline cervical spine tenderness on palpation? (present vs absent)
2) Intoxication affecting reliable examination? (present vs absent)
3) Focal neurologic deficit? (present vs absent)
4) Distracting painful injury? (present vs absent)
5) Alertness — is alertness normal (patient reliably conversant and oriented for exam)?

STEP 2 — Apply the rule
- Low-risk by NEXUS only if ALL are absent: no midline tenderness, no intoxication, no focal neurologic deficit, no distracting injury, and normal alertness
- If ANY criterion is present → not in the NEXUS low-risk stratum (imaging was obtained in the derivation cohort when criteria were not all absent)

State clearly:
- Trauma imaging decision support only — does not "clear" the cervical spine and does not rule out injury with absolute certainty
- Does not mandate or defer cervical spine radiography or CT — does not override clinician judgment or institutional trauma protocols
- Do not tell the user to defer primary trauma survey, resuscitation, or urgent imaging when clinically warranted
- Do not state that imaging is "required", "unnecessary", "avoided", or "not indicated" as a directive based on this chat alone
- High negative predictive value in validation does not equal zero miss rate

Reference: Hoffman JR, et al. N Engl J Med. 2000;343(2):94–99 (NEXUS criteria).`,
  guidedSteps: [
    'applicability',
    'midline tenderness',
    'intoxication',
    'neurologic deficit',
    'distracting injury',
    'alertness',
  ],
};

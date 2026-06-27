/**
 * Tier-B chat-assisted configuration for Canadian C-Spine Rule (CCR).
 * No dedicated Calculators.jsx form — guided workflow only.
 *
 * Rule logic: `src/utils/canadianCSpineCalculator.ts` (high/low-risk, ROM 45°, applicability).
 * Informational chat-assisted only unless local governance approves executable trauma workflow.
 */

import { NLU, REGISTRY, TOOL_LAUNCH_PATHS } from '../clinicalToolIdContract';

export const CANADIAN_C_SPINE_TOOL_ID = NLU.canadianCSpine;

/** Product-required NLU phrases → `canadian-c-spine` (also in `NLU_TO_REGISTRY_ID`). */
export const CANADIAN_C_SPINE_REQUIRED_NLU_ALIASES = Object.freeze([
  'canadian c spine',
  'canadian c-spine rule',
  'c spine rule',
  'cervical spine rule',
  'neck trauma imaging rule',
]);

export const canadianCSpineChatConfig = {
  toolId: NLU.canadianCSpine,
  name: 'Canadian C-Spine Rule',
  hubPath: TOOL_LAUNCH_PATHS.calculatorsHub,
  registryId: REGISTRY.canadianCSpine,
  category: 'calculator',
  description:
    'Canadian C-Spine Rule — cervical imaging decision support for alert, stable blunt trauma (clinical decision support only; not c-spine clearance).',
  chatSeed: `Help me apply the Canadian C-Spine Rule (CCR) using a structured step-by-step workflow for an alert, stable adult with blunt neck trauma.

STEP 0 — Applicability and emergencies (must confirm before using the rule)
- Patient is alert and stable (GCS 15, hemodynamically stable on assessment)
- Blunt trauma context with possible cervical spine concern
- STOP for full trauma evaluation without delay if any are present: hemodynamic instability, GCS <15, suspected spinal cord injury or new focal neurologic deficit, midline tenderness with neurologic signs, penetrating neck injury, or need for urgent intubation/resuscitation — CCR must not delay primary survey, immobilisation decisions, or urgently indicated imaging
- Confirm this is not an unstable patient, intubated patient, or clearly unreliable exam (intoxication, uncooperative, distracting injury preventing assessment) — if not applicable, stop and state that CCR must not be used; proceed with full trauma evaluation per local protocol
- Note: validated cohort is typically adults; pediatric patients may require different rules — document if age <16

STEP 1 — High-risk factors (if ANY are present, cervical spine imaging is indicated by the rule)
Ask about each:
1) Age 65 years or older
2) Dangerous mechanism (e.g. fall from elevation ≥3 ft/5 stairs, axial load to head, high-speed MVC, rollover, ejection, motorized recreation, bicycle struck)
3) Paresthesias in the extremities

STEP 2 — Low-risk factors (ALL must be present to proceed to active range-of-motion assessment)
Only ask if NO high-risk factors:
1) Simple rear-end motor vehicle collision (not pushed into traffic, not struck by bus/large truck, no rollover, not high-speed, vehicle drivable)
2) Patient sitting in the emergency department at assessment
3) Ambulatory at any time since the accident
4) Onset of neck pain was delayed (not immediate at time of collision)
5) No midline cervical spine tenderness on examination
6) No distracting painful injury

STEP 3 — Active range of motion (only if ALL low-risk factors are met)
- Can the patient actively rotate the neck 45 degrees to the left AND 45 degrees to the right?

After collecting answers, apply the rule:
- Any high-risk factor → imaging indicated by CCR
- No high-risk and not all low-risk → imaging indicated by CCR
- No high-risk, all low-risk, and 45° rotation both sides → imaging NOT indicated by CCR (may assess ROM clinically per local protocol)
- No high-risk, all low-risk, but cannot rotate 45° both ways → imaging indicated by CCR

State clearly:
- This is imaging decision support only — it does not "clear" the cervical spine and does not rule out injury with absolute certainty
- CCR must not be used for unstable patients or when it would delay primary trauma survey, resuscitation, or urgent imaging when clinically warranted
- Do not override clinician judgment or institutional trauma protocols
- Do not tell the user to defer all trauma evaluation to finish this chat
- High negative predictive value in validation does not equal zero miss rate — document shared decision-making
- Remain informational unless your institution has governed workflows for chat-assisted trauma imaging decisions

Reference: Stiell IG, et al. JAMA. 2001;286(15):1841–1848 (Canadian C-spine rule).`,
  guidedSteps: ['applicability', 'high-risk factors', 'low-risk factors', 'active ROM 45°'],
};

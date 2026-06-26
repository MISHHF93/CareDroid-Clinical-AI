/**
 * Tier-B chat-assisted configuration for PECARN pediatric head injury rule.
 * No dedicated Calculators.jsx form — guided workflow only.
 *
 * Rule logic: `src/utils/pecarnHeadCalculator.js`.
 * Informational only — does not recommend CT or override clinical judgment.
 */

import { NLU, REGISTRY, TOOL_LAUNCH_PATHS } from '../clinicalToolIdContract';

export const PECARN_HEAD_TOOL_ID = NLU.pecarnHead;

/** Product-required NLU phrases → `pecarn-head` (also in `NLU_TO_REGISTRY_ID`). */
export const PECARN_HEAD_REQUIRED_NLU_ALIASES = Object.freeze([
  'pecarn',
  'pecarn head',
  'pecarn head injury',
  'pediatric head ct',
  'pediatric head injury rule',
  'child head trauma ct',
]);

export const pecarnHeadChatConfig = {
  toolId: NLU.pecarnHead,
  name: 'PECARN Head Injury Rule',
  hubPath: TOOL_LAUNCH_PATHS.calculatorsHub,
  registryId: REGISTRY.pecarnHead,
  category: 'calculator',
  description:
    'PECARN pediatric head injury rule — CT decision support for minor blunt head trauma (informational only; does not recommend imaging or override clinical judgment).',
  chatSeed: `Help me apply the PECARN pediatric head injury clinical decision rule using a structured step-by-step workflow for a child with blunt head trauma.

STEP 0 — Emergencies and applicability (must confirm before using the rule)
- Patient is a child with blunt head trauma being considered for head CT vs observation
- STOP and prioritize emergency care without delay if any are present: GCS ≤8, signs of herniation, active seizures, hemodynamic instability, penetrating skull injury, suspected non-accidental trauma requiring immediate safeguarding evaluation, or need for urgent resuscitation — PECARN must not delay emergency treatment or neurosurgical consultation
- Confirm injury is within the intended minor blunt head trauma context (not already known intracranial injury on imaging)
- Document age category first: younger than 2 years vs 2 years and older (typically through late adolescence in validation)

STEP 1 — Collect inputs (ask one domain at a time)
1) Age category (<2 years vs ≥2 years)
2) Mental status — GCS <15 or altered mental status on exam?
3) Loss of consciousness — for <2 years: >5 seconds; for ≥2 years: document for context (not a standalone ≥2y PECARN criterion)
4) Vomiting — for ≥2 years only (PECARN criterion)
5) Severe or worsening mechanism (e.g. MVC with patient ejection/death, fall >3 ft / 5 stairs, high-impact object, pedestrian/bicycle without helmet)
6) Skull fracture signs — <2 years: palpable skull fracture; ≥2 years: signs of basilar skull fracture

STEP 2 — Apply the age-appropriate PECARN criteria
- <2 years: criteria include GCS <15/AMS, palpable skull fracture, severe mechanism, LOC >5 s
- ≥2 years: criteria include GCS <15/AMS, basilar skull fracture signs, vomiting, severe mechanism

After collecting answers, state:
- Which criteria (if any) are present
- Whether the patient falls in the higher-risk or lower-risk stratum per PECARN validation literature
State clearly:
- Informational pediatric head CT decision support only — does not recommend for or against head CT, hospitalization, or discharge
- Does not rule out clinically important traumatic brain injury with certainty in any stratum
- Do not tell the user that CT is "required", "not needed", "avoided", or "unnecessary" based on this chat alone
- Do not override clinician judgment, parental preference, serial observation protocols, or institutional pediatric trauma pathways
- High negative predictive value in validation does not equal zero miss rate

Reference: Kuppermann N, et al. Lancet. 2009;374(9696):1160–1170 (PECARN head injury rule).`,
  guidedSteps: [
    'applicability',
    'age category',
    'mental status',
    'loss of consciousness',
    'vomiting (≥2y)',
    'severe mechanism',
    'skull fracture signs',
  ],
};

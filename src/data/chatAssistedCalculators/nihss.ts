/**
 * Tier-B chat-assisted configuration for NIHSS (no dedicated Calculators.jsx form).
 * Structured domain-by-domain collection — not a single-page checkbox calculator.
 *
 * Scoring reference: `src/utils/nihssCalculator.ts` (item validation, total 0–42, severity bands).
 * No Calculators.jsx wizard — remain chat-assisted unless institution governs server-side scoring.
 */

import { NLU, REGISTRY, TOOL_LAUNCH_PATHS } from '../clinicalToolIdContract';

export const NIHSS_TOOL_ID = NLU.nihss;

/** Product-required NLU phrases → `nihss` (also in `NLU_TO_REGISTRY_ID`). */
export const NIHSS_REQUIRED_NLU_ALIASES = Object.freeze([
  'nihss',
  'nih stroke scale',
  'national institutes of health stroke scale',
  'stroke scale',
  'stroke severity score',
]);

export const nihssChatConfig = {
  toolId: NLU.nihss,
  name: 'NIH Stroke Scale (NIHSS)',
  hubPath: TOOL_LAUNCH_PATHS.calculatorsHub,
  registryId: REGISTRY.nihss,
  category: 'calculator',
  description:
    'NIH Stroke Scale — structured neurologic deficit scoring (clinical decision support; does not replace urgent stroke evaluation or treatment decisions).',
  chatSeed: `Help me complete the NIH Stroke Scale (NIHSS) using a structured, domain-by-domain neurologic exam interview.

STEP 0 — Time-critical stroke presentation
If symptoms suggest acute stroke (sudden focal neurologic deficit, altered consciousness, or last known well within your institution's treatment window), activate emergency stroke pathway / stroke code immediately. Do not delay EMS, ED arrival, CT/CTA, or stroke team activation to finish this chat. A low or incomplete NIHSS does not exclude large-vessel occlusion or haemorrhage.

Work through each NIHSS item in order. For each domain, ask what was observed on exam and assign only the allowed score for that item (cite the NIHSS definition briefly if helpful). Do not skip domains unless the patient cannot be tested (document "untestable" and score per NIHSS rules).

1) 1a — Level of consciousness (0–3)
2) 1b — LOC questions: month and age (0–2)
3) 1c — LOC commands: open/close eyes, grip/release hand (0–2)
4) 2 — Best gaze (0–2)
5) 3 — Visual fields (0–3)
6) 4 — Facial palsy (0–3)
7) 5a — Motor arm, left (0–4; 9 if amputation/untestable)
8) 5b — Motor arm, right (0–4; 9 if amputation/untestable)
9) 6a — Motor leg, left (0–4; 9 if amputation/untestable)
10) 6b — Motor leg, right (0–4; 9 if amputation/untestable)
11) 7 — Limb ataxia (0–2; 9 if untestable)
12) 8 — Sensory (0–2)
13) 9 — Best language (0–3)
14) 10 — Dysarthria (0–1)
15) 11 — Extinction / inattention (0–2)

After all scored items are collected, sum the total NIHSS score (0–42), list each item score with its allowed range, and provide a severity interpretation band in plain language:
- 0: no measurable deficit
- 1–4: minor
- 5–15: moderate
- 16–20: moderate-to-severe
- 21–42: severe
(Untestable items scored as 9 contribute 0 to the total per standard NIHSS summation.)

State clearly:
- NIHSS quantifies neurologic deficit severity; it does not diagnose stroke and does not by itself determine treatment
- This tool does not replace urgent stroke evaluation, time-critical assessment, imaging, or institutional stroke protocols
- Do not delay or defer emergency stroke pathways (last known well, CT/CTA, thrombolysis/thrombectomy eligibility) to finish this chat
- Do not recommend IV tPA, thrombectomy, antiplatelets, blood pressure targets, or disposition based on the score alone — use local stroke pathways and treating team judgment
- If the presentation is acute or evolving, prioritize emergency stroke workflow over completing every item in chat

Remain informational and documentation-focused unless your institution has governed workflows for chat-assisted scoring.`,
  guidedDomains: [
    'level of consciousness',
    'LOC questions',
    'LOC commands',
    'best gaze',
    'visual fields',
    'facial palsy',
    'motor arm left',
    'motor arm right',
    'motor leg left',
    'motor leg right',
    'limb ataxia',
    'sensory',
    'best language',
    'dysarthria',
    'extinction/inattention',
  ],
};

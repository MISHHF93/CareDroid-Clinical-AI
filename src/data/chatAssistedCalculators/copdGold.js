/**
 * Tier-B chat-assisted configuration for COPD GOLD grouping (no dedicated Calculators.jsx form).
 * Supports GOLD A/B/E grouping from symptom burden and exacerbation history — not pharmacotherapy.
 */

export const COPD_GOLD_TOOL_ID = 'copd-gold';

export const copdGoldChatConfig = {
  toolId: COPD_GOLD_TOOL_ID,
  name: 'COPD GOLD',
  hubPath: '/tools/calculators',
  registryId: COPD_GOLD_TOOL_ID,
  category: 'calculator',
  description:
    'COPD GOLD grouping support from symptoms and exacerbation history (decision support only; does not diagnose COPD or recommend inhalers).',
  chatSeed: `Help me apply COPD GOLD grouping using a guided step-by-step approach for symptom burden and exacerbation history.

STEP 0 — Urgent presentations (address before grouping)
STOP and prioritise emergency or acute care if any are present: severe respiratory distress, new hypoxemia requiring urgent oxygen assessment, altered mental status, suspected pneumothorax, sepsis, or an acute exacerbation needing immediate treatment per local protocols. State clearly that acute COPD exacerbation management takes priority and this conversation must not delay urgent evaluation or treatment.

Collect the following in turn (confirm the look-back period, usually the past 12 months unless the user specifies otherwise):

1) Symptom burden — use whichever the clinician has available:
   - mMRC dyspnea grade (0–4), OR
   - COPD Assessment Test (CAT) total score (0–40), OR
   - A structured clinical summary (e.g. "few daily symptoms" vs "frequent dyspnea limiting activities")
   Classify as FEWER symptoms (mMRC 0–1 or CAT <10) vs MORE symptoms (mMRC ≥2 or CAT ≥10).

2) Exacerbation history in the past year:
   - Number of moderate exacerbations (antibiotic and/or oral steroid courses for COPD worsening)
   - Number of severe exacerbations (ED visit or hospital admission for COPD)

3) Hospitalization history for COPD:
   - Any COPD-related hospitalization in the past year (yes/no; count if known)

After inputs are collected, report GOLD grouping support using the current A / B / E framework:
- Group A: fewer symptoms AND low exacerbation risk (0–1 moderate exacerbations and no severe exacerbation/hospitalization)
- Group B: more symptoms AND low exacerbation risk
- Group E: high exacerbation risk (≥2 moderate exacerbations in a year OR ≥1 severe exacerbation/hospitalization), regardless of symptom level

State clearly in plain language:
- This is COPD GOLD grouping support only, not a diagnosis of COPD
- GOLD grouping informs longitudinal management discussions; it does not by itself establish airflow obstruction — post-bronchodilator spirometry (FEV₁/FVC) is required for spirometric GOLD grades 1–4 when not already documented
- Do NOT recommend specific medications, inhalers (e.g. LABA, LAMA, ICS), triple therapy, doses, or devices
- Do NOT suggest starting, stopping, or escalating therapy — refer to clinician judgment and local COPD pathways
- All outputs require review by a qualified clinician; institutional protocols govern treatment
- If inputs are uncertain or incomplete, state limitations and avoid overstating precision

Use institutional COPD pathways for treatment decisions. Do not delay urgent exacerbation care to finish this chat.`,
  guidedCriteria: [
    'symptom burden (mMRC or CAT)',
    'moderate exacerbation count',
    'severe exacerbation / hospitalization history',
  ],
};

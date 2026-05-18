/**
 * Tier-B chat-assisted configuration for GRACE ACS (no dedicated Calculators.jsx form).
 *
 * Scoring logic: `src/utils/graceAcsCalculator.js` (GRACE 2.0 admission logistic models).
 * Tier C (`grace-acs-calculator` executor): deferred — evaluate if server attestation or API
 * integrators require POST /tools/:id/execute; client utils are sufficient for validated math.
 */

export const GRACE_ACS_TOOL_ID = 'grace-acs';

/** Product-required NLU phrases → `grace-acs` (also in `NLU_TO_REGISTRY_ID`). */
export const GRACE_ACS_REQUIRED_NLU_ALIASES = Object.freeze([
  'grace',
  'grace score',
  'grace acs',
  'acs mortality risk',
  'acute coronary syndrome risk',
]);

export const graceAcsChatConfig = {
  toolId: GRACE_ACS_TOOL_ID,
  name: 'GRACE ACS Risk',
  hubPath: '/tools/calculators',
  registryId: GRACE_ACS_TOOL_ID,
  category: 'calculator',
  description:
    'GRACE ACS mortality risk stratification — in-hospital and 6-month estimates (clinical decision support only; not a diagnosis of ACS).',
  chatSeed: `Help me estimate GRACE ACS risk using a guided step-by-step approach for acute coronary syndrome risk stratification support.

STEP 0 — Unstable ACS and emergencies (address before completing GRACE)
STOP and prioritise emergency care if any are present: ongoing ischemic chest pain with hemodynamic instability, cardiogenic shock, sustained ventricular arrhythmia, acute pulmonary oedema, cardiac arrest, or suspected STEMI requiring urgent reperfusion. State clearly that local ACS/STEMI and resuscitation pathways take priority and this conversation must not delay activation of emergency care, cath lab, or critical care.

Collect these admission variables in turn (confirm units: creatinine in mg/dL or µmol/L):
1) Age (years)
2) Heart rate (beats/min)
3) Systolic blood pressure (mmHg)
4) Serum creatinine (mg/dL or µmol/L — convert if needed)
5) Killip class (I–IV; document how class was assigned)
6) Cardiac arrest at admission (yes/no)
7) ST-segment deviation on the admission ECG (yes/no)
8) Elevated cardiac enzymes / necrosis biomarkers (yes/no)

After all inputs are collected, apply the validated GRACE 2.0 admission logistic model (GRACE ACS risk score) to estimate:
1) In-hospital mortality risk (%)
2) Mortality from discharge to 6 months (%)
3) Risk category from the 6-month estimate: low if <3%, intermediate if 3–8%, high if >8%

State clearly in plain language:
- This is ACS risk stratification support only, not a diagnosis of acute coronary syndrome
- GRACE estimates prognosis; it does not confirm or exclude ACS, and must not be read as diagnostic certainty
- Do not recommend specific treatments (antiplatelets, anticoagulation, invasive strategy, thrombolysis, discharge, or cath lab activation) — refer to clinician judgment and local ACS pathways
- Mortality percentages are population-derived estimates for discussion and documentation, not individual guarantees
- If any input is uncertain or missing, say so and avoid overstating precision
- High estimated mortality does not by itself mandate a specific invasive strategy; low estimates do not prove safety for discharge — clinician judgment and pathways apply

Use institutional ACS protocols and clinician interpretation for management decisions. Do not delay emergency ACS care to finish this chat.

Reference: GRACE / GRACE 2.0 — Global Registry of Acute Coronary Events (Fox KAA et al., BMJ 2006; updated GRACE 2.0 admission models).`,
  guidedCriteria: [
    'age',
    'heart rate',
    'systolic blood pressure',
    'creatinine',
    'Killip class',
    'cardiac arrest at admission',
    'ST-segment deviation',
    'elevated cardiac enzymes',
  ],
};

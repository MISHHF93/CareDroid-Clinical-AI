/**
 * Tier-B chat-assisted configuration for GRACE ACS (no dedicated Calculators.jsx form).
 * Tier C backend executor: not enabled — evaluate shared graceAcsCalculator.js for a future orchestrator.
 */

export const GRACE_ACS_TOOL_ID = 'grace-acs';

export const graceAcsChatConfig = {
  toolId: GRACE_ACS_TOOL_ID,
  name: 'GRACE ACS',
  hubPath: '/tools/calculators',
  registryId: GRACE_ACS_TOOL_ID,
  category: 'calculator',
  description:
    'GRACE ACS risk stratification — mortality estimates for acute coronary syndrome (decision support only; not a diagnosis).',
  chatSeed: `Help me estimate GRACE ACS risk using a guided step-by-step approach for acute coronary syndrome risk stratification.

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

After all inputs are collected, compute GRACE 2.0–style estimated mortality risks (in-hospital death and death from discharge to 6 months, as percentages) using the validated logistic model, and report a risk category (low / intermediate / high) based on the 6-month mortality estimate.

State clearly in plain language:
- This is ACS risk stratification support only, not a diagnosis of acute coronary syndrome
- GRACE estimates prognosis; it does not confirm or exclude ACS, and must not be read as diagnostic certainty
- Do not recommend specific treatments (antiplatelets, anticoagulation, invasive strategy, thrombolysis, discharge, or cath lab activation) — refer to clinician judgment and local ACS pathways
- Mortality percentages are population-derived estimates for discussion and documentation, not individual guarantees
- If any input is uncertain or missing, say so and avoid overstating precision
- High estimated mortality does not by itself mandate a specific invasive strategy; low estimates do not prove safety for discharge — clinician judgment and pathways apply

Use institutional ACS protocols for management decisions. Do not delay emergency ACS care to finish this chat.`,
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

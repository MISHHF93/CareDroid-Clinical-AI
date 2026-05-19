/**
 * Catalog of clinical tools the NLU layer can recognize (mirrors backend patterns).
 * Keep in sync with:
 * - backend/.../intent-classifier/patterns/tool.patterns.ts (toolId + keywords)
 * - src/data/clinicalToolAliasSync.js (catalog alias drift tests)
 * - src/data/clinicalToolIdContract.js (NLU_TO_REGISTRY_ID precise aliases)
 */

import { graceAcsChatConfig } from './chatAssistedCalculators/graceAcs';
import { canadianCSpineChatConfig } from './chatAssistedCalculators/canadianCSpine';
import { ottawaAnkleChatConfig } from './chatAssistedCalculators/ottawaAnkle';
import { nihssChatConfig } from './chatAssistedCalculators/nihss';
import { percChatConfig } from './chatAssistedCalculators/perc';
import { wellsPeChatConfig } from './chatAssistedCalculators/wellsPe';
import { copdGoldChatConfig } from './chatAssistedCalculators/copdGold';
import { romeIvIbsChatConfig } from './chatAssistedCalculators/romeIvIbs';
import { dispatchAiChatConfig } from './chatAssistedFleet/dispatchAi';
import { ensureChatSeedGuardrails } from './clinicalSafetyGuardrails';
import { NLU, REGISTRY, TOOL_LAUNCH_PATHS } from './clinicalToolIdContract';

const clinicalIntentToolsRaw = [
  {
    toolId: NLU.sofaCalculator,
    toolName: 'SOFA Score Calculator',
    category: 'calculator',
    description:
      'Sequential Organ Failure Assessment (ICU sepsis / organ dysfunction) — clinical decision support only; does not diagnose sepsis or direct therapy.',
    path: '/tools/calculator/sofa',
    sidebarToolId: REGISTRY.sofaScore,
    backendExecutable: true,
  },
  {
    toolId: NLU.qsofa,
    toolName: 'qSOFA (quick SOFA)',
    category: 'calculator',
    description:
      'Bedside screening: RR ≥22/min, SBP ≤100 mmHg, altered mentation or GCS <15. Score ≥2 suggests higher risk of poor outcome in suspected infection (Sepsis-3).',
    path: '/tools/calculators/qsofa',
    sidebarToolId: 'qsofa',
    chatSeed:
      'Help me apply qSOFA for suspected infection using respiratory rate, blood pressure, and mentation / GCS.',
    backendExecutable: false,
  },
  {
    toolId: 'news2',
    toolName: 'NEWS2 (National Early Warning Score 2)',
    category: 'calculator',
    description:
      'RCP NEWS2: RR, SpO₂ (Scale 1 or 2), supplemental oxygen, systolic BP, pulse, consciousness, temperature — total score and escalation band.',
    path: '/tools/calculators/news2',
    sidebarToolId: 'news2',
    chatSeed:
      'Help me calculate and interpret NEWS2 from respiratory rate, SpO₂ (and which SpO₂ scale), oxygen use, blood pressure, pulse, consciousness, and temperature.',
    backendExecutable: false,
  },
  {
    toolId: 'child-pugh',
    toolName: 'Child-Pugh score',
    category: 'calculator',
    description:
      'Cirrhosis severity (Child–Turcotte–Pugh): bilirubin, albumin, INR or PT prolongation, ascites, hepatic encephalopathy — total 5–15 and class A/B/C.',
    path: '/tools/calculators/child-pugh',
    sidebarToolId: 'child-pugh',
    chatSeed:
      'Help me calculate Child-Pugh from bilirubin, albumin, INR or PT prolongation, ascites, and hepatic encephalopathy.',
    backendExecutable: false,
  },
  {
    toolId: 'has-bled',
    toolName: 'HAS-BLED score',
    category: 'calculator',
    description:
      'Bleeding-risk factors (0–9) when anticoagulation is considered, e.g. in atrial fibrillation; score ≥3 suggests higher bleeding risk warranting closer review.',
    path: '/tools/calculators/has-bled',
    sidebarToolId: 'has-bled',
    chatSeed:
      'Help me score HAS-BLED for bleeding risk: hypertension, renal/liver dysfunction, stroke, bleeding history, labile INR, age over 65, predisposing drugs, and alcohol.',
    backendExecutable: false,
  },
  {
    toolId: 'meld',
    toolName: 'MELD score',
    category: 'calculator',
    description:
      'Model for End-stage Liver Disease: total bilirubin, INR, creatinine (dialysis rule) — 6–40 severity index for chronic liver disease.',
    path: '/tools/calculators/meld',
    sidebarToolId: 'meld',
    chatSeed:
      'Help me calculate MELD from bilirubin, INR, and creatinine (including dialysis if applicable) and interpret short-term mortality context.',
    backendExecutable: false,
  },
  {
    toolId: 'meld-na',
    toolName: 'MELD-Na score',
    category: 'calculator',
    description:
      'MELD with UNOS sodium adjustment (MELD-Na) for hyponatremia in chronic liver disease — laboratory MELD plus serum sodium.',
    path: '/tools/calculators/meld-na',
    sidebarToolId: 'meld-na',
    chatSeed:
      'Help me calculate MELD-Na from bilirubin, INR, creatinine, and serum sodium per UNOS rules.',
    backendExecutable: false,
  },
  {
    toolId: 'timi-ua-nstemi',
    toolName: 'TIMI risk score (UA/NSTEMI)',
    category: 'calculator',
    description:
      'TIMI for unstable angina / NSTEMI: age, CAD risk factors, known CAD, aspirin, severe angina, ST deviation, elevated cardiac markers (0–7).',
    path: '/tools/calculators/timi-ua-nstemi',
    sidebarToolId: 'timi-ua-nstemi',
    chatSeed:
      'Help me calculate the TIMI risk score for UA/NSTEMI using age, risk factors, known CAD, aspirin use, angina severity, ST deviation, and cardiac markers.',
    backendExecutable: false,
  },
  {
    toolId: 'ascvd-risk',
    toolName: 'ASCVD 10-year risk (PCE)',
    category: 'calculator',
    description:
      'Decision support: ACC/AHA pooled cohort equations for primary prevention ASCVD risk (age 40–79). Does not recommend statins or other therapies.',
    path: '/tools/calculators/ascvd-risk',
    sidebarToolId: 'ascvd-risk',
    chatSeed:
      'Help me estimate 10-year ASCVD risk using the pooled cohort equations (age, sex, race, lipids, blood pressure, diabetes, smoking) and interpret the risk category for prevention discussion.',
    backendExecutable: false,
  },
  {
    toolId: 'ckd-staging',
    toolName: 'CKD staging (KDIGO)',
    category: 'calculator',
    description:
      'Decision support: KDIGO CKD stage and staging (CKD-EPI 2021 eGFR, ACR, G×A prognostic risk). Does not establish chronicity or recommend dialysis or drug therapy.',
    path: '/tools/calculators/ckd-staging',
    sidebarToolId: 'ckd-staging',
    chatSeed:
      'Help me stage CKD using age, sex, serum creatinine, and urine albumin-creatinine ratio — eGFR category, albuminuria category, and KDIGO combined risk for discussion.',
    backendExecutable: false,
  },
  {
    toolId: 'stop-bang',
    toolName: 'STOP-Bang (OSA screening)',
    category: 'calculator',
    description:
      'STOP-Bang (stop bang) questionnaire for obstructive sleep apnea screening: snoring, tiredness, observed apnea, hypertension, BMI, age, neck size, male sex (0–8).',
    path: '/tools/calculators/stop-bang',
    sidebarToolId: 'stop-bang',
    chatSeed:
      'Help me complete the STOP-Bang questionnaire for obstructive sleep apnea screening and interpret the OSA risk category.',
    backendExecutable: false,
  },
  {
    toolId: 'audit-c',
    toolName: 'AUDIT-C (alcohol screen)',
    category: 'calculator',
    description:
      'Screening only: AUDIT-C brief alcohol consumption screen (0–12). Does not diagnose alcohol use disorder or provide withdrawal-management advice.',
    path: '/tools/calculators/audit-c',
    sidebarToolId: 'audit-c',
    chatSeed:
      'Help me complete the AUDIT-C alcohol screen (drinking frequency, drinks per day, binge frequency) and interpret the score against screening thresholds.',
    backendExecutable: false,
  },
  {
    toolId: 'phq9',
    toolName: 'PHQ-9 (depression screen)',
    category: 'calculator',
    description:
      'Screening only: PHQ-9 depression symptom questionnaire (0–27). Does not diagnose depression or recommend medications. Question 9 requires urgent safety review when non-zero.',
    path: '/tools/calculators/phq9',
    sidebarToolId: 'phq9',
    chatSeed:
      'STEP 0 — Before routine scoring: if PHQ-9 question 9 (self-harm or suicidal ideation) is non-zero, stop screening, arrange immediate safety assessment, and ensure crisis resources (e.g. 988 Suicide & Crisis Lifeline in the U.S. when applicable). Then help me complete the PHQ-9 mood screen (nine questions, past two weeks) and interpret the total score and severity range as screening only — do not diagnose depression or recommend medications.',
    backendExecutable: false,
  },
  {
    toolId: 'gad7',
    toolName: 'GAD-7 (anxiety screen)',
    category: 'calculator',
    description:
      'Screening only: GAD-7 anxiety symptom questionnaire (0–21). Does not diagnose anxiety disorders or recommend medications.',
    path: '/tools/calculators/gad7',
    sidebarToolId: 'gad7',
    chatSeed:
      'STEP 0 — Before routine scoring: if suicidal thoughts, self-harm, or immediate safety concerns are present, stop screening, arrange immediate safety assessment, and ensure crisis resources (e.g. 988 Suicide & Crisis Lifeline in the U.S. when applicable; emergency services if in immediate danger). Then help me complete the GAD-7 anxiety screen (seven questions, past two weeks) and interpret the total score and severity range as screening only — do not diagnose an anxiety disorder or recommend medications. For moderate or severe scores, acute panic, or overwhelming distress, emphasize timely or urgent clinical evaluation without diagnosing or recommending treatment.',
    backendExecutable: false,
  },
  {
    toolId: 'apache2-calculator',
    toolName: 'APACHE-II Score',
    category: 'calculator',
    description: 'ICU mortality prediction (chat-assisted; no dedicated form yet).',
    path: '/tools/calculators',
    sidebarToolId: 'calculators',
    chatSeed:
      'Help me estimate an APACHE-II score. I will provide age, vitals, labs, and GCS as available.',
    backendExecutable: false,
  },
  {
    toolId: 'cha2ds2vasc-calculator',
    toolName: 'CHA2DS2-VASc Score',
    category: 'calculator',
    description:
      'Stroke risk in non-valvular atrial fibrillation — clinical decision support only; does not recommend starting, stopping, or switching anticoagulation.',
    path: '/tools/calculator/chads2vasc',
    sidebarToolId: 'calc-chads2vasc',
    backendExecutable: false,
  },
  {
    toolId: 'curb65-calculator',
    toolName: 'CURB-65 Score',
    category: 'calculator',
    description: 'CAP severity (chat-assisted; no dedicated form yet).',
    path: '/tools/calculators',
    sidebarToolId: 'calculators',
    chatSeed:
      'Help me apply CURB-65 for pneumonia severity using confusion, urea, RR, BP, and age.',
    backendExecutable: false,
  },
  {
    toolId: 'gcs-calculator',
    toolName: 'Glasgow Coma Scale',
    category: 'calculator',
    description: 'Level of consciousness scoring (chat-assisted).',
    path: '/tools/calculators',
    sidebarToolId: 'calculators',
    chatSeed:
      'Help me score and interpret the Glasgow Coma Scale from eye, verbal, and motor responses.',
    backendExecutable: false,
  },
  {
    toolId: 'wells-dvt-calculator',
    toolName: 'Wells DVT Score',
    category: 'calculator',
    description: 'Pre-test probability for DVT (chat-assisted).',
    path: '/tools/calculators',
    sidebarToolId: 'calculators',
    chatSeed: 'Help me complete a Wells score for suspected DVT using my clinical findings.',
    backendExecutable: false,
  },
  {
    toolId: wellsPeChatConfig.toolId,
    toolName: 'Wells PE Score',
    category: wellsPeChatConfig.category,
    description: wellsPeChatConfig.description,
    path: wellsPeChatConfig.hubPath,
    sidebarToolId: wellsPeChatConfig.registryId,
    chatSeed: wellsPeChatConfig.chatSeed,
    backendExecutable: false,
  },
  {
    toolId: percChatConfig.toolId,
    toolName: 'PERC (PE rule-out criteria)',
    category: percChatConfig.category,
    description: percChatConfig.description,
    path: percChatConfig.hubPath,
    sidebarToolId: percChatConfig.registryId,
    chatSeed: percChatConfig.chatSeed,
    backendExecutable: false,
  },
  {
    toolId: graceAcsChatConfig.toolId,
    toolName: graceAcsChatConfig.name,
    category: graceAcsChatConfig.category,
    description: graceAcsChatConfig.description,
    path: graceAcsChatConfig.hubPath,
    sidebarToolId: graceAcsChatConfig.registryId,
    chatSeed: graceAcsChatConfig.chatSeed,
    backendExecutable: false,
  },
  {
    toolId: nihssChatConfig.toolId,
    toolName: nihssChatConfig.name,
    category: nihssChatConfig.category,
    description: nihssChatConfig.description,
    path: nihssChatConfig.hubPath,
    sidebarToolId: nihssChatConfig.registryId,
    chatSeed: nihssChatConfig.chatSeed,
    backendExecutable: false,
  },
  {
    toolId: canadianCSpineChatConfig.toolId,
    toolName: canadianCSpineChatConfig.name,
    category: canadianCSpineChatConfig.category,
    description: canadianCSpineChatConfig.description,
    path: canadianCSpineChatConfig.hubPath,
    sidebarToolId: canadianCSpineChatConfig.registryId,
    chatSeed: canadianCSpineChatConfig.chatSeed,
    backendExecutable: false,
  },
  {
    toolId: ottawaAnkleChatConfig.toolId,
    toolName: ottawaAnkleChatConfig.name,
    category: ottawaAnkleChatConfig.category,
    description: ottawaAnkleChatConfig.description,
    path: ottawaAnkleChatConfig.hubPath,
    sidebarToolId: ottawaAnkleChatConfig.registryId,
    chatSeed: ottawaAnkleChatConfig.chatSeed,
    backendExecutable: false,
  },
  {
    toolId: copdGoldChatConfig.toolId,
    toolName: 'COPD GOLD Assessment',
    category: copdGoldChatConfig.category,
    description: copdGoldChatConfig.description,
    path: copdGoldChatConfig.hubPath,
    sidebarToolId: copdGoldChatConfig.registryId,
    chatSeed: copdGoldChatConfig.chatSeed,
    backendExecutable: false,
  },
  {
    toolId: romeIvIbsChatConfig.toolId,
    toolName: 'Rome IV IBS Criteria',
    category: romeIvIbsChatConfig.category,
    description: romeIvIbsChatConfig.description,
    path: romeIvIbsChatConfig.hubPath,
    sidebarToolId: romeIvIbsChatConfig.registryId,
    chatSeed: romeIvIbsChatConfig.chatSeed,
    backendExecutable: false,
  },
  {
    toolId: dispatchAiChatConfig.toolId,
    toolName: 'Dispatch Intelligence Assistant',
    category: dispatchAiChatConfig.category,
    description: dispatchAiChatConfig.description,
    path: dispatchAiChatConfig.hubPath,
    sidebarToolId: dispatchAiChatConfig.registryId,
    chatSeed: dispatchAiChatConfig.chatSeed,
    backendExecutable: true,
  },
  {
    toolId: 'drug-interactions',
    toolName: 'Drug Interaction Checker',
    category: 'checker',
    description:
      'Drug–drug interaction and contraindication context — clinical decision support only; does not recommend specific doses or starting, stopping, or switching therapy.',
    path: '/tools/drug-checker',
    sidebarToolId: 'drug-check',
    backendExecutable: true,
  },
  {
    toolId: 'dose-calculator',
    toolName: 'Medication Dose Calculator',
    category: 'calculator',
    description:
      'Reference-only: explains dosing concepts and where to find institutional protocols. Does not calculate or recommend patient-specific doses.',
    path: '/tools/calculators',
    sidebarToolId: 'calculators',
    chatSeed:
      'Help me understand how weight-based and renal-adjusted dosing are typically approached for a medication class — educational reference only. Do not calculate mg/kg doses or recommend a specific dose for this patient; direct prescribing to licensed clinicians and pharmacy resources.',
    backendExecutable: false,
  },
  {
    toolId: 'lab-interpreter',
    toolName: 'Lab Results Interpreter',
    category: 'interpreter',
    description:
      'Lab panel interpretation support — clinical decision support only; does not establish a diagnosis. Verify with clinician judgment and local protocols.',
    path: '/tools/lab-interpreter',
    sidebarToolId: 'lab-interp',
    backendExecutable: true,
  },
  {
    toolId: 'abg-interpreter',
    toolName: 'ABG Interpreter',
    category: 'interpreter',
    description:
      'ABG and acid–base interpretation support (Lab Interpreter page) — clinical decision support only; does not establish a diagnosis.',
    path: '/tools/lab-interpreter',
    sidebarToolId: 'lab-interp',
    backendExecutable: false,
  },
  {
    toolId: 'protocol-lookup',
    toolName: 'Clinical Protocol Lookup',
    category: 'protocol',
    description: 'Evidence-based protocols and pathways.',
    path: '/tools/protocols',
    sidebarToolId: 'protocols',
    chatSeed: 'Summarize the evidence-based protocol for this condition:',
    backendExecutable: false,
  },
  {
    toolId: 'acls-protocol',
    toolName: 'ACLS Protocol',
    category: 'protocol',
    description: 'Resuscitation algorithms.',
    path: '/tools/protocols',
    sidebarToolId: 'protocols',
    chatSeed: 'Walk me through the ACLS algorithm for this cardiac arrest scenario:',
    backendExecutable: false,
  },
  {
    toolId: 'atls-protocol',
    toolName: 'ATLS Protocol',
    category: 'protocol',
    description: 'Trauma algorithms.',
    path: '/tools/protocols',
    sidebarToolId: 'protocols',
    chatSeed: 'Guide me through the ATLS primary survey for this trauma patient:',
    backendExecutable: false,
  },
  {
    toolId: 'route-optimizer',
    toolName: 'Route Optimization Assistant',
    category: 'fleet',
    description:
      'Plan and reorder multi-stop routes using priorities, traffic, vehicle limits, and time windows. Provides travel estimates and savings — does not auto-dispatch.',
    path: '/fleet/route-optimizer',
    sidebarToolId: 'route-optimizer',
    chatSeed:
      'Help me optimize a multi-stop fleet route: review destinations, priorities, traffic constraints, vehicle limits, and time windows. Suggest stop order and travel estimates — do not auto-dispatch or modify live routes without human approval.',
    backendExecutable: false,
  },
  {
    toolId: 'predictive-maintenance',
    toolName: 'Predictive Maintenance Assistant',
    category: 'fleet',
    description:
      'Rule-based maintenance risk score, inspection windows, and anomaly indicators from vehicle age, mileage, service history, diagnostic codes, battery health, and telemetry. Does not schedule service automatically.',
    path: '/fleet/predictive-maintenance',
    sidebarToolId: 'predictive-maintenance',
    chatSeed:
      'Help me interpret predictive maintenance risk for a fleet vehicle: review age, mileage, service history, diagnostic codes, battery health, and telemetry. Suggest inspection timing and anomalies — do not auto-schedule shop work without human maintenance approval.',
    backendExecutable: false,
  },
  {
    toolId: 'fleet-command',
    toolName: 'Fleet Command Dashboard',
    category: 'fleet',
    description:
      'Operational fleet snapshot: active and available vehicles, maintenance status, ETAs, energy levels, and utilization metrics. Decision support only — does not dispatch or control vehicles.',
    path: '/fleet/command',
    sidebarToolId: 'fleet-command',
    chatSeed:
      'Help me review fleet operations using the Fleet Command dashboard context: summarize active vs available vs on-job vehicles, flag maintenance and low-energy units, and discuss utilization and ETA patterns. Do not auto-dispatch or change assignments — recommend human dispatcher review.',
    backendExecutable: false,
  },
  {
    toolId: 'differential-diagnosis',
    toolName: 'Differential Diagnosis Generator',
    category: 'reference',
    description: 'Symptom-based differentials.',
    path: '/tools/diagnosis',
    sidebarToolId: 'diagnosis',
    chatSeed:
      'Generate a ranked differential diagnosis list for discussion as clinical decision support — not a confirmed diagnosis. Require clinician review before testing or treatment decisions:',
    backendExecutable: false,
  },
  {
    toolId: 'antibiotic-guide',
    toolName: 'Antibiotic Selection Guide',
    category: 'reference',
    description: 'Empiric antimicrobial choice.',
    path: '/tools/diagnosis',
    sidebarToolId: 'diagnosis',
    chatSeed:
      'Discuss empiric antibiotic considerations for this infection scenario as educational decision support — cite guideline principles, resistance patterns, and patient factors. Do not prescribe, dose, or order antibiotics; require clinician review and local antimicrobial stewardship pathways.',
    backendExecutable: false,
  },
];

export const clinicalIntentTools = clinicalIntentToolsRaw.map((row) => ({
  ...row,
  chatSeed: row.chatSeed ? ensureChatSeedGuardrails(row) : row.chatSeed,
}));

/** Built-in calculator slugs not yet in Calculators.jsx UI — NLU + catalog only */
export const nluCalculatorHubOnly = [
  {
    toolId: NLU.apache2Calculator,
    name: 'APACHE-II',
    hubPath: TOOL_LAUNCH_PATHS.calculatorsHub,
  },
  {
    toolId: NLU.curb65Calculator,
    name: 'CURB-65',
    hubPath: TOOL_LAUNCH_PATHS.calculatorsHub,
  },
  { toolId: NLU.gcsCalculator, name: 'GCS', hubPath: TOOL_LAUNCH_PATHS.calculatorsHub },
  {
    toolId: NLU.wellsDvtCalculator,
    name: 'Wells DVT',
    hubPath: TOOL_LAUNCH_PATHS.calculatorsHub,
  },
  { toolId: wellsPeChatConfig.toolId, name: wellsPeChatConfig.name, hubPath: wellsPeChatConfig.hubPath },
  { toolId: percChatConfig.toolId, name: percChatConfig.name, hubPath: percChatConfig.hubPath },
  {
    toolId: graceAcsChatConfig.toolId,
    name: graceAcsChatConfig.name,
    hubPath: graceAcsChatConfig.hubPath,
  },
  { toolId: nihssChatConfig.toolId, name: nihssChatConfig.name, hubPath: nihssChatConfig.hubPath },
  {
    toolId: canadianCSpineChatConfig.toolId,
    name: canadianCSpineChatConfig.name,
    hubPath: canadianCSpineChatConfig.hubPath,
  },
  {
    toolId: ottawaAnkleChatConfig.toolId,
    name: ottawaAnkleChatConfig.name,
    hubPath: ottawaAnkleChatConfig.hubPath,
  },
  {
    toolId: copdGoldChatConfig.toolId,
    name: copdGoldChatConfig.name,
    hubPath: copdGoldChatConfig.hubPath,
  },
  {
    toolId: romeIvIbsChatConfig.toolId,
    name: romeIvIbsChatConfig.name,
    hubPath: romeIvIbsChatConfig.hubPath,
  },
  {
    toolId: dispatchAiChatConfig.toolId,
    name: dispatchAiChatConfig.name,
    hubPath: dispatchAiChatConfig.hubPath,
  },
];

export const builtinUiCalculators = [
  {
    id: 'sofa',
    name: 'SOFA Score',
    description: 'ICU organ dysfunction.',
    path: '/tools/calculator/sofa',
    calcQuery: '/tools/calculators?calc=sofa',
    implementation: 'UI + POST /api/tools/sofa-calculator/execute',
    orchestratorId: 'sofa-calculator',
  },
  {
    id: 'qsofa',
    name: 'qSOFA (quick SOFA)',
    description: 'Bedside sepsis risk screen (RR, SBP, mentation / GCS).',
    path: '/tools/calculators/qsofa',
    calcQuery: '/tools/calculators?calc=qsofa',
    implementation: 'Client-side in Calculators.jsx (qsofaCalculator.js)',
    orchestratorId: null,
  },
  {
    id: 'news2',
    name: 'NEWS2',
    description: 'National Early Warning Score 2 (RCP) — vitals, SpO₂ scale, escalation.',
    path: '/tools/calculators/news2',
    calcQuery: '/tools/calculators?calc=news2',
    implementation: 'Client-side in Calculators.jsx (news2Calculator.js)',
    orchestratorId: null,
  },
  {
    id: 'child-pugh',
    name: 'Child-Pugh',
    description: 'Cirrhosis severity class (bilirubin, albumin, coagulation, ascites, encephalopathy).',
    path: '/tools/calculators/child-pugh',
    calcQuery: '/tools/calculators?calc=child-pugh',
    implementation: 'Client-side in Calculators.jsx (childPughCalculator.js)',
    orchestratorId: null,
  },
  {
    id: 'has-bled',
    name: 'HAS-BLED',
    description: 'Bleeding risk (anticoagulation context); 9 binary factors.',
    path: '/tools/calculators/has-bled',
    calcQuery: '/tools/calculators?calc=has-bled',
    implementation: 'Client-side in Calculators.jsx (hasBledCalculator.js)',
    orchestratorId: null,
  },
  {
    id: 'meld',
    name: 'MELD',
    description: 'Model for End-stage Liver Disease (bilirubin, INR, creatinine / dialysis).',
    path: '/tools/calculators/meld',
    calcQuery: '/tools/calculators?calc=meld',
    implementation: 'Client-side in Calculators.jsx (meldCalculator.js)',
    orchestratorId: null,
  },
  {
    id: 'meld-na',
    name: 'MELD-Na',
    description: 'MELD with UNOS sodium adjustment for hyponatremia.',
    path: '/tools/calculators/meld-na',
    calcQuery: '/tools/calculators?calc=meld-na',
    implementation: 'Client-side in Calculators.jsx (meldCalculator.js)',
    orchestratorId: null,
  },
  {
    id: 'timi-ua-nstemi',
    name: 'TIMI (UA/NSTEMI)',
    description: 'TIMI risk score for unstable angina / NSTEMI (7 binary criteria).',
    path: '/tools/calculators/timi-ua-nstemi',
    calcQuery: '/tools/calculators?calc=timi-ua-nstemi',
    implementation: 'Client-side in Calculators.jsx (timiUaNstemiCalculator.js)',
    orchestratorId: null,
  },
  {
    id: 'ascvd-risk',
    name: 'ASCVD 10-year risk',
    description: 'ACC/AHA pooled cohort equations for primary prevention ASCVD risk.',
    path: '/tools/calculators/ascvd-risk',
    calcQuery: '/tools/calculators?calc=ascvd-risk',
    implementation: 'Client-side in Calculators.jsx (ascvdPceCalculator.js)',
    orchestratorId: null,
  },
  {
    id: 'ckd-staging',
    name: 'CKD stage / staging (KDIGO)',
    description: 'KDIGO CKD stage and staging: eGFR, albuminuria, and combined prognostic risk.',
    path: '/tools/calculators/ckd-staging',
    calcQuery: '/tools/calculators?calc=ckd-staging',
    implementation: 'Client-side in Calculators.jsx (ckdStagingCalculator.js)',
    orchestratorId: null,
  },
  {
    id: 'stop-bang',
    name: 'STOP-Bang / stop bang',
    description: 'STOP-Bang (stop bang) obstructive sleep apnea screening questionnaire (0–8).',
    path: '/tools/calculators/stop-bang',
    calcQuery: '/tools/calculators?calc=stop-bang',
    implementation: 'Client-side in Calculators.jsx (stopBangCalculator.js)',
    orchestratorId: null,
  },
  {
    id: 'audit-c',
    name: 'AUDIT-C / audit c',
    description: 'AUDIT-C (audit c) brief alcohol consumption screen (0–12).',
    path: '/tools/calculators/audit-c',
    calcQuery: '/tools/calculators?calc=audit-c',
    implementation: 'Client-side in Calculators.jsx (auditCCalculator.js)',
    orchestratorId: null,
  },
  {
    id: 'phq9',
    name: 'PHQ-9 / phq9',
    description: 'PHQ-9 (phq9) depression symptom screen (0–27) with question 9 safety escalation.',
    path: '/tools/calculators/phq9',
    calcQuery: '/tools/calculators?calc=phq9',
    implementation: 'Client-side in Calculators.jsx (phq9Calculator.js)',
    orchestratorId: null,
  },
  {
    id: 'gad7',
    name: 'GAD-7 / gad7',
    description: 'GAD-7 (gad7) anxiety symptom screen (0–21) with severity range.',
    path: '/tools/calculators/gad7',
    calcQuery: '/tools/calculators?calc=gad7',
    implementation: 'Client-side in Calculators.jsx (gad7Calculator.js)',
    orchestratorId: null,
  },
  {
    id: 'gfr',
    name: 'eGFR (CKD-EPI)',
    description: 'Kidney function estimate.',
    path: '/tools/calculator/gfr',
    calcQuery: '/tools/calculators?calc=gfr',
    implementation: 'Client-side in Calculators.jsx',
    orchestratorId: null,
  },
  {
    id: 'bmi',
    name: 'BMI',
    description: 'Body mass index.',
    path: '/tools/calculator/bmi',
    calcQuery: '/tools/calculators?calc=bmi',
    implementation: 'Client-side in Calculators.jsx',
    orchestratorId: null,
  },
  {
    id: 'chads2vasc',
    name: 'CHA2DS2-VASc',
    description: 'AF stroke risk.',
    path: '/tools/calculator/chads2vasc',
    calcQuery: '/tools/calculators?calc=chads2vasc',
    implementation: 'Client-side in Calculators.jsx',
    orchestratorId: null,
  },
];

export { ORCHESTRATOR_TO_REGISTRY_ID } from './clinicalToolIdContract';

export const clinicalIntentToolsById = clinicalIntentTools.reduce((acc, row) => {
  acc[row.toolId] = row;
  return acc;
}, {});

export function getCatalogSummary({ sidebarCount = 0, backendToolCount = 0 } = {}) {
  const chatOnlyProfiles = clinicalIntentTools.filter((t) => !t.path).length;
  return {
    sidebarShortcuts: sidebarCount,
    calculatorForms: builtinUiCalculators.length,
    aiClinicalProfiles: clinicalIntentTools.length,
    chatOnlyProfiles,
    backendExecutors: backendToolCount || clinicalIntentTools.filter((t) => t.backendExecutable).length,
  };
}

/** NLU tools with no dedicated page — launch via chat from suite or catalog */
export const chatOnlyClinicalTools = clinicalIntentTools.filter((t) => !t.path);

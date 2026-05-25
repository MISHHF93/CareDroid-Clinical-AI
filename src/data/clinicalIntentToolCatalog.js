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
import { pecarnHeadChatConfig } from './chatAssistedCalculators/pecarnHead';
import { nexusCSpineChatConfig } from './chatAssistedCalculators/nexusCSpine';
import { dispatchAiChatConfig } from './chatAssistedFleet/dispatchAi';
import { ensureChatSeedGuardrails } from './clinicalSafetyGuardrails';
import {
  NLU,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
  REGISTRY,
  TOOL_LAUNCH_PATHS,
} from './clinicalToolIdContract';

const clinicalIntentToolsRaw = [
  {
    toolId: NLU.sofaCalculator,
    toolName: 'SOFA Score Calculator',
    category: 'calculator',
    description:
      'Sequential Organ Failure Assessment (ICU sepsis / organ dysfunction) — clinical decision support only; does not diagnose sepsis or direct therapy.',
    path: '/tools/calculators/sofa',
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
    toolId: NLU.egfrCkdEpi,
    toolName: 'eGFR CKD-EPI 2021',
    category: 'calculator',
    description:
      'Race-free CKD-EPI 2021 creatinine eGFR estimate. Does not diagnose AKI/CKD or automate renal medication dosing.',
    path: '/tools/calculators/egfr-ckd-epi',
    sidebarToolId: REGISTRY.egfrCkdEpi,
    chatSeed:
      'Help me estimate eGFR using CKD-EPI 2021 from age, sex, and serum creatinine. Clinical decision support only; do not diagnose AKI or CKD, do not determine chronicity, and do not recommend medication dosing adjustments.',
    backendExecutable: false,
  },
  {
    toolId: NLU.creatinineClearanceCg,
    toolName: 'Creatinine Clearance Cockcroft-Gault',
    category: 'calculator',
    description:
      'Cockcroft-Gault creatinine clearance estimate using age, sex, weight, and creatinine. Not medication dosing automation.',
    path: '/tools/calculators/creatinine-clearance-cg',
    sidebarToolId: REGISTRY.creatinineClearanceCg,
    chatSeed:
      'Help me estimate Cockcroft-Gault creatinine clearance from age, sex, selected weight, and serum creatinine. Clinical decision support only; explain weight selection caveats and do not recommend drug doses, dose intervals, renal adjustments, or medication changes.',
    backendExecutable: false,
  },
  {
    toolId: NLU.fena,
    toolName: 'FeNa',
    category: 'calculator',
    description:
      'Fractional excretion of sodium urine electrolyte pattern support for selected AKI contexts. Does not diagnose AKI etiology.',
    path: '/tools/calculators/fena',
    sidebarToolId: REGISTRY.fena,
    chatSeed:
      'Help me calculate FeNa from serum sodium, urine sodium, serum creatinine, and urine creatinine. Clinical decision support only; discuss limitations with diuretics, CKD, sepsis, contrast, and non-oliguric states, and do not recommend fluids, diuretics, or dialysis.',
    backendExecutable: false,
  },
  {
    toolId: NLU.feurea,
    toolName: 'FeUrea',
    category: 'calculator',
    description:
      'Fractional excretion of urea urine electrolyte pattern support, often considered when diuretics limit FeNa.',
    path: '/tools/calculators/feurea',
    sidebarToolId: REGISTRY.feurea,
    chatSeed:
      'Help me calculate FeUrea from BUN, urine urea nitrogen, serum creatinine, and urine creatinine. Clinical decision support only; discuss limitations and do not diagnose AKI etiology or recommend fluids, diuretics, or dialysis.',
    backendExecutable: false,
  },
  {
    toolId: NLU.kfre,
    toolName: 'Kidney Failure Risk Equation',
    category: 'calculator',
    description:
      'Four-variable KFRE 2-year and 5-year kidney failure risk context from age, sex, eGFR, and ACR.',
    path: '/tools/calculators/kfre',
    sidebarToolId: REGISTRY.kfre,
    chatSeed:
      'Help me estimate kidney failure risk with the four-variable KFRE from age, sex, eGFR, and urine ACR. Clinical decision support only; do not diagnose CKD, determine transplant referral, or recommend dialysis initiation.',
    backendExecutable: false,
  },
  {
    toolId: NLU.bunCreatinineRatio,
    toolName: 'BUN/Creatinine Ratio',
    category: 'calculator',
    description:
      'BUN/creatinine ratio pattern support for renal and volume-status review. Nonspecific and non-diagnostic.',
    path: '/tools/calculators/bun-creatinine-ratio',
    sidebarToolId: REGISTRY.bunCreatinineRatio,
    chatSeed:
      'Help me calculate and interpret the BUN/creatinine ratio as nonspecific pattern support. Clinical decision support only; do not diagnose prerenal azotemia or recommend fluids, diuretics, or dialysis.',
    backendExecutable: false,
  },
  {
    toolId: NLU.correctedSodium,
    toolName: 'Corrected Sodium',
    category: 'calculator',
    description:
      'Corrected sodium estimate for hyperglycemia context. Does not recommend sodium correction strategy.',
    path: '/tools/calculators/corrected-sodium',
    sidebarToolId: REGISTRY.correctedSodium,
    chatSeed:
      'Help me calculate corrected sodium from measured sodium and glucose. Clinical decision support only; do not recommend hypertonic saline, insulin, free water, sodium correction rate, or monitoring frequency.',
    backendExecutable: false,
  },
  {
    toolId: NLU.freeWaterDeficit,
    toolName: 'Free Water Deficit',
    category: 'calculator',
    description:
      'Free water deficit estimate from sodium, weight, and total body water factor. Does not prescribe fluids.',
    path: '/tools/calculators/free-water-deficit',
    sidebarToolId: REGISTRY.freeWaterDeficit,
    chatSeed:
      'Help me estimate free water deficit from sodium, weight, TBW factor, and target sodium. Clinical decision support only; do not prescribe IV fluids, enteral water, correction rates, or monitoring intervals.',
    backendExecutable: false,
  },
  {
    toolId: NLU.osmolalGap,
    toolName: 'Osmolal Gap',
    category: 'calculator',
    description:
      'Osmolal gap calculation from measured osmolality, sodium, glucose, BUN, and optional ethanol. Toxicology context only.',
    path: '/tools/calculators/osmolal-gap',
    sidebarToolId: REGISTRY.osmolalGap,
    chatSeed:
      'Help me calculate the osmolal gap from measured osmolality, sodium, glucose, BUN, and ethanol if available. Clinical decision support only; do not diagnose toxic alcohol ingestion or recommend antidotes, dialysis, or disposition.',
    backendExecutable: false,
  },
  {
    toolId: NLU.homaIr,
    toolName: 'HOMA-IR',
    category: 'calculator',
    description:
      'HOMA-IR insulin resistance estimate from fasting glucose and fasting insulin. Does not diagnose diabetes or recommend insulin/medication changes.',
    path: '/tools/calculators/homa-ir',
    sidebarToolId: REGISTRY.homaIr,
    chatSeed:
      'Help me calculate HOMA-IR from fasting glucose and fasting insulin. Clinical decision support only; do not diagnose diabetes, insulin resistance, or metabolic syndrome, and do not recommend insulin, diabetes medication, diet, or weight-loss treatment.',
    backendExecutable: false,
  },
  {
    toolId: NLU.correctedCalcium,
    toolName: 'Corrected Calcium',
    category: 'calculator',
    description:
      'Albumin-corrected total calcium estimate. Does not diagnose calcium disorders or recommend treatment.',
    path: '/tools/calculators/corrected-calcium',
    sidebarToolId: REGISTRY.correctedCalcium,
    chatSeed:
      'Help me calculate corrected calcium from measured total calcium and albumin. Clinical decision support only; discuss ionized calcium limitations and do not diagnose hypocalcemia or hypercalcemia, and do not recommend calcium, vitamin D, bisphosphonate, calcitonin, dialysis, or medication changes.',
    backendExecutable: false,
  },
  {
    toolId: NLU.serumOsmolality,
    toolName: 'Serum Osmolality',
    category: 'calculator',
    description:
      'Calculated serum osmolality from sodium, glucose, BUN, and optional ethanol. Does not diagnose hyperosmolar states or DKA.',
    path: '/tools/calculators/serum-osmolality',
    sidebarToolId: REGISTRY.serumOsmolality,
    chatSeed:
      'Help me calculate serum osmolality from sodium, glucose, BUN, and ethanol if available. Clinical decision support only; do not diagnose DKA, HHS, toxic ingestion, or hyperosmolar state, and do not recommend insulin, fluids, dialysis, or disposition.',
    backendExecutable: false,
  },
  {
    toolId: NLU.bsa,
    toolName: 'Body Surface Area',
    category: 'calculator',
    description:
      'Mosteller body surface area estimate from height and weight. Does not recommend medication, chemotherapy, or fluid dosing.',
    path: '/tools/calculators/bsa',
    sidebarToolId: REGISTRY.bsa,
    chatSeed:
      'Help me calculate Mosteller body surface area from height and weight. Clinical decision support only; confirm the required formula for the protocol and do not recommend medication doses, chemotherapy doses, fluids, nutrition, or treatment.',
    backendExecutable: false,
  },
  {
    toolId: NLU.idealBodyWeight,
    toolName: 'Ideal Body Weight',
    category: 'calculator',
    description:
      'Devine ideal body weight estimate from sex and height. Not a health target and not medication dosing automation.',
    path: '/tools/calculators/ideal-body-weight',
    sidebarToolId: REGISTRY.idealBodyWeight,
    chatSeed:
      'Help me calculate Devine ideal body weight from sex and height. Clinical decision support only; this is not a target weight and does not recommend medication dosing, nutrition targets, ventilator settings, or weight-loss treatment.',
    backendExecutable: false,
  },
  {
    toolId: NLU.adjustedBodyWeight,
    toolName: 'Adjusted Body Weight',
    category: 'calculator',
    description:
      'Adjusted body weight estimate from actual weight, ideal body weight, and correction factor. Not dosing automation.',
    path: '/tools/calculators/adjusted-body-weight',
    sidebarToolId: REGISTRY.adjustedBodyWeight,
    chatSeed:
      'Help me calculate adjusted body weight from actual weight, height, sex, and correction factor. Clinical decision support only; do not recommend drug doses, insulin doses, nutrition prescriptions, fluid rates, or treatment plans, and defer dosing decisions to governed protocols and pharmacy/clinician review.',
    backendExecutable: false,
  },
  {
    toolId: NLU.waistHipRatio,
    toolName: 'Waist-to-Hip Ratio',
    category: 'calculator',
    description:
      'Waist-to-hip ratio central adiposity estimate. Does not diagnose cardiometabolic disease or recommend treatment.',
    path: '/tools/calculators/waist-hip-ratio',
    sidebarToolId: REGISTRY.waistHipRatio,
    chatSeed:
      'Help me calculate waist-to-hip ratio from waist and hip circumference. Clinical decision support only; do not diagnose metabolic syndrome, obesity-related disease, or cardiometabolic disease, and do not recommend treatment, medication, surgery, or nutrition plans.',
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
    toolId: NLU.bodeIndex,
    toolName: 'BODE Index',
    category: 'calculator',
    description:
      'COPD prognosis context using BMI, FEV1 percent predicted, 6-minute walk distance, and mMRC dyspnea. Does not diagnose COPD or recommend therapy.',
    path: '/tools/calculators/bode-index',
    sidebarToolId: REGISTRY.bodeIndex,
    chatSeed:
      'Help me calculate the BODE Index from BMI, FEV1 percent predicted, 6-minute walk distance, and mMRC dyspnea. Clinical decision support only; do not diagnose COPD or recommend inhalers, oxygen, pulmonary rehab, transplant referral, admission, or discharge.',
    backendExecutable: false,
  },
  {
    toolId: NLU.copdGoldAssessment,
    toolName: 'COPD GOLD Assessment',
    category: 'calculator',
    description:
      'COPD GOLD A/B/E grouping and optional spirometric grade context. Does not diagnose COPD or recommend inhalers, steroids, antibiotics, oxygen, or disposition.',
    path: '/tools/calculators/copd-gold-assessment',
    sidebarToolId: REGISTRY.copdGoldAssessment,
    chatSeed:
      'Help me apply COPD GOLD assessment using mMRC or CAT symptom burden, exacerbation history, hospitalization history, and optional FEV1 percent predicted. Clinical decision support only; do not diagnose COPD, do not replace post-bronchodilator spirometry, and do not recommend inhalers, steroids, antibiotics, oxygen, admission, or discharge.',
    backendExecutable: false,
  },
  {
    toolId: NLU.aaGradient,
    toolName: 'A-a Gradient',
    category: 'calculator',
    description:
      'Alveolar-arterial oxygen gradient from ABG values and FiO2 assumptions. Does not diagnose PE, shunt, V/Q mismatch, or respiratory failure.',
    path: '/tools/calculators/aa-gradient',
    sidebarToolId: REGISTRY.aaGradient,
    chatSeed:
      'Help me calculate the A-a gradient from age, FiO2, PaO2, PaCO2, atmospheric pressure, and respiratory quotient. Clinical decision support only; verify ABG quality and do not diagnose PE, shunt, V/Q mismatch, or respiratory failure.',
    backendExecutable: false,
  },
  {
    toolId: NLU.pao2Fio2Ratio,
    toolName: 'PaO2/FiO2 Ratio',
    category: 'calculator',
    description:
      'Oxygenation ratio support for ABG and FiO2 context. Does not diagnose ARDS or recommend ventilator or oxygen changes.',
    path: '/tools/calculators/pao2-fio2-ratio',
    sidebarToolId: REGISTRY.pao2Fio2Ratio,
    chatSeed:
      'Help me calculate the PaO2/FiO2 ratio from PaO2 and FiO2. Clinical decision support only; do not diagnose ARDS and do not recommend oxygen device, ventilator settings, intubation, ICU admission, or disposition.',
    backendExecutable: false,
  },
  {
    toolId: NLU.roxIndex,
    toolName: 'ROX Index',
    category: 'calculator',
    description:
      'ROX index from SpO2, FiO2, and respiratory rate for high-flow oxygen monitoring context. Does not determine escalation or intubation.',
    path: '/tools/calculators/rox-index',
    sidebarToolId: REGISTRY.roxIndex,
    chatSeed:
      'Help me calculate the ROX Index from SpO2, FiO2, and respiratory rate for monitoring context. Clinical decision support only; use serial reassessment and local escalation policy, and do not recommend intubation, NIV, ICU admission, or oxygen device changes.',
    backendExecutable: false,
  },
  {
    toolId: NLU.pneumoniaSeverityIndex,
    toolName: 'Pneumonia Severity Index',
    category: 'calculator',
    description:
      'Community-acquired pneumonia risk class context using PSI variables. Does not diagnose pneumonia or recommend antibiotics or disposition.',
    path: '/tools/calculators/pneumonia-severity-index',
    sidebarToolId: REGISTRY.pneumoniaSeverityIndex,
    chatSeed:
      'Help me calculate Pneumonia Severity Index risk class from demographics, comorbidities, vital signs, labs, oxygenation, and pleural effusion. Clinical decision support only; do not diagnose pneumonia or recommend antibiotics, admission, ICU care, or discharge.',
    backendExecutable: false,
  },
  {
    toolId: NLU.asthmaSeverityScore,
    toolName: 'Asthma Severity Score',
    category: 'calculator',
    description:
      'Acute asthma severity helper using PEF, SpO2, respiratory rate, speech, work of breathing, and life-threatening features.',
    path: '/tools/calculators/asthma-severity-score',
    sidebarToolId: REGISTRY.asthmaSeverityScore,
    chatSeed:
      'Help me assess acute asthma severity using PEF percent personal best, SpO2, respiratory rate, speech, accessory muscle use, exhaustion, altered mental status, and silent chest. Clinical decision support only; life-threatening features require urgent local pathways and this tool does not recommend medications, NIV, intubation, admission, or discharge.',
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
    toolId: 'heart-score',
    toolName: 'HEART score',
    category: 'calculator',
    description:
      'HEART score for chest pain risk stratification: history, ECG, age, risk factors, troponin (0–10).',
    path: '/tools/calculators/heart-score',
    sidebarToolId: 'heart-score',
    chatSeed: `Help me calculate the HEART score for a patient with chest pain using history, ECG, age, cardiovascular risk factors, and troponin (0–10 total).

STEP 0 — If the patient is hemodynamically unstable, has ongoing severe chest pain with concern for STEMI, or needs immediate resuscitation, activate emergency chest-pain / ACS pathways first. Do not delay urgent care to finish this chat.

Ask about each component in turn (0, 1, or 2 points each):
1) History suspiciousness for ACS
2) ECG findings at presentation
3) Age band
4) Cardiovascular risk factors
5) Initial troponin relative to local ULN

After collecting answers, report the total HEART score, risk category (low 0–3, intermediate 4–6, high 7–10), and validation-cohort MACE context. Clearly state:
- Clinical decision support and risk stratification only — not a diagnosis of ACS or myocardial infarction
- Does not rule in or rule out acute coronary syndrome
- Do not recommend specific treatment, anticoagulation, disposition, observation duration, or invasive strategy`,
    backendExecutable: false,
  },
  {
    toolId: 'abcd2',
    toolName: 'ABCD² score',
    category: 'calculator',
    description:
      'ABCD² score for short-term stroke risk after TIA: age, blood pressure, clinical features, duration, diabetes (0–7).',
    path: '/tools/calculators/abcd2',
    sidebarToolId: 'abcd2',
    chatSeed: `Help me calculate the ABCD² score for a patient with a suspected transient ischemic attack (TIA).

STEP 0 — If acute stroke, crescendo neurologic symptoms, or new persistent focal deficit is present, activate emergency stroke pathways immediately. Do not delay urgent evaluation, imaging, or treatment to finish this chat.

Collect at the time of the TIA:
1) Age ≥60 years
2) Blood pressure at event (systolic and diastolic mmHg) — 1 point if SBP ≥140 or DBP ≥90
3) Clinical features: other (0), speech disturbance without weakness (1), or unilateral weakness (2)
4) Duration: <10 min (0), 10–59 min (1), or ≥60 min (2)
5) Diabetes (1 point)

Report total score (0–7), risk category (low 0–3, moderate 4–5, high 6–7), and validation-cohort stroke-risk context. Clearly state this is TIA/stroke risk stratification only — does not diagnose TIA or stroke and does not recommend antithrombotic therapy, admission, or imaging timing.`,
    backendExecutable: false,
  },
  {
    toolId: 'centor-mcisaac',
    toolName: 'Centor / McIsaac score',
    category: 'calculator',
    description:
      'Modified Centor (McIsaac) score for streptococcal pharyngitis probability (0–5).',
    path: '/tools/calculators/centor-mcisaac',
    sidebarToolId: 'centor-mcisaac',
    chatSeed:
      'Help me score Centor/McIsaac criteria for strep pharyngitis: exudates, lymph nodes, fever, cough, and age band.',
    backendExecutable: false,
  },
  {
    toolId: 'bishop-score',
    toolName: 'Bishop score',
    category: 'calculator',
    description:
      'Bishop score for cervical favourability before labour induction (dilation, effacement, station, consistency, position; 0–13).',
    path: '/tools/calculators/bishop-score',
    sidebarToolId: 'bishop-score',
    chatSeed: `Help me calculate the Bishop score from a cervical examination for labour documentation.

STEP 0 — Cervical favourability documentation only. Does not recommend induction method, ripening agents, timing, or mode of delivery — follow obstetric team and institutional protocols.

Collect: dilation (cm), effacement (%), fetal station, consistency, and position. Total 0–13; classic teaching uses ≥8 favourable, 6–7 intermediate, <6 unfavourable.`,
    backendExecutable: false,
  },
  {
    toolId: 'apgar-score',
    toolName: 'Apgar score',
    category: 'calculator',
    description:
      'Apgar score for newborn status at 1 and 5 minutes (appearance, pulse, grimace, activity, respiration; 0–10 each).',
    path: '/tools/calculators/apgar-score',
    sidebarToolId: 'apgar-score',
    chatSeed: `Help me score Apgar components at 1 and 5 minutes for a newborn.

STEP 0 — Newborn assessment documentation only. Does not replace neonatal resuscitation algorithms (e.g. NRP) or ongoing monitoring — follow delivery-unit and pediatric protocols.

Score appearance, pulse, grimace, activity, and respiration (0–2 each) at 1 and 5 minutes. Interpretation bands: 0–3 severely depressed, 4–6 moderately depressed, 7–10 reassuring.`,
    backendExecutable: false,
  },
  {
    toolId: 'braden-scale',
    toolName: 'Braden scale',
    category: 'calculator',
    description:
      'Braden scale for pressure injury risk (six subscales, 6–23; lower scores = higher risk).',
    path: '/tools/calculators/braden-scale',
    sidebarToolId: 'braden-scale',
    chatSeed: `Help me complete the Braden scale for an inpatient and document pressure-injury risk.

STEP 0 — This is a nursing risk screen for prevention documentation. It does not replace skin inspection, repositioning orders, support-surface selection, or wound care plans — follow your unit's pressure-injury prevention bundle.

Score all six subscales (sensory perception, moisture, activity, mobility, nutrition, friction & shear). Total 6–23; lower scores indicate higher risk in validation studies.`,
    backendExecutable: false,
  },
  {
    toolId: 'morse-fall-scale',
    toolName: 'Morse Fall Scale',
    category: 'calculator',
    description:
      'Morse Fall Scale for inpatient fall risk (history, diagnoses, ambulation, IV, gait, mental status; 0–125).',
    path: '/tools/calculators/morse-fall-scale',
    sidebarToolId: 'morse-fall-scale',
    chatSeed: `Help me score the Morse Fall Scale for an inpatient and document fall-risk category.

STEP 0 — This is a nursing fall-risk screen for documentation. It does not replace environmental safety rounds, toileting plans, bed alarms, physiotherapy referral, or provider orders — follow your unit's fall-prevention pathway.

Collect: history of falling (within 3 months), secondary diagnosis, ambulatory aid, IV/heparin lock, gait, and mental status. Total 0–125; bands: low <25, moderate 25–50, high >50.`,
    backendExecutable: false,
  },
  {
    toolId: 'ranson-criteria',
    toolName: 'Ranson criteria',
    category: 'calculator',
    description:
      'Ranson criteria for acute pancreatitis severity (5 admission + 6 at 48 hours; 0–11).',
    path: '/tools/calculators/ranson-criteria',
    sidebarToolId: 'ranson-criteria',
    chatSeed:
      'Help me apply Ranson criteria at admission and 48 hours for acute pancreatitis severity.',
    backendExecutable: false,
  },
  {
    toolId: 'bisap-score',
    toolName: 'BISAP score',
    category: 'calculator',
    description:
      'BISAP score for early acute pancreatitis mortality risk (BUN, mental status, SIRS, age, pleural effusion; 0–5).',
    path: '/tools/calculators/bisap-score',
    sidebarToolId: 'bisap-score',
    chatSeed: `Help me calculate the BISAP score for acute pancreatitis within 24 hours of presentation.

STEP 0 — Early severity estimate for risk documentation only. Does not replace imaging for necrosis, ICU criteria, fluid resuscitation, or serial reassessment — follow institutional acute pancreatitis pathways.

Check: BUN >25 mg/dL, impaired mental status, SIRS, age >60, pleural effusion on imaging. Score 0–5; higher scores correlate with higher mortality in validation cohorts.`,
    backendExecutable: false,
  },
  {
    toolId: 'fib4',
    toolName: 'FIB-4 index',
    category: 'calculator',
    description:
      'FIB-4 index for liver fibrosis risk using age, AST, ALT, and platelets.',
    path: '/tools/calculators/fib4',
    sidebarToolId: 'fib4',
    chatSeed: `Help me calculate the FIB-4 index from age, AST, ALT, and platelet count.

STEP 0 — Non-invasive fibrosis screening only. Does not diagnose cirrhosis or replace elastography, biopsy, or hepatology referral — follow local NAFLD/hepatitis staging protocols.

Use conventional units: age (years), AST and ALT (U/L), platelets (×10⁹/L). Interpretation uses age <65 vs ≥65 cutoffs (<1.3 / 1.3–2.67 / >2.67 vs <2.0 / ≥2.0).`,
    backendExecutable: false,
  },
  {
    toolId: NLU.maddreyDiscriminantFunction,
    toolName: 'Maddrey Discriminant Function',
    category: 'calculator',
    description:
      'Maddrey DF for alcoholic hepatitis severe-range risk context using PT prolongation and bilirubin. Does not diagnose alcoholic hepatitis or recommend treatment.',
    path: '/tools/calculators/maddrey-discriminant-function',
    sidebarToolId: REGISTRY.maddreyDiscriminantFunction,
    chatSeed:
      'Help me calculate Maddrey Discriminant Function from patient PT, control PT, and bilirubin. Clinical decision support only; do not diagnose alcoholic hepatitis and do not recommend corticosteroids, transplant referral, admission, discharge, or any treatment.',
    backendExecutable: false,
  },
  {
    toolId: NLU.apri,
    toolName: 'APRI',
    category: 'calculator',
    description:
      'AST to Platelet Ratio Index fibrosis screening context. Does not diagnose cirrhosis or replace elastography, imaging, biopsy, or hepatology review.',
    path: '/tools/calculators/apri',
    sidebarToolId: REGISTRY.apri,
    chatSeed:
      'Help me calculate APRI from AST, AST upper limit of normal, and platelet count. Clinical decision support only; do not diagnose fibrosis or cirrhosis, and do not recommend treatment, biopsy, elastography, referral urgency, or medication changes.',
    backendExecutable: false,
  },
  {
    toolId: NLU.glasgowBlatchfordScore,
    toolName: 'Glasgow-Blatchford Score',
    category: 'calculator',
    description:
      'Pre-endoscopy upper GI bleeding risk stratification support using BUN/urea, hemoglobin, blood pressure, pulse, melena, syncope, hepatic disease, and cardiac failure.',
    path: '/tools/calculators/glasgow-blatchford-score',
    sidebarToolId: REGISTRY.glasgowBlatchfordScore,
    chatSeed:
      'Help me calculate Glasgow-Blatchford Score for suspected upper GI bleeding from BUN/urea, hemoglobin, sex, systolic BP, pulse, melena, syncope, hepatic disease, and cardiac failure. Clinical decision support only; do not rule in or rule out GI bleeding and do not recommend transfusion, endoscopy timing, medication, admission, discharge, or disposition.',
    backendExecutable: false,
  },
  {
    toolId: NLU.rockallScore,
    toolName: 'Rockall Score',
    category: 'calculator',
    description:
      'Upper GI bleeding risk score using age, shock, comorbidity, endoscopic diagnosis, and bleeding stigmata. Does not recommend treatment or disposition.',
    path: '/tools/calculators/rockall-score',
    sidebarToolId: REGISTRY.rockallScore,
    chatSeed:
      'Help me calculate the Rockall Score for upper GI bleeding using age, shock, comorbidity, diagnosis, and endoscopic stigmata. Clinical decision support only; do not recommend transfusion, endoscopy timing, medication, level of care, admission, discharge, or disposition.',
    backendExecutable: false,
  },
  {
    toolId: 'framingham-risk',
    toolName: 'Framingham 10-year CHD risk',
    category: 'calculator',
    description:
      'Framingham ATP III point-based 10-year hard CHD risk (ages 30–74) — alternative cardiovascular risk context to ASCVD PCE.',
    path: '/tools/calculators/framingham-risk',
    sidebarToolId: 'framingham-risk',
    chatSeed:
      'Help me estimate 10-year hard CHD risk using Framingham point tables (age, sex, lipids, blood pressure, smoking).',
    backendExecutable: false,
  },
  {
    toolId: 'shock-index',
    toolName: 'Shock Index',
    category: 'calculator',
    description: 'Hemodynamic screening index from heart rate divided by systolic blood pressure.',
    path: '/tools/calculators/shock-index',
    sidebarToolId: 'shock-index',
    chatSeed: 'Help me calculate shock index from heart rate and systolic blood pressure.',
    backendExecutable: false,
  },
  {
    toolId: 'anion-gap',
    toolName: 'Anion Gap',
    category: 'calculator',
    description: 'Serum anion gap with optional albumin correction for acid-base review.',
    path: '/tools/calculators/anion-gap',
    sidebarToolId: 'anion-gap',
    chatSeed: 'Help me calculate an anion gap from sodium, chloride, bicarbonate, and optional albumin.',
    backendExecutable: false,
  },
  {
    toolId: 'rass',
    toolName: 'RASS',
    category: 'calculator',
    description: 'Richmond Agitation-Sedation Scale for bedside sedation/agitation documentation.',
    path: '/tools/calculators/rass',
    sidebarToolId: 'rass',
    chatSeed: 'Help me document a Richmond Agitation-Sedation Scale score.',
    backendExecutable: false,
  },
  {
    toolId: 'apache2-calculator',
    toolName: 'APACHE-II Score',
    category: 'calculator',
    description:
      'APACHE II ICU severity scoring from validated point bands, GCS, age, and chronic health. Mortality estimates are diagnosis-specific and not generated.',
    path: '/tools/calculators/apache-ii',
    sidebarToolId: 'apache2-calculator',
    chatSeed:
      'Open APACHE II and help me score acute physiology, GCS, age, and chronic health using validated APACHE II point bands. Clinical decision support only. Do not estimate mortality without diagnosis-specific validated context.',
    backendExecutable: false,
  },
  {
    toolId: 'cha2ds2vasc-calculator',
    toolName: 'CHA2DS2-VASc Score',
    category: 'calculator',
    description:
      'Stroke risk in non-valvular atrial fibrillation — clinical decision support only; does not recommend starting, stopping, or switching anticoagulation.',
    path: '/tools/calculators/chads2vasc',
    sidebarToolId: 'calc-chads2vasc',
    backendExecutable: false,
  },
  {
    toolId: 'curb65-calculator',
    toolName: 'CURB-65 Score',
    category: 'calculator',
    description: 'Community-acquired pneumonia severity score using confusion, urea/BUN, respiratory rate, blood pressure, and age.',
    path: '/tools/calculators/curb-65',
    sidebarToolId: 'curb65-calculator',
    chatSeed:
      'Open CURB-65 and help me apply pneumonia severity criteria: confusion, urea or BUN, respiratory rate, blood pressure, and age. Clinical decision support only; not a diagnosis or disposition order.',
    backendExecutable: false,
  },
  {
    toolId: 'gcs-calculator',
    toolName: 'Glasgow Coma Scale',
    category: 'calculator',
    description: 'Level of consciousness scoring from eye, verbal, and motor responses with severe/moderate/mild interpretation ranges.',
    path: '/tools/calculators/gcs',
    sidebarToolId: 'gcs-calculator',
    chatSeed:
      'Open the Glasgow Coma Scale calculator and help me score eye, verbal, and motor responses. Clinical decision support only; not a diagnosis.',
    backendExecutable: false,
  },
  {
    toolId: NLU.mews,
    toolName: 'Modified Early Warning Score (MEWS)',
    category: 'calculator',
    description:
      'Adult early-warning score from respiratory rate, heart rate, systolic blood pressure, temperature, and AVPU.',
    path: '/tools/calculators/mews',
    sidebarToolId: REGISTRY.mews,
    chatSeed:
      'Open MEWS and help me calculate an adult early-warning score from respiratory rate, heart rate, systolic blood pressure, temperature, and AVPU. Clinical decision support only; not a diagnosis.',
    backendExecutable: false,
  },
  {
    toolId: NLU.revisedTraumaScore,
    toolName: 'Revised Trauma Score',
    category: 'calculator',
    description:
      'Physiologic trauma severity score using coded GCS, systolic blood pressure, and respiratory rate.',
    path: '/tools/calculators/revised-trauma-score',
    sidebarToolId: REGISTRY.revisedTraumaScore,
    chatSeed:
      'Open Revised Trauma Score and help me calculate weighted RTS from GCS, systolic blood pressure, and respiratory rate. Clinical decision support only; trauma pathways take priority.',
    backendExecutable: false,
  },
  {
    toolId: NLU.pews,
    toolName: 'Pediatric Early Warning Score (PEWS)',
    category: 'calculator',
    description:
      'Pediatric early-warning score using Brighton-style behavior, cardiovascular, respiratory, nebulizer, and vomiting criteria.',
    path: '/tools/calculators/pews',
    sidebarToolId: REGISTRY.pews,
    chatSeed:
      'Open PEWS and help me calculate a pediatric early-warning score from behavior, cardiovascular status, respiratory status, frequent nebulizers, and persistent vomiting. Pediatric caution: use age-appropriate norms and local escalation pathways. Clinical decision support only.',
    backendExecutable: false,
  },
  {
    toolId: 'wells-dvt-calculator',
    toolName: 'Wells DVT Score',
    category: 'calculator',
    description: 'Pre-test probability for DVT (chat-assisted).',
    path: '/tools/calculators',
    sidebarToolId: 'wells-dvt-calculator',
    chatSeed: `Help me complete a Wells score for suspected DVT using my clinical findings.

Ask for missing inputs one at a time:
1. Active cancer
2. Paralysis, paresis, or recent plaster immobilization of lower extremity
3. Recently bedridden for more than 3 days or major surgery within 12 weeks
4. Localized tenderness along deep venous system
5. Entire leg swollen
6. Calf swelling at least 3 cm larger than asymptomatic side
7. Pitting edema confined to symptomatic leg
8. Collateral superficial veins
9. Previous documented DVT
10. Alternative diagnosis at least as likely as DVT

Then summarize entered findings, calculate the Wells DVT score, explain likely/unlikely or probability-band interpretation, show limitations, cite the original Wells validation work, and warn: "Clinical decision support only. Not a diagnosis." Do not invent missing clinical values.`,
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
    toolId: pecarnHeadChatConfig.toolId,
    toolName: pecarnHeadChatConfig.name,
    category: pecarnHeadChatConfig.category,
    description: pecarnHeadChatConfig.description,
    path: pecarnHeadChatConfig.hubPath,
    sidebarToolId: pecarnHeadChatConfig.registryId,
    chatSeed: pecarnHeadChatConfig.chatSeed,
    backendExecutable: false,
  },
  {
    toolId: nexusCSpineChatConfig.toolId,
    toolName: nexusCSpineChatConfig.name,
    category: nexusCSpineChatConfig.category,
    description: nexusCSpineChatConfig.description,
    path: nexusCSpineChatConfig.hubPath,
    sidebarToolId: nexusCSpineChatConfig.registryId,
    chatSeed: nexusCSpineChatConfig.chatSeed,
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
    toolId: NLU.asthmaExacerbationAssistant,
    toolName: 'Asthma Exacerbation Assistant',
    category: 'calculator',
    description:
      'Guided asthma exacerbation review for severity features, reassessment prompts, and safety handoff. Does not diagnose or recommend medications/disposition.',
    path: '/tools/pulmonology/asthma-exacerbation-assistant',
    sidebarToolId: REGISTRY.asthmaExacerbationAssistant,
    chatSeed:
      'Help me structure an asthma exacerbation review: severity features, PEF/SpO2 context, work of breathing, response trend, and handoff prompts. Clinical decision support only; do not diagnose asthma, do not recommend bronchodilators, steroids, magnesium, NIV, intubation, admission, or discharge, and do not delay emergency pathways for life-threatening features.',
    backendExecutable: false,
  },
  {
    toolId: NLU.ventilatorSupportAssistant,
    toolName: 'Ventilator Support Assistant',
    category: 'reference',
    description:
      'Ventilator support review for mode context, oxygenation/ventilation checks, alarms, and escalation prompts. Does not change settings.',
    path: '/tools/pulmonology/ventilator-support-assistant',
    sidebarToolId: REGISTRY.ventilatorSupportAssistant,
    chatSeed:
      'Help me organize ventilator support review: current mode, oxygenation, ventilation, alarms, synchrony concerns, recent ABG, and escalation questions for clinician/RT review. Clinical decision support only; do not recommend or change ventilator settings, sedation, paralytics, extubation, intubation, or disposition.',
    backendExecutable: false,
  },
  {
    toolId: NLU.oxygenEscalationHelper,
    toolName: 'Oxygen Escalation Helper',
    category: 'calculator',
    description:
      'Oxygen escalation checklist support using device context, work of breathing, ROX/PF ratio context, and local policy reminders.',
    path: '/tools/pulmonology/oxygen-escalation-helper',
    sidebarToolId: REGISTRY.oxygenEscalationHelper,
    chatSeed:
      'Help me structure oxygen escalation review: current oxygen device and FiO2, SpO2 trend, work of breathing, PaO2/FiO2 or ROX context if available, and local escalation triggers. Clinical decision support only; do not recommend oxygen device changes, NIV, intubation, ICU admission, or discharge, and do not delay urgent care.',
    backendExecutable: false,
  },
  {
    toolId: NLU.copdWorkflowAssistant,
    toolName: 'COPD Workflow Assistant',
    category: 'calculator',
    description:
      'COPD workflow support for GOLD context, exacerbation concerns, oxygen safety, and handoff prompts. Does not recommend treatment.',
    path: '/tools/pulmonology/copd-workflow-assistant',
    sidebarToolId: REGISTRY.copdWorkflowAssistant,
    chatSeed:
      'Help me structure a COPD workflow review: GOLD context, exacerbation history, oxygenation, CO2 retention concerns, infection triggers, comorbidities, and handoff prompts. Clinical decision support only; do not diagnose COPD or recommend inhalers, steroids, antibiotics, oxygen targets, NIV, admission, or discharge.',
    backendExecutable: false,
  },
  {
    toolId: NLU.ventilatorMonitoringDashboard,
    toolName: 'Ventilator Monitoring Dashboard',
    category: 'reference',
    description:
      'Ventilator monitoring dashboard for oxygenation, ventilation, alarms, trends, and human review queues. Does not change settings.',
    path: '/tools/pulmonology/ventilator-monitoring-dashboard',
    sidebarToolId: REGISTRY.ventilatorMonitoringDashboard,
    chatSeed:
      'Help me review a ventilator monitoring dashboard summary: oxygenation, ventilation, alarms, settings context, recent ABGs, and unresolved review items. Clinical decision support only; do not change ventilator settings or recommend sedation, extubation, intubation, or disposition.',
    backendExecutable: false,
  },
  {
    toolId: NLU.respiratoryTelemetryDashboard,
    toolName: 'Respiratory Telemetry Dashboard',
    category: 'reference',
    description:
      'Respiratory telemetry review for SpO2, respiratory rate, oxygen device context, deterioration signals, gaps, and artifact.',
    path: '/tools/pulmonology/respiratory-telemetry-dashboard',
    sidebarToolId: REGISTRY.respiratoryTelemetryDashboard,
    chatSeed:
      'Help me review respiratory telemetry: SpO2, respiratory rate, oxygen device context, sustained desaturation, artifacts, missing data, and local escalation flags. Clinical decision support only; do not diagnose respiratory failure or recommend oxygen, NIV, intubation, ICU admission, or discharge.',
    backendExecutable: false,
  },
  {
    toolId: NLU.sleepApneaAnalytics,
    toolName: 'Sleep Apnea Analytics',
    category: 'reference',
    description:
      'Sleep apnea analytics support for STOP-BANG context, symptoms, adherence trends, and review queues. Screening only.',
    path: '/tools/pulmonology/sleep-apnea-analytics',
    sidebarToolId: REGISTRY.sleepApneaAnalytics,
    chatSeed:
      'Help me review sleep apnea analytics: STOP-BANG context, symptoms, sleep study status if known, device adherence trend if provided, and follow-up queue prompts. Clinical decision support only; do not diagnose OSA or recommend CPAP, oral appliances, surgery, or sleep study ordering.',
    backendExecutable: false,
  },
  {
    toolId: NLU.pulmonaryTrendEngine,
    toolName: 'Pulmonary Trend Engine',
    category: 'reference',
    description:
      'Pulmonary trend support for oxygenation indices, symptoms, spirometry context, and serial respiratory observations.',
    path: '/tools/pulmonology/pulmonary-trend-engine',
    sidebarToolId: REGISTRY.pulmonaryTrendEngine,
    chatSeed:
      'Help me summarize pulmonary trends: SpO2, respiratory rate, oxygen requirement, PaO2/FiO2, ROX, spirometry context, symptoms, and unresolved deterioration signals. Clinical decision support only; do not diagnose or recommend treatment, oxygen escalation, ventilator settings, or disposition.',
    backendExecutable: false,
  },
  {
    toolId: NLU.respiratoryCommandCenter,
    toolName: 'Respiratory Command Center',
    category: 'reference',
    description:
      'Respiratory command-center workflow for oxygen, ventilator, COPD/asthma, and sleep-review operational queues.',
    path: '/tools/pulmonology/respiratory-command-center',
    sidebarToolId: REGISTRY.respiratoryCommandCenter,
    chatSeed:
      'Help me review respiratory command-center queues: oxygen escalation, ventilator monitoring, asthma/COPD reviews, sleep apnea analytics, bottlenecks, and unresolved alerts. Clinical decision support only; no automated orders, dispatch, bed moves, ventilator changes, or disposition recommendations.',
    backendExecutable: false,
  },
  {
    toolId: NLU.akiStagingAssistant,
    toolName: 'AKI Staging Assistant',
    category: 'calculator',
    description:
      'Guided AKI staging support using KDIGO creatinine and urine output context. Does not diagnose etiology or recommend therapy.',
    path: '/tools/nephrology/aki-staging-assistant',
    sidebarToolId: REGISTRY.akiStagingAssistant,
    chatSeed:
      'Help me structure AKI staging using baseline creatinine, current creatinine, timing, urine output context, and missing data. Clinical decision support only; do not diagnose AKI etiology and do not recommend fluids, diuretics, nephrotoxins to stop, dialysis, disposition, or medication dosing changes.',
    backendExecutable: false,
  },
  {
    toolId: NLU.dialysisReadinessHelper,
    toolName: 'Dialysis Readiness Helper',
    category: 'reference',
    description:
      'Dialysis readiness checklist support for access status, symptoms, labs, volume context, and nephrology handoff.',
    path: '/tools/nephrology/dialysis-readiness-helper',
    sidebarToolId: REGISTRY.dialysisReadinessHelper,
    chatSeed:
      'Help me organize dialysis readiness information: symptoms, volume context, potassium, acid-base status, uremic features, access status, current modality if any, and nephrology handoff questions. Clinical decision support only; do not initiate dialysis, set a dialysis prescription, recommend ultrafiltration, or determine disposition.',
    backendExecutable: false,
  },
  {
    toolId: NLU.electrolyteDisorderAssistant,
    toolName: 'Electrolyte Disorder Assistant',
    category: 'calculator',
    description:
      'Guided electrolyte disorder review for sodium, potassium, bicarbonate, osmolality, kidney function, and safety flags.',
    path: '/tools/nephrology/electrolyte-disorder-assistant',
    sidebarToolId: REGISTRY.electrolyteDisorderAssistant,
    chatSeed:
      'Help me review an electrolyte disorder: sodium, potassium, bicarbonate, chloride, glucose, osmolality, kidney function, symptoms, ECG concern if relevant, and missing labs. Clinical decision support only; do not recommend electrolyte replacement doses, hypertonic saline, insulin, bicarbonate, binders, correction rates, or medication dosing changes.',
    backendExecutable: false,
  },
  {
    toolId: NLU.renalMonitoringDashboard,
    toolName: 'Renal Monitoring Dashboard',
    category: 'reference',
    description:
      'Renal monitoring dashboard for creatinine, eGFR, urine output, electrolyte, acid-base, and missing-data review queues.',
    path: '/tools/nephrology/renal-monitoring-dashboard',
    sidebarToolId: REGISTRY.renalMonitoringDashboard,
    chatSeed:
      'Help me review a renal monitoring dashboard summary: creatinine/eGFR trends, urine output, electrolytes, acid-base markers, nephrotoxin exposure context if provided, missing data, and unresolved review items. Clinical decision support only; no automated orders, medication dosing, dialysis decisions, or disposition recommendations.',
    backendExecutable: false,
  },
  {
    toolId: NLU.ckdProgressionPredictor,
    toolName: 'CKD Progression Predictor',
    category: 'reference',
    description:
      'CKD progression workspace for eGFR slope, albuminuria, KFRE context, and longitudinal review prompts.',
    path: '/tools/nephrology/ckd-progression-predictor',
    sidebarToolId: REGISTRY.ckdProgressionPredictor,
    chatSeed:
      'Help me summarize CKD progression context: eGFR slope, albuminuria, KFRE inputs if available, blood pressure context, comorbidities, and missing follow-up data. Clinical decision support only; do not diagnose CKD chronicity, recommend medications, determine referral urgency, transplant referral, or dialysis initiation.',
    backendExecutable: false,
  },
  {
    toolId: NLU.dialysisUtilizationTracker,
    toolName: 'Dialysis Utilization Tracker',
    category: 'reference',
    description:
      'Dialysis utilization tracker for schedule adherence, access context, missed treatments, capacity, and review queues.',
    path: '/tools/nephrology/dialysis-utilization-tracker',
    sidebarToolId: REGISTRY.dialysisUtilizationTracker,
    chatSeed:
      'Help me review dialysis utilization: scheduled vs completed treatments, missed treatments, access issues, capacity bottlenecks, symptoms reported, and unresolved review queues. Clinical decision support and operations visibility only; do not change dialysis prescriptions, ultrafiltration goals, modality, or scheduling without dialysis team approval.',
    backendExecutable: false,
  },
  {
    toolId: NLU.electrolyteTrendEngine,
    toolName: 'Electrolyte Trend Engine',
    category: 'reference',
    description:
      'Electrolyte trend engine for sodium, potassium, bicarbonate, chloride, osmolality, and serial lab context.',
    path: '/tools/nephrology/electrolyte-trend-engine',
    sidebarToolId: REGISTRY.electrolyteTrendEngine,
    chatSeed:
      'Help me summarize electrolyte trends: sodium, potassium, chloride, bicarbonate, osmolality, glucose, kidney function, timing, symptoms, and missing data. Clinical decision support only; do not recommend replacement doses, correction rates, binders, insulin, bicarbonate, dialysis, or medication changes.',
    backendExecutable: false,
  },
  {
    toolId: NLU.fluidBalanceMonitor,
    toolName: 'Fluid Balance Monitor',
    category: 'reference',
    description:
      'Fluid balance monitor for intake/output, weight change, urine output, volume context, and handoff prompts.',
    path: '/tools/nephrology/fluid-balance-monitor',
    sidebarToolId: REGISTRY.fluidBalanceMonitor,
    chatSeed:
      'Help me review fluid balance: intake, output, urine output, weight change, edema or overload context, hemodynamics, kidney function, and missing data. Clinical decision support only; do not prescribe fluids, diuretics, ultrafiltration, dialysis, or monitoring frequency.',
    backendExecutable: false,
  },
  {
    toolId: NLU.diabetesCareAssistant,
    toolName: 'Diabetes Care Assistant',
    category: 'calculator',
    description:
      'Guided diabetes review for glucose trends, A1c context, complications, safety flags, and handoff prompts.',
    path: '/tools/endocrine/diabetes-care-assistant',
    sidebarToolId: REGISTRY.diabetesCareAssistant,
    chatSeed:
      'Help me structure a diabetes care review: glucose trend, A1c context, hypoglycemia or hyperglycemia episodes, complications, kidney function context, current regimen as documented, and missing data. Clinical decision support only; do not diagnose diabetes, do not recommend insulin or medication starts/stops/changes, do not calculate doses, and do not delay urgent hypoglycemia, DKA, or HHS pathways.',
    backendExecutable: false,
  },
  {
    toolId: NLU.dkaPathwayAssistant,
    toolName: 'DKA Pathway Assistant',
    category: 'calculator',
    description:
      'DKA pathway checklist support for glucose, ketones, anion gap, bicarbonate, osmolality, severity context, and urgent handoff.',
    path: '/tools/endocrine/dka-pathway-assistant',
    sidebarToolId: REGISTRY.dkaPathwayAssistant,
    chatSeed:
      'Help me organize a DKA pathway review: glucose, ketones, anion gap, bicarbonate, pH, potassium, sodium/corrected sodium, osmolality, mental status, fluids already documented, insulin already documented, and missing data. Clinical decision support only; do not diagnose DKA/HHS, do not recommend insulin, potassium, bicarbonate, or fluid dosing/rates, and do not delay emergency endocrine/critical-care protocols.',
    backendExecutable: false,
  },
  {
    toolId: NLU.thyroidDisorderAssistant,
    toolName: 'Thyroid Disorder Assistant',
    category: 'calculator',
    description:
      'Guided thyroid disorder review for TSH/free T4 context, symptoms, medication/pregnancy caveats, red flags, and follow-up prompts.',
    path: '/tools/endocrine/thyroid-disorder-assistant',
    sidebarToolId: REGISTRY.thyroidDisorderAssistant,
    chatSeed:
      'Help me structure a thyroid disorder review: TSH, free T4/T3 if available, symptoms, pregnancy/postpartum status, amiodarone/lithium/biotin context, vital-sign red flags, and follow-up gaps. Clinical decision support only; do not diagnose thyroid storm, myxedema coma, hypo/hyperthyroidism, or recommend levothyroxine, antithyroid drugs, beta blockers, iodine, steroids, or medication dose changes.',
    backendExecutable: false,
  },
  {
    toolId: NLU.metabolicSyndromeAssistant,
    toolName: 'Metabolic Syndrome Assistant',
    category: 'calculator',
    description:
      'Metabolic syndrome review using waist circumference, glucose, blood pressure, triglycerides, HDL, and missing data.',
    path: '/tools/endocrine/metabolic-syndrome-assistant',
    sidebarToolId: REGISTRY.metabolicSyndromeAssistant,
    chatSeed:
      'Help me review metabolic syndrome criteria: waist circumference, fasting glucose/A1c context, blood pressure, triglycerides, HDL, medications as documented, and missing data. Clinical decision support only; do not diagnose metabolic syndrome or recommend antihypertensives, lipid therapy, diabetes medications, weight-loss medication, surgery, diet, or exercise prescriptions.',
    backendExecutable: false,
  },
  {
    toolId: NLU.glucoseTelemetryDashboard,
    toolName: 'Glucose Telemetry Dashboard',
    category: 'reference',
    description:
      'Backend-backed glucose telemetry dashboard for CGM/point-of-care trends, freshness, hypoglycemia flags, and human review queues.',
    path: '/tools/endocrine/glucose-telemetry-dashboard',
    sidebarToolId: REGISTRY.glucoseTelemetryDashboard,
    chatSeed:
      'Help me review glucose telemetry dashboard context: CGM or point-of-care glucose trends, hypoglycemia flags, hyperglycemia patterns, data freshness, missing readings, and unresolved review items. Clinical decision support only; backend telemetry visibility only, no autonomous insulin changes, no dose recommendations, no alerts replacing bedside assessment.',
    backendExecutable: false,
  },
  {
    toolId: NLU.insulinTrendEngine,
    toolName: 'Insulin Trend Engine',
    category: 'reference',
    description:
      'Insulin trend review for documented insulin administration and glucose response context without dose recommendations.',
    path: '/tools/endocrine/insulin-trend-engine',
    sidebarToolId: REGISTRY.insulinTrendEngine,
    chatSeed:
      'Help me review insulin trends from documented administrations and glucose response context: timing, data gaps, hypoglycemia clusters, and protocol-governance questions. Clinical decision support only; backend trend visibility only, no insulin dosing automation, no dose calculation, no titration recommendation, and no medication change without explicitly governed protocols and clinician approval.',
    backendExecutable: false,
  },
  {
    toolId: NLU.endocrineMonitoringSystem,
    toolName: 'Endocrine Monitoring System',
    category: 'reference',
    description:
      'Endocrine monitoring workspace for glucose, thyroid, calcium, weight, metabolic labs, and missing-data queues.',
    path: '/tools/endocrine/endocrine-monitoring-system',
    sidebarToolId: REGISTRY.endocrineMonitoringSystem,
    chatSeed:
      'Help me review endocrine monitoring: glucose, thyroid labs, calcium, sodium/osmolality, anthropometrics, critical-value flags, missing data, and unresolved review queues. Clinical decision support only; backend monitoring visibility only, no autonomous orders, no insulin/dosing automation, and no medication or treatment recommendations.',
    backendExecutable: false,
  },
  {
    toolId: NLU.metabolicAnalytics,
    toolName: 'Metabolic Analytics',
    category: 'reference',
    description:
      'Metabolic analytics for anthropometrics, glucose/lipid context, metabolic syndrome factors, and review queues.',
    path: '/tools/endocrine/metabolic-analytics',
    sidebarToolId: REGISTRY.metabolicAnalytics,
    chatSeed:
      'Help me summarize metabolic analytics: BMI, BSA, waist-to-hip ratio, fasting glucose/A1c context, lipids if provided, blood pressure context, and missing data. Clinical decision support only; backend analytics visibility only, no diagnosis, no treatment plan, no medication dosing, and no diet or weight-loss prescription.',
    backendExecutable: false,
  },
  {
    toolId: NLU.continuousGlucoseCommandCenter,
    toolName: 'Continuous Glucose Command Center',
    category: 'reference',
    description:
      'CGM command-center view for glucose telemetry, freshness, hypoglycemia/hyperglycemia patterns, and unresolved review queues.',
    path: '/tools/endocrine/continuous-glucose-command-center',
    sidebarToolId: REGISTRY.continuousGlucoseCommandCenter,
    chatSeed:
      'Help me review continuous glucose command-center queues: CGM freshness, hypoglycemia events, sustained hyperglycemia patterns, sensor gaps, unresolved alerts, and handoff priorities. Clinical decision support and backend telemetry visibility only; no autonomous insulin changes, no dosing recommendations, no pump control, and no replacement for urgent bedside assessment.',
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
    toolId: NLU.giBleedWorkflowAssistant,
    toolName: 'GI Bleed Workflow Assistant',
    category: 'calculator',
    description:
      'Guided GI bleed review using GBS/Rockall context, hemodynamics, medications, comorbidities, and handoff prompts.',
    path: '/tools/calculators',
    sidebarToolId: REGISTRY.giBleedWorkflowAssistant,
    chatSeed:
      'Help me structure a GI bleed workflow review: hemodynamics, ongoing bleeding, melena/hematemesis, hemoglobin trend, BUN/urea, anticoagulants, liver disease, Glasgow-Blatchford or Rockall context, and handoff prompts. Clinical decision support only; do not recommend transfusion, endoscopy timing, medications, admission, discharge, or disposition, and do not delay urgent local GI bleed pathways.',
    backendExecutable: false,
  },
  {
    toolId: NLU.liverDiseaseAssistant,
    toolName: 'Liver Disease Assistant',
    category: 'calculator',
    description:
      'Guided liver disease review for Child-Pugh, MELD/MELD-Na, Maddrey DF, FIB-4/APRI, trends, and missing data.',
    path: '/tools/calculators',
    sidebarToolId: REGISTRY.liverDiseaseAssistant,
    chatSeed:
      'Help me structure a liver disease review: bilirubin, INR/PT, albumin, creatinine, sodium, ascites, encephalopathy, platelets, AST/ALT, Child-Pugh, MELD/MELD-Na, Maddrey DF, FIB-4/APRI context, and missing data. Clinical decision support only; do not diagnose cirrhosis or alcoholic hepatitis and do not recommend treatment, transplant listing, referral urgency, admission, discharge, or medication changes.',
    backendExecutable: false,
  },
  {
    toolId: NLU.pancreatitisWorkflowAssistant,
    toolName: 'Pancreatitis Workflow Assistant',
    category: 'calculator',
    description:
      'Guided pancreatitis severity review using Ranson, BISAP, organ-failure context, trends, and missing-data prompts.',
    path: '/tools/calculators',
    sidebarToolId: REGISTRY.pancreatitisWorkflowAssistant,
    chatSeed:
      'Help me structure an acute pancreatitis workflow review: timing, etiology context, Ranson criteria, BISAP, organ failure markers, BUN trend, calcium, oxygenation, imaging status if known, and missing data. Clinical decision support only; do not diagnose severity definitively and do not recommend fluids, antibiotics, nutrition, ICU admission, procedures, discharge, or disposition.',
    backendExecutable: false,
  },
  {
    toolId: NLU.giSurveillanceDashboard,
    toolName: 'GI Surveillance Dashboard',
    category: 'reference',
    description:
      'GI surveillance dashboard for endoscopy follow-up, pathology gaps, recall queues, and human review tracking.',
    path: '/tools/gastroenterology/gi-surveillance-dashboard',
    sidebarToolId: REGISTRY.giSurveillanceDashboard,
    chatSeed:
      'Help me review a GI surveillance dashboard summary: endoscopy follow-up queue, pathology status, recall gaps, overdue reviews, and unresolved clinician-review items. Clinical decision support only; do not recommend surveillance intervals, procedures, treatment, admission, discharge, or disposition.',
    backendExecutable: false,
  },
  {
    toolId: NLU.hepaticTrendAnalytics,
    toolName: 'Hepatic Trend Analytics',
    category: 'reference',
    description:
      'Hepatic trend analytics for synthetic function, cholestasis, platelets, MELD/Child-Pugh inputs, and missing labs.',
    path: '/tools/gastroenterology/hepatic-trend-analytics',
    sidebarToolId: REGISTRY.hepaticTrendAnalytics,
    chatSeed:
      'Help me summarize hepatic trends: bilirubin, INR/PT, albumin, sodium, creatinine, AST/ALT, platelets, MELD/Child-Pugh inputs, FIB-4/APRI context, and missing labs. Clinical decision support only; do not diagnose liver failure and do not recommend treatment, transplant listing, referral urgency, admission, discharge, or medication changes.',
    backendExecutable: false,
  },
  {
    toolId: NLU.endoscopyWorkflowAssistant,
    toolName: 'Endoscopy Workflow Assistant',
    category: 'reference',
    description:
      'Endoscopy workflow support for indication, preparation status, risk context, documentation, and follow-up queues.',
    path: '/tools/gastroenterology/endoscopy-workflow-assistant',
    sidebarToolId: REGISTRY.endoscopyWorkflowAssistant,
    chatSeed:
      'Help me organize an endoscopy workflow review: indication, preparation status, anticoagulant context if provided, GI bleed risk-score context if relevant, pathology follow-up, and unresolved documentation items. Clinical decision support only; do not recommend procedure timing, sedation, anticoagulant changes, treatment, admission, discharge, or disposition.',
    backendExecutable: false,
  },
  {
    toolId: NLU.cirrhosisMonitoringEngine,
    toolName: 'Cirrhosis Monitoring Engine',
    category: 'reference',
    description:
      'Cirrhosis monitoring workspace for decompensation features, liver scores, surveillance gaps, and review queues.',
    path: '/tools/gastroenterology/cirrhosis-monitoring-engine',
    sidebarToolId: REGISTRY.cirrhosisMonitoringEngine,
    chatSeed:
      'Help me review cirrhosis monitoring context: ascites, encephalopathy, variceal/history context if provided, bilirubin, INR, albumin, creatinine, sodium, MELD/MELD-Na, Child-Pugh, platelet trend, and surveillance gaps. Clinical decision support only; do not recommend treatment, transplant listing, procedures, referral urgency, admission, discharge, or disposition.',
    backendExecutable: false,
  },
  {
    toolId: NLU.giCommandCenter,
    toolName: 'GI Command Center',
    category: 'reference',
    description:
      'GI command-center workflow for GI bleed, liver disease, pancreatitis, endoscopy, and surveillance queues.',
    path: '/tools/gastroenterology/gi-command-center',
    sidebarToolId: REGISTRY.giCommandCenter,
    chatSeed:
      'Help me review GI command-center queues: GI bleed workflow, liver disease reviews, pancreatitis reviews, endoscopy workflow, surveillance dashboard gaps, unresolved alerts, and handoff priorities. Clinical decision support and operations visibility only; do not recommend treatment, procedures, admission, discharge, or disposition.',
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
    toolId: NLU.calculatorRecommenderAi,
    toolName: 'Calculator Recommendation AI',
    category: 'calculator',
    description:
      'Suggests shipped CareDroid calculators and risk scores from symptoms, chief complaint, and clinical keywords. Tool-selection support only.',
    path: '/tools/calculator-recommender',
    sidebarToolId: REGISTRY.calculatorRecommenderAi,
    chatSeed:
      'Recommend CareDroid calculators or risk scores for this clinical scenario based on symptoms, chief complaint, and keywords. Suggest only tools that exist in CareDroid. Do not diagnose, rule out disease, recommend treatment, or recommend disposition.',
    backendExecutable: false,
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
    sidebarToolId: 'dose-calculator',
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
    sidebarToolId: 'abg-interpreter',
    backendExecutable: false,
  },
  {
    toolId: 'procedures',
    toolName: 'Procedure Guide',
    category: 'reference',
    description:
      'Step-by-step procedural guidance and checklists — clinical decision support only; does not replace hands-on training, supervision, or institutional policy.',
    path: '/tools/procedures',
    sidebarToolId: 'procedures',
    chatSeed:
      'Walk me through a step-by-step clinical procedure with equipment checklist, key steps, common pitfalls, and when to stop or escalate. This is educational support only — confirm technique and indications with institutional policy and supervising clinician.',
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
    sidebarToolId: 'acls-protocol',
    chatSeed: 'Walk me through the ACLS algorithm for this cardiac arrest scenario:',
    backendExecutable: false,
  },
  {
    toolId: 'atls-protocol',
    toolName: 'ATLS Protocol',
    category: 'protocol',
    description: 'Trauma algorithms.',
    path: '/tools/protocols',
    sidebarToolId: 'atls-protocol',
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
    toolId: NLU.differentialAi,
    toolName: 'Differential Diagnosis Assistant',
    category: 'reference',
    description:
      'Structured differential diagnosis decision support from symptoms, labs, history, and demographics. Not a diagnosis.',
    path: '/tools/differential-ai',
    sidebarToolId: REGISTRY.differentialAi,
    chatSeed:
      'Generate a ranked differential diagnosis decision-support list from symptoms, labs, history, and demographics. Include supporting evidence, missing evidence, suggested calculators, and clearly state this is not a diagnosis.',
    backendExecutable: false,
  },
  {
    toolId: 'antibiotic-guide',
    toolName: 'Antibiotic Selection Guide',
    category: 'reference',
    description: 'Empiric antimicrobial choice.',
    path: '/tools/diagnosis',
    sidebarToolId: 'antibiotic-guide',
    chatSeed:
      'Discuss empiric antibiotic considerations for this infection scenario as educational decision support — cite guideline principles, resistance patterns, and patient factors. Do not prescribe, dose, or order antibiotics; require clinician review and local antimicrobial stewardship pathways.',
    backendExecutable: false,
  },
];

export const clinicalIntentTools = clinicalIntentToolsRaw.map((row) => ({
  ...row,
  postExecutable: ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS.includes(row.toolId),
  backendRouted: Boolean(row.backendExecutable),
  chatSeed: row.chatSeed ? ensureChatSeedGuardrails(row) : row.chatSeed,
}));

/** Calculator profiles that intentionally launch guided chat from the hub instead of a dedicated form. */
export const nluCalculatorHubOnly = [
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
    toolId: pecarnHeadChatConfig.toolId,
    name: pecarnHeadChatConfig.name,
    hubPath: pecarnHeadChatConfig.hubPath,
  },
  {
    toolId: nexusCSpineChatConfig.toolId,
    name: nexusCSpineChatConfig.name,
    hubPath: nexusCSpineChatConfig.hubPath,
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
    path: '/tools/calculators/sofa',
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
    id: 'apache-ii',
    name: 'APACHE II',
    description: 'ICU severity score using APACHE II acute physiology, GCS, age, and chronic health points.',
    path: '/tools/calculators/apache-ii',
    calcQuery: '/tools/calculators?calc=apache-ii',
    implementation: 'Client-side in emergencyCriticalCareCalculators.jsx (emergencyCriticalCareCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'curb-65',
    name: 'CURB-65',
    description: 'Community-acquired pneumonia severity (confusion, urea/BUN, RR, BP, age).',
    path: '/tools/calculators/curb-65',
    calcQuery: '/tools/calculators?calc=curb-65',
    implementation: 'Client-side in emergencyCriticalCareCalculators.jsx (emergencyCriticalCareCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'gcs',
    name: 'Glasgow Coma Scale',
    description: 'Consciousness scoring from eye, verbal, and motor responses.',
    path: '/tools/calculators/gcs',
    calcQuery: '/tools/calculators?calc=gcs',
    implementation: 'Client-side in emergencyCriticalCareCalculators.jsx (emergencyCriticalCareCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'mews',
    name: 'MEWS',
    description: 'Modified Early Warning Score from adult vitals and AVPU.',
    path: '/tools/calculators/mews',
    calcQuery: '/tools/calculators?calc=mews',
    implementation: 'Client-side in emergencyCriticalCareCalculators.jsx (emergencyCriticalCareCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'revised-trauma-score',
    name: 'Revised Trauma Score',
    description: 'Weighted trauma physiology score from coded GCS, systolic BP, and respiratory rate.',
    path: '/tools/calculators/revised-trauma-score',
    calcQuery: '/tools/calculators?calc=revised-trauma-score',
    implementation: 'Client-side in emergencyCriticalCareCalculators.jsx (emergencyCriticalCareCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'pews',
    name: 'PEWS',
    description: 'Pediatric Early Warning Score with pediatric caution labels.',
    path: '/tools/calculators/pews',
    calcQuery: '/tools/calculators?calc=pews',
    implementation: 'Client-side in emergencyCriticalCareCalculators.jsx (emergencyCriticalCareCalculators.js)',
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
    id: 'egfr-ckd-epi',
    name: 'eGFR CKD-EPI 2021',
    description: 'Race-free CKD-EPI creatinine eGFR estimate.',
    path: '/tools/calculators/egfr-ckd-epi',
    calcQuery: '/tools/calculators?calc=egfr-ckd-epi',
    implementation: 'Client-side in nephrologyCalculators.jsx (nephrologyCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'creatinine-clearance-cg',
    name: 'Creatinine Clearance Cockcroft-Gault',
    description: 'Creatinine clearance estimate from age, sex, weight, and serum creatinine.',
    path: '/tools/calculators/creatinine-clearance-cg',
    calcQuery: '/tools/calculators?calc=creatinine-clearance-cg',
    implementation: 'Client-side in nephrologyCalculators.jsx (nephrologyCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'fena',
    name: 'FeNa',
    description: 'Fractional excretion of sodium from serum and urine sodium/creatinine.',
    path: '/tools/calculators/fena',
    calcQuery: '/tools/calculators?calc=fena',
    implementation: 'Client-side in nephrologyCalculators.jsx (nephrologyCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'feurea',
    name: 'FeUrea',
    description: 'Fractional excretion of urea from BUN, urine urea nitrogen, and creatinine values.',
    path: '/tools/calculators/feurea',
    calcQuery: '/tools/calculators?calc=feurea',
    implementation: 'Client-side in nephrologyCalculators.jsx (nephrologyCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'kfre',
    name: 'Kidney Failure Risk Equation',
    description: 'Four-variable KFRE 2-year and 5-year kidney failure risk context.',
    path: '/tools/calculators/kfre',
    calcQuery: '/tools/calculators?calc=kfre',
    implementation: 'Client-side in nephrologyCalculators.jsx (nephrologyCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'bun-creatinine-ratio',
    name: 'BUN/Creatinine Ratio',
    description: 'BUN/creatinine ratio pattern support.',
    path: '/tools/calculators/bun-creatinine-ratio',
    calcQuery: '/tools/calculators?calc=bun-creatinine-ratio',
    implementation: 'Client-side in nephrologyCalculators.jsx (nephrologyCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'corrected-sodium',
    name: 'Corrected Sodium',
    description: 'Sodium correction for hyperglycemia context.',
    path: '/tools/calculators/corrected-sodium',
    calcQuery: '/tools/calculators?calc=corrected-sodium',
    implementation: 'Client-side in nephrologyCalculators.jsx (nephrologyCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'free-water-deficit',
    name: 'Free Water Deficit',
    description: 'Estimated free water deficit from sodium, weight, TBW factor, and target sodium.',
    path: '/tools/calculators/free-water-deficit',
    calcQuery: '/tools/calculators?calc=free-water-deficit',
    implementation: 'Client-side in nephrologyCalculators.jsx (nephrologyCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'osmolal-gap',
    name: 'Osmolal Gap',
    description: 'Measured vs calculated serum osmolality gap with optional ethanol.',
    path: '/tools/calculators/osmolal-gap',
    calcQuery: '/tools/calculators?calc=osmolal-gap',
    implementation: 'Client-side in nephrologyCalculators.jsx (nephrologyCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'homa-ir',
    name: 'HOMA-IR',
    description: 'Insulin resistance estimate from fasting glucose and fasting insulin.',
    path: '/tools/calculators/homa-ir',
    calcQuery: '/tools/calculators?calc=homa-ir',
    implementation: 'Client-side in endocrineMetabolicCalculators.jsx (endocrineMetabolicCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'corrected-calcium',
    name: 'Corrected Calcium',
    description: 'Albumin-corrected total calcium estimate.',
    path: '/tools/calculators/corrected-calcium',
    calcQuery: '/tools/calculators?calc=corrected-calcium',
    implementation: 'Client-side in endocrineMetabolicCalculators.jsx (endocrineMetabolicCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'serum-osmolality',
    name: 'Serum Osmolality',
    description: 'Calculated serum osmolality from sodium, glucose, BUN, and optional ethanol.',
    path: '/tools/calculators/serum-osmolality',
    calcQuery: '/tools/calculators?calc=serum-osmolality',
    implementation: 'Client-side in endocrineMetabolicCalculators.jsx (endocrineMetabolicCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'bsa',
    name: 'Body Surface Area',
    description: 'Mosteller body surface area estimate from height and weight.',
    path: '/tools/calculators/bsa',
    calcQuery: '/tools/calculators?calc=bsa',
    implementation: 'Client-side in endocrineMetabolicCalculators.jsx (endocrineMetabolicCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'ideal-body-weight',
    name: 'Ideal Body Weight',
    description: 'Devine ideal body weight estimate from sex and height.',
    path: '/tools/calculators/ideal-body-weight',
    calcQuery: '/tools/calculators?calc=ideal-body-weight',
    implementation: 'Client-side in endocrineMetabolicCalculators.jsx (endocrineMetabolicCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'adjusted-body-weight',
    name: 'Adjusted Body Weight',
    description: 'Adjusted body weight estimate using IBW, actual weight, and a correction factor.',
    path: '/tools/calculators/adjusted-body-weight',
    calcQuery: '/tools/calculators?calc=adjusted-body-weight',
    implementation: 'Client-side in endocrineMetabolicCalculators.jsx (endocrineMetabolicCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'waist-hip-ratio',
    name: 'Waist-to-Hip Ratio',
    description: 'Central adiposity estimate from waist and hip circumference.',
    path: '/tools/calculators/waist-hip-ratio',
    calcQuery: '/tools/calculators?calc=waist-hip-ratio',
    implementation: 'Client-side in endocrineMetabolicCalculators.jsx (endocrineMetabolicCalculators.js)',
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
    id: 'bode-index',
    name: 'BODE Index',
    description: 'COPD prognosis context from BMI, FEV1, 6-minute walk distance, and mMRC dyspnea.',
    path: '/tools/calculators/bode-index',
    calcQuery: '/tools/calculators?calc=bode-index',
    implementation: 'Client-side in pulmonologyCalculators.jsx (pulmonologyCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'copd-gold-assessment',
    name: 'COPD GOLD Assessment',
    description: 'GOLD A/B/E grouping and optional spirometric grade context.',
    path: '/tools/calculators/copd-gold-assessment',
    calcQuery: '/tools/calculators?calc=copd-gold-assessment',
    implementation: 'Client-side in pulmonologyCalculators.jsx (pulmonologyCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'aa-gradient',
    name: 'A-a Gradient',
    description: 'Alveolar-arterial oxygen gradient from ABG values and FiO2 assumptions.',
    path: '/tools/calculators/aa-gradient',
    calcQuery: '/tools/calculators?calc=aa-gradient',
    implementation: 'Client-side in pulmonologyCalculators.jsx (pulmonologyCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'pao2-fio2-ratio',
    name: 'PaO2/FiO2 Ratio',
    description: 'Oxygenation ratio support from PaO2 and FiO2.',
    path: '/tools/calculators/pao2-fio2-ratio',
    calcQuery: '/tools/calculators?calc=pao2-fio2-ratio',
    implementation: 'Client-side in pulmonologyCalculators.jsx (pulmonologyCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'rox-index',
    name: 'ROX Index',
    description: 'SpO2/FiO2 divided by respiratory rate for oxygenation monitoring context.',
    path: '/tools/calculators/rox-index',
    calcQuery: '/tools/calculators?calc=rox-index',
    implementation: 'Client-side in pulmonologyCalculators.jsx (pulmonologyCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'pneumonia-severity-index',
    name: 'Pneumonia Severity Index',
    description: 'Community-acquired pneumonia risk class context.',
    path: '/tools/calculators/pneumonia-severity-index',
    calcQuery: '/tools/calculators?calc=pneumonia-severity-index',
    implementation: 'Client-side in pulmonologyCalculators.jsx (pulmonologyCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'asthma-severity-score',
    name: 'Asthma Severity Score',
    description: 'Acute asthma exacerbation severity feature helper.',
    path: '/tools/calculators/asthma-severity-score',
    calcQuery: '/tools/calculators?calc=asthma-severity-score',
    implementation: 'Client-side in pulmonologyCalculators.jsx (pulmonologyCalculators.js)',
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
    id: 'heart-score',
    name: 'HEART score',
    description: 'Chest pain risk stratification (history, ECG, age, risk factors, troponin; 0–10).',
    path: '/tools/calculators/heart-score',
    calcQuery: '/tools/calculators?calc=heart-score',
    implementation: 'Client-side in pr8ClinicalBatchCalculators.jsx (heartScoreCalculator.js)',
    orchestratorId: null,
  },
  {
    id: 'centor-mcisaac',
    name: 'Centor / McIsaac',
    description: 'Strep pharyngitis probability (modified Centor/McIsaac; 0–5).',
    path: '/tools/calculators/centor-mcisaac',
    calcQuery: '/tools/calculators?calc=centor-mcisaac',
    implementation: 'Client-side in pr8ClinicalBatchCalculators.jsx (centorMcisaacCalculator.js)',
    orchestratorId: null,
  },
  {
    id: 'bishop-score',
    name: 'Bishop score',
    description: 'Cervical favourability for labour induction (0–13).',
    path: '/tools/calculators/bishop-score',
    calcQuery: '/tools/calculators?calc=bishop-score',
    implementation: 'Client-side in pr8ClinicalBatchCalculators.jsx (bishopScoreCalculator.js)',
    orchestratorId: null,
  },
  {
    id: 'apgar-score',
    name: 'Apgar score',
    description: 'Newborn status at 1 and 5 minutes (0–10 per timepoint).',
    path: '/tools/calculators/apgar-score',
    calcQuery: '/tools/calculators?calc=apgar-score',
    implementation: 'Client-side in pr8ClinicalBatchCalculators.jsx (apgarScoreCalculator.js)',
    orchestratorId: null,
  },
  {
    id: 'braden-scale',
    name: 'Braden scale',
    description: 'Pressure injury risk (6 subscales; 6–23).',
    path: '/tools/calculators/braden-scale',
    calcQuery: '/tools/calculators?calc=braden-scale',
    implementation: 'Client-side in pr8ClinicalBatchCalculators.jsx (bradenScaleCalculator.js)',
    orchestratorId: null,
  },
  {
    id: 'morse-fall-scale',
    name: 'Morse Fall Scale',
    description: 'Inpatient fall risk (0–125).',
    path: '/tools/calculators/morse-fall-scale',
    calcQuery: '/tools/calculators?calc=morse-fall-scale',
    implementation: 'Client-side in pr8ClinicalBatchCalculators.jsx (morseFallScaleCalculator.js)',
    orchestratorId: null,
  },
  {
    id: 'ranson-criteria',
    name: 'Ranson criteria',
    description: 'Acute pancreatitis severity (admission + 48 h; 0–11).',
    path: '/tools/calculators/ranson-criteria',
    calcQuery: '/tools/calculators?calc=ranson-criteria',
    implementation: 'Client-side in pr8ClinicalBatchCalculators.jsx (ransonCriteriaCalculator.js)',
    orchestratorId: null,
  },
  {
    id: 'bisap-score',
    name: 'BISAP score',
    description: 'Early pancreatitis mortality risk (0–5).',
    path: '/tools/calculators/bisap-score',
    calcQuery: '/tools/calculators?calc=bisap-score',
    implementation: 'Client-side in pr8ClinicalBatchCalculators.jsx (bisapScoreCalculator.js)',
    orchestratorId: null,
  },
  {
    id: 'fib4',
    name: 'FIB-4',
    description: 'Liver fibrosis risk index from age, AST, ALT, platelets.',
    path: '/tools/calculators/fib4',
    calcQuery: '/tools/calculators?calc=fib4',
    implementation: 'Client-side in pr8ClinicalBatchCalculators.jsx (fib4Calculator.js)',
    orchestratorId: null,
  },
  {
    id: 'maddrey-discriminant-function',
    name: 'Maddrey Discriminant Function',
    description: 'Alcoholic hepatitis severe-range risk context from PT prolongation and bilirubin.',
    path: '/tools/calculators/maddrey-discriminant-function',
    calcQuery: '/tools/calculators?calc=maddrey-discriminant-function',
    implementation: 'Client-side in hepatologyGiCalculators.jsx (hepatologyGiCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'apri',
    name: 'APRI',
    description: 'AST to Platelet Ratio Index fibrosis screening context.',
    path: '/tools/calculators/apri',
    calcQuery: '/tools/calculators?calc=apri',
    implementation: 'Client-side in hepatologyGiCalculators.jsx (hepatologyGiCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'glasgow-blatchford-score',
    name: 'Glasgow-Blatchford Score',
    description: 'Pre-endoscopy upper GI bleeding risk stratification support.',
    path: '/tools/calculators/glasgow-blatchford-score',
    calcQuery: '/tools/calculators?calc=glasgow-blatchford-score',
    implementation: 'Client-side in hepatologyGiCalculators.jsx (hepatologyGiCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'rockall-score',
    name: 'Rockall Score',
    description: 'Upper GI bleeding risk score using clinical and endoscopic findings.',
    path: '/tools/calculators/rockall-score',
    calcQuery: '/tools/calculators?calc=rockall-score',
    implementation: 'Client-side in hepatologyGiCalculators.jsx (hepatologyGiCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'framingham-risk',
    name: 'Framingham CHD risk',
    description: '10-year hard CHD risk (Framingham ATP III points; ages 30–74).',
    path: '/tools/calculators/framingham-risk',
    calcQuery: '/tools/calculators?calc=framingham-risk',
    implementation: 'Client-side in pr8ClinicalBatchCalculators.jsx (framinghamRiskCalculator.js)',
    orchestratorId: null,
  },
  {
    id: 'abcd2',
    name: 'ABCD² score',
    description: 'TIA short-term stroke risk (age, BP, clinical features, duration, diabetes; 0–7).',
    path: '/tools/calculators/abcd2',
    calcQuery: '/tools/calculators?calc=abcd2',
    implementation: 'Client-side in abcd2Calculator.jsx (abcd2Calculator.js)',
    orchestratorId: null,
  },
  {
    id: 'shock-index',
    name: 'Shock Index',
    description: 'Hemodynamic screening index from heart rate / systolic blood pressure.',
    path: '/tools/calculators/shock-index',
    calcQuery: '/tools/calculators?calc=shock-index',
    implementation: 'Client-side in nextWaveCalculators.jsx (nextWaveCalculatorUtils.js)',
    orchestratorId: null,
  },
  {
    id: 'anion-gap',
    name: 'Anion Gap',
    description: 'Serum anion gap with optional albumin correction.',
    path: '/tools/calculators/anion-gap',
    calcQuery: '/tools/calculators?calc=anion-gap',
    implementation: 'Client-side in nextWaveCalculators.jsx (nextWaveCalculatorUtils.js)',
    orchestratorId: null,
  },
  {
    id: 'rass',
    name: 'RASS',
    description: 'Richmond Agitation-Sedation Scale from +4 combative to -5 unarousable.',
    path: '/tools/calculators/rass',
    calcQuery: '/tools/calculators?calc=rass',
    implementation: 'Client-side in nextWaveCalculators.jsx (nextWaveCalculatorUtils.js)',
    orchestratorId: null,
  },
  {
    id: 'gfr',
    name: 'eGFR (CKD-EPI)',
    description: 'Kidney function estimate.',
    path: '/tools/calculators/gfr',
    calcQuery: '/tools/calculators?calc=gfr',
    implementation: 'Client-side in Calculators.jsx',
    orchestratorId: null,
  },
  {
    id: 'bmi',
    name: 'BMI',
    description: 'Body mass index.',
    path: '/tools/calculators/bmi',
    calcQuery: '/tools/calculators?calc=bmi',
    implementation: 'Client-side in Calculators.jsx',
    orchestratorId: null,
  },
  {
    id: 'chads2vasc',
    name: 'CHA2DS2-VASc',
    description: 'AF stroke risk.',
    path: '/tools/calculators/chads2vasc',
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
    backendExecutors: backendToolCount || clinicalIntentTools.filter((t) => t.postExecutable).length,
  };
}

/** NLU tools with no dedicated page — launch via chat from suite or catalog */
export const chatOnlyClinicalTools = clinicalIntentTools.filter((t) => !t.path);

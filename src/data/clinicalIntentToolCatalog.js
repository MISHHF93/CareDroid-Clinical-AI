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
    toolId: NLU.dukeTreadmillScore,
    toolName: 'Duke Treadmill Score',
    category: 'calculator',
    description:
      'Exercise treadmill prognostic score from exercise time, ST deviation, and angina index. Decision support only; does not clear patients for discharge or exercise.',
    path: '/tools/calculators/duke-treadmill-score',
    sidebarToolId: REGISTRY.dukeTreadmillScore,
    chatSeed:
      'Help me calculate the Duke Treadmill Score from exercise duration, ST-segment deviation, and exercise angina index. Decision support only; do not use for unstable ACS, uninterpretable ECG, or treatment/disposition decisions.',
    backendExecutable: false,
  },
  {
    toolId: NLU.reynoldsRiskScore,
    toolName: 'Reynolds Risk Score Helper',
    category: 'calculator',
    description:
      'Cardiovascular prevention risk context using Reynolds inputs including hs-CRP and parental MI. Helper only; exact risk requires validated Reynolds implementation.',
    path: '/tools/calculators/reynolds-risk-score',
    sidebarToolId: REGISTRY.reynoldsRiskScore,
    chatSeed:
      'Help me review Reynolds Risk Score inputs (age, sex, blood pressure, cholesterol, hs-CRP, smoking, parental MI, diabetes/HbA1c where applicable). Clinical decision support only; do not recommend statins, aspirin, or blood pressure therapy.',
    backendExecutable: false,
  },
  {
    toolId: NLU.hcmSuddenDeathRisk,
    toolName: 'HCM Sudden Death Risk',
    category: 'calculator',
    description:
      'HCM Risk-SCD 5-year sudden cardiac death risk context for specialist review. Does not recommend ICD placement or non-placement.',
    path: '/tools/calculators/hcm-sudden-death-risk',
    sidebarToolId: REGISTRY.hcmSuddenDeathRisk,
    chatSeed:
      'Help me calculate HCM Risk-SCD context from age, max wall thickness, left atrial diameter, LVOT gradient, family history of SCD, NSVT, and unexplained syncope. Clinical decision support only; do not recommend ICD placement or non-placement.',
    backendExecutable: false,
  },
  {
    toolId: NLU.chads2,
    toolName: 'CHADS2 Score',
    category: 'calculator',
    description:
      'Older atrial fibrillation stroke-risk score using CHF, hypertension, age, diabetes, and stroke/TIA history. Does not recommend anticoagulation.',
    path: '/tools/calculators/chads2',
    sidebarToolId: REGISTRY.chads2,
    chatSeed:
      'Help me calculate CHADS2 for atrial fibrillation stroke-risk context using CHF, hypertension, age 75 or older, diabetes, and prior stroke/TIA. Clinical decision support only; do not recommend anticoagulation or medication changes.',
    backendExecutable: false,
  },
  {
    toolId: NLU.heartFailureStaging,
    toolName: 'Heart Failure Staging Helper',
    category: 'calculator',
    description:
      'ACC/AHA heart failure stage documentation helper (A-D). Does not diagnose heart failure, assign NYHA class, or recommend therapy.',
    path: '/tools/calculators/heart-failure-staging',
    sidebarToolId: REGISTRY.heartFailureStaging,
    chatSeed:
      'Help me apply ACC/AHA heart failure staging (A-D) from risk factors, structural heart disease, symptoms, and advanced/refractory features. Clinical decision support only; do not diagnose heart failure or recommend diuretics, devices, admission, or advanced therapy.',
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
    toolId: NLU.cage,
    toolName: 'CAGE (alcohol screen)',
    category: 'calculator',
    description:
      'Screening only: CAGE alcohol questionnaire (0-4). Does not diagnose alcohol use disorder or provide withdrawal-management advice.',
    path: '/tools/calculators/cage',
    sidebarToolId: REGISTRY.cage,
    chatSeed:
      'Help me complete the CAGE alcohol screen and interpret the score as screening only. Do not diagnose alcohol use disorder, do not recommend detox or medications, and route intoxication, withdrawal, co-ingestion, trauma, pregnancy, or immediate safety concerns to local urgent pathways.',
    backendExecutable: false,
  },
  {
    toolId: NLU.mmse,
    toolName: 'MMSE score entry',
    category: 'calculator',
    description:
      'Screening only: MMSE domain score entry from governed administration. Does not diagnose dementia, delirium, or capacity.',
    path: '/tools/calculators/mmse',
    sidebarToolId: REGISTRY.mmse,
    chatSeed:
      'Help me enter MMSE domain scores from a governed administration and summarize the total as cognitive screening support only. Do not diagnose dementia, delirium, cognitive impairment, or capacity; do not recommend medications. Acute confusion, neurologic deficits, intoxication, trauma, infection, hypoxia, or rapidly changing mental status requires urgent medical evaluation first.',
    backendExecutable: false,
  },
  {
    toolId: NLU.mocaPlaceholderWorkflow,
    toolName: 'MoCA placeholder workflow',
    category: 'calculator',
    description:
      'Governance workflow only: MoCA placeholder that does not show items, administer MoCA, calculate a score, or diagnose cognitive impairment.',
    path: '/tools/calculators/moca-placeholder-workflow',
    sidebarToolId: REGISTRY.mocaPlaceholderWorkflow,
    chatSeed:
      'Help me check MoCA workflow readiness: official form/version, required training, language and sensory accommodations, and clinician review plan. This placeholder does not administer or score MoCA, does not show MoCA items, does not diagnose cognitive impairment, and does not recommend medications or treatment.',
    backendExecutable: false,
  },
  {
    toolId: NLU.pcl5,
    toolName: 'PCL-5 (PTSD symptom screen)',
    category: 'calculator',
    description:
      'Screening only: PCL-5 PTSD symptom score entry (0-80) with current safety concern flag. Does not diagnose PTSD.',
    path: '/tools/calculators/pcl5',
    sidebarToolId: REGISTRY.pcl5,
    chatSeed:
      'Help me enter PCL-5 item scores and summarize the total as PTSD symptom screening support only. Do not diagnose PTSD, establish causality, or recommend medications or therapy. If self-harm, suicidal ideation, acute danger, severe dissociation, or inability to maintain safety is present, stop routine scoring and arrange immediate safety assessment and crisis resources.',
    backendExecutable: false,
  },
  {
    toolId: NLU.mdq,
    toolName: 'Mood Disorder Questionnaire (MDQ)',
    category: 'calculator',
    description:
      'Screening only: MDQ bipolar-spectrum screening summary. Does not diagnose bipolar disorder, mania, hypomania, or medication need.',
    path: '/tools/calculators/mdq',
    sidebarToolId: REGISTRY.mdq,
    chatSeed:
      'Help me summarize the MDQ using symptom count, same-period symptoms, impairment, and urgent safety flags. Screening only; do not diagnose bipolar disorder, mania, hypomania, psychosis, or recommend medications. Psychosis, unsafe behavior, suicidal ideation, violence risk, or inability to maintain safety requires urgent human review before routine screening.',
    backendExecutable: false,
  },
  {
    toolId: NLU.epworthSleepinessScale,
    toolName: 'Epworth Sleepiness Scale',
    category: 'calculator',
    description:
      'Screening only: Epworth Sleepiness Scale (0-24). Does not diagnose sleep apnea, narcolepsy, or medication effects.',
    path: '/tools/calculators/epworth-sleepiness-scale',
    sidebarToolId: REGISTRY.epworthSleepinessScale,
    chatSeed:
      'Help me complete the Epworth Sleepiness Scale and summarize daytime sleepiness as screening support only. Do not diagnose sleep apnea, narcolepsy, or medication effects, do not determine driving or work clearance, and flag safety-sensitive sleepiness for prompt human review.',
    backendExecutable: false,
  },
  {
    toolId: NLU.columbiaSuicideSeverityWorkflow,
    toolName: 'Columbia suicide severity workflow entry',
    category: 'calculator',
    description:
      'Workflow entry only: suicide-risk routing support with immediate safety review messaging. Does not administer or score official C-SSRS.',
    path: '/tools/calculators/columbia-suicide-severity-workflow',
    sidebarToolId: REGISTRY.columbiaSuicideSeverityWorkflow,
    chatSeed:
      'Help me document a Columbia suicide severity workflow entry: ideation disclosure, intent or plan, recent suicidal or preparatory behavior, immediate safety status, and direct human review. This is not official C-SSRS scoring and does not clear risk. Any suicidal ideation, intent, plan, behavior, or inability to maintain safety requires immediate safety assessment, local psychiatric emergency pathways, emergency services when needed, and crisis resources such as 988 in the U.S. when applicable.',
    backendExecutable: false,
  },
  {
    toolId: NLU.mentalHealthScreeningAssistant,
    toolName: 'Mental Health Screening Assistant',
    category: 'calculator',
    description:
      'Guided mental-health screening workflow across mood, anxiety, trauma, sleep, substance-use, and cognitive screens.',
    path: '/tools/psychiatry/mental-health-screening-assistant',
    sidebarToolId: REGISTRY.mentalHealthScreeningAssistant,
    chatSeed:
      'Help me choose and document mental-health screening tools across PHQ-9, GAD-7, PCL-5, MDQ, Epworth, AUDIT-C/CAGE, MMSE, and MoCA workflow readiness. Screening decision support only; do not diagnose, do not recommend medications or therapy, require human review, and prioritize crisis, psychosis, intoxication, withdrawal, delirium, or medical emergency pathways before chat.',
    backendExecutable: false,
  },
  {
    toolId: NLU.suicideRiskWorkflowAssistant,
    toolName: 'Suicide Risk Workflow Assistant',
    category: 'calculator',
    description:
      'Guided suicide-risk workflow support for PHQ-9 item 9, Columbia workflow flags, direct review, and crisis handoff.',
    path: '/tools/psychiatry/suicide-risk-workflow-assistant',
    sidebarToolId: REGISTRY.suicideRiskWorkflowAssistant,
    chatSeed:
      'Help me organize suicide-risk workflow documentation from PHQ-9 item 9 and Columbia workflow flags: ideation, intent, plan, behavior, immediate safety, protective context, and direct clinician/crisis review. Decision support only; do not diagnose, do not clear risk, do not recommend medications or therapy, and immediately prioritize safety assessment, emergency services, local psychiatric emergency pathways, and crisis resources such as 988 in the U.S. when applicable.',
    backendExecutable: false,
  },
  {
    toolId: NLU.substanceUseScreeningAssistant,
    toolName: 'Substance Use Screening Assistant',
    category: 'calculator',
    description:
      'Guided substance-use screening workflow for AUDIT-C, CAGE, intoxication/withdrawal context, and local referral prompts.',
    path: '/tools/psychiatry/substance-use-screening-assistant',
    sidebarToolId: REGISTRY.substanceUseScreeningAssistant,
    chatSeed:
      'Help me organize substance-use screening with AUDIT-C, CAGE, substance pattern, intoxication/withdrawal concerns, co-ingestions, pregnancy, trauma, safety concerns, and follow-up prompts. Screening decision support only; do not diagnose substance use disorder, do not recommend detox, medications, or treatment programs, and prioritize overdose, withdrawal, intoxication, co-ingestion, trauma, or immediate danger pathways.',
    backendExecutable: false,
  },
  {
    toolId: NLU.cognitiveScreeningAssistant,
    toolName: 'Cognitive Screening Assistant',
    category: 'calculator',
    description:
      'Guided cognitive screening workflow for MMSE score entry, MoCA governance, delirium flags, accommodations, and clinician review.',
    path: '/tools/psychiatry/cognitive-screening-assistant',
    sidebarToolId: REGISTRY.cognitiveScreeningAssistant,
    chatSeed:
      'Help me organize cognitive screening with MMSE score entry, MoCA workflow readiness, baseline function, collateral history, language/sensory/motor accommodations, medication/substance context, and delirium flags. Screening decision support only; do not diagnose dementia, delirium, cognitive impairment, or capacity, do not recommend medications, and prioritize acute confusion, neurologic deficit, trauma, hypoxia, infection, or intoxication pathways.',
    backendExecutable: false,
  },
  {
    toolId: NLU.behavioralAnalyticsDashboard,
    toolName: 'Behavioral Analytics Dashboard',
    category: 'reference',
    description:
      'Dashboard concept for behavioral-health screening volumes, positive-screen queues, follow-up status, and safety-review gaps.',
    path: '/tools/psychiatry/behavioral-analytics-dashboard',
    sidebarToolId: REGISTRY.behavioralAnalyticsDashboard,
    chatSeed:
      'Help me review behavioral analytics dashboard context: screening volumes, positive-screen queues, follow-up status, unresolved PHQ-9 item 9 or Columbia workflow flags, data freshness, and human review status. Monitoring visibility and decision support only; no diagnosis, no medication or therapy advice, no autonomous escalation, and crisis pathways take priority.',
    backendExecutable: false,
  },
  {
    toolId: NLU.screeningTrendEngine,
    toolName: 'Screening Trend Engine',
    category: 'reference',
    description: 'Trend engine concept for serial psychiatry screening scores and review queues.',
    path: '/tools/psychiatry/screening-trend-engine',
    sidebarToolId: REGISTRY.screeningTrendEngine,
    chatSeed:
      'Help me review screening trend engine context: serial PHQ-9, GAD-7, PCL-5, MDQ, AUDIT-C/CAGE, Epworth, MMSE, and MoCA workflow status, score changes, missing data, and review queues. Trend visibility and decision support only; no diagnosis, no treatment or medication recommendations, and human interpretation is required.',
    backendExecutable: false,
  },
  {
    toolId: NLU.psychiatryMonitoringDashboard,
    toolName: 'Psychiatry Monitoring Dashboard',
    category: 'reference',
    description:
      'Monitoring dashboard concept for psychiatry review queues, repeated screens, unresolved safety flags, and handoff status.',
    path: '/tools/psychiatry/psychiatry-monitoring-dashboard',
    sidebarToolId: REGISTRY.psychiatryMonitoringDashboard,
    chatSeed:
      'Help me review psychiatry monitoring dashboard context: repeated screens, unresolved safety flags, follow-up gaps, review queues, and care-team handoff status. Monitoring decision support only; no diagnosis, no medication or therapy recommendations, no autonomous escalation, and crisis pathways take priority.',
    backendExecutable: false,
  },
  {
    toolId: NLU.crisisEscalationAuditLog,
    toolName: 'Crisis Escalation Audit Log',
    category: 'reference',
    description:
      'Audit-log concept for crisis escalation events, PHQ-9 item 9, Columbia workflow flags, and direct review status.',
    path: '/tools/psychiatry/crisis-escalation-audit-log',
    sidebarToolId: REGISTRY.crisisEscalationAuditLog,
    chatSeed:
      'Help me review crisis escalation audit-log context: PHQ-9 item 9 alerts, Columbia workflow flags, crisis-resource display, direct-review status, timestamps, and unresolved escalation gaps. Audit visibility and decision support only; no risk clearance, no diagnosis, no medication or therapy advice, and immediate safety workflows take priority.',
    backendExecutable: false,
  },
  {
    toolId: NLU.populationScreeningDashboard,
    toolName: 'Population Screening Dashboard',
    category: 'reference',
    description:
      'Population screening dashboard concept for panel-level completion, positive screens, follow-up gaps, and data quality.',
    path: '/tools/psychiatry/population-screening-dashboard',
    sidebarToolId: REGISTRY.populationScreeningDashboard,
    chatSeed:
      'Help me review population screening dashboard context: panel completion rates, positive-screen queues, follow-up gaps, equity/data-quality checks, and human review status. Population health visibility and decision support only; no individual diagnosis, no treatment or medication recommendations, and crisis pathways take priority.',
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
    toolId: NLU.huntHessScale,
    toolName: 'Hunt-Hess Scale',
    category: 'calculator',
    description:
      'Aneurysmal subarachnoid hemorrhage clinical severity grade. Does not replace emergency SAH evaluation or neurosurgical pathways.',
    path: '/tools/calculators/hunt-hess-scale',
    sidebarToolId: REGISTRY.huntHessScale,
    chatSeed:
      'Help me document Hunt-Hess clinical grade for suspected aneurysmal subarachnoid hemorrhage. Clinical decision support only; do not diagnose SAH, do not recommend aneurysm treatment, and do not delay emergency neuroimaging, airway/hemodynamic support, or neurosurgical consultation.',
    backendExecutable: false,
  },
  {
    toolId: NLU.ichScore,
    toolName: 'ICH Score',
    category: 'calculator',
    description:
      'Intracerebral hemorrhage severity score from GCS, hematoma volume, intraventricular hemorrhage, infratentorial origin, and age.',
    path: '/tools/calculators/ich-score',
    sidebarToolId: REGISTRY.ichScore,
    chatSeed:
      'Help me calculate ICH Score from GCS, hematoma volume, intraventricular hemorrhage, infratentorial origin, and age. Clinical decision support only; do not diagnose hemorrhage type, do not recommend BP targets, reversal, surgery, transfer, or disposition, and do not delay emergency imaging or stroke/neurosurgery pathways.',
    backendExecutable: false,
  },
  {
    toolId: NLU.fourScore,
    toolName: 'FOUR Score',
    category: 'calculator',
    description:
      'Coma scale using eye, motor, brainstem reflex, and respiration components. Airway and neurocritical-care pathways take priority.',
    path: '/tools/calculators/four-score',
    sidebarToolId: REGISTRY.fourScore,
    chatSeed:
      'Help me document FOUR Score components: eye response, motor response, brainstem reflexes, and respiration. Clinical decision support only; do not diagnose coma cause, brain death, or prognosis, and do not delay airway, ventilation, seizure, trauma, stroke, or neurocritical-care evaluation.',
    backendExecutable: false,
  },
  {
    toolId: NLU.modifiedRankinScale,
    toolName: 'Modified Rankin Scale',
    category: 'calculator',
    description:
      'Global disability outcome scale after stroke or neurologic illness. Does not recommend acute treatment or disposition.',
    path: '/tools/calculators/modified-rankin-scale',
    sidebarToolId: REGISTRY.modifiedRankinScale,
    chatSeed:
      'Help me document modified Rankin Scale level from functional status and dependence. Clinical decision support only; outcome documentation only, not a diagnosis and not an acute treatment, discharge, rehab, or placement recommendation. Do not delay urgent evaluation for new or worsening neurologic deficits to complete this outcome score.',
    backendExecutable: false,
  },
  {
    toolId: NLU.nihssSummaryView,
    toolName: 'NIHSS Summary View',
    category: 'calculator',
    description:
      'NIH Stroke Scale item summary for stroke exam documentation. Does not replace urgent stroke activation or imaging.',
    path: '/tools/calculators/nihss-summary-view',
    sidebarToolId: REGISTRY.nihssSummaryView,
    chatSeed:
      'Help me summarize NIHSS item scores for a stroke exam: LOC, questions, commands, gaze, visual fields, facial palsy, motor arms/legs, ataxia, sensory, language, dysarthria, and extinction. Clinical decision support only; do not diagnose stroke, do not determine thrombolysis or thrombectomy eligibility, and do not delay emergency stroke activation, imaging, transfer, or treatment workflows.',
    backendExecutable: false,
  },
  {
    toolId: NLU.pediatricGcs,
    toolName: 'Pediatric GCS',
    category: 'calculator',
    description:
      'Pediatric Glasgow Coma Scale with age-adjusted verbal response context. Does not replace urgent pediatric evaluation.',
    path: '/tools/calculators/pediatric-gcs',
    sidebarToolId: REGISTRY.pediatricGcs,
    chatSeed:
      'Help me document Pediatric GCS from eye, verbal, and motor responses using age-appropriate descriptions. Clinical decision support only; do not diagnose neurologic injury, do not recommend imaging, airway, transfer, or disposition, and do not delay pediatric trauma, seizure, hypoglycemia, airway, or emergency pathways.',
    backendExecutable: false,
  },
  {
    toolId: 'centor-mcisaac',
    toolName: 'Centor / McIsaac score',
    category: 'calculator',
    description: 'Modified Centor (McIsaac) score for streptococcal pharyngitis probability (0–5).',
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
    toolId: NLU.gestationalAgeCalculator,
    toolName: 'Gestational Age Calculator',
    category: 'calculator',
    description:
      'Gestational age calculation from LMP, conception, or ultrasound dating with ACOG dating caveats.',
    path: '/tools/calculators/gestational-age-calculator',
    sidebarToolId: REGISTRY.gestationalAgeCalculator,
    chatSeed:
      'Help me calculate gestational age from LMP, conception/ovulation date, or ultrasound dating, and document the estimated due date and dating method. Pediatric/OB decision support only; reconcile with ACOG dating policy and local obstetric workflow, do not diagnose pregnancy complications, do not recommend delivery timing, and do not delay urgent maternal or fetal evaluation.',
    backendExecutable: false,
  },
  {
    toolId: NLU.pediatricBpPercentile,
    toolName: 'Pediatric BP Percentile',
    category: 'calculator',
    description:
      'Pediatric blood pressure screening-band helper using age/sex context and AAP source-table reminders.',
    path: '/tools/calculators/pediatric-bp-percentile',
    sidebarToolId: REGISTRY.pediatricBpPercentile,
    chatSeed:
      'Help me review pediatric blood pressure using age, sex, systolic BP, and diastolic BP. Pediatric decision support only; confirm cuff size, repeat manual readings, height percentile/source tables, and local pediatric guidance. Do not diagnose hypertension, recommend medications, or delay urgent evaluation for severe symptoms.',
    backendExecutable: false,
  },
  {
    toolId: NLU.pregnancyDueDateCalculator,
    toolName: 'Pregnancy Due Date Calculator',
    category: 'calculator',
    description:
      'Estimated due date helper from LMP, conception/ovulation date, or ultrasound dating.',
    path: '/tools/calculators/pregnancy-due-date-calculator',
    sidebarToolId: REGISTRY.pregnancyDueDateCalculator,
    chatSeed:
      'Help me estimate pregnancy due date using LMP, conception/ovulation date, or ultrasound dating details. OB decision support only; confirm dating hierarchy with ACOG/local policy, do not recommend delivery timing or interventions, and do not delay urgent maternal or fetal evaluation.',
    backendExecutable: false,
  },
  {
    toolId: NLU.fentonGrowthChartHelper,
    toolName: 'Fenton Growth Chart Helper',
    category: 'calculator',
    description:
      'Neonatal growth percentile classification helper for official Fenton chart review.',
    path: '/tools/calculators/fenton-growth-chart-helper',
    sidebarToolId: REGISTRY.fentonGrowthChartHelper,
    chatSeed:
      'Help me classify neonatal growth percentiles from the official Fenton chart: gestational/postmenstrual age, weight percentile, length percentile, and head circumference percentile. Pediatric/neonatal decision support only; use validated source charts and neonatal review, do not diagnose growth failure or recommend feeding, fluids, fortification, or disposition.',
    backendExecutable: false,
  },
  {
    toolId: NLU.neonatalBilirubinRiskHelper,
    toolName: 'Neonatal Bilirubin Risk Helper',
    category: 'calculator',
    description:
      'Neonatal bilirubin review helper for AAP 2022 nomogram workflow without phototherapy recommendations.',
    path: '/tools/calculators/neonatal-bilirubin-risk-helper',
    sidebarToolId: REGISTRY.neonatalBilirubinRiskHelper,
    chatSeed:
      'Help me organize neonatal bilirubin review: age in hours, total bilirubin, gestational age, neurotoxicity risk factors, and whether values have been plotted on the AAP 2022/local nomogram. Neonatal decision support only; do not recommend phototherapy, exchange transfusion, labs, admission, discharge, or timing, and do not delay urgent jaundice or neonatal evaluation.',
    backendExecutable: false,
  },
  {
    toolId: NLU.pediatricDoseSafetyChecker,
    toolName: 'Pediatric Dose Safety Checker',
    category: 'calculator',
    description:
      'Placeholder-only pediatric medication safety checklist that blocks patient-specific dose calculation.',
    path: '/tools/calculators/pediatric-dose-safety-checker',
    sidebarToolId: REGISTRY.pediatricDoseSafetyChecker,
    chatSeed:
      'Help me document pediatric medication safety checks without calculating a dose: medication context, weight in kg, governed institutional protocol availability, concentration, route, frequency, maximum dose source, allergies, renal/hepatic context, and independent verification. Placeholder only; do not provide mg/kg doses, dose ranges, titration, infusion rates, medication recommendations, or prescriptions unless governed by an approved protocol outside this build.',
    backendExecutable: false,
  },
  {
    toolId: NLU.pediatricSepsisAssistant,
    toolName: 'Pediatric Sepsis Assistant',
    category: 'calculator',
    description:
      'Guided pediatric sepsis review for infection concern, age-adjusted vitals, perfusion, labs, and escalation prompts.',
    path: '/tools/pediatrics-obgyn/pediatric-sepsis-assistant',
    sidebarToolId: REGISTRY.pediatricSepsisAssistant,
    chatSeed:
      'Help me structure a pediatric sepsis review: age, infection concern, age-adjusted vitals, perfusion, mental status, lactate/labs if available, fluids or antibiotics already documented, source concerns, and missing data. Pediatric decision support only; do not diagnose sepsis, do not recommend fluids, antibiotics, vasopressors, medication doses, disposition, or transfer, and do not delay local pediatric sepsis or emergency pathways.',
    backendExecutable: false,
  },
  {
    toolId: NLU.pregnancyWorkflowAssistant,
    toolName: 'Pregnancy Workflow Assistant',
    category: 'calculator',
    description:
      'Pregnancy workflow review for dating, maternal symptoms, fetal movement, labs, risk context, and handoff prompts.',
    path: '/tools/pediatrics-obgyn/pregnancy-workflow-assistant',
    sidebarToolId: REGISTRY.pregnancyWorkflowAssistant,
    chatSeed:
      'Help me structure a pregnancy workflow review: gestational age, dating method, maternal symptoms, fetal movement, bleeding/fluid/leakage context, blood pressure, labs if available, risk factors, and missing data. OB decision support only; do not diagnose pregnancy complications, do not recommend medications, delivery timing, disposition, or procedures, and do not delay urgent obstetric evaluation.',
    backendExecutable: false,
  },
  {
    toolId: NLU.neonatalAssessmentAssistant,
    toolName: 'Neonatal Assessment Assistant',
    category: 'calculator',
    description:
      'Neonatal assessment assistant for Apgar, feeding, temperature, bilirubin, growth, screening, and red flags.',
    path: '/tools/pediatrics-obgyn/neonatal-assessment-assistant',
    sidebarToolId: REGISTRY.neonatalAssessmentAssistant,
    chatSeed:
      'Help me structure a neonatal assessment: gestational age, birth weight, Apgar documentation, temperature, feeding, glucose if available, bilirubin context, growth percentiles, screenings, and red flags. Neonatal decision support only; do not replace NRP or neonatal clinician assessment, do not recommend treatment or disposition, and do not delay urgent newborn evaluation.',
    backendExecutable: false,
  },
  {
    toolId: NLU.obTriageAssistant,
    toolName: 'OB Triage Assistant',
    category: 'calculator',
    description:
      'OB triage assistant for maternal symptoms, gestational age, fetal concerns, bleeding, fluid leakage, and urgent pathway prompts.',
    path: '/tools/pediatrics-obgyn/ob-triage-assistant',
    sidebarToolId: REGISTRY.obTriageAssistant,
    chatSeed:
      'Help me structure an OB triage review: gestational age, chief concern, maternal vitals, bleeding, fluid leakage, contractions, fetal movement, pain, headache/vision symptoms, labs if available, and missing data. OB decision support only; do not diagnose, do not recommend medications, delivery, discharge, admission, transfer, or procedures, and do not delay urgent maternal or fetal pathways.',
    backendExecutable: false,
  },
  {
    toolId: NLU.neonatalDashboard,
    toolName: 'Neonatal Dashboard',
    category: 'reference',
    description:
      'Neonatal dashboard concept for vitals, feeding, bilirubin, growth, screening, and review queues.',
    path: '/tools/pediatrics-obgyn/neonatal-dashboard',
    sidebarToolId: REGISTRY.neonatalDashboard,
    chatSeed:
      'Help me review neonatal dashboard context: vitals, temperature, feeding, weight change, bilirubin review status, growth percentile trends, screening completion, data freshness, and unresolved review items. Monitoring visibility and neonatal decision support only; no autonomous escalation, treatment, feeding, phototherapy, discharge, or admission recommendations.',
    backendExecutable: false,
  },
  {
    toolId: NLU.maternalMonitoringDashboard,
    toolName: 'Maternal Monitoring Dashboard',
    category: 'reference',
    description:
      'Maternal monitoring dashboard concept for vitals, symptoms, labs, fetal context, and review queues.',
    path: '/tools/pediatrics-obgyn/maternal-monitoring-dashboard',
    sidebarToolId: REGISTRY.maternalMonitoringDashboard,
    chatSeed:
      'Help me review maternal monitoring dashboard context: blood pressure trends, symptoms, labs if available, fetal movement/status documentation, postpartum or antepartum risk context, data freshness, and review queues. OB decision support and monitoring visibility only; no autonomous escalation, medication, delivery, disposition, or procedure recommendations.',
    backendExecutable: false,
  },
  {
    toolId: NLU.pediatricCommandCenter,
    toolName: 'Pediatric Command Center',
    category: 'reference',
    description:
      'Pediatric command-center concept for deterioration, sepsis, vitals, growth, BP, and unresolved review items.',
    path: '/tools/pediatrics-obgyn/pediatric-command-center',
    sidebarToolId: REGISTRY.pediatricCommandCenter,
    chatSeed:
      'Help me review pediatric command-center queues: PEWS/deterioration context, sepsis concern, vitals trends, BP screening bands, growth trend flags, data gaps, and human review status. Pediatric decision support and operations visibility only; no diagnosis, medication dosing, treatment, transfer, or disposition recommendations.',
    backendExecutable: false,
  },
  {
    toolId: NLU.growthTrendAnalytics,
    toolName: 'Growth Trend Analytics',
    category: 'reference',
    description:
      'Growth trend analytics concept for serial anthropometrics, percentile changes, data quality, and review queues.',
    path: '/tools/pediatrics-obgyn/growth-trend-analytics',
    sidebarToolId: REGISTRY.growthTrendAnalytics,
    chatSeed:
      'Help me review growth trend analytics: serial weight, length/height, head circumference, percentiles, gestational/corrected age where applicable, percentile crossing, measurement quality, and missing data. Pediatric/neonatal decision support only; no growth diagnosis and no nutrition, medication, lab, imaging, or disposition recommendation.',
    backendExecutable: false,
  },
  {
    toolId: NLU.perinatalRiskDashboard,
    toolName: 'Perinatal Risk Dashboard',
    category: 'reference',
    description:
      'Perinatal risk dashboard concept for maternal, fetal, delivery, neonatal, and follow-up review queues.',
    path: '/tools/pediatrics-obgyn/perinatal-risk-dashboard',
    sidebarToolId: REGISTRY.perinatalRiskDashboard,
    chatSeed:
      'Help me review perinatal risk dashboard context: maternal risk factors, fetal concerns, delivery details, neonatal assessment, bilirubin/growth follow-up, data freshness, and unresolved review queues. Perinatal decision support and visibility only; no diagnosis, medication dosing, delivery, treatment, admission, discharge, or transfer recommendations.',
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
    description: 'FIB-4 index for liver fibrosis risk using age, AST, ALT, and platelets.',
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
    chatSeed:
      'Help me calculate an anion gap from sodium, chloride, bicarbonate, and optional albumin.',
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
    toolId: NLU.bedOccupancyCalculator,
    toolName: 'Bed Occupancy Calculator',
    category: 'calculator',
    description:
      'Hospital operations calculator for occupied beds, blocked beds, usable beds, and occupancy percentage. Operations support only; no admission, discharge, transfer, or clinical triage decisions.',
    path: '/tools/calculators/bed-occupancy-calculator',
    sidebarToolId: REGISTRY.bedOccupancyCalculator,
    chatSeed:
      'Open the Bed Occupancy Calculator and help me review occupied beds, total beds, blocked beds, usable capacity, and available beds. Operations planning support only; do not recommend admission, discharge, transfer, triage, or staffing actions.',
    backendExecutable: false,
  },
  {
    toolId: NLU.staffingRatioCalculator,
    toolName: 'Staffing Ratio Calculator',
    category: 'calculator',
    description:
      'Operations calculator for patients per staff member and target staffing coverage gap. Does not schedule staff or override acuity, credentials, labor rules, or supervisor review.',
    path: '/tools/calculators/staffing-ratio-calculator',
    sidebarToolId: REGISTRY.staffingRatioCalculator,
    chatSeed:
      'Open the Staffing Ratio Calculator and help me review patient count, available staff, target patients per staff, and staffing coverage gap. Operations planning support only; do not recommend autonomous staffing changes or clinical assignments.',
    backendExecutable: false,
  },
  {
    toolId: NLU.turnaroundTimeCalculator,
    toolName: 'Turnaround Time Calculator',
    category: 'calculator',
    description:
      'Operations calculator for request-to-assign, travel, service, cleanup, and target turnaround variance. Does not auto-dispatch or reprioritize work.',
    path: '/tools/calculators/turnaround-time-calculator',
    sidebarToolId: REGISTRY.turnaroundTimeCalculator,
    chatSeed:
      'Open the Turnaround Time Calculator and help me total request-to-assign, travel, service, cleanup, and target variance. Operations planning support only; do not auto-dispatch, reprioritize care, or override command workflows.',
    backendExecutable: false,
  },
  {
    toolId: NLU.resourceUtilizationIndex,
    toolName: 'Resource Utilization Index',
    category: 'calculator',
    description:
      'Composite operations utilization index across beds, staff, devices, and fleet signals. Requires source-system validation and human approval for resource moves.',
    path: '/tools/calculators/resource-utilization-index',
    sidebarToolId: REGISTRY.resourceUtilizationIndex,
    chatSeed:
      'Open the Resource Utilization Index and help me review bed, staff, device, and fleet utilization signals. Operations planning support only; require human approval for any resource movement, staffing, dispatch, admission, or transfer decision.',
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
    description:
      'Community-acquired pneumonia severity score using confusion, urea/BUN, respiratory rate, blood pressure, and age.',
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
    description:
      'Level of consciousness scoring from eye, verbal, and motor responses with severe/moderate/mild interpretation ranges.',
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
    toolId: NLU.seizureAssistant,
    toolName: 'Seizure Assistant',
    category: 'calculator',
    description:
      'Guided seizure review with event features, recovery, triggers, medications as documented, and urgent-care prompts.',
    path: '/tools/neurology/seizure-assistant',
    sidebarToolId: REGISTRY.seizureAssistant,
    chatSeed:
      'Help me structure a seizure review: witnessed event description, onset and duration, recovery, provoking factors, glucose/electrolyte context if known, antiseizure medications as documented, pregnancy/trauma/infection context, and missing data. Clinical decision support only; do not diagnose seizure type, do not recommend antiseizure medication dosing or changes, and do not delay status epilepticus, airway, trauma, or emergency pathways.',
    backendExecutable: false,
  },
  {
    toolId: NLU.strokeWorkflowAssistant,
    toolName: 'Stroke Workflow Assistant',
    category: 'calculator',
    description:
      'Stroke workflow review for last-known-well, deficits, NIHSS context, imaging status, contraindication prompts, and handoff.',
    path: '/tools/neurology/stroke-workflow-assistant',
    sidebarToolId: REGISTRY.strokeWorkflowAssistant,
    chatSeed:
      'Help me organize an acute stroke workflow handoff: last-known-well, baseline function, focal deficits, NIHSS context, glucose, anticoagulant context, imaging status, thrombectomy screen prompts, and missing data. Clinical decision support only; do not diagnose stroke, do not determine thrombolysis or thrombectomy eligibility, and do not delay emergency stroke activation, imaging, transfer, or treatment workflows.',
    backendExecutable: false,
  },
  {
    toolId: NLU.headacheRedFlagAssistant,
    toolName: 'Headache Red Flag Assistant',
    category: 'calculator',
    description:
      'Headache red-flag review for thunderclap onset, neurologic deficit, infection, pregnancy/postpartum, cancer, trauma, and age context.',
    path: '/tools/neurology/headache-red-flag-assistant',
    sidebarToolId: REGISTRY.headacheRedFlagAssistant,
    chatSeed:
      'Help me review headache red flags: thunderclap or worst headache, new neurologic deficits, altered mental status, fever/meningismus, pregnancy/postpartum, cancer/immunosuppression, trauma, anticoagulation, age over 50, and pattern change. Clinical decision support only; do not diagnose headache cause, do not recommend imaging, LP, medications, admission, discharge, or disposition, and do not delay urgent evaluation.',
    backendExecutable: false,
  },
  {
    toolId: NLU.vertigoHintsAssistant,
    toolName: 'Vertigo HINTS Assistant',
    category: 'calculator',
    description:
      'Vertigo/HINTS documentation support for continuous vertigo, trained bedside exam findings, gait/hearing context, and stroke warnings.',
    path: '/tools/neurology/vertigo-hints-assistant',
    sidebarToolId: REGISTRY.vertigoHintsAssistant,
    chatSeed:
      'Help me document a vertigo/HINTS review for continuous acute vestibular syndrome: timing, nystagmus, head impulse, test of skew, hearing symptoms, gait, focal neurologic findings, and vascular risk context. Clinical decision support only; HINTS requires trained bedside exam, does not rule out posterior circulation stroke, and must not delay urgent stroke evaluation or imaging when concerning features are present.',
    backendExecutable: false,
  },
  {
    toolId: NLU.neuroExamAssistant,
    toolName: 'Neuro Exam Assistant',
    category: 'calculator',
    description:
      'Guided neurologic exam checklist for mental status, cranial nerves, motor, sensory, coordination, gait, reflexes, and localization prompts.',
    path: '/tools/neurology/neuro-exam-assistant',
    sidebarToolId: REGISTRY.neuroExamAssistant,
    chatSeed:
      'Help me structure a neurologic exam: mental status, cranial nerves, motor strength/tone, reflexes, sensory findings, coordination, gait, cortical signs, localization clues, and missing data. Clinical decision support only; do not diagnose, do not recommend treatment or disposition, and do not delay emergency stroke, seizure, trauma, infection, or spinal cord pathways for new deficits.',
    backendExecutable: false,
  },
  {
    toolId: NLU.neuroTelemetryDashboard,
    toolName: 'Neuro Telemetry Dashboard',
    category: 'reference',
    description:
      'Neuro telemetry dashboard for neuro checks, GCS/NIHSS trends, seizure events, ICP/EVD context, freshness, and review queues.',
    path: '/tools/neurology/neuro-telemetry-dashboard',
    sidebarToolId: REGISTRY.neuroTelemetryDashboard,
    chatSeed:
      'Help me review neuro telemetry dashboard context: neuro check trends, GCS or NIHSS changes, seizure events, pupillary findings, ICP/EVD context if available, data freshness, missing checks, and unresolved review items. Clinical decision support and monitoring visibility only; no autonomous escalation or alerts replacing bedside assessment, and urgent neurologic change needs immediate local pathways.',
    backendExecutable: false,
  },
  {
    toolId: NLU.strokeCommandCenter,
    toolName: 'Stroke Command Center',
    category: 'reference',
    description:
      'Stroke command-center view for activation queues, last-known-well, imaging milestones, handoff status, and unresolved review items.',
    path: '/tools/neurology/stroke-command-center',
    sidebarToolId: REGISTRY.strokeCommandCenter,
    chatSeed:
      'Help me review stroke command-center queues: active stroke alerts, last-known-well documentation, imaging milestones, transfer/handoff status, unresolved data gaps, and review priorities. Clinical decision support and operations visibility only; do not determine thrombolysis or thrombectomy eligibility and do not delay emergency stroke workflow steps.',
    backendExecutable: false,
  },
  {
    toolId: NLU.neuroMonitoringEngine,
    toolName: 'Neuro Monitoring Engine',
    category: 'reference',
    description:
      'Neuro monitoring trend engine for serial exams, consciousness scores, pupillary data, ICP context, and review queues.',
    path: '/tools/neurology/neuro-monitoring-engine',
    sidebarToolId: REGISTRY.neuroMonitoringEngine,
    chatSeed:
      'Help me summarize neuro monitoring trends: serial neuro exams, consciousness scores, pupillary findings, ICP/EVD context if available, sedation/procedure context, data gaps, and review queues. Clinical decision support and trend visibility only; no autonomous escalation orders and no replacement for bedside assessment.',
    backendExecutable: false,
  },
  {
    toolId: NLU.eegTrendDashboard,
    toolName: 'EEG Trend Dashboard',
    category: 'reference',
    description:
      'EEG trend dashboard for EEG status, seizure burden context, artifact, report freshness, and review queues.',
    path: '/tools/neurology/eeg-trend-dashboard',
    sidebarToolId: REGISTRY.eegTrendDashboard,
    chatSeed:
      'Help me review EEG trend dashboard context: EEG connection/status, seizure burden context if reported, artifact, report freshness, medication context as documented, and pending review queues. Clinical decision support and visibility only; do not diagnose seizures or recommend antiseizure medication, sedation, stimulation, admission, discharge, or disposition, and do not delay urgent seizure or neurologic deterioration pathways.',
    backendExecutable: false,
  },
  {
    toolId: NLU.neurologyTimelineAi,
    toolName: 'Neurology Timeline AI',
    category: 'reference',
    description:
      'Neurology timeline workflow for symptom onset, exams, imaging, EEG, interventions, and handoff chronology.',
    path: '/tools/neurology/neurology-timeline-ai',
    sidebarToolId: REGISTRY.neurologyTimelineAi,
    chatSeed:
      'Help me build a clinician-reviewed neurology timeline: symptom onset and last-known-well, exam changes, imaging and EEG milestones, treatments already documented, consults, and handoff gaps. Clinical decision support only; do not diagnose, do not recommend treatment, and do not delay emergency stroke, seizure, airway, infection, trauma, or neurosurgical care.',
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
    toolId: NLU.hospitalCommandAssistant,
    toolName: 'Hospital Command Assistant',
    category: 'hospital-operations',
    description:
      'Chat-assisted command-center support for hospital map, bed capacity, device fleet, telemetry, alerts, and huddle prompts. Human command approval required; no autonomous dispatch, escalation, admission, transfer, discharge, or clinical decisions.',
    path: TOOL_LAUNCH_PATHS.calculatorsHub,
    sidebarToolId: REGISTRY.hospitalCommandAssistant,
    chatSeed:
      'Help me prepare a hospital command huddle using map status, bed occupancy, staffing ratio, turnaround time, resource utilization, device alerts, fleet status, and stale telemetry. Operations support only; do not make autonomous dispatch, escalation, admission, transfer, discharge, staffing, or clinical decisions. Ask what source-system values should be verified.',
    backendExecutable: false,
  },
  {
    toolId: NLU.resourceAllocationAssistant,
    toolName: 'Resource Allocation Assistant',
    category: 'hospital-operations',
    description:
      'Chat-assisted resource allocation planning for beds, staff, devices, and fleet options with constraints and human approval. Does not move resources or issue assignments.',
    path: TOOL_LAUNCH_PATHS.calculatorsHub,
    sidebarToolId: REGISTRY.resourceAllocationAssistant,
    chatSeed:
      'Help me compare resource allocation options across beds, staff, devices, and fleet capacity. Ask for constraints, source-system values, and approval owner. Operations support only; do not move resources, assign staff, dispatch vehicles, or make clinical decisions.',
    backendExecutable: false,
  },
  {
    toolId: NLU.deviceRecommendationAssistant,
    toolName: 'Device Recommendation Assistant',
    category: 'hospital-operations',
    description:
      'Chat-assisted device requirement and availability review using inventory, battery, maintenance, calibration, compatibility, and location context. Does not assign clinical devices automatically.',
    path: TOOL_LAUNCH_PATHS.calculatorsHub,
    sidebarToolId: REGISTRY.deviceRecommendationAssistant,
    chatSeed:
      'Help me review device options for an equipment request using requirements, inventory, battery, maintenance, calibration, firmware, compatibility, location, and source-system verification. Operations support only; do not assign devices automatically or make clinical decisions.',
    backendExecutable: false,
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
    toolId: NLU.ecgInterpretationAssistant,
    toolName: 'ECG Interpretation Assistant',
    category: 'calculator',
    description:
      'Structured ECG interpretation support for rhythm, rate, intervals, ischemia flags, and urgent escalation reminders.',
    path: '/tools/cardiology/ecg-interpretation-assistant',
    sidebarToolId: REGISTRY.ecgInterpretationAssistant,
    chatSeed:
      'Help me structure an ECG interpretation: rhythm, rate, axis, PR/QRS/QT intervals, hypertrophy, ischemia/infarction flags, and comparison with prior ECGs. Clinical decision support only; do not diagnose, do not rule out MI, and do not delay STEMI/unstable arrhythmia pathways.',
    backendExecutable: false,
  },
  {
    toolId: NLU.stemiPathwayAssistant,
    toolName: 'STEMI Pathway Assistant',
    category: 'calculator',
    description:
      'STEMI pathway checklist support for ECG timing, activation, contraindication review, and handoff preparation.',
    path: '/tools/cardiology/stemi-pathway-assistant',
    sidebarToolId: REGISTRY.stemiPathwayAssistant,
    chatSeed:
      'Help me prepare a STEMI pathway checklist: symptom onset, ECG timing, STEMI-equivalent concerns, cath lab or reperfusion pathway activation, contraindication review prompts, and handoff items. Clinical decision support only; do not delay emergency activation and do not recommend treatment orders.',
    backendExecutable: false,
  },
  {
    toolId: NLU.acsWorkflowAssistant,
    toolName: 'ACS Workflow Assistant',
    category: 'calculator',
    description:
      'ACS workflow support across ECG review, serial biomarkers, risk score selection, and reassessment checkpoints.',
    path: '/tools/cardiology/acs-workflow-assistant',
    sidebarToolId: REGISTRY.acsWorkflowAssistant,
    chatSeed:
      'Help me organize an ACS workflow: initial ECG, serial ECG/bio-marker checkpoints, HEART/TIMI/GRACE calculator selection, red flags, and handoff documentation. Clinical decision support only; do not diagnose ACS, rule out ACS, recommend antithrombotics, disposition, or invasive strategy.',
    backendExecutable: false,
  },
  {
    toolId: NLU.atrialFibrillationAssistant,
    toolName: 'Atrial Fibrillation Assistant',
    category: 'calculator',
    description:
      'AF decision-support workspace for stability review, stroke/bleeding score selection, and clinician handoff prompts.',
    path: '/tools/cardiology/atrial-fibrillation-assistant',
    sidebarToolId: REGISTRY.atrialFibrillationAssistant,
    chatSeed:
      'Help me structure an atrial fibrillation review: stability first, symptom context, triggers, CHA2DS2-VASc/CHADS2/HAS-BLED selection, medication safety questions, and handoff prompts. Clinical decision support only; do not recommend anticoagulation, rate/rhythm control, cardioversion, or disposition.',
    backendExecutable: false,
  },
  {
    toolId: NLU.heartFailureAssistant,
    toolName: 'Heart Failure Assistant',
    category: 'calculator',
    description:
      'Heart failure support for staging, congestion context, telemetry concerns, and escalation prompts.',
    path: '/tools/cardiology/heart-failure-assistant',
    sidebarToolId: REGISTRY.heartFailureAssistant,
    chatSeed:
      'Help me structure a heart failure review: stability, congestion symptoms, vitals, renal/electrolyte context, ACC/AHA stage helper, red flags, and follow-up questions. Clinical decision support only; do not diagnose heart failure or recommend diuretics, devices, admission, or medication changes.',
    backendExecutable: false,
  },
  {
    toolId: NLU.cardiacTelemetryAnalyzer,
    toolName: 'Cardiac Telemetry Analyzer',
    category: 'reference',
    description:
      'Telemetry review workflow for rhythm events, sustained alerts, artifact concerns, and human-reviewed escalation summaries.',
    path: '/tools/cardiology/cardiac-telemetry-analyzer',
    sidebarToolId: REGISTRY.cardiacTelemetryAnalyzer,
    chatSeed:
      'Help me review cardiac telemetry events: rhythm label, duration, rate, symptoms, artifact/lead quality, recurrence, and escalation summary. Clinical decision support only; do not diagnose arrhythmia, silence alarms, auto-page, or replace clinician review.',
    backendExecutable: false,
  },
  {
    toolId: NLU.ecgTrendEngine,
    toolName: 'ECG Trend Engine',
    category: 'reference',
    description:
      'Serial ECG trend support for intervals, morphology changes, ischemia flags, and comparison documentation.',
    path: '/tools/cardiology/ecg-trend-engine',
    sidebarToolId: REGISTRY.ecgTrendEngine,
    chatSeed:
      'Help me compare serial ECGs: rhythm/rate changes, PR/QRS/QT interval trends, ST-T morphology, new conduction changes, and urgent-change flags. Clinical decision support only; do not diagnose MI or delay emergency pathways.',
    backendExecutable: false,
  },
  {
    toolId: NLU.arrhythmiaRiskClassifier,
    toolName: 'Arrhythmia Risk Classifier',
    category: 'reference',
    description:
      'Arrhythmia concern-level classifier using symptoms, telemetry findings, comorbidity context, and escalation signals.',
    path: '/tools/cardiology/arrhythmia-risk-classifier',
    sidebarToolId: REGISTRY.arrhythmiaRiskClassifier,
    chatSeed:
      'Help me classify arrhythmia concern level from rhythm description, rate, duration, symptoms, hemodynamics, structural heart disease, electrolyte context, and telemetry recurrence. Clinical decision support only; unstable arrhythmia pathways take priority and this does not diagnose or recommend therapy.',
    backendExecutable: false,
  },
  {
    toolId: NLU.remoteCardiologyMonitoringDashboard,
    toolName: 'Remote Cardiology Monitoring Dashboard',
    category: 'reference',
    description:
      'Remote cardiology monitoring review queue for symptoms, vitals, missed transmissions, alerts, and human triage documentation.',
    path: '/tools/cardiology/remote-cardiology-monitoring-dashboard',
    sidebarToolId: REGISTRY.remoteCardiologyMonitoringDashboard,
    chatSeed:
      'Help me review remote cardiology monitoring: patient symptoms, vitals, rhythm alerts, missed transmissions, device flags, and priority queue summary. Clinical decision support only; do not auto-triage, message patients autonomously, or replace local escalation policy.',
    backendExecutable: false,
  },
  {
    toolId: NLU.cardiologyCommandCenter,
    toolName: 'Cardiology Command Center',
    category: 'reference',
    description:
      'Cardiology operations command center for ACS queues, telemetry risk, remote monitoring alerts, and unresolved human-review items.',
    path: '/tools/cardiology/cardiology-command-center',
    sidebarToolId: REGISTRY.cardiologyCommandCenter,
    chatSeed:
      'Help me summarize the cardiology command center: ACS/STEMI queue, telemetry alerts, remote monitoring flags, high-risk calculator follow-ups, bottlenecks, and unresolved review tasks. Clinical decision support only; no automated orders, no dispatch, and human review required.',
    backendExecutable: false,
  },
  {
    toolId: NLU.aiGateway,
    toolName: 'AI Gateway',
    category: 'reference',
    description:
      'Assistant gateway surface for routing, trace metadata, safety policy context, and guarded clinical AI responses.',
    path: TOOL_LAUNCH_PATHS.assistant,
    sidebarToolId: REGISTRY.aiGateway,
    chatSeed:
      'Open the AI Gateway assistant flow and help me route this clinical AI request with safety, memory, retrieval, tool, cost, and evaluation context. Clinical decision support only; do not automate orders or replace clinician judgment.',
    backendExecutable: false,
  },
  {
    toolId: NLU.moeRouter,
    toolName: 'MoE Router',
    category: 'reference',
    description:
      'Mixture-of-experts router context for expert selection, retrieval policy, fallback behavior, and human-review flags.',
    path: TOOL_LAUNCH_PATHS.assistant,
    sidebarToolId: REGISTRY.moeRouter,
    chatSeed:
      'Help me inspect which CareDroid AI expert route should handle this request, including retrieval policy, safety flags, and fallback rationale. Clinical decision support only; require clinician review.',
    backendExecutable: false,
  },
  {
    toolId: NLU.aiRag,
    toolName: 'RAG Evidence Engine',
    category: 'reference',
    description:
      'Retrieval-augmented evidence engine for guideline lookup, citations, source panels, and grounded assistant responses.',
    path: '/tools/guideline-rag',
    sidebarToolId: REGISTRY.aiRag,
    chatSeed:
      'Help me retrieve and summarize guideline evidence with citations and source attribution. Clinical decision support only; do not make treatment decisions without clinician review.',
    backendExecutable: false,
  },
  {
    toolId: NLU.aiArtifacts,
    toolName: 'AI Artifacts',
    category: 'reference',
    description:
      'Artifact workspace for saved AI outputs, workflow assets, telemetry schemas, protocols, and templates.',
    path: TOOL_LAUNCH_PATHS.artifacts,
    sidebarToolId: REGISTRY.aiArtifacts,
    chatSeed:
      'Help me review relevant AI artifacts, saved outputs, templates, or protocols and explain how they should be used with clinician review.',
    backendExecutable: false,
  },
  {
    toolId: NLU.aiMemory,
    toolName: 'AI Memory',
    category: 'reference',
    description:
      'Memory dashboard for short, long, and clinical context used to personalize assistant workflows.',
    path: TOOL_LAUNCH_PATHS.memory,
    sidebarToolId: REGISTRY.aiMemory,
    chatSeed:
      'Help me review the assistant memory context for this workflow, including active conversation, saved preferences, clinical summaries, and saved tools. Do not infer missing patient facts.',
    backendExecutable: false,
  },
  {
    toolId: NLU.aiToolCalling,
    toolName: 'AI Tool Calling',
    category: 'reference',
    description:
      'Guarded tool-calling workflow for tool resolution, parameter validation, structured tool context, and unsupported-tool boundaries.',
    path: TOOL_LAUNCH_PATHS.assistant,
    sidebarToolId: REGISTRY.aiToolCalling,
    chatSeed:
      'Help me launch the right CareDroid tool for this request. Collect required parameters, return structured context, and avoid unsupported backend executors. Clinical decision support only.',
    backendExecutable: false,
  },
  {
    toolId: NLU.aiTraining,
    toolName: 'AI Training Pipeline',
    category: 'reference',
    description:
      'Training and MoE planning dashboard for governed AI iteration, datasets, and model improvement loops.',
    path: TOOL_LAUNCH_PATHS.training,
    sidebarToolId: REGISTRY.aiTraining,
    chatSeed:
      'Help me review AI training readiness, MoE plan status, dataset gaps, and improvement opportunities. Governance review required before model changes.',
    backendExecutable: false,
  },
  {
    toolId: NLU.aiCostOptimization,
    toolName: 'AI Cost Optimization',
    category: 'reference',
    description:
      'Cost optimizer dashboard for route prediction, cache metrics, token spend, and savings snapshots.',
    path: TOOL_LAUNCH_PATHS.costs,
    sidebarToolId: REGISTRY.aiCostOptimization,
    chatSeed:
      'Help me review AI cost optimization metrics, route predictions, cache behavior, and token spend without changing production routing automatically.',
    backendExecutable: false,
  },
  {
    toolId: NLU.aiEvaluation,
    toolName: 'AI Evaluation',
    category: 'reference',
    description:
      'Evaluation framework for hallucination, accuracy, latency, retrieval precision, tool success, satisfaction, and cost metrics.',
    path: TOOL_LAUNCH_PATHS.aiEvaluation,
    sidebarToolId: REGISTRY.aiEvaluation,
    chatSeed:
      'Help me review AI evaluation metrics, benchmarks, trends, and assistant quality signals. Highlight risks and missing evidence for human review.',
    backendExecutable: false,
  },
  {
    toolId: NLU.aiCommandCenter,
    toolName: 'AI Command Center',
    category: 'reference',
    description:
      'Unified AI operations dashboard spanning health, active experts, RAG, memory, tools, costs, hallucination, retrieval, and audit logs.',
    path: TOOL_LAUNCH_PATHS.aiCommandCenter,
    sidebarToolId: REGISTRY.aiCommandCenter,
    chatSeed:
      'Open the AI Command Center and help me summarize AI health, experts, RAG, memory, tool usage, costs, evaluation quality, and audit signals.',
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
  {
    toolId: wellsPeChatConfig.toolId,
    name: wellsPeChatConfig.name,
    hubPath: wellsPeChatConfig.hubPath,
  },
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
  {
    toolId: NLU.hospitalCommandAssistant,
    name: 'Hospital Command Assistant',
    hubPath: TOOL_LAUNCH_PATHS.calculatorsHub,
  },
  {
    toolId: NLU.resourceAllocationAssistant,
    name: 'Resource Allocation Assistant',
    hubPath: TOOL_LAUNCH_PATHS.calculatorsHub,
  },
  {
    toolId: NLU.deviceRecommendationAssistant,
    name: 'Device Recommendation Assistant',
    hubPath: TOOL_LAUNCH_PATHS.calculatorsHub,
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
    description:
      'ICU severity score using APACHE II acute physiology, GCS, age, and chronic health points.',
    path: '/tools/calculators/apache-ii',
    calcQuery: '/tools/calculators?calc=apache-ii',
    implementation:
      'Client-side in emergencyCriticalCareCalculators.jsx (emergencyCriticalCareCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'curb-65',
    name: 'CURB-65',
    description: 'Community-acquired pneumonia severity (confusion, urea/BUN, RR, BP, age).',
    path: '/tools/calculators/curb-65',
    calcQuery: '/tools/calculators?calc=curb-65',
    implementation:
      'Client-side in emergencyCriticalCareCalculators.jsx (emergencyCriticalCareCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'gcs',
    name: 'Glasgow Coma Scale',
    description: 'Consciousness scoring from eye, verbal, and motor responses.',
    path: '/tools/calculators/gcs',
    calcQuery: '/tools/calculators?calc=gcs',
    implementation:
      'Client-side in emergencyCriticalCareCalculators.jsx (emergencyCriticalCareCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'mews',
    name: 'MEWS',
    description: 'Modified Early Warning Score from adult vitals and AVPU.',
    path: '/tools/calculators/mews',
    calcQuery: '/tools/calculators?calc=mews',
    implementation:
      'Client-side in emergencyCriticalCareCalculators.jsx (emergencyCriticalCareCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'revised-trauma-score',
    name: 'Revised Trauma Score',
    description:
      'Weighted trauma physiology score from coded GCS, systolic BP, and respiratory rate.',
    path: '/tools/calculators/revised-trauma-score',
    calcQuery: '/tools/calculators?calc=revised-trauma-score',
    implementation:
      'Client-side in emergencyCriticalCareCalculators.jsx (emergencyCriticalCareCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'pews',
    name: 'PEWS',
    description: 'Pediatric Early Warning Score with pediatric caution labels.',
    path: '/tools/calculators/pews',
    calcQuery: '/tools/calculators?calc=pews',
    implementation:
      'Client-side in emergencyCriticalCareCalculators.jsx (emergencyCriticalCareCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'child-pugh',
    name: 'Child-Pugh',
    description:
      'Cirrhosis severity class (bilirubin, albumin, coagulation, ascites, encephalopathy).',
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
    description:
      'Fractional excretion of urea from BUN, urine urea nitrogen, and creatinine values.',
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
    implementation:
      'Client-side in endocrineMetabolicCalculators.jsx (endocrineMetabolicCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'corrected-calcium',
    name: 'Corrected Calcium',
    description: 'Albumin-corrected total calcium estimate.',
    path: '/tools/calculators/corrected-calcium',
    calcQuery: '/tools/calculators?calc=corrected-calcium',
    implementation:
      'Client-side in endocrineMetabolicCalculators.jsx (endocrineMetabolicCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'serum-osmolality',
    name: 'Serum Osmolality',
    description: 'Calculated serum osmolality from sodium, glucose, BUN, and optional ethanol.',
    path: '/tools/calculators/serum-osmolality',
    calcQuery: '/tools/calculators?calc=serum-osmolality',
    implementation:
      'Client-side in endocrineMetabolicCalculators.jsx (endocrineMetabolicCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'bsa',
    name: 'Body Surface Area',
    description: 'Mosteller body surface area estimate from height and weight.',
    path: '/tools/calculators/bsa',
    calcQuery: '/tools/calculators?calc=bsa',
    implementation:
      'Client-side in endocrineMetabolicCalculators.jsx (endocrineMetabolicCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'ideal-body-weight',
    name: 'Ideal Body Weight',
    description: 'Devine ideal body weight estimate from sex and height.',
    path: '/tools/calculators/ideal-body-weight',
    calcQuery: '/tools/calculators?calc=ideal-body-weight',
    implementation:
      'Client-side in endocrineMetabolicCalculators.jsx (endocrineMetabolicCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'adjusted-body-weight',
    name: 'Adjusted Body Weight',
    description: 'Adjusted body weight estimate using IBW, actual weight, and a correction factor.',
    path: '/tools/calculators/adjusted-body-weight',
    calcQuery: '/tools/calculators?calc=adjusted-body-weight',
    implementation:
      'Client-side in endocrineMetabolicCalculators.jsx (endocrineMetabolicCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'waist-hip-ratio',
    name: 'Waist-to-Hip Ratio',
    description: 'Central adiposity estimate from waist and hip circumference.',
    path: '/tools/calculators/waist-hip-ratio',
    calcQuery: '/tools/calculators?calc=waist-hip-ratio',
    implementation:
      'Client-side in endocrineMetabolicCalculators.jsx (endocrineMetabolicCalculators.js)',
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
    id: 'cage',
    name: 'CAGE',
    description: 'CAGE alcohol screening questionnaire (0-4).',
    path: '/tools/calculators/cage',
    calcQuery: '/tools/calculators?calc=cage',
    implementation:
      'Client-side in psychiatryScreeningCalculators.jsx (psychiatryScreeningCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'mmse',
    name: 'MMSE',
    description: 'MMSE cognitive screening score entry from governed administration (0-30).',
    path: '/tools/calculators/mmse',
    calcQuery: '/tools/calculators?calc=mmse',
    implementation:
      'Client-side in psychiatryScreeningCalculators.jsx (psychiatryScreeningCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'moca-placeholder-workflow',
    name: 'MoCA Placeholder Workflow',
    description: 'MoCA governance workflow placeholder without item display or scoring.',
    path: '/tools/calculators/moca-placeholder-workflow',
    calcQuery: '/tools/calculators?calc=moca-placeholder-workflow',
    implementation:
      'Client-side in psychiatryScreeningCalculators.jsx (psychiatryScreeningCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'pcl5',
    name: 'PCL-5',
    description: 'PCL-5 PTSD symptom screening score entry (0-80) with current safety flag.',
    path: '/tools/calculators/pcl5',
    calcQuery: '/tools/calculators?calc=pcl5',
    implementation:
      'Client-side in psychiatryScreeningCalculators.jsx (psychiatryScreeningCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'mdq',
    name: 'MDQ',
    description: 'Mood Disorder Questionnaire screening summary with urgent safety flag.',
    path: '/tools/calculators/mdq',
    calcQuery: '/tools/calculators?calc=mdq',
    implementation:
      'Client-side in psychiatryScreeningCalculators.jsx (psychiatryScreeningCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'epworth-sleepiness-scale',
    name: 'Epworth Sleepiness Scale',
    description: 'Daytime sleepiness screen (0-24) with safety-sensitive activity flag.',
    path: '/tools/calculators/epworth-sleepiness-scale',
    calcQuery: '/tools/calculators?calc=epworth-sleepiness-scale',
    implementation:
      'Client-side in psychiatryScreeningCalculators.jsx (psychiatryScreeningCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'columbia-suicide-severity-workflow',
    name: 'Columbia Suicide Severity Workflow',
    description: 'Suicide-severity workflow entry with immediate safety review messaging.',
    path: '/tools/calculators/columbia-suicide-severity-workflow',
    calcQuery: '/tools/calculators?calc=columbia-suicide-severity-workflow',
    implementation:
      'Client-side in psychiatryScreeningCalculators.jsx (psychiatryScreeningCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'heart-score',
    name: 'HEART score',
    description:
      'Chest pain risk stratification (history, ECG, age, risk factors, troponin; 0–10).',
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
    id: 'gestational-age-calculator',
    name: 'Gestational Age Calculator',
    description: 'Gestational age from LMP, conception, or ultrasound dating.',
    path: '/tools/calculators/gestational-age-calculator',
    calcQuery: '/tools/calculators?calc=gestational-age-calculator',
    implementation: 'Client-side in pediatricsObgynCalculators.jsx (pediatricsObgynCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'pediatric-bp-percentile',
    name: 'Pediatric BP Percentile',
    description: 'Pediatric BP screening-band helper with AAP source-table reminders.',
    path: '/tools/calculators/pediatric-bp-percentile',
    calcQuery: '/tools/calculators?calc=pediatric-bp-percentile',
    implementation: 'Client-side in pediatricsObgynCalculators.jsx (pediatricsObgynCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'pregnancy-due-date-calculator',
    name: 'Pregnancy Due Date Calculator',
    description: 'Estimated due date from LMP, conception, or ultrasound dating.',
    path: '/tools/calculators/pregnancy-due-date-calculator',
    calcQuery: '/tools/calculators?calc=pregnancy-due-date-calculator',
    implementation: 'Client-side in pediatricsObgynCalculators.jsx (pediatricsObgynCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'fenton-growth-chart-helper',
    name: 'Fenton Growth Chart Helper',
    description: 'Neonatal growth percentile classification helper for Fenton chart review.',
    path: '/tools/calculators/fenton-growth-chart-helper',
    calcQuery: '/tools/calculators?calc=fenton-growth-chart-helper',
    implementation: 'Client-side in pediatricsObgynCalculators.jsx (pediatricsObgynCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'neonatal-bilirubin-risk-helper',
    name: 'Neonatal Bilirubin Risk Helper',
    description: 'AAP 2022 bilirubin nomogram review prompt without treatment recommendations.',
    path: '/tools/calculators/neonatal-bilirubin-risk-helper',
    calcQuery: '/tools/calculators?calc=neonatal-bilirubin-risk-helper',
    implementation: 'Client-side in pediatricsObgynCalculators.jsx (pediatricsObgynCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'pediatric-dose-safety-checker',
    name: 'Pediatric Dose Safety Checker',
    description:
      'Placeholder-only pediatric medication safety checker; no patient-specific dose calculation.',
    path: '/tools/calculators/pediatric-dose-safety-checker',
    calcQuery: '/tools/calculators?calc=pediatric-dose-safety-checker',
    implementation: 'Client-side in pediatricsObgynCalculators.jsx (pediatricsObgynCalculators.js)',
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
    description:
      'Alcoholic hepatitis severe-range risk context from PT prolongation and bilirubin.',
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
    id: 'duke-treadmill-score',
    name: 'Duke Treadmill Score',
    description:
      'Exercise treadmill prognostic score from time, ST deviation, and exercise angina.',
    path: '/tools/calculators/duke-treadmill-score',
    calcQuery: '/tools/calculators?calc=duke-treadmill-score',
    implementation: 'Client-side in cardiologyCalculators.jsx (cardiologyRiskCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'reynolds-risk-score',
    name: 'Reynolds Risk Score Helper',
    description: 'Cardiovascular prevention risk context including hs-CRP and parental MI.',
    path: '/tools/calculators/reynolds-risk-score',
    calcQuery: '/tools/calculators?calc=reynolds-risk-score',
    implementation: 'Client-side in cardiologyCalculators.jsx (cardiologyRiskCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'hcm-sudden-death-risk',
    name: 'HCM Sudden Death Risk',
    description: 'HCM Risk-SCD 5-year sudden cardiac death risk context for specialist review.',
    path: '/tools/calculators/hcm-sudden-death-risk',
    calcQuery: '/tools/calculators?calc=hcm-sudden-death-risk',
    implementation: 'Client-side in cardiologyCalculators.jsx (cardiologyRiskCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'chads2',
    name: 'CHADS2',
    description:
      'Older AF stroke-risk score using CHF, hypertension, age, diabetes, and stroke/TIA.',
    path: '/tools/calculators/chads2',
    calcQuery: '/tools/calculators?calc=chads2',
    implementation: 'Client-side in cardiologyCalculators.jsx (cardiologyRiskCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'heart-failure-staging',
    name: 'Heart Failure Staging Helper',
    description: 'ACC/AHA heart failure stage documentation helper (A-D).',
    path: '/tools/calculators/heart-failure-staging',
    calcQuery: '/tools/calculators?calc=heart-failure-staging',
    implementation: 'Client-side in cardiologyCalculators.jsx (cardiologyRiskCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'abcd2',
    name: 'ABCD² score',
    description:
      'TIA short-term stroke risk (age, BP, clinical features, duration, diabetes; 0–7).',
    path: '/tools/calculators/abcd2',
    calcQuery: '/tools/calculators?calc=abcd2',
    implementation: 'Client-side in abcd2Calculator.jsx (abcd2Calculator.js)',
    orchestratorId: null,
  },
  {
    id: 'hunt-hess-scale',
    name: 'Hunt-Hess Scale',
    description: 'Aneurysmal SAH clinical severity grade with emergency pathway warnings.',
    path: '/tools/calculators/hunt-hess-scale',
    calcQuery: '/tools/calculators?calc=hunt-hess-scale',
    implementation: 'Client-side in neurologyCalculators.jsx (neurologyCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'ich-score',
    name: 'ICH Score',
    description: 'Intracerebral hemorrhage severity from GCS, volume, IVH, origin, and age.',
    path: '/tools/calculators/ich-score',
    calcQuery: '/tools/calculators?calc=ich-score',
    implementation: 'Client-side in neurologyCalculators.jsx (neurologyCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'four-score',
    name: 'FOUR Score',
    description: 'Coma exam score from eye, motor, brainstem reflex, and respiration.',
    path: '/tools/calculators/four-score',
    calcQuery: '/tools/calculators?calc=four-score',
    implementation: 'Client-side in neurologyCalculators.jsx (neurologyCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'modified-rankin-scale',
    name: 'Modified Rankin Scale',
    description: 'Global disability outcome scale for stroke and neurologic illness.',
    path: '/tools/calculators/modified-rankin-scale',
    calcQuery: '/tools/calculators?calc=modified-rankin-scale',
    implementation: 'Client-side in neurologyCalculators.jsx (neurologyCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'nihss-summary-view',
    name: 'NIHSS Summary View',
    description: 'NIHSS item summary view for stroke exam documentation and serial comparison.',
    path: '/tools/calculators/nihss-summary-view',
    calcQuery: '/tools/calculators?calc=nihss-summary-view',
    implementation: 'Client-side in neurologyCalculators.jsx (neurologyCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'pediatric-gcs',
    name: 'Pediatric GCS',
    description: 'Pediatric Glasgow Coma Scale with age-adjusted verbal response descriptions.',
    path: '/tools/calculators/pediatric-gcs',
    calcQuery: '/tools/calculators?calc=pediatric-gcs',
    implementation: 'Client-side in neurologyCalculators.jsx (neurologyCalculators.js)',
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
    id: 'bed-occupancy-calculator',
    name: 'Bed Occupancy Calculator',
    description: 'Hospital bed occupancy percentage with blocked-bed and usable-capacity context.',
    path: '/tools/calculators/bed-occupancy-calculator',
    calcQuery: '/tools/calculators?calc=bed-occupancy-calculator',
    implementation:
      'Client-side in hospitalOperationsCalculators.jsx (hospitalOperationsCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'staffing-ratio-calculator',
    name: 'Staffing Ratio Calculator',
    description: 'Patients-per-staff ratio and target coverage gap for operations planning.',
    path: '/tools/calculators/staffing-ratio-calculator',
    calcQuery: '/tools/calculators?calc=staffing-ratio-calculator',
    implementation:
      'Client-side in hospitalOperationsCalculators.jsx (hospitalOperationsCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'turnaround-time-calculator',
    name: 'Turnaround Time Calculator',
    description: 'Turnaround segment total and target variance for operational workflows.',
    path: '/tools/calculators/turnaround-time-calculator',
    calcQuery: '/tools/calculators?calc=turnaround-time-calculator',
    implementation:
      'Client-side in hospitalOperationsCalculators.jsx (hospitalOperationsCalculators.js)',
    orchestratorId: null,
  },
  {
    id: 'resource-utilization-index',
    name: 'Resource Utilization Index',
    description: 'Composite utilization index across beds, staff, devices, and fleet signals.',
    path: '/tools/calculators/resource-utilization-index',
    calcQuery: '/tools/calculators?calc=resource-utilization-index',
    implementation:
      'Client-side in hospitalOperationsCalculators.jsx (hospitalOperationsCalculators.js)',
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
    backendExecutors:
      backendToolCount || clinicalIntentTools.filter((t) => t.postExecutable).length,
  };
}

/** NLU tools with no dedicated page — launch via chat from suite or catalog */
export const chatOnlyClinicalTools = clinicalIntentTools.filter((t) => !t.path);

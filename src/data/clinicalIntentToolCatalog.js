/**
 * Catalog of clinical tools the NLU layer can recognize (mirrors backend patterns).
 * Keep in sync with:
 * backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts
 */

export const clinicalIntentTools = [
  {
    toolId: 'sofa-calculator',
    toolName: 'SOFA Score Calculator',
    category: 'calculator',
    description: 'Sequential Organ Failure Assessment (ICU sepsis / organ dysfunction).',
    path: '/tools/calculator/sofa',
    sidebarToolId: 'sofa-score',
    backendExecutable: true,
  },
  {
    toolId: 'qsofa',
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
    description: 'Stroke risk in non-valvular atrial fibrillation.',
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
    toolId: 'drug-interactions',
    toolName: 'Drug Interaction Checker',
    category: 'checker',
    description: 'Drug–drug interaction and contraindication context.',
    path: '/tools/drug-checker',
    sidebarToolId: 'drug-check',
    backendExecutable: true,
  },
  {
    toolId: 'dose-calculator',
    toolName: 'Medication Dose Calculator',
    category: 'calculator',
    description: 'Dosing from patient factors.',
    path: '/tools/calculators',
    sidebarToolId: 'calculators',
    backendExecutable: false,
  },
  {
    toolId: 'lab-interpreter',
    toolName: 'Lab Results Interpreter',
    category: 'interpreter',
    description: 'Interpretation of labs and panels.',
    path: '/tools/lab-interpreter',
    sidebarToolId: 'lab-interp',
    backendExecutable: true,
  },
  {
    toolId: 'abg-interpreter',
    toolName: 'ABG Interpreter',
    category: 'interpreter',
    description: 'ABG and acid–base (closest page: Lab Interpreter).',
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
    toolId: 'differential-diagnosis',
    toolName: 'Differential Diagnosis Generator',
    category: 'reference',
    description: 'Symptom-based differentials.',
    path: '/tools/diagnosis',
    sidebarToolId: 'diagnosis',
    chatSeed: 'Generate a differential diagnosis for:',
    backendExecutable: false,
  },
  {
    toolId: 'antibiotic-guide',
    toolName: 'Antibiotic Selection Guide',
    category: 'reference',
    description: 'Empiric antimicrobial choice.',
    path: '/tools/diagnosis',
    sidebarToolId: 'diagnosis',
    chatSeed: 'Recommend empiric antibiotics for this infection scenario:',
    backendExecutable: false,
  },
];

/** Built-in calculator slugs not yet in Calculators.jsx UI — NLU + catalog only */
export const nluCalculatorHubOnly = [
  { toolId: 'apache2-calculator', name: 'APACHE-II', hubPath: '/tools/calculators' },
  { toolId: 'curb65-calculator', name: 'CURB-65', hubPath: '/tools/calculators' },
  { toolId: 'gcs-calculator', name: 'GCS', hubPath: '/tools/calculators' },
  { toolId: 'wells-dvt-calculator', name: 'Wells DVT', hubPath: '/tools/calculators' },
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

/** NLU / orchestrator id → sidebar registry id */
export const ORCHESTRATOR_TO_REGISTRY_ID = {
  'sofa-calculator': 'sofa-score',
  'drug-interactions': 'drug-check',
  'lab-interpreter': 'lab-interp',
  'apache2-calculator': 'calculators',
  'cha2ds2vasc-calculator': 'calc-chads2vasc',
  'curb65-calculator': 'calculators',
  'gcs-calculator': 'calculators',
  'wells-dvt-calculator': 'calculators',
  'dose-calculator': 'calculators',
  'abg-interpreter': 'lab-interp',
  'protocol-lookup': 'protocols',
  'acls-protocol': 'protocols',
  'atls-protocol': 'protocols',
  'differential-diagnosis': 'diagnosis',
  'antibiotic-guide': 'diagnosis',
};

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

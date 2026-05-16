/**
 * Clinical tools registry (sidebar, workspaces, deep links).
 *
 * `panelTool` + `initialCalc`: sidebar entries that open the shared Calculators UI on a specific calculator.
 */
const toolRegistry = [
  {
    id: 'drug-check',
    name: 'Drug Checker',
    path: '/tools/drug-checker',
    color: '#FF6B9D',
    description: 'Check drug interactions, contraindications, and dosing',
    shortcut: 'Ctrl+1',
    category: 'Diagnostic',
    features: [
      'Drug-drug interaction checking',
      'Contraindication warnings',
      'Dosage recommendations',
      'Adverse effects database',
      'Renal/hepatic adjustments',
    ],
    useCases: ['Polypharmacy management', 'New prescription safety check', 'Patient medication review'],
  },
  {
    id: 'lab-interp',
    name: 'Lab Interpreter',
    path: '/tools/lab-interpreter',
    color: '#4ECDC4',
    description: 'Interpret lab values and diagnostic tests',
    shortcut: 'Ctrl+2',
    category: 'Diagnostic',
    features: [
      'Reference range comparison',
      'Trend analysis',
      'Clinical significance explanation',
      'Critical value alerts',
      'Test correlation insights',
    ],
    useCases: ['Lab result interpretation', 'Abnormal value investigation', 'Serial lab monitoring'],
  },
  {
    id: 'sofa-score',
    name: 'SOFA Score',
    path: '/tools/calculator/sofa',
    panelTool: 'calculators',
    initialCalc: 'sofa',
    color: '#95E1D3',
    description: 'Sequential Organ Failure Assessment (ICU sepsis / organ dysfunction)',
    shortcut: 'Ctrl+3',
    category: 'Calculator',
    features: ['PaO2/FiO2 & ventilation', 'Coagulation & liver', 'Cardiovascular & CNS', 'Renal / urine output'],
    useCases: ['Sepsis bundle documentation', 'ICU severity trending', 'Mortality risk context'],
  },
  {
    id: 'calc-gfr',
    name: 'eGFR (CKD-EPI)',
    path: '/tools/calculator/gfr',
    panelTool: 'calculators',
    initialCalc: 'gfr',
    color: '#7FD1AE',
    description: 'Estimated glomerular filtration rate',
    shortcut: 'Ctrl+4',
    category: 'Calculator',
    features: ['CKD staging support', 'Creatinine-based eGFR'],
    useCases: ['Drug dosing in CKD', 'AKI vs CKD context', 'Nephrology handoff'],
  },
  {
    id: 'calc-bmi',
    name: 'BMI',
    path: '/tools/calculator/bmi',
    panelTool: 'calculators',
    initialCalc: 'bmi',
    color: '#88D4C4',
    description: 'Body mass index and weight classification',
    shortcut: 'Ctrl+5',
    category: 'Calculator',
    features: ['Metric / imperial inputs', 'WHO-style categories'],
    useCases: ['Obesity counseling', 'Peri-op risk', 'Public health screening'],
  },
  {
    id: 'calc-chads2vasc',
    name: 'CHA₂DS₂-VASc',
    path: '/tools/calculator/chads2vasc',
    panelTool: 'calculators',
    initialCalc: 'chads2vasc',
    color: '#6BCFC0',
    description: 'Stroke risk in non-valvular atrial fibrillation',
    shortcut: 'Ctrl+6',
    category: 'Calculator',
    features: ['Anticoagulation decision support context', 'Age & comorbidity factors'],
    useCases: ['AFib clinic', 'ED rate control vs rhythm', 'Cardiology consult'],
  },
  {
    id: 'qsofa',
    name: 'qSOFA (quick SOFA)',
    path: '/tools/calculators/qsofa',
    panelTool: 'calculators',
    initialCalc: 'qsofa',
    color: '#7FD1AE',
    description: 'Bedside sepsis screen: RR, SBP, mentation / GCS (Sepsis-3)',
    shortcut: 'Ctrl+Shift+7',
    category: 'Calculator',
    features: ['RR ≥22/min', 'SBP ≤100 mmHg', 'Altered mentation or GCS <15', '0–3 score'],
    useCases: ['Suspected infection in ED / ward', 'Sepsis screening alongside clinical judgment'],
  },
  {
    id: 'news2',
    name: 'NEWS2',
    path: '/tools/calculators/news2',
    panelTool: 'calculators',
    initialCalc: 'news2',
    color: '#6BCFC0',
    description: 'National Early Warning Score 2 — acute illness severity and escalation (RCP)',
    shortcut: 'Ctrl+Shift+8',
    category: 'Calculator',
    features: ['SpO₂ Scale 1 / 2', 'Supplemental oxygen', 'ACVPU', 'Aggregate score & risk band'],
    useCases: ['Ward / ED deterioration', 'Sepsis suspicion context', 'Monitoring frequency'],
  },
  {
    id: 'child-pugh',
    name: 'Child-Pugh',
    path: '/tools/calculators/child-pugh',
    panelTool: 'calculators',
    initialCalc: 'child-pugh',
    color: '#88D4C4',
    description: 'Cirrhosis severity classification (Child–Turcotte–Pugh)',
    shortcut: 'Ctrl+Shift+9',
    category: 'Calculator',
    features: ['Bilirubin & albumin', 'INR or PT prolongation', 'Ascites & encephalopathy', 'Class A/B/C'],
    useCases: ['Hepatology staging', 'Peri-procedure risk context', 'Transplant referral discussion'],
  },
  {
    id: 'has-bled',
    name: 'HAS-BLED',
    path: '/tools/calculators/has-bled',
    panelTool: 'calculators',
    initialCalc: 'has-bled',
    color: '#FF6B9D',
    description: 'Bleeding-risk score when considering anticoagulation (e.g. AF)',
    shortcut: 'Ctrl+Shift+0',
    category: 'Calculator',
    features: ['Hypertension', 'Renal / liver', 'Stroke & bleeding', 'Labile INR', 'Age, drugs, alcohol'],
    useCases: ['AF anticoagulation counselling', 'Risk documentation', 'MDT preparation'],
  },
  {
    id: 'calculators',
    name: 'All calculators',
    path: '/tools/calculators',
    color: '#5EC4B8',
    description: 'Browse every built-in calculator in one place',
    shortcut: 'Ctrl+7',
    category: 'Calculator',
    features: ['SOFA', 'qSOFA', 'NEWS2', 'Child-Pugh', 'HAS-BLED', 'eGFR', 'BMI', 'CHA₂DS₂-VASc'],
    useCases: ['Teaching', 'Quick switching between scores'],
  },
  {
    id: 'protocols',
    name: 'Clinical Protocols',
    path: '/tools/protocols',
    color: '#A8E6CF',
    description: 'Evidence-based clinical protocols and guidelines',
    shortcut: 'Ctrl+8',
    category: 'Reference',
    features: [
      'Specialty-specific protocols',
      'Emergency algorithms',
      'Treatment pathways',
      'Evidence-based guidelines',
      'Institution protocols',
    ],
    useCases: ['Acute care management', 'Standard of care reference', 'Quality improvement'],
  },
  {
    id: 'diagnosis',
    name: 'Diagnosis Assistant',
    path: '/tools/diagnosis',
    color: '#FFD93D',
    description: 'Differential diagnosis and diagnostic support',
    shortcut: 'Ctrl+9',
    category: 'Diagnostic',
    features: [
      'Symptom-based differentials',
      'Diagnostic criteria lookup',
      'Pattern recognition',
      'Clinical decision trees',
      'Rare disease identification',
    ],
    useCases: ['Differential diagnosis generation', 'Diagnostic workup planning', 'Complex case analysis'],
  },
  {
    id: 'procedures',
    name: 'Procedure Guide',
    path: '/tools/procedures',
    color: '#6BCB77',
    description: 'Procedural guidance and step-by-step instructions',
    shortcut: 'Ctrl+0',
    category: 'Reference',
    features: [
      'Step-by-step instructions',
      'Equipment checklists',
      'Complication management',
      'Contraindication warnings',
      'Video demonstrations',
    ],
    useCases: ['Procedure preparation', 'Complication troubleshooting', 'Training reference'],
  },
];

export const toolRegistryById = toolRegistry.reduce((acc, tool) => {
  acc[tool.id] = tool;
  return acc;
}, {});

export const getToolById = (toolId) => toolRegistryById[toolId] || null;

/**
 * Map a registry id from a legacy URL (?tool=) to the calculators panel id and optional calculator slug.
 */
export function resolveToolDrawerParams(registryToolId) {
  const entry = registryToolId ? toolRegistryById[registryToolId] : null;
  if (!entry) {
    return { drawerToolId: null, initialCalc: null };
  }
  if (entry.panelTool) {
    return { drawerToolId: entry.panelTool, initialCalc: entry.initialCalc || null };
  }
  return { drawerToolId: entry.id, initialCalc: null };
}

export default toolRegistry;

const DEFAULT_SYMPTOMS =
  'Chest pain with shortness of breath, diaphoresis, and nausea for two hours.';

const SIGNAL_DEFINITIONS = Object.freeze([
  {
    id: 'acs',
    label: 'Possible ACS / cardiac ischemia',
    keywords: ['chest pain', 'pressure', 'diaphoresis', 'nausea', 'radiating', 'troponin', 'ecg'],
    risk: 'high',
    calculators: ['heart-score', 'timi-ua-nstemi', 'grace-acs'],
    workflows: ['ACS pathway review', 'ECG/troponin trend handoff', 'Chest pain observation workflow'],
    labs: ['Serial troponin', 'CBC', 'BMP including potassium and creatinine', 'Coagulation studies if anticoagulated'],
    imaging: ['12-lead ECG now and repeat', 'Chest X-ray if dyspnea or alternate diagnosis concern'],
    escalation: ['Escalate immediately for unstable vitals, ischemic ECG changes, or refractory symptoms'],
  },
  {
    id: 'sepsis',
    label: 'Possible infection / sepsis deterioration',
    keywords: ['fever', 'infection', 'hypotension', 'lactate', 'confusion', 'tachycardia', 'sepsis'],
    risk: 'high',
    calculators: ['qsofa', 'news2', 'sofa-score'],
    workflows: ['Sepsis screening workflow', 'Deterioration huddle', 'Closed-loop handoff'],
    labs: ['CBC with differential', 'CMP', 'Lactate trend', 'Blood cultures before antibiotics when feasible'],
    imaging: ['Chest X-ray for respiratory source', 'Source-directed imaging based on exam'],
    escalation: ['Escalate for hypotension, altered mental status, rising lactate, or increased oxygen need'],
  },
  {
    id: 'stroke',
    label: 'Possible stroke / neurologic emergency',
    keywords: ['weakness', 'aphasia', 'facial droop', 'stroke', 'slurred', 'last known well', 'vision loss'],
    risk: 'critical',
    calculators: ['nihss', 'abcd2'],
    workflows: ['Stroke alert workflow', 'Last-known-well documentation', 'Contraindication checklist'],
    labs: ['Point-of-care glucose', 'CBC', 'BMP', 'PT/INR if anticoagulation possible'],
    imaging: ['Non-contrast head CT', 'CTA head/neck when pathway appropriate'],
    escalation: ['Activate stroke team for focal deficit or unclear last-known-well with persistent symptoms'],
  },
  {
    id: 'respiratory',
    label: 'Respiratory failure / pulmonary embolism risk',
    keywords: ['shortness of breath', 'dyspnea', 'hypoxia', 'pleuritic', 'wheezing', 'hemoptysis', 'tachypnea'],
    risk: 'high',
    calculators: ['wells-pe', 'perc', 'rox-index', 'pao2-fio2-ratio'],
    workflows: ['Oxygen escalation review', 'PE rule-out workflow', 'Respiratory support escalation'],
    labs: ['ABG/VBG when ventilation concern', 'D-dimer only when pathway appropriate', 'CBC', 'BMP'],
    imaging: ['Chest X-ray', 'CT pulmonary angiography when PE pathway supports it'],
    escalation: ['Escalate for worsening hypoxia, fatigue, altered mental status, or hemodynamic instability'],
  },
  {
    id: 'abdominal',
    label: 'Abdominal pain / GI risk',
    keywords: ['abdominal pain', 'melena', 'hematemesis', 'vomiting', 'right upper quadrant', 'pancreatitis'],
    risk: 'moderate',
    calculators: ['glasgow-blatchford-score', 'bisap-score', 'ranson-criteria', 'meld'],
    workflows: ['GI bleed workflow', 'Pancreatitis severity review', 'Surgical consult threshold review'],
    labs: ['CBC trend', 'CMP/LFTs', 'Lipase', 'Type and screen if bleeding concern'],
    imaging: ['RUQ ultrasound when biliary concern', 'CT abdomen/pelvis when severe or unclear diagnosis'],
    escalation: ['Escalate for peritonitis, shock, active bleeding, or falling hemoglobin'],
  },
  {
    id: 'renal-metabolic',
    label: 'Renal / metabolic abnormality',
    keywords: ['kidney', 'creatinine', 'hyperkalemia', 'sodium', 'anion gap', 'glucose', 'dka', 'dehydration'],
    risk: 'moderate',
    calculators: ['ckd-staging', 'egfr-ckd-epi', 'corrected-sodium', 'anion-gap'],
    workflows: ['Electrolyte safety workflow', 'DKA pathway review', 'Renal dosing checkpoint'],
    labs: ['BMP repeat', 'Magnesium/phosphorus', 'Serum ketones when DKA concern', 'Urinalysis'],
    imaging: ['Renal ultrasound if obstruction concern', 'No routine imaging unless exam suggests source'],
    escalation: ['Escalate for ECG changes, severe electrolyte abnormality, acidosis, or altered mental status'],
  },
]);

const ROLE_HINTS = Object.freeze({
  'emergency physician': 'Prioritize time-sensitive stabilization, pathway activation, and disposition risk.',
  nurse: 'Prioritize monitoring changes, medication safety, closed-loop escalation, and handoff clarity.',
  'medical student': 'Prioritize structured differential, must-not-miss diagnoses, and calculator selection rationale.',
  cardiologist: 'Prioritize ECG/troponin patterns, ACS risk, and cardiology escalation thresholds.',
  'ICU clinician': 'Prioritize organ dysfunction, respiratory support, and early deterioration signals.',
  'biomedical engineer': 'Prioritize device telemetry reliability and escalation when monitoring data conflict.',
});

const WORKSPACE_HINTS = Object.freeze({
  diagnostic: 'Diagnostic workspace active: recommendations emphasize risk stratification and differential workflow.',
  calculator: 'Calculator workspace active: recommendations emphasize calculator selection and interpretation limits.',
  reference: 'Reference workspace active: recommendations emphasize pathways, evidence notes, and handoff structure.',
  'hospital-operations': 'Operations workspace active: recommendations include escalation and capacity-aware workflow handoff.',
});

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values.filter(Boolean))];
}

function detectSignals(symptoms) {
  const text = normalize(symptoms || DEFAULT_SYMPTOMS);
  const matches = SIGNAL_DEFINITIONS.map((signal) => {
    const matchedKeywords = signal.keywords.filter((keyword) => text.includes(keyword));
    return { ...signal, matchedKeywords };
  }).filter((signal) => signal.matchedKeywords.length > 0);

  return matches.length
    ? matches
    : [{ ...SIGNAL_DEFINITIONS[0], matchedKeywords: ['default presentation'] }];
}

function riskRank(risk) {
  return risk === 'critical' ? 3 : risk === 'high' ? 2 : risk === 'moderate' ? 1 : 0;
}

function chooseRisk(signals) {
  return signals.reduce((highest, signal) => (riskRank(signal.risk) > riskRank(highest) ? signal.risk : highest), 'low');
}

function calculatorCards(signals, calculatorInventory) {
  const byId = new Map<any, any>(calculatorInventory.map((tool) => [tool.id, tool]));
  return unique(signals.flatMap((signal) => signal.calculators))
    .map((id: any) => byId.get(id) || byId.get((id as string).replace(/-score$/, '')))
    .filter(Boolean)
    .slice(0, 6);
}

export function buildClinicalDecisionSupportPlan({
  symptoms = DEFAULT_SYMPTOMS,
  patientContext = {} as any,
  profile = {} as any,
  activeWorkspaceId = 'all',
  calculatorInventory = [] as readonly any[],
} = {}) {
  const signals = detectSignals(symptoms);
  const riskLevel = chooseRisk(signals);
  const role = normalize(profile.role) || 'medical student';
  const specialty = normalize(profile.specialty) || 'medical education';
  const workspace = normalize(activeWorkspaceId) || 'all';
  const selectedCalculators = calculatorCards(signals, calculatorInventory);

  const age = Number(patientContext.age || 0);
  const ageRisk = age >= 65 ? 'Age >= 65 increases pretest risk and escalation sensitivity.' : null;
  const unstableVitals = normalize(patientContext.vitals).match(/hypotension|spo2|tachycardia|altered|shock/);

  const escalationSuggestions = unique([
    ...signals.flatMap((signal) => signal.escalation),
    unstableVitals ? 'Treat unstable vitals as an immediate escalation trigger.' : null,
    riskLevel === 'critical' ? 'Use local emergency activation pathway now if symptoms are active.' : null,
  ]);

  return {
    sourceStatus: 'local-decision-support',
    safetyLabel: 'Clinical decision support only - verify with clinician judgment and local policy',
    riskLevel,
    signals: signals.map((signal) => ({
      id: signal.id,
      label: signal.label,
      matchedKeywords: signal.matchedKeywords,
      risk: signal.risk,
    })),
    calculatorRecommendations: selectedCalculators.map((tool) => ({
      id: tool.id,
      name: tool.name || tool.label,
      path: tool.path || tool.route || tool.navigationPath,
      reason: `Matched ${signals
        .filter((signal) => signal.calculators.includes(tool.id))
        .map((signal) => signal.label)
        .join(', ') || 'patient risk context'}.`,
    })),
    workflowRecommendations: unique(signals.flatMap((signal) => signal.workflows)),
    labRecommendations: unique(signals.flatMap((signal) => signal.labs)),
    imagingRecommendations: unique(signals.flatMap((signal) => signal.imaging)),
    escalationSuggestions,
    assistantPrompt: `Help explain a clinical decision support plan for: ${symptoms}`,
    explainability: {
      matchedSignals: signals.map((signal) => signal.label),
      profileContext: ROLE_HINTS[role] || `Profile role "${role}" used for recommendation framing.`,
      workspaceContext:
        WORKSPACE_HINTS[workspace] ||
        `Workspace "${workspace}" active; recommendations include calculator, workflow, lab, imaging, and escalation domains.`,
      specialtyContext: `Specialty context: ${specialty}.`,
      patientContext: unique([
        ageRisk,
        patientContext.sex ? `Sex/context captured: ${patientContext.sex}.` : null,
        patientContext.history ? `History considered: ${patientContext.history}.` : null,
        patientContext.vitals ? `Vitals considered: ${patientContext.vitals}.` : null,
      ]),
      inventoryContext: `${selectedCalculators.length} calculator recommendations were selected from the canonical calculator inventory.`,
      limitations: [
        'Does not diagnose or order care.',
        'Does not replace local protocols, supervising clinician review, or emergency escalation.',
        'Recommendations are deterministic support based on entered context and available inventory.',
      ],
    },
  };
}

export { DEFAULT_SYMPTOMS, SIGNAL_DEFINITIONS };

export const PROTOCOL_CATEGORIES = Object.freeze([
  'sepsis',
  'ACS',
  'stroke',
  'trauma',
  'DKA',
  'respiratory failure',
  'pediatric fever',
]);

export const PROTOCOL_PATHWAYS = Object.freeze([
  {
    id: 'sepsis',
    category: 'sepsis',
    title: 'Sepsis Management',
    subtitle: 'Early recognition, bundle activation, escalation, and reassessment',
    status: 'demo-guideline-support',
    currentVersion: 'v2026.05',
    updatedAt: '2026-05-20',
    summary:
      'Structured support for suspected infection with organ dysfunction, early risk scoring, lactate review, cultures, antibiotics, fluids, and escalation.',
    indications: ['Suspected infection', 'Hypotension or lactate elevation', 'Altered mentation', 'Rising organ dysfunction'],
    steps: [
      'Confirm sepsis concern and assess airway, breathing, circulation, disability, and exposure.',
      'Use qSOFA, NEWS2, or SOFA as decision-support context, not as a standalone diagnosis.',
      'Review lactate, CBC, CMP, cultures, source control needs, and antimicrobial timing.',
      'Escalate for persistent hypotension, elevated lactate, shock physiology, or rapid deterioration.',
    ],
    redFlags: ['SBP <= 90 or MAP < 65', 'Lactate >= 4 mmol/L', 'New confusion', 'Oliguria', 'Escalating oxygen needs'],
    linkedCalculators: [
      { id: 'qsofa', label: 'qSOFA', path: '/tools/calculators/qsofa' },
      { id: 'sofa-score', label: 'SOFA Score', path: '/tools/calculators/sofa' },
      { id: 'news2', label: 'NEWS2', path: '/tools/calculators/news2' },
    ],
    linkedSimulations: [
      { id: 'sepsis-deterioration', label: 'Sepsis deterioration simulation', path: '/simulation/sepsis-deterioration' },
      { id: 'abnormal-lab-escalation', label: 'Abnormal lab escalation', path: '/simulation/abnormal-lab-escalation' },
    ],
    versionHistory: [
      { version: 'v2026.05', date: '2026-05-20', notes: 'Added linked simulation debrief and lactate escalation emphasis.' },
      { version: 'v2025.11', date: '2025-11-12', notes: 'Aligned calculator links with unified CareDroid calculator routes.' },
    ],
    aiExplanation:
      'This pathway prioritizes early recognition and escalation because delayed source control, antibiotics, perfusion support, or ICU transfer increases safety risk.',
  },
  {
    id: 'acs',
    category: 'ACS',
    title: 'ACS Chest Pain Pathway',
    subtitle: 'Chest pain triage, ECG/troponin workflow, risk context, and cardiology escalation',
    status: 'demo-guideline-support',
    currentVersion: 'v2026.04',
    updatedAt: '2026-04-28',
    summary:
      'Supports suspected acute coronary syndrome workup with immediate ECG, serial biomarkers, risk stratification, contraindication review, and escalation triggers.',
    indications: ['Chest pain', 'Dyspnea with ischemic concern', 'Syncope with ECG changes', 'Elevated troponin'],
    steps: [
      'Obtain immediate ECG and repeat if symptoms persist or initial ECG is nondiagnostic.',
      'Trend high-sensitivity troponin per local pathway and evaluate dynamic changes.',
      'Use HEART, TIMI, or GRACE as risk context alongside clinician assessment.',
      'Escalate STEMI, unstable vitals, malignant arrhythmia, refractory pain, or shock physiology.',
    ],
    redFlags: ['ST elevation', 'New LBBB with ischemic concern', 'Hemodynamic instability', 'Ventricular arrhythmia', 'Ongoing ischemic symptoms'],
    linkedCalculators: [
      { id: 'heart-score', label: 'HEART Score', path: '/tools/calculators/heart-score' },
      { id: 'timi-ua-nstemi', label: 'TIMI UA/NSTEMI', path: '/tools/calculators/timi-ua-nstemi' },
      { id: 'grace-acs', label: 'GRACE ACS', path: '/tools/calculators/grace-acs' },
    ],
    linkedSimulations: [
      { id: 'chest-pain-acs', label: 'Chest pain ACS simulation', path: '/simulation/chest-pain-acs' },
    ],
    versionHistory: [
      { version: 'v2026.04', date: '2026-04-28', notes: 'Added GRACE ACS and simulation quick links.' },
      { version: 'v2025.10', date: '2025-10-05', notes: 'Added serial ECG reminder.' },
    ],
    aiExplanation:
      'This pathway keeps time-sensitive ECG changes and unstable symptoms visible while using calculators only as risk context.',
  },
  {
    id: 'stroke',
    category: 'stroke',
    title: 'Stroke Alert Pathway',
    subtitle: 'Last-known-well, NIHSS context, imaging readiness, and thrombolysis/thrombectomy escalation',
    status: 'demo-guideline-support',
    currentVersion: 'v2026.03',
    updatedAt: '2026-03-15',
    summary:
      'Supports stroke alert coordination with last-known-well capture, glucose check, NIHSS context, imaging readiness, and neurology escalation.',
    indications: ['New focal neurologic deficit', 'Speech change', 'Vision loss', 'Severe acute dizziness with neuro signs', 'Wake-up stroke concern'],
    steps: [
      'Confirm last-known-well, anticoagulant exposure, glucose, vitals, and baseline function.',
      'Use NIHSS to structure neurologic deficit documentation.',
      'Coordinate noncontrast CT/CTA or local imaging protocol without delaying escalation.',
      'Escalate immediately for disabling deficit, large-vessel occlusion concern, or airway compromise.',
    ],
    redFlags: ['Airway risk', 'Rapidly worsening deficit', 'Severe hypertension requiring protocol review', 'Anticoagulant exposure', 'LVO concern'],
    linkedCalculators: [
      { id: 'nihss', label: 'NIHSS', path: '/tools/calculators/nihss' },
      { id: 'gcs-calculator', label: 'Glasgow Coma Scale', path: '/tools/calculators/gcs' },
    ],
    linkedSimulations: [
      { id: 'stroke-alert', label: 'Stroke alert simulation', path: '/simulation/stroke-alert' },
    ],
    versionHistory: [
      { version: 'v2026.03', date: '2026-03-15', notes: 'Added LVO and imaging coordination prompts.' },
      { version: 'v2025.09', date: '2025-09-21', notes: 'Added NIHSS quick link.' },
    ],
    aiExplanation:
      'This pathway emphasizes last-known-well and imaging coordination because treatment eligibility and transfer decisions are time dependent.',
  },
  {
    id: 'trauma',
    category: 'trauma',
    title: 'Trauma Primary Survey Pathway',
    subtitle: 'ATLS-style primary survey, hemorrhage recognition, and trauma team escalation',
    status: 'demo-guideline-support',
    currentVersion: 'v2026.02',
    updatedAt: '2026-02-18',
    summary:
      'Supports trauma team coordination through airway, breathing, circulation, disability, exposure, hemorrhage control, and transfer triggers.',
    indications: ['Major trauma', 'High-energy mechanism', 'Shock after injury', 'Penetrating injury', 'Altered mental status after trauma'],
    steps: [
      'Run primary survey with immediate life-threat interventions.',
      'Identify hemorrhage sources and activate local massive transfusion workflow when indicated.',
      'Use GCS, Revised Trauma Score, or pediatric trauma context when appropriate.',
      'Escalate for airway threat, shock, penetrating torso injury, or neurologic deterioration.',
    ],
    redFlags: ['Uncontrolled hemorrhage', 'Airway compromise', 'Tension physiology', 'GCS decline', 'Pelvic instability'],
    linkedCalculators: [
      { id: 'revised-trauma-score', label: 'Revised Trauma Score', path: '/tools/calculators/revised-trauma-score' },
      { id: 'gcs-calculator', label: 'GCS', path: '/tools/calculators/gcs' },
    ],
    linkedSimulations: [
      { id: 'trauma-triage', label: 'Trauma triage simulation', path: '/simulation/trauma-triage' },
      { id: 'mass-casualty-incident', label: 'Mass casualty incident', path: '/simulation/mass-casualty-incident' },
    ],
    versionHistory: [
      { version: 'v2026.02', date: '2026-02-18', notes: 'Added disaster and mass casualty simulation link.' },
      { version: 'v2025.08', date: '2025-08-09', notes: 'Added Revised Trauma Score link.' },
    ],
    aiExplanation:
      'This pathway is organized around the primary survey so immediately reversible threats are handled before detailed diagnostics.',
  },
  {
    id: 'dka',
    category: 'DKA',
    title: 'DKA Management Pathway',
    subtitle: 'DKA recognition, potassium safety, insulin workflow, and gap closure monitoring',
    status: 'demo-guideline-support',
    currentVersion: 'v2026.01',
    updatedAt: '2026-01-25',
    summary:
      'Supports diabetic ketoacidosis workflow with volume status, potassium safety, anion gap tracking, insulin timing, and ICU escalation triggers.',
    indications: ['Hyperglycemia with ketones', 'Anion gap metabolic acidosis', 'Vomiting/dehydration', 'Altered mentation with diabetes'],
    steps: [
      'Confirm glucose, ketones, pH or bicarbonate, anion gap, potassium, creatinine, and mental status.',
      'Assess potassium before insulin initiation and follow local electrolyte replacement protocol.',
      'Trend anion gap, glucose, potassium, and fluid balance.',
      'Escalate for severe acidosis, shock, cerebral edema concern, or inability to monitor safely.',
    ],
    redFlags: ['K < 3.3 mEq/L', 'pH < 7.0', 'Shock', 'Altered mental status', 'Cerebral edema concern'],
    linkedCalculators: [
      { id: 'anion-gap', label: 'Anion Gap', path: '/tools/calculators/anion-gap' },
      { id: 'corrected-sodium', label: 'Corrected Sodium', path: '/tools/calculators/corrected-sodium' },
    ],
    linkedSimulations: [
      { id: 'dka-management', label: 'DKA management simulation', path: '/simulation/dka-management' },
    ],
    versionHistory: [
      { version: 'v2026.01', date: '2026-01-25', notes: 'Added potassium safety red flag and corrected sodium link.' },
      { version: 'v2025.07', date: '2025-07-18', notes: 'Added anion gap tracking.' },
    ],
    aiExplanation:
      'This pathway foregrounds potassium and anion gap because insulin therapy without electrolyte readiness can create immediate safety risk.',
  },
  {
    id: 'respiratory-failure',
    category: 'respiratory failure',
    title: 'Respiratory Failure Pathway',
    subtitle: 'Oxygenation, ventilation, ABG context, noninvasive support, and airway escalation',
    status: 'demo-guideline-support',
    currentVersion: 'v2026.05',
    updatedAt: '2026-05-04',
    summary:
      'Supports evaluation of hypoxemic or hypercapnic respiratory failure with oxygenation, ventilation, ABG/VBG context, and escalation triggers.',
    indications: ['Hypoxemia', 'Hypercapnia', 'Increased work of breathing', 'Respiratory acidosis', 'Impending airway failure'],
    steps: [
      'Assess airway protection, work of breathing, oxygenation, perfusion, and mental status.',
      'Interpret ABG/VBG context with pulse oximetry, oxygen delivery, and suspected physiology.',
      'Consider local noninvasive ventilation, high-flow, or airway escalation criteria.',
      'Escalate for exhaustion, shock, altered mentation, refractory hypoxemia, or severe acidosis.',
    ],
    redFlags: ['Silent chest', 'Exhaustion', 'Rising CO2 with altered mentation', 'Refractory hypoxemia', 'Severe acidosis'],
    linkedCalculators: [
      { id: 'abg-interpreter', label: 'ABG Interpreter', path: '/tools/lab-interpreter' },
      { id: 'pao2-fio2-ratio', label: 'PaO2/FiO2 Ratio', path: '/tools/calculators/pao2-fio2-ratio' },
      { id: 'copd-gold', label: 'COPD GOLD', path: '/tools/calculators/copd-gold' },
    ],
    linkedSimulations: [
      { id: 'respiratory-failure', label: 'Respiratory failure simulation', path: '/simulation/respiratory-failure' },
    ],
    versionHistory: [
      { version: 'v2026.05', date: '2026-05-04', notes: 'Added ABG and PaO2/FiO2 links.' },
      { version: 'v2025.12', date: '2025-12-01', notes: 'Added noninvasive support escalation framing.' },
    ],
    aiExplanation:
      'This pathway separates oxygenation, ventilation, and airway protection so deterioration is not hidden behind a single oxygen saturation value.',
  },
  {
    id: 'pediatric-fever',
    category: 'pediatric fever',
    title: 'Pediatric Fever Pathway',
    subtitle: 'Age band, appearance, hydration, sepsis risk, and escalation support',
    status: 'demo-guideline-support',
    currentVersion: 'v2026.04',
    updatedAt: '2026-04-10',
    summary:
      'Supports pediatric fever evaluation with age-specific risk, appearance, hydration, respiratory status, and caregiver safety-net planning.',
    indications: ['Fever in infant or child', 'Ill appearance', 'Poor feeding', 'Dehydration concern', 'Fever with rash or respiratory distress'],
    steps: [
      'Document age band, immunization context, appearance, hydration, respiratory status, and caregiver concern.',
      'Use PEWS or age-specific fever risk context when appropriate.',
      'Review local evaluation pathway for infants, immunocompromised children, or incomplete immunization.',
      'Escalate for toxic appearance, poor perfusion, respiratory distress, dehydration, or neurologic signs.',
    ],
    redFlags: ['Age under 28 days', 'Toxic appearance', 'Non-blanching rash', 'Neck stiffness', 'Poor perfusion', 'Seizure'],
    linkedCalculators: [
      { id: 'pews', label: 'PEWS', path: '/tools/calculators/pews' },
      { id: 'pediatric-gcs', label: 'Pediatric GCS', path: '/tools/calculators/pediatric-gcs' },
    ],
    linkedSimulations: [
      { id: 'pediatric-fever', label: 'Pediatric fever simulation', path: '/simulation/pediatric-fever' },
    ],
    versionHistory: [
      { version: 'v2026.04', date: '2026-04-10', notes: 'Added age band and caregiver safety-net prompts.' },
      { version: 'v2025.11', date: '2025-11-02', notes: 'Added PEWS link.' },
    ],
    aiExplanation:
      'This pathway makes age and appearance explicit because fever risk changes sharply in neonates, infants, and ill-appearing children.',
  },
]);

export function getProtocolPathwayById(id) {
  return PROTOCOL_PATHWAYS.find((protocol) => protocol.id === id);
}

export function getProtocolPathwaysByCategory(category) {
  if (!category || category === 'all') return PROTOCOL_PATHWAYS;
  return PROTOCOL_PATHWAYS.filter((protocol) => protocol.category.toLowerCase() === String(category).toLowerCase());
}

export function searchProtocolPathways(query) {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  if (!normalizedQuery) return PROTOCOL_PATHWAYS;

  return PROTOCOL_PATHWAYS.filter((protocol) => {
    const haystack = [
      protocol.title,
      protocol.category,
      protocol.summary,
      ...protocol.indications,
      ...protocol.redFlags,
      ...protocol.linkedCalculators.map((calculator) => calculator.label),
      ...protocol.linkedSimulations.map((simulation) => simulation.label),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

export function buildProtocolAiPrompt(protocol) {
  return [
    `Explain this clinical pathway for ${protocol.title}.`,
    `Category: ${protocol.category}.`,
    `Summary: ${protocol.summary}`,
    `Key red flags: ${protocol.redFlags.join(', ')}.`,
    'Keep it concise, explain the clinical reasoning, and remind the user this is decision support only.',
  ].join(' ');
}

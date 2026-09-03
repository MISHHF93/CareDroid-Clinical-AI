/**
 * Hub layout for Tier-B chat-assisted calculators (Calculators.jsx, ToolsOverview).
 * Group headings and leads emphasise decision support and emergency-pathway priority.
 */

export const CHAT_ASSISTED_HUB_GROUPS = Object.freeze([
  {
    groupId: 'cardiac',
    heading: 'Acute coronary syndrome',
    lead: 'GRACE supports ACS mortality risk stratification (clinical decision support only). It does not diagnose ACS, does not confirm or exclude acute coronary syndrome, and does not recommend treatments. Unstable patients, STEMI, shock, or arrest need immediate local ACS/STEMI pathways — do not delay emergency care to finish chat.',
    toolIds: ['grace-acs'],
  },
  {
    groupId: 'cardiology-assistants',
    heading: 'Cardiology workflow assistants',
    lead: 'ECG, STEMI, ACS, atrial fibrillation, and heart failure assistants organize cardiology review and handoff prompts. They are clinical decision support only, do not diagnose, do not recommend treatment or disposition, and must not delay emergency ACS/STEMI, unstable arrhythmia, or decompensated heart failure pathways.',
    toolIds: [
      'ecg-interpretation-assistant',
      'stemi-pathway-assistant',
      'acs-workflow-assistant',
      'atrial-fibrillation-assistant',
      'heart-failure-assistant',
    ],
  },
  {
    groupId: 'neurology',
    heading: 'Acute stroke severity (NIHSS)',
    lead: 'NIHSS documents neurologic deficit severity on exam (clinical decision support only). It does not diagnose stroke and does not determine treatment. Suspected acute stroke requires emergency stroke pathways, imaging, and stroke team activation first — do not defer urgent care to complete scoring in chat.',
    toolIds: ['nihss'],
  },
  {
    groupId: 'neurology-assistants',
    heading: 'Neurology workflow assistants',
    lead: 'Seizure, stroke workflow, headache red-flag, vertigo/HINTS, and neuro exam assistants organize exam-heavy review and handoff prompts. They are clinical decision support only, do not diagnose, do not recommend treatment or disposition, and must not delay emergency stroke, seizure, airway, trauma, infection, or neurosurgical pathways.',
    toolIds: [
      'seizure-assistant',
      'stroke-workflow-assistant',
      'headache-red-flag-assistant',
      'vertigo-hints-assistant',
      'neuro-exam-assistant',
    ],
  },
  {
    groupId: 'pediatrics-obgyn-assistants',
    heading: 'Pediatrics and OB-GYN workflows',
    lead: 'Pediatric sepsis, pregnancy workflow, neonatal assessment, and OB triage assistants organize review and handoff prompts. They are pediatric/OB decision support only, do not diagnose, do not recommend treatment, medication dosing, delivery timing, procedures, or disposition, and must not delay urgent maternal, fetal, neonatal, pediatric sepsis, airway, trauma, or emergency pathways.',
    toolIds: [
      'pediatric-sepsis-assistant',
      'pregnancy-workflow-assistant',
      'neonatal-assessment-assistant',
      'ob-triage-assistant',
    ],
  },
  {
    groupId: 'psychiatry-screening-assistants',
    heading: 'Psychiatry and screening workflows',
    lead: 'Mental health screening, suicide-risk workflow, substance-use screening, and cognitive screening assistants organize review prompts. They are screening decision support only, do not diagnose, do not recommend medications or therapy, require human review, and must not delay psychiatric emergency, intoxication, withdrawal, delirium, or medical emergency pathways.',
    toolIds: [
      'mental-health-screening-assistant',
      'suicide-risk-workflow-assistant',
      'substance-use-screening-assistant',
      'cognitive-screening-assistant',
    ],
  },
  {
    groupId: 'trauma',
    heading: 'Trauma imaging decision support',
    lead: 'Canadian C-Spine, Ottawa ankle/foot, and PECARN pediatric head rules support selected imaging decisions (clinical decision support only). They do not clear the spine, prove absence of fracture, rule out injury with certainty, rule out brain injury, or mandate or defer CT. Unstable patients, neurovascular compromise, open fractures, declining mental status, and severe trauma need full evaluation without delay — do not defer urgent care to finish chat.',
    toolIds: ['canadian-c-spine', 'nexus-cspine', 'ottawa-ankle', 'pecarn-head'],
  },
  {
    groupId: 'pe',
    heading: 'Pulmonary embolism probability',
    lead: 'Wells and PERC inform pre-test probability when PE is being considered. They do not rule in or rule out PE with certainty and are not a substitute for imaging or clinical judgment when PE cannot be safely excluded.',
    toolIds: ['wells-pe', 'perc'],
  },
  {
    groupId: 'pulmonary-copd',
    heading: 'COPD (GOLD grouping)',
    lead: 'COPD GOLD grouping support uses symptom burden and exacerbation history to suggest A/B/E groups for discussion. It does not diagnose COPD, does not replace spirometry for GOLD grades 1–4, and does not recommend inhalers or other therapy — acute exacerbation requires urgent evaluation per local protocols.',
    toolIds: ['copd-gold'],
  },
  {
    groupId: 'pulmonology-assistants',
    heading: 'Pulmonology workflow assistants',
    lead: 'Asthma, ventilator, oxygen escalation, and COPD assistants organize respiratory review and handoff prompts. They are clinical decision support only, do not diagnose, do not recommend treatment or disposition, and must not delay emergency respiratory, oxygen, ventilator, asthma, or COPD pathways.',
    toolIds: [
      'asthma-exacerbation-assistant',
      'ventilator-support-assistant',
      'oxygen-escalation-helper',
      'copd-workflow-assistant',
    ],
  },
  {
    groupId: 'nephrology-assistants',
    heading: 'Nephrology workflow assistants',
    lead: 'AKI staging, dialysis readiness, and electrolyte assistants organize renal review and handoff prompts. They are clinical decision support only, do not diagnose, do not recommend fluids, dialysis, electrolyte replacement, correction rates, or medication dosing, and must not delay urgent AKI, electrolyte, toxicology, or critical-care pathways.',
    toolIds: [
      'aki-staging-assistant',
      'dialysis-readiness-helper',
      'electrolyte-disorder-assistant',
    ],
  },
  {
    groupId: 'endocrine-metabolic-assistants',
    heading: 'Endocrine and metabolic workflow assistants',
    lead: 'Diabetes, DKA, thyroid, and metabolic syndrome assistants organize review, missing data, and handoff prompts. They are clinical decision support only, do not diagnose, do not recommend insulin or other medication dosing, and must not delay urgent hypoglycemia, DKA, HHS, thyroid storm, myxedema, or electrolyte pathways.',
    toolIds: [
      'diabetes-care-assistant',
      'dka-pathway-assistant',
      'thyroid-disorder-assistant',
      'metabolic-syndrome-assistant',
    ],
  },
  {
    groupId: 'gastrointestinal',
    heading: 'Rome IV IBS criteria',
    lead: 'Rome IV criteria support reviews abdominal pain frequency, duration, and stool-related features for discussion. It is informational only, does not diagnose irritable bowel syndrome, and does not replace alarm-feature workup — red-flag symptoms require clinician evaluation without delay.',
    toolIds: ['rome-iv-ibs'],
  },
  {
    groupId: 'hepatology-gi-workflows',
    heading: 'Hepatology and GI workflows',
    lead: 'GI bleed, liver disease, and pancreatitis assistants organize risk-score context, trends, missing data, and handoff prompts. They are clinical decision support only, do not diagnose, do not recommend treatment, procedures, or disposition, and must not delay urgent GI bleed, liver failure, pancreatitis, endoscopy, or emergency pathways.',
    toolIds: [
      'gi-bleed-workflow-assistant',
      'liver-disease-assistant',
      'pancreatitis-workflow-assistant',
    ],
  },
  {
    groupId: 'medication-dosing-education',
    heading: 'Medication dosing education',
    lead: 'Medication dose support is educational only. It explains dosing concepts, renal adjustment considerations, and protocol lookup prompts, but does not calculate patient-specific mg/kg doses or recommend a prescription.',
    toolIds: ['dose-calculator'],
  },
  {
    groupId: 'fleet-dispatch',
    heading: 'Fleet dispatch intelligence',
    lead: 'Dispatch Intelligence supports assignment options, prioritization, and bottleneck review in chat. It does not auto-assign vehicles, change live routes, or override dispatcher authority — verify all actions against your dispatch system of record.',
    toolIds: ['dispatch-ai'],
  },
  {
    groupId: 'hospital-operations-command',
    heading: 'Hospital operations command',
    lead: 'Hospital Command, Resource Allocation, and Device Recommendation assistants organize operations huddles, constraints, and source-system checks. They do not auto-dispatch, allocate resources, assign devices, change staffing, or make clinical decisions; command staff must approve every action.',
    toolIds: [
      'hospital-command-assistant',
      'resource-allocation-assistant',
      'device-recommendation-assistant',
    ],
  },
  {
    groupId: 'nlu-hub-screening',
    heading: 'Screening & severity (chat)',
    lead: 'Wells DVT supports structured scoring in guided chat (clinical decision support only). It does not diagnose DVT, establish prognosis with certainty, or replace VTE pathways — unstable patients need urgent evaluation first.',
    toolIds: ['wells-dvt-calculator'],
  },
]);

/**
 * Accessible name for chat-assisted launch controls (keyboard / screen readers).
 * @param {string} toolName
 */
export function chatAssistedLaunchAriaLabel(toolName) {
  return `Start guided chat: ${toolName}. Clinical decision support only; does not diagnose or replace urgent emergency pathways.`;
}

/** Extra urgency context for screen readers on chat-assisted launch buttons. */
const CLINICAL_CHAT_LAUNCH_ARIA_CONTEXT = Object.freeze({
  'grace-acs': 'Unstable ACS or STEMI pathways take priority over chat.',
  nihss: 'Emergency stroke pathways take priority over completing scoring in chat.',
  'pediatric-sepsis-assistant':
    'Local pediatric sepsis and emergency pathways take priority over chat.',
  'pregnancy-workflow-assistant':
    'Urgent maternal or fetal concerns need obstetric evaluation before chat.',
  'neonatal-assessment-assistant':
    'Neonatal resuscitation, hypoglycemia, temperature instability, or jaundice pathways take priority over chat.',
  'ob-triage-assistant':
    'Urgent bleeding, severe symptoms, labor, fetal concern, or hypertensive emergency pathways take priority over chat.',
  'seizure-assistant':
    'Status epilepticus, airway compromise, trauma, or unstable patients need urgent pathways before chat.',
  'stroke-workflow-assistant':
    'Emergency stroke activation, imaging, transfer, and treatment workflows take priority over chat.',
  'headache-red-flag-assistant':
    'Thunderclap headache, neurologic deficit, meningismus, or unstable patients need urgent evaluation before chat.',
  'vertigo-hints-assistant':
    'Posterior circulation stroke concerns and severe gait/neurologic findings need urgent evaluation before chat.',
  'neuro-exam-assistant':
    'New focal deficits, declining consciousness, seizure, trauma, infection, or cord symptoms need urgent pathways before chat.',
  'canadian-c-spine': 'Unstable trauma and primary survey take priority over chat.',
  'nexus-cspine': 'Unstable trauma and primary survey take priority over chat.',
  'ottawa-ankle': 'Hard-stop injuries and urgent evaluation take priority over chat.',
  'pecarn-head':
    'Declining consciousness, seizures, or hemodynamic instability take priority over chat.',
  'wells-pe':
    'PE cannot be ruled out with certainty; unstable patients need urgent evaluation first.',
  perc: 'PERC does not rule out pulmonary embolism with certainty.',
  'copd-gold':
    'Acute COPD exacerbation or severe respiratory distress takes priority over grouping chat.',
  'asthma-exacerbation-assistant':
    'Life-threatening asthma features require urgent pathways before chat.',
  'ventilator-support-assistant':
    'Bedside clinician and respiratory therapy review take priority over chat.',
  'oxygen-escalation-helper': 'Severe hypoxemia or respiratory distress takes priority over chat.',
  'copd-workflow-assistant':
    'Acute COPD exacerbation or respiratory failure takes priority over chat.',
  'aki-staging-assistant':
    'Rapidly worsening kidney function, oliguria, or unstable patients need urgent review before chat.',
  'dialysis-readiness-helper':
    'Life-threatening electrolyte, toxin, overload, or uremic concerns need urgent local pathways before chat.',
  'electrolyte-disorder-assistant':
    'Severe or symptomatic electrolyte abnormalities need urgent review before chat.',
  'diabetes-care-assistant':
    'Hypoglycemia, DKA, HHS, or unstable patients need urgent local pathways before chat.',
  'dka-pathway-assistant':
    'Suspected DKA or HHS requires urgent local emergency/endocrine pathways before chat.',
  'thyroid-disorder-assistant':
    'Thyroid storm, myxedema coma, pregnancy concerns, or unstable patients need urgent review before chat.',
  'metabolic-syndrome-assistant':
    'This is risk-factor review only and does not diagnose metabolic syndrome.',
  'rome-iv-ibs':
    'Alarm features and urgent gastrointestinal evaluation take priority over criteria chat.',
  'gi-bleed-workflow-assistant':
    'Hemodynamic instability or active GI bleeding needs urgent local pathways before chat.',
  'liver-disease-assistant':
    'Acute liver failure, severe encephalopathy, shock, or bleeding needs urgent local pathways before chat.',
  'pancreatitis-workflow-assistant':
    'Shock, organ failure, sepsis, or severe pancreatitis concern needs urgent local pathways before chat.',
  phq9: 'Question 9 self-harm or suicidal ideation requires immediate safety assessment before routine scoring.',
  gad7: 'Suicidal ideation or acute psychiatric emergency takes priority over anxiety screening chat.',
  cage: 'Intoxication, withdrawal, co-ingestion, or immediate safety concerns take priority over alcohol screening.',
  pcl5: 'Self-harm, suicidal ideation, acute danger, or severe dissociation takes priority over trauma symptom scoring.',
  mdq: 'Psychosis, unsafe behavior, suicidal ideation, or acute mania concerns need urgent human review before chat.',
  'columbia-suicide-severity-workflow':
    'Any suicide-risk disclosure requires immediate safety assessment and direct human review.',
  'mental-health-screening-assistant':
    'Suicidal ideation, self-harm, psychosis, violence risk, intoxication, withdrawal, or delirium concerns take priority over chat.',
  'suicide-risk-workflow-assistant':
    'Immediate safety assessment and crisis pathways take priority over chat.',
  'substance-use-screening-assistant':
    'Withdrawal, intoxication, overdose, co-ingestion, pregnancy, trauma, or immediate danger take priority over chat.',
  'cognitive-screening-assistant':
    'Acute confusion, delirium, neurologic deficit, intoxication, hypoxia, or trauma take priority over chat.',
  'apache2-calculator':
    'ICU-level illness and organ support decisions take priority over completing APACHE-II in chat.',
  'curb65-calculator':
    'Severe pneumonia, sepsis, or respiratory failure take priority over CURB-65 chat.',
  'gcs-calculator':
    'Declining consciousness or trauma requires immediate evaluation before GCS chat alone.',
  'wells-dvt-calculator':
    'Wells DVT does not rule in or rule out DVT with certainty; suspected PE or limb-threatening ischemia need urgent pathways.',
  'ecg-interpretation-assistant':
    'Unstable ECG findings and STEMI pathways take priority over chat.',
  'stemi-pathway-assistant': 'STEMI activation and emergency care take priority over chat.',
  'acs-workflow-assistant': 'Unstable ACS pathways take priority over chat.',
  'atrial-fibrillation-assistant':
    'Unstable atrial fibrillation requires urgent evaluation before chat.',
  'heart-failure-assistant':
    'Respiratory failure, shock, or severe decompensation takes priority over chat.',
  'hospital-command-assistant':
    'Hospital incident command and source systems take priority over chat.',
  'resource-allocation-assistant':
    'Human command approval is required before any resource movement.',
  'device-recommendation-assistant':
    'Biomedical and bedside clinical review are required before device assignment.',
});

/**
 * Context-aware aria-label for PR3 and other clinical chat-assisted launches.
 * @param {string} toolId
 * @param {string} toolName
 */
export function chatAssistedLaunchAriaLabelForTool(toolId, toolName) {
  const base = chatAssistedLaunchAriaLabel(toolName);
  const extra = CLINICAL_CHAT_LAUNCH_ARIA_CONTEXT[toolId];
  return extra ? `${base} ${extra}` : base;
}

/** @deprecated Use CLINICAL_CHAT_LAUNCH_ARIA_CONTEXT */
export const PR3_LAUNCH_ARIA_CONTEXT = CLINICAL_CHAT_LAUNCH_ARIA_CONTEXT;

/**
 * Accessible name for fleet dispatch chat launches (no clinical emergency framing).
 * @param {string} toolName
 */
export function fleetChatAssistedLaunchAriaLabel(toolName) {
  return `Start guided chat: ${toolName}. Fleet dispatch decision support only; does not auto-assign vehicles or change live routes. Human dispatcher approval required.`;
}

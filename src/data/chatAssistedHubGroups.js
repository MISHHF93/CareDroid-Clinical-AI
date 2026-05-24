/**
 * Hub layout for Tier-B chat-assisted calculators (Calculators.jsx, ToolsOverview).
 * Group headings and leads emphasise decision support and emergency-pathway priority.
 */

export const CHAT_ASSISTED_HUB_GROUPS = Object.freeze([
  {
    groupId: 'cardiac',
    heading: 'Acute coronary syndrome',
    lead:
      'GRACE supports ACS mortality risk stratification (clinical decision support only). It does not diagnose ACS, does not confirm or exclude acute coronary syndrome, and does not recommend treatments. Unstable patients, STEMI, shock, or arrest need immediate local ACS/STEMI pathways — do not delay emergency care to finish chat.',
    toolIds: ['grace-acs'],
  },
  {
    groupId: 'cardiology-assistants',
    heading: 'Cardiology workflow assistants',
    lead:
      'ECG, STEMI, ACS, atrial fibrillation, and heart failure assistants organize cardiology review and handoff prompts. They are clinical decision support only, do not diagnose, do not recommend treatment or disposition, and must not delay emergency ACS/STEMI, unstable arrhythmia, or decompensated heart failure pathways.',
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
    lead:
      'NIHSS documents neurologic deficit severity on exam (clinical decision support only). It does not diagnose stroke and does not determine treatment. Suspected acute stroke requires emergency stroke pathways, imaging, and stroke team activation first — do not defer urgent care to complete scoring in chat.',
    toolIds: ['nihss'],
  },
  {
    groupId: 'trauma',
    heading: 'Trauma imaging decision support',
    lead:
      'Canadian C-Spine, Ottawa ankle/foot, and PECARN pediatric head rules support selected imaging decisions (clinical decision support only). They do not clear the spine, prove absence of fracture, rule out injury with certainty, rule out brain injury, or mandate or defer CT. Unstable patients, neurovascular compromise, open fractures, declining mental status, and severe trauma need full evaluation without delay — do not defer urgent care to finish chat.',
    toolIds: ['canadian-c-spine', 'nexus-cspine', 'ottawa-ankle', 'pecarn-head'],
  },
  {
    groupId: 'pe',
    heading: 'Pulmonary embolism probability',
    lead:
      'Wells and PERC inform pre-test probability when PE is being considered. They do not rule in or rule out PE with certainty and are not a substitute for imaging or clinical judgment when PE cannot be safely excluded.',
    toolIds: ['wells-pe', 'perc'],
  },
  {
    groupId: 'pulmonary-copd',
    heading: 'COPD (GOLD grouping)',
    lead:
      'COPD GOLD grouping support uses symptom burden and exacerbation history to suggest A/B/E groups for discussion. It does not diagnose COPD, does not replace spirometry for GOLD grades 1–4, and does not recommend inhalers or other therapy — acute exacerbation requires urgent evaluation per local protocols.',
    toolIds: ['copd-gold'],
  },
  {
    groupId: 'gastrointestinal',
    heading: 'Rome IV IBS criteria',
    lead:
      'Rome IV criteria support reviews abdominal pain frequency, duration, and stool-related features for discussion. It is informational only, does not diagnose irritable bowel syndrome, and does not replace alarm-feature workup — red-flag symptoms require clinician evaluation without delay.',
    toolIds: ['rome-iv-ibs'],
  },
  {
    groupId: 'medication-dosing-education',
    heading: 'Medication dosing education',
    lead:
      'Medication dose support is educational only. It explains dosing concepts, renal adjustment considerations, and protocol lookup prompts, but does not calculate patient-specific mg/kg doses or recommend a prescription.',
    toolIds: ['dose-calculator'],
  },
  {
    groupId: 'fleet-dispatch',
    heading: 'Fleet dispatch intelligence',
    lead:
      'Dispatch Intelligence supports assignment options, prioritization, and bottleneck review in chat. It does not auto-assign vehicles, change live routes, or override dispatcher authority — verify all actions against your dispatch system of record.',
    toolIds: ['dispatch-ai'],
  },
  {
    groupId: 'nlu-hub-screening',
    heading: 'Screening & severity (chat)',
    lead:
      'Wells DVT supports structured scoring in guided chat (clinical decision support only). It does not diagnose DVT, establish prognosis with certainty, or replace VTE pathways — unstable patients need urgent evaluation first.',
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
  'canadian-c-spine': 'Unstable trauma and primary survey take priority over chat.',
  'nexus-cspine': 'Unstable trauma and primary survey take priority over chat.',
  'ottawa-ankle': 'Hard-stop injuries and urgent evaluation take priority over chat.',
  'pecarn-head': 'Declining consciousness, seizures, or hemodynamic instability take priority over chat.',
  'wells-pe': 'PE cannot be ruled out with certainty; unstable patients need urgent evaluation first.',
  perc: 'PERC does not rule out pulmonary embolism with certainty.',
  'copd-gold': 'Acute COPD exacerbation or severe respiratory distress takes priority over grouping chat.',
  'rome-iv-ibs': 'Alarm features and urgent gastrointestinal evaluation take priority over criteria chat.',
  phq9: 'Question 9 self-harm or suicidal ideation requires immediate safety assessment before routine scoring.',
  gad7: 'Suicidal ideation or acute psychiatric emergency takes priority over anxiety screening chat.',
  'apache2-calculator': 'ICU-level illness and organ support decisions take priority over completing APACHE-II in chat.',
  'curb65-calculator': 'Severe pneumonia, sepsis, or respiratory failure take priority over CURB-65 chat.',
  'gcs-calculator': 'Declining consciousness or trauma requires immediate evaluation before GCS chat alone.',
  'wells-dvt-calculator': 'Wells DVT does not rule in or rule out DVT with certainty; suspected PE or limb-threatening ischemia need urgent pathways.',
  'ecg-interpretation-assistant': 'Unstable ECG findings and STEMI pathways take priority over chat.',
  'stemi-pathway-assistant': 'STEMI activation and emergency care take priority over chat.',
  'acs-workflow-assistant': 'Unstable ACS pathways take priority over chat.',
  'atrial-fibrillation-assistant': 'Unstable atrial fibrillation requires urgent evaluation before chat.',
  'heart-failure-assistant': 'Respiratory failure, shock, or severe decompensation takes priority over chat.',
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

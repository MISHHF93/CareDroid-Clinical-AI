/**
 * Hub layout for Tier-B chat-assisted calculators (Calculators.jsx, ToolsOverview).
 * Group headings and leads emphasise decision support and emergency-pathway priority.
 */

export const CHAT_ASSISTED_HUB_GROUPS = Object.freeze([
  {
    groupId: 'cardiac',
    heading: 'Acute coronary syndrome',
    lead:
      'GRACE supports mortality risk stratification in suspected or confirmed ACS. It does not diagnose ACS. Unstable patients, STEMI, shock, or arrest need immediate local ACS/STEMI pathways — do not delay emergency care to finish chat.',
    toolIds: ['grace-acs'],
  },
  {
    groupId: 'neurology',
    heading: 'Acute stroke severity (NIHSS)',
    lead:
      'NIHSS documents neurologic deficit severity on exam. Suspected acute stroke requires emergency stroke pathways, imaging, and stroke team activation first — do not defer urgent care to complete scoring in chat.',
    toolIds: ['nihss'],
  },
  {
    groupId: 'trauma',
    heading: 'Trauma imaging decision support',
    lead:
      'Canadian C-Spine and Ottawa ankle/foot rules support selected imaging decisions. They do not clear the spine, prove absence of fracture, or replace primary trauma survey — unstable or hard-stop presentations need full evaluation without delay.',
    toolIds: ['canadian-c-spine', 'ottawa-ankle'],
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
]);

/**
 * Accessible name for chat-assisted launch controls (keyboard / screen readers).
 * @param {string} toolName
 */
export function chatAssistedLaunchAriaLabel(toolName) {
  return `Start guided chat: ${toolName}. Clinical decision support only; does not diagnose or replace urgent emergency pathways.`;
}

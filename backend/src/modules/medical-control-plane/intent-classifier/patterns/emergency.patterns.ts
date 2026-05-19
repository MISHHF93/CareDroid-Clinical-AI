/**
 * Emergency Detection Patterns
 *
 * CRITICAL: 100% recall required for emergency keywords
 * This module defines patterns for detecting medical emergencies in user messages.
 *
 * Categories:
 * - Cardiac emergencies
 * - Neurological emergencies
 * - Respiratory emergencies
 * - Psychiatric emergencies
 * - Trauma emergencies
 * - Metabolic emergencies
 */

import { EmergencySeverity } from '../dto/intent-classification.dto';

export interface EmergencyPattern {
  keywords: string[];
  category: string;
  severity: EmergencySeverity;
  escalationMessage: string;
  protocolReference?: string;
}

export const EMERGENCY_PATTERNS: EmergencyPattern[] = [
  // ========================================
  // CARDIAC EMERGENCIES (CRITICAL)
  // ========================================
  {
    keywords: [
      'cardiac arrest',
      'heart stopped',
      'no pulse',
      'pulseless',
      'code blue',
      'vfib',
      'v-fib',
      'ventricular fibrillation',
      'asystole',
      'pea',
      'pulseless electrical activity',
    ],
    category: 'cardiac',
    severity: EmergencySeverity.CRITICAL,
    escalationMessage:
      '🚨 CRITICAL: Cardiac arrest detected. Initiate ACLS immediately. Call code blue.',
    protocolReference: 'ACLS-2024',
  },
  {
    keywords: [
      'chest pain',
      'crushing chest pain',
      'substernal pain',
      'stemi',
      'st elevation',
      'myocardial infarction',
      'heart attack',
      'acute mi',
      'acs',
      'acute coronary syndrome',
    ],
    category: 'cardiac',
    severity: EmergencySeverity.URGENT,
    escalationMessage:
      '⚠️ URGENT: Possible acute coronary syndrome. Obtain ECG, troponins, and activate cath lab if STEMI.',
    protocolReference: 'ACS-Protocol-2024',
  },

  // ========================================
  // NEUROLOGICAL EMERGENCIES (CRITICAL)
  // ========================================
  {
    keywords: [
      'stroke',
      'cva',
      'cerebrovascular accident',
      'facial droop',
      'arm weakness',
      'speech difficulty',
      'slurred speech',
      'befast',
      'nihss',
      'ischemic stroke',
      'hemorrhagic stroke',
      'tpa',
      'thrombectomy',
    ],
    category: 'neurological',
    severity: EmergencySeverity.CRITICAL,
    escalationMessage:
      '🚨 CRITICAL: Stroke suspected. Time is brain. Activate stroke team, obtain CT head, check tPA eligibility.',
    protocolReference: 'Stroke-Protocol-2024',
  },
  {
    keywords: [
      'seizure',
      'seizing',
      'convulsing',
      'status epilepticus',
      'grand mal',
      'tonic-clonic',
      'post-ictal',
    ],
    category: 'neurological',
    severity: EmergencySeverity.URGENT,
    escalationMessage:
      '⚠️ URGENT: Seizure activity. Protect airway, administer benzodiazepines if status epilepticus.',
    protocolReference: 'Seizure-Protocol-2024',
  },
  {
    keywords: [
      'altered mental status',
      'unresponsive',
      'unconscious',
      'gcs',
      'glasgow coma scale',
      'coma',
      'confused',
      'disoriented',
      'altered loc',
      'level of consciousness',
    ],
    category: 'neurological',
    severity: EmergencySeverity.URGENT,
    escalationMessage:
      '⚠️ URGENT: Altered mental status. Assess GCS, check glucose, consider CT head and toxicology.',
  },

  // ========================================
  // RESPIRATORY EMERGENCIES (CRITICAL)
  // ========================================
  {
    keywords: [
      'respiratory arrest',
      'not breathing',
      'apnea',
      'respiratory failure',
      'agonal breathing',
      'gasping',
    ],
    category: 'respiratory',
    severity: EmergencySeverity.CRITICAL,
    escalationMessage:
      '🚨 CRITICAL: Respiratory arrest. Initiate BVM ventilation, prepare for intubation.',
    protocolReference: 'Airway-Protocol-2024',
  },
  {
    keywords: [
      'severe dyspnea',
      "can't breathe",
      'shortness of breath',
      'struggling to breathe',
      'hypoxia',
      'low oxygen',
      'spo2',
      'desaturation',
      'stridor',
      'wheezing',
    ],
    category: 'respiratory',
    severity: EmergencySeverity.URGENT,
    escalationMessage:
      '⚠️ URGENT: Respiratory distress. Administer oxygen, assess for airway obstruction, consider bronchodilators.',
  },
  {
    keywords: [
      'anaphylaxis',
      'anaphylactic shock',
      'severe allergic reaction',
      'throat closing',
      'angioedema',
      'urticaria',
      'hives',
    ],
    category: 'respiratory',
    severity: EmergencySeverity.CRITICAL,
    escalationMessage:
      '🚨 CRITICAL: Anaphylaxis. Administer epinephrine IM immediately. Prepare for airway management.',
    protocolReference: 'Anaphylaxis-Protocol-2024',
  },

  // ========================================
  // PSYCHIATRIC EMERGENCIES (CRITICAL)
  // ========================================
  {
    keywords: [
      'suicide',
      'suicidal',
      'want to die',
      'kill myself',
      'end my life',
      'self-harm',
      'overdose',
      'take all pills',
    ],
    category: 'psychiatric',
    severity: EmergencySeverity.CRITICAL,
    escalationMessage:
      '🚨 CRITICAL: Suicide risk. Immediate psychiatric evaluation required. Do not leave patient alone. Remove means.',
    protocolReference: 'Suicide-Risk-Protocol-2024',
  },
  {
    keywords: ['homicidal', 'want to hurt', 'kill someone', 'harm others', 'violent', 'aggressive'],
    category: 'psychiatric',
    severity: EmergencySeverity.CRITICAL,
    escalationMessage:
      '🚨 CRITICAL: Violence risk. Ensure safety of staff and others. Consider restraints and security.',
  },
  {
    keywords: [
      'psychotic',
      'psychosis',
      'hallucinating',
      'hearing voices',
      'paranoid',
      'delusional',
    ],
    category: 'psychiatric',
    severity: EmergencySeverity.URGENT,
    escalationMessage:
      '⚠️ URGENT: Acute psychosis. Psychiatric consultation needed. Assess for danger to self/others.',
  },

  // ========================================
  // TRAUMA EMERGENCIES (CRITICAL)
  // ========================================
  {
    keywords: [
      'massive bleeding',
      'hemorrhage',
      'uncontrolled bleeding',
      'exsanguinating',
      'spurting blood',
      'arterial bleed',
    ],
    category: 'trauma',
    severity: EmergencySeverity.CRITICAL,
    escalationMessage:
      '🚨 CRITICAL: Massive hemorrhage. Apply direct pressure, consider tourniquet, activate MTP (massive transfusion protocol).',
    protocolReference: 'Hemorrhage-Protocol-2024',
  },
  {
    keywords: [
      'traumatic injury',
      'major trauma',
      'polytrauma',
      'penetrating trauma',
      'gunshot wound',
      'stabbing',
      'motor vehicle accident',
      'mva',
    ],
    category: 'trauma',
    severity: EmergencySeverity.CRITICAL,
    escalationMessage:
      '🚨 CRITICAL: Major trauma. Activate trauma team. Follow ATLS protocol: ABC assessment.',
    protocolReference: 'ATLS-2024',
  },

  // ========================================
  // SHOCK / HEMODYNAMIC EMERGENCIES (CRITICAL)
  // ========================================
  {
    keywords: [
      'shock',
      'hypotensive',
      'blood pressure low',
      'bp dropping',
      'cardiogenic shock',
      'septic shock',
      'hemorrhagic shock',
      'distributive shock',
    ],
    category: 'hemodynamic',
    severity: EmergencySeverity.CRITICAL,
    escalationMessage:
      '🚨 CRITICAL: Shock state. Assess type of shock, fluid resuscitation, vasopressors, identify source.',
    protocolReference: 'Shock-Protocol-2024',
  },

  // ========================================
  // SEPSIS EMERGENCIES (CRITICAL)
  // ========================================
  {
    keywords: [
      'sepsis',
      'septic',
      'severe infection',
      'qsofa',
      'sofa score',
      'systemic infection',
      'bacteremia',
      'septicemia',
    ],
    category: 'infectious',
    severity: EmergencySeverity.CRITICAL,
    escalationMessage:
      '🚨 CRITICAL: Sepsis suspected. Initiate sepsis bundle: blood cultures, broad-spectrum antibiotics, IV fluids within 1 hour.',
    protocolReference: 'Sepsis-Bundle-2024',
  },

  // ========================================
  // METABOLIC EMERGENCIES (URGENT)
  // ========================================
  {
    keywords: [
      'dka',
      'diabetic ketoacidosis',
      'hhs',
      'hyperosmolar',
      'severe hyperglycemia',
      'blood sugar very high',
      'glucose over',
    ],
    category: 'metabolic',
    severity: EmergencySeverity.URGENT,
    escalationMessage:
      '⚠️ URGENT: Diabetic emergency. Check glucose, ketones, electrolytes. Initiate DKA/HHS protocol if confirmed.',
    protocolReference: 'DKA-Protocol-2024',
  },
  {
    keywords: [
      'severe hypoglycemia',
      'blood sugar low',
      'glucose under 40',
      'unresponsive hypoglycemia',
    ],
    category: 'metabolic',
    severity: EmergencySeverity.URGENT,
    escalationMessage:
      '⚠️ URGENT: Severe hypoglycemia. Administer D50 IV or glucagon IM immediately. Recheck glucose.',
  },
];

/**
 * Fast keyword lookup for emergency detection
 * Returns all matched emergency patterns
 */
export function detectEmergencyKeywords(message: string): EmergencyPattern[] {
  const lowerMessage = message.toLowerCase();
  const matches: EmergencyPattern[] = [];

  for (const pattern of EMERGENCY_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        matches.push(pattern);
        break; // Only add pattern once even if multiple keywords match
      }
    }
  }

  return matches;
}

/**
 * Get the highest severity level from matched patterns
 */
export function getHighestSeverity(patterns: EmergencyPattern[]): EmergencySeverity | null {
  if (patterns.length === 0) return null;

  const severityOrder = {
    [EmergencySeverity.CRITICAL]: 3,
    [EmergencySeverity.URGENT]: 2,
    [EmergencySeverity.MODERATE]: 1,
  };

  let highestSeverity = patterns[0].severity;

  for (const pattern of patterns) {
    if (severityOrder[pattern.severity] > severityOrder[highestSeverity]) {
      highestSeverity = pattern.severity;
    }
  }

  return highestSeverity;
}

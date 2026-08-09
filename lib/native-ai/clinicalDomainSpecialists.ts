import { latestPatientVitals } from '../shared/patientClinicalHelpers';
import type { Patient } from '../../src/types/emergency';
import type { ClinicalDomainId, NativeAiSourceState, SpecialistInferenceResult } from './types';

export type ClinicalDomainSpecialist = {
  id: ClinicalDomainId;
  label: string;
  modelId: string;
  modelVersion: string;
  keywords: string[];
  vitalSignals: Array<'hr' | 'sbp' | 'spo2' | 'temp' | 'rr' | 'pain'>;
  toolRecommendations: string[];
  fhirHint?: string;
  requiresHumanReview: true;
  disclaimer: string;
};

export const CLINICAL_DOMAIN_SPECIALISTS: ClinicalDomainSpecialist[] = [
  {
    id: 'cardiac_vascular',
    label: 'Cardiac-Vascular Specialist',
    modelId: 'native-ai-cardiac-vascular-v1',
    modelVersion: '1.0.0',
    keywords: [
      'chest pain',
      'acs',
      'mi',
      'stemi',
      'nstemi',
      'angina',
      'troponin',
      'palpitation',
      'syncope',
      'aortic',
      'heart failure',
      'afib',
    ],
    vitalSignals: ['hr', 'sbp', 'spo2'],
    toolRecommendations: ['heart-score', 'grace-acs', 'ecg-checklist'],
    fhirHint: 'Condition',
    requiresHumanReview: true,
    disclaimer: 'Cardiac-vascular specialist signal — staff confirmation required.',
  },
  {
    id: 'pulmonary',
    label: 'Pulmonary Specialist',
    modelId: 'native-ai-pulmonary-v1',
    modelVersion: '1.0.0',
    keywords: [
      'shortness of breath',
      'dyspnea',
      'sob',
      'wheezing',
      'copd',
      'asthma',
      'pe',
      'pulmonary embolism',
      'hypoxia',
      'respiratory distress',
    ],
    vitalSignals: ['spo2', 'rr'],
    toolRecommendations: ['wells-pe', 'perc-rule', 'curb-65'],
    requiresHumanReview: true,
    disclaimer: 'Pulmonary specialist signal — staff confirmation required.',
  },
  {
    id: 'gastro_oesophageal',
    label: 'Gastro-Oesophageal Specialist',
    modelId: 'native-ai-gastro-v1',
    modelVersion: '1.0.0',
    keywords: [
      'abdominal pain',
      'vomiting',
      'gi bleed',
      'melena',
      'hematemesis',
      'appendicitis',
      'pancreatitis',
      'cholecystitis',
      'reflux',
      'oesophageal',
    ],
    vitalSignals: ['hr', 'sbp', 'temp'],
    toolRecommendations: ['alvarado', 'glasgow-blatchford'],
    requiresHumanReview: true,
    disclaimer: 'Gastro-oesophageal specialist signal — staff confirmation required.',
  },
  {
    id: 'musculoskeletal',
    label: 'Musculoskeletal Specialist',
    modelId: 'native-ai-musculoskeletal-v1',
    modelVersion: '1.0.0',
    keywords: [
      'fracture',
      'sprain',
      'dislocation',
      'back pain',
      'joint pain',
      'knee injury',
      'ankle injury',
      'shoulder pain',
      'musculoskeletal',
      'trauma extremity',
    ],
    vitalSignals: ['pain'],
    toolRecommendations: ['ottawa-ankle', 'ottawa-knee', 'canadian-c-spine'],
    requiresHumanReview: true,
    disclaimer: 'Musculoskeletal specialist signal — staff confirmation required.',
  },
  {
    id: 'psychogenic',
    label: 'Psychogenic Specialist',
    modelId: 'native-ai-psychogenic-v1',
    modelVersion: '1.0.0',
    keywords: [
      'anxiety',
      'panic',
      'psych',
      'suicidal',
      'self-harm',
      'hallucination',
      'agitation',
      'behavioral',
      'overdose intent',
      'substance intoxication',
    ],
    vitalSignals: ['hr'],
    toolRecommendations: ['phq-9', 'columbia-suicide', 'ciwa-ar'],
    requiresHumanReview: true,
    disclaimer: 'Psychogenic specialist signal — staff confirmation required.',
  },
  {
    id: 'neurology',
    label: 'Neurology Specialist',
    modelId: 'native-ai-neurology-v1',
    modelVersion: '1.0.0',
    keywords: ['stroke', 'seizure', 'altered mental status', 'weakness', 'facial droop', 'aphasia', 'headache thunderclap'],
    vitalSignals: ['hr', 'sbp'],
    toolRecommendations: ['nihss', 'canadian-c-spine'],
    requiresHumanReview: true,
    disclaimer: 'Neurology specialist signal — staff confirmation required.',
  },
  {
    id: 'general_emergency',
    label: 'General Emergency Specialist',
    modelId: 'native-ai-general-ed-v1',
    modelVersion: '1.0.0',
    keywords: [],
    vitalSignals: ['hr', 'sbp', 'spo2'],
    toolRecommendations: ['news2', 'qsofa'],
    requiresHumanReview: true,
    disclaimer: 'General emergency routing — staff confirmation required.',
  },
];

export function getClinicalDomainSpecialist(id: ClinicalDomainId): ClinicalDomainSpecialist {
  return CLINICAL_DOMAIN_SPECIALISTS.find((specialist) => specialist.id === id) || CLINICAL_DOMAIN_SPECIALISTS.at(-1)!;
}

function complaintText(patient: Patient): string {
  return [
    patient.chiefComplaint,
    patient.complaint,
    patient.complaintCategory,
    patient.arrival?.chiefComplaint,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

const DOMAIN_PREDICTIONS: Partial<Record<ClinicalDomainId, { pattern: RegExp; label: string; weight: number }[]>> = {
  cardiac_vascular: [
    { pattern: /stemi|nstemi|acs/, label: 'ACS pathway concern', weight: 0.9 },
    { pattern: /chest pain.*(radiat|arm|jaw)/, label: 'Ischemic chest pain pattern', weight: 0.82 },
    { pattern: /troponin|syncope|palpitation/, label: 'Cardiac biomarker / rhythm concern', weight: 0.75 },
  ],
  pulmonary: [
    { pattern: /pe|pulmonary embolism/, label: 'Pulmonary embolism concern', weight: 0.88 },
    { pattern: /respiratory distress|hypoxia|spo2/, label: 'Respiratory compromise', weight: 0.8 },
    { pattern: /copd|asthma|wheez/, label: 'Obstructive airway exacerbation', weight: 0.72 },
  ],
  gastro_oesophageal: [
    { pattern: /gi bleed|melena|hematemesis/, label: 'GI hemorrhage concern', weight: 0.9 },
    { pattern: /appendicitis|pancreatitis|cholecystitis/, label: 'Surgical abdomen concern', weight: 0.78 },
    { pattern: /abdominal pain|vomiting/, label: 'Acute abdominal presentation', weight: 0.65 },
  ],
  musculoskeletal: [
    { pattern: /fracture|dislocation/, label: 'Fracture / dislocation concern', weight: 0.8 },
    { pattern: /back pain|joint pain/, label: 'MSK pain presentation', weight: 0.6 },
  ],
  psychogenic: [
    { pattern: /suicidal|self-harm/, label: 'Self-harm risk — safety assessment required', weight: 0.92 },
    { pattern: /panic|anxiety|agitation/, label: 'Behavioral crisis presentation', weight: 0.7 },
  ],
  neurology: [
    { pattern: /stroke|facial droop|aphasia/, label: 'Acute stroke concern', weight: 0.9 },
    { pattern: /seizure|altered mental/, label: 'Neurologic emergency concern', weight: 0.82 },
    { pattern: /thunderclap/, label: 'Thunderclap headache — SAH rule-out', weight: 0.85 },
  ],
};

export function runClinicalSpecialistInference(
  patient: Patient,
  domainId: ClinicalDomainId,
  options: { sourceState?: NativeAiSourceState; routingConfidence?: number } = {},
): SpecialistInferenceResult {
  const specialist = getClinicalDomainSpecialist(domainId);
  const complaint = complaintText(patient);
  const vitals = latestPatientVitals(patient);
  const predictors: string[] = [];
  let confidence = options.routingConfidence ?? 0.5;

  specialist.keywords.forEach((keyword) => {
    if (keyword && complaint.includes(keyword)) {
      predictors.push(`Complaint: ${keyword}`);
      confidence += 0.04;
    }
  });

  if (vitals) {
    if (domainId === 'cardiac_vascular' && vitals.hr != null && vitals.hr > 100) {
      predictors.push(`HR: ${vitals.hr}`);
      confidence += 0.06;
    }
    if (domainId === 'pulmonary' && vitals.spo2 != null && vitals.spo2 < 94) {
      predictors.push(`SpO2: ${vitals.spo2}%`);
      confidence += 0.08;
    }
    if (domainId === 'cardiac_vascular' && vitals.sbp != null && vitals.sbp < 90) {
      predictors.push(`SBP: ${vitals.sbp}`);
      confidence += 0.07;
    }
    if (patient.age != null && patient.age >= 65) {
      predictors.push(`Age: ${patient.age}`);
      confidence += 0.03;
    }
  }

  const domainPatterns = DOMAIN_PREDICTIONS[domainId] || [];
  let prediction = `${specialist.label} — general pathway review`;
  domainPatterns.forEach((entry) => {
    if (entry.pattern.test(complaint)) {
      prediction = entry.label;
      confidence = Math.max(confidence, entry.weight);
      predictors.unshift(`Pattern: ${entry.label}`);
    }
  });

  if (domainId === 'general_emergency' && predictors.length === 0) {
    predictors.push('No strong domain-specific signal — general ED review');
    prediction = 'General emergency assessment';
    confidence = 0.48;
  }

  return {
    domainId,
    specialistLabel: specialist.label,
    prediction,
    confidence: Number(Math.min(0.95, confidence).toFixed(2)),
    keyPredictors: predictors.slice(0, 6),
    recommendedTools: specialist.toolRecommendations,
    modelId: specialist.modelId,
    modelVersion: specialist.modelVersion,
    requiresHumanReview: true,
    sourceState: options.sourceState || 'demo',
  };
}

export function runRoutedSpecialistPanel(
  patient: Patient,
  domainIds: ClinicalDomainId[],
  options: { sourceState?: NativeAiSourceState; routingConfidence?: number } = {},
): SpecialistInferenceResult[] {
  return domainIds.map((domainId) =>
    runClinicalSpecialistInference(patient, domainId, {
      sourceState: options.sourceState,
      routingConfidence: options.routingConfidence,
    }),
  );
}
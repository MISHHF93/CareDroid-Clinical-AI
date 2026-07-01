import { getUserFacingToolInventory } from '../data/toolInventory';

const RECOMMENDATION_RULES = Object.freeze([
  {
    id: 'chest-pain',
    label: 'Chest pain / ACS risk',
    keywords: [
      'chest pain',
      'chest pressure',
      'acs',
      'nstemi',
      'stemi',
      'troponin',
      'angina',
      'cardiac risk',
      'myocardial infarction',
      'mi',
    ],
    toolIds: ['heart-score', 'timi-ua-nstemi', 'grace-acs', 'ascvd-risk'],
  },
  {
    id: 'dyspnea-pe',
    label: 'Dyspnea / pulmonary embolism risk',
    keywords: [
      'shortness of breath',
      'dyspnea',
      'pleuritic',
      'pulmonary embolism',
      'pe',
      'hemoptysis',
      'dvt',
      'leg swelling',
      'tachycardia',
    ],
    toolIds: ['wells-pe', 'perc', 'wells-dvt-calculator', 'news2'],
  },
  {
    id: 'infection-sepsis',
    label: 'Infection / sepsis deterioration',
    keywords: [
      'sepsis',
      'septic',
      'infection',
      'fever',
      'hypotension',
      'lactate',
      'altered mental status',
      'tachypnea',
      'pneumonia',
    ],
    toolIds: ['qsofa', 'news2', 'sofa-score', 'curb65-calculator'],
  },
  {
    id: 'stroke-tia',
    label: 'Stroke / TIA risk and severity',
    keywords: [
      'stroke',
      'tia',
      'weakness',
      'facial droop',
      'aphasia',
      'slurred speech',
      'neurologic deficit',
    ],
    toolIds: ['nihss', 'abcd2', 'gcs-calculator'],
  },
  {
    id: 'liver-disease',
    label: 'Liver disease severity',
    keywords: [
      'cirrhosis',
      'ascites',
      'encephalopathy',
      'bilirubin',
      'inr',
      'liver disease',
      'hepatitis',
      'fibrosis',
    ],
    toolIds: ['meld', 'meld-na', 'child-pugh', 'fib4'],
  },
  {
    id: 'pancreatitis',
    label: 'Pancreatitis severity',
    keywords: ['pancreatitis', 'epigastric pain', 'lipase', 'amylase', 'sirs'],
    toolIds: ['ranson-criteria', 'bisap-score', 'news2'],
  },
  {
    id: 'kidney-risk',
    label: 'Kidney function / CKD staging',
    keywords: ['ckd', 'kidney', 'renal', 'creatinine', 'egfr', 'gfr', 'albuminuria', 'acr'],
    toolIds: ['ckd-staging', 'calc-gfr', 'anion-gap'],
  },
  {
    id: 'atrial-fibrillation',
    label: 'Atrial fibrillation stroke and bleeding risk',
    keywords: ['atrial fibrillation', 'afib', 'af', 'anticoagulation', 'stroke risk', 'bleeding risk'],
    toolIds: ['calc-chads2vasc', 'has-bled'],
  },
  {
    id: 'falls-skin-inpatient',
    label: 'Inpatient nursing risk screens',
    keywords: ['fall', 'falls', 'pressure injury', 'pressure ulcer', 'skin breakdown', 'immobility'],
    toolIds: ['morse-fall-scale', 'braden-scale'],
  },
]);

export const CALCULATOR_RECOMMENDER_TOOL_ID = 'calculator-recommender-ai';

function normalizeInput(value) {
  if (Array.isArray(value)) return value.join(' ');
  return String(value || '');
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildInputText({ symptoms = '', chiefComplaint = '', clinicalKeywords = '' }: any = {}) {
  return [normalizeInput(chiefComplaint), normalizeInput(symptoms), normalizeInput(clinicalKeywords)]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function inventoryById() {
  return Object.fromEntries(getUserFacingToolInventory().map((record) => [record.id, record]));
}

function resolveRecommendedTools(toolIds, byId) {
  return unique(toolIds)
    .map((toolId) => byId[toolId as any])
    .filter(Boolean)
    .map((record) => ({
      id: record.id,
      label: record.label,
      description: record.description,
      route: record.route,
      navigationPath: record.navigationPath,
      launchType: record.launchType,
      surface: record.surface,
      chatSeed: record.chatSeed,
    }));
}

export function getCalculatorRecommendationRules() {
  return RECOMMENDATION_RULES.map((rule) => ({ ...rule, toolIds: [...rule.toolIds] }));
}

export function recommendCalculators(input: any = {}, options: any = {}) {
  const limit = Number.isFinite(options.limit) ? options.limit : 6;
  const text = buildInputText(input);
  const byId = inventoryById();

  const scoredRules = RECOMMENDATION_RULES.map((rule) => {
    const matches = rule.keywords.filter((keyword) => text.includes(keyword));
    return {
      ...rule,
      matches,
      score: matches.length,
    };
  })
    .filter((rule) => rule.score > 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));

  const recommendedToolIds = unique(scoredRules.flatMap((rule) => rule.toolIds)).slice(0, limit);
  const recommendations = resolveRecommendedTools(recommendedToolIds, byId);

  return {
    capabilityId: CALCULATOR_RECOMMENDER_TOOL_ID,
    status: recommendations.length ? 'matched' : 'needs_more_context',
    inputText: text,
    matchedContexts: scoredRules.map((rule) => ({
      id: rule.id,
      label: rule.label,
      matchedKeywords: rule.matches,
    })),
    recommendations,
    safety: {
      warnings: [
        'Suggestions are tool-selection support only and do not diagnose, rule out, or recommend treatment.',
        'Use calculator outputs only with clinician judgment and local protocols.',
      ],
    },
  };
}

export function buildCalculatorRecommendationChatMessage(input: any = {}) {
  const chiefComplaint = normalizeInput(input.chiefComplaint).trim();
  const symptoms = normalizeInput(input.symptoms).trim();
  const clinicalKeywords = normalizeInput(input.clinicalKeywords).trim();

  return [
    'Recommend CareDroid calculators or scores for this clinical scenario.',
    chiefComplaint ? `Chief complaint: ${chiefComplaint}` : null,
    symptoms ? `Symptoms: ${symptoms}` : null,
    clinicalKeywords ? `Clinical keywords: ${clinicalKeywords}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

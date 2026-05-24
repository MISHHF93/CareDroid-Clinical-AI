import { Injectable } from '@nestjs/common';

export interface CalculatorRecommendation {
  id: string;
  label: string;
  route: string;
  rationale: string;
}

interface RecommendationRule {
  id: string;
  label: string;
  keywords: string[];
  recommendations: CalculatorRecommendation[];
}

const RULES: RecommendationRule[] = [
  {
    id: 'chest-pain',
    label: 'Chest pain / ACS risk',
    keywords: ['chest pain', 'chest pressure', 'acs', 'nstemi', 'stemi', 'troponin', 'angina'],
    recommendations: [
      {
        id: 'heart-score',
        label: 'HEART score',
        route: '/tools/calculators/heart-score',
        rationale:
          'Chest pain risk stratification from history, ECG, age, risk factors, and troponin.',
      },
      {
        id: 'timi-ua-nstemi',
        label: 'TIMI (UA/NSTEMI)',
        route: '/tools/calculators/timi-ua-nstemi',
        rationale: 'UA/NSTEMI event-risk context when ACS is being evaluated.',
      },
      {
        id: 'grace-acs',
        label: 'GRACE ACS',
        route: '/tools/calculators',
        rationale: 'ACS prognosis context through the chat-assisted calculator hub.',
      },
      {
        id: 'ascvd-risk',
        label: 'ASCVD 10-year risk',
        route: '/tools/calculators/ascvd-risk',
        rationale:
          'Primary-prevention cardiovascular risk context after acute evaluation is addressed.',
      },
    ],
  },
  {
    id: 'dyspnea-pe',
    label: 'Dyspnea / PE risk',
    keywords: ['dyspnea', 'shortness of breath', 'pulmonary embolism', 'pe', 'pleuritic', 'dvt'],
    recommendations: [
      {
        id: 'wells-pe',
        label: 'Wells PE',
        route: '/tools/calculators',
        rationale: 'Pre-test probability support for suspected pulmonary embolism.',
      },
      {
        id: 'perc',
        label: 'PERC',
        route: '/tools/calculators',
        rationale: 'PE rule-out criteria when the patient is otherwise low risk.',
      },
      {
        id: 'wells-dvt-calculator',
        label: 'Wells DVT',
        route: '/tools/calculators',
        rationale: 'DVT probability support when leg symptoms or DVT concern is present.',
      },
      {
        id: 'news2',
        label: 'NEWS2',
        route: '/tools/calculators/news2',
        rationale: 'Physiologic deterioration screen from routine observations.',
      },
    ],
  },
  {
    id: 'infection-sepsis',
    label: 'Infection / sepsis deterioration',
    keywords: ['sepsis', 'septic', 'infection', 'fever', 'hypotension', 'tachypnea', 'pneumonia'],
    recommendations: [
      {
        id: 'qsofa',
        label: 'qSOFA',
        route: '/tools/calculators/qsofa',
        rationale: 'Bedside suspected-infection risk screen.',
      },
      {
        id: 'news2',
        label: 'NEWS2',
        route: '/tools/calculators/news2',
        rationale: 'Early warning score for acute deterioration.',
      },
      {
        id: 'sofa-score',
        label: 'SOFA Score',
        route: '/tools/calculator/sofa',
        rationale: 'Organ dysfunction context for ICU/sepsis workflows.',
      },
      {
        id: 'curb65-calculator',
        label: 'CURB-65',
        route: '/tools/calculators',
        rationale: 'Pneumonia severity context when CAP is the working syndrome.',
      },
    ],
  },
  {
    id: 'stroke-tia',
    label: 'Stroke / TIA',
    keywords: ['stroke', 'tia', 'weakness', 'facial droop', 'aphasia', 'slurred speech'],
    recommendations: [
      {
        id: 'nihss',
        label: 'NIHSS',
        route: '/tools/calculators',
        rationale: 'Stroke severity documentation support.',
      },
      {
        id: 'abcd2',
        label: 'ABCD2',
        route: '/tools/calculators/abcd2',
        rationale: 'Short-term stroke risk context after suspected TIA.',
      },
      {
        id: 'gcs-calculator',
        label: 'GCS',
        route: '/tools/calculators',
        rationale: 'Level-of-consciousness documentation when relevant.',
      },
    ],
  },
  {
    id: 'liver-pancreas-renal',
    label: 'Abdominal organ severity',
    keywords: ['cirrhosis', 'liver', 'pancreatitis', 'kidney', 'renal', 'creatinine', 'egfr'],
    recommendations: [
      {
        id: 'meld',
        label: 'MELD',
        route: '/tools/calculators/meld',
        rationale: 'Chronic liver disease severity context.',
      },
      {
        id: 'meld-na',
        label: 'MELD-Na',
        route: '/tools/calculators/meld-na',
        rationale: 'MELD context with sodium adjustment.',
      },
      {
        id: 'child-pugh',
        label: 'Child-Pugh',
        route: '/tools/calculators/child-pugh',
        rationale: 'Cirrhosis severity class support.',
      },
      {
        id: 'ckd-staging',
        label: 'CKD staging',
        route: '/tools/calculators/ckd-staging',
        rationale: 'Kidney function and albuminuria staging support.',
      },
    ],
  },
];

@Injectable()
export class CalculatorRecommenderService {
  recommend(message: string): {
    capabilityId: 'calculator-recommender-ai';
    status: 'matched' | 'needs_more_context';
    matchedContexts: Array<{ id: string; label: string; matchedKeywords: string[] }>;
    recommendations: CalculatorRecommendation[];
    safety: { warnings: string[] };
  } {
    const normalized = String(message || '').toLowerCase();
    const matched = RULES.map((rule) => ({
      ...rule,
      matchedKeywords: rule.keywords.filter((keyword) => normalized.includes(keyword)),
    }))
      .filter((rule) => rule.matchedKeywords.length > 0)
      .sort((a, b) => b.matchedKeywords.length - a.matchedKeywords.length);

    const byId = new Map<string, CalculatorRecommendation>();
    for (const rule of matched) {
      for (const recommendation of rule.recommendations) {
        byId.set(recommendation.id, recommendation);
      }
    }

    return {
      capabilityId: 'calculator-recommender-ai',
      status: byId.size ? 'matched' : 'needs_more_context',
      matchedContexts: matched.map((rule) => ({
        id: rule.id,
        label: rule.label,
        matchedKeywords: rule.matchedKeywords,
      })),
      recommendations: [...byId.values()].slice(0, 6),
      safety: {
        warnings: [
          'Suggested tools are calculator-selection support only.',
          'Recommendations do not diagnose, rule out disease, recommend treatment, or determine disposition.',
        ],
      },
    };
  }
}

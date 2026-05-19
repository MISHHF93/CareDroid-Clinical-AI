/**
 * Clinical Query Patterns
 *
 * Patterns for identifying general clinical queries, medical reference questions,
 * and administrative requests.
 */

export interface ClinicalQueryPattern {
  category: 'medical_reference' | 'administrative' | 'general_query';
  keywords: string[];
  description: string;
}

export const CLINICAL_QUERY_PATTERNS: ClinicalQueryPattern[] = [
  // ========================================
  // MEDICAL REFERENCE
  // ========================================
  {
    category: 'medical_reference',
    keywords: [
      'what is',
      'define',
      'definition',
      'explain',
      'tell me about',
      'information on',
      'lookup',
      'pathophysiology',
      'etiology',
      'mechanism',
      'symptoms of',
      'signs of',
      'treatment for',
      'management of',
      'prognosis',
    ],
    description: 'Medical knowledge lookup and reference questions',
  },
  {
    category: 'medical_reference',
    keywords: [
      'diagnosis',
      'diagnostic criteria',
      'how to diagnose',
      'workup for',
      'evaluation of',
      'assessment of',
    ],
    description: 'Diagnostic approach questions',
  },

  // ========================================
  // ADMINISTRATIVE
  // ========================================
  {
    category: 'administrative',
    keywords: [
      'billing',
      'icd-10',
      'cpt code',
      'procedure code',
      'insurance',
      'prior authorization',
      'documentation',
      'medical record',
      'discharge summary',
      'admission note',
    ],
    description: 'Administrative and documentation queries',
  },
  {
    category: 'administrative',
    keywords: ['schedule', 'appointment', 'referral', 'consult', 'patient list', 'census'],
    description: 'Scheduling and workflow queries',
  },

  // ========================================
  // GENERAL CLINICAL QUERIES
  // ========================================
  {
    category: 'general_query',
    keywords: [
      'should i',
      'would you',
      'can you',
      'help me',
      'assist with',
      'advice',
      'recommendation',
      'suggest',
      'opinion',
    ],
    description: 'General clinical decision support requests',
  },
];

/**
 * Classify general clinical query category
 */
export function classifyClinicalQuery(message: string): {
  category: 'medical_reference' | 'administrative' | 'general_query';
  confidence: number;
} {
  const lowerMessage = message.toLowerCase();

  let bestMatch: {
    category: 'medical_reference' | 'administrative' | 'general_query';
    confidence: number;
  } = {
    category: 'general_query',
    confidence: 0.3,
  };

  for (const pattern of CLINICAL_QUERY_PATTERNS) {
    let matchCount = 0;

    for (const keyword of pattern.keywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      const confidence = Math.min(0.4 + matchCount * 0.15, 0.85);

      if (confidence > bestMatch.confidence) {
        bestMatch = {
          category: pattern.category,
          confidence,
        };
      }
    }
  }

  return bestMatch;
}

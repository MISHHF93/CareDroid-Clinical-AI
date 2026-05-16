/**
 * Clinical Tool Patterns
 * 
 * Defines patterns for detecting which clinical tool the user wants to invoke.
 * Each pattern includes keywords, parameter extraction patterns, and tool metadata.
 */

export interface ToolPattern {
  toolId: string;
  toolName: string;
  keywords: string[];
  requiredParameters: string[];
  optionalParameters?: string[];
  parameterExtractors?: Record<string, RegExp>;
  description: string;
  category: 'calculator' | 'checker' | 'interpreter' | 'protocol' | 'reference';
}

export const CLINICAL_TOOL_PATTERNS: ToolPattern[] = [
  // ========================================
  // CALCULATORS
  // ========================================
  {
    toolId: 'sofa-calculator',
    toolName: 'SOFA Score Calculator',
    keywords: [
      'sofa',
      'sofa score',
      'sequential organ failure',
      'organ failure assessment',
      'sepsis score',
    ],
    requiredParameters: [],
    optionalParameters: [
      'pao2',
      'fio2',
      'platelets',
      'bilirubin',
      'map',
      'dopamine',
      'dobutamine',
      'epinephrine',
      'norepinephrine',
      'gcs',
      'creatinine',
      'urine_output',
    ],
    description: 'Calculates Sequential Organ Failure Assessment (SOFA) score for ICU patients',
    category: 'calculator',
  },
  {
    toolId: 'qsofa',
    toolName: 'qSOFA (quick SOFA)',
    keywords: [
      'qsofa',
      'q sofa',
      'quick sofa',
      'quick sepsis score',
      'sepsis bedside score',
      'bedside sepsis score',
    ],
    requiredParameters: [],
    optionalParameters: ['respiratory_rate', 'systolic_bp', 'gcs', 'altered_mentation'],
    description:
      'Bedside qSOFA: RR ≥22, SBP ≤100, altered mentation or GCS <15 for suspected infection (Sepsis-3)',
    category: 'calculator',
  },
  {
    toolId: 'news2',
    toolName: 'NEWS2 (National Early Warning Score 2)',
    keywords: [
      'news2',
      'news 2',
      'national early warning score',
      'early warning score',
      'deterioration score',
    ],
    requiredParameters: [],
    optionalParameters: [
      'respiratory_rate',
      'spo2',
      'oxygen',
      'systolic_bp',
      'pulse',
      'temperature',
      'consciousness',
    ],
    description:
      'Calculates NEWS2 from routine observations including SpO₂ Scale 1 or 2 per RCP chart',
    category: 'calculator',
  },
  {
    toolId: 'child-pugh',
    toolName: 'Child-Pugh score',
    keywords: [
      'child pugh',
      'child-pugh',
      'ctp score',
      'cirrhosis score',
      'liver severity score',
      'child turcotte pugh',
    ],
    requiredParameters: [],
    optionalParameters: ['bilirubin', 'albumin', 'inr', 'ascites', 'encephalopathy'],
    description: 'Child–Turcotte–Pugh cirrhosis severity classification (class A/B/C)',
    category: 'calculator',
  },
  {
    toolId: 'has-bled',
    toolName: 'HAS-BLED score',
    keywords: [
      'has bled',
      'has-bled',
      'hasbled',
      'bleeding risk',
      'af bleeding risk',
      'anticoagulation bleeding risk',
    ],
    requiredParameters: [],
    optionalParameters: [
      'hypertension',
      'renal_dysfunction',
      'liver_dysfunction',
      'stroke',
      'bleeding',
      'inr',
      'age',
      'medications',
      'alcohol',
    ],
    description: 'HAS-BLED bleeding risk score for anticoagulation decisions in atrial fibrillation',
    category: 'calculator',
  },
  {
    toolId: 'apache2-calculator',
    toolName: 'APACHE-II Score',
    keywords: [
      'apache',
      'apache-ii',
      'apache 2',
      'apache ii',
      'acute physiology',
    ],
    requiredParameters: ['age'],
    optionalParameters: [
      'temperature',
      'map',
      'heart_rate',
      'respiratory_rate',
      'pao2',
      'ph',
      'sodium',
      'potassium',
      'creatinine',
      'hematocrit',
      'wbc',
      'gcs',
    ],
    description: 'Calculates APACHE-II score for ICU mortality prediction',
    category: 'calculator',
  },
  {
    toolId: 'cha2ds2vasc-calculator',
    toolName: 'CHA2DS2-VASc Score',
    keywords: [
      'cha2ds2vasc',
      'chads',
      'chads vasc',
      'afib stroke risk',
      'atrial fibrillation risk',
    ],
    requiredParameters: ['age', 'sex'],
    optionalParameters: [
      'chf',
      'hypertension',
      'diabetes',
      'stroke_tia',
      'vascular_disease',
    ],
    description: 'Calculates stroke risk in atrial fibrillation patients',
    category: 'calculator',
  },
  {
    toolId: 'curb65-calculator',
    toolName: 'CURB-65 Score',
    keywords: [
      'curb-65',
      'curb65',
      'curb 65',
      'pneumonia severity',
      'community acquired pneumonia',
    ],
    requiredParameters: ['age'],
    optionalParameters: [
      'confusion',
      'urea',
      'respiratory_rate',
      'blood_pressure',
    ],
    description: 'Assesses pneumonia severity and need for hospitalization',
    category: 'calculator',
  },
  {
    toolId: 'gcs-calculator',
    toolName: 'Glasgow Coma Scale',
    keywords: [
      'gcs',
      'glasgow coma scale',
      'consciousness level',
      'eye opening',
      'verbal response',
      'motor response',
    ],
    requiredParameters: [],
    optionalParameters: ['eye_opening', 'verbal_response', 'motor_response'],
    description: 'Assesses level of consciousness after brain injury',
    category: 'calculator',
  },
  {
    toolId: 'wells-dvt-calculator',
    toolName: 'Wells DVT Score',
    keywords: [
      'wells',
      'wells dvt',
      'wells score',
      'dvt risk',
      'deep vein thrombosis',
    ],
    requiredParameters: [],
    optionalParameters: [
      'active_cancer',
      'paralysis',
      'bedridden',
      'localized_tenderness',
      'swelling',
      'pitting_edema',
      'collateral_veins',
      'alternative_diagnosis',
    ],
    description: 'Estimates probability of deep vein thrombosis (DVT)',
    category: 'calculator',
  },

  // ========================================
  // DRUG & MEDICATION TOOLS
  // ========================================
  {
    toolId: 'drug-interactions',
    toolName: 'Drug Interaction Checker',
    keywords: [
      'drug interaction',
      'medication interaction',
      'drug-drug interaction',
      'check interaction',
      'contraindication',
      'adverse interaction',
    ],
    requiredParameters: ['medications'],
    optionalParameters: ['severity_filter'],
    parameterExtractors: {
      medications: /(?:between|with|and)\s+([a-z]+(?:\s+and\s+[a-z]+)*)/i,
    },
    description: 'Checks for clinically significant drug-drug interactions',
    category: 'checker',
  },
  {
    toolId: 'dose-calculator',
    toolName: 'Medication Dose Calculator',
    keywords: [
      'dose',
      'dosing',
      'medication dose',
      'drug dose',
      'calculate dose',
      'renal dosing',
      'creatinine clearance',
    ],
    requiredParameters: ['medication'],
    optionalParameters: ['weight', 'age', 'creatinine', 'indication'],
    description: 'Calculates appropriate medication dosages based on patient factors',
    category: 'calculator',
  },

  // ========================================
  // LAB INTERPRETATION
  // ========================================
  {
    toolId: 'lab-interpreter',
    toolName: 'Lab Results Interpreter',
    keywords: [
      'lab results',
      'interpret labs',
      'lab interpretation',
      'abnormal labs',
      'lab values',
      'blood work',
      'chemistry panel',
      'cbc',
      'bmp',
      'cmp',
    ],
    requiredParameters: ['lab_values'],
    optionalParameters: ['patient_age', 'patient_sex', 'clinical_context'],
    description: 'Interprets laboratory results and provides clinical significance',
    category: 'interpreter',
  },
  {
    toolId: 'abg-interpreter',
    toolName: 'ABG Interpreter',
    keywords: [
      'abg',
      'arterial blood gas',
      'blood gas',
      'acid-base',
      'metabolic acidosis',
      'respiratory acidosis',
      'alkalosis',
    ],
    requiredParameters: ['ph', 'paco2', 'hco3'],
    optionalParameters: ['pao2', 'lactate'],
    description: 'Interprets arterial blood gas results and acid-base status',
    category: 'interpreter',
  },

  // ========================================
  // PROTOCOLS & GUIDELINES
  // ========================================
  {
    toolId: 'protocol-lookup',
    toolName: 'Clinical Protocol Lookup',
    keywords: [
      'protocol',
      'guideline',
      'clinical guideline',
      'standard of care',
      'evidence-based',
      'recommendation',
    ],
    requiredParameters: ['condition'],
    optionalParameters: ['organization'],
    description: 'Retrieves evidence-based clinical protocols and guidelines',
    category: 'protocol',
  },
  {
    toolId: 'acls-protocol',
    toolName: 'ACLS Protocol',
    keywords: [
      'acls',
      'advanced cardiac life support',
      'cardiac algorithm',
      'resuscitation',
      'code blue protocol',
    ],
    requiredParameters: [],
    optionalParameters: ['rhythm', 'scenario'],
    description: 'Provides ACLS algorithms for cardiac emergencies',
    category: 'protocol',
  },
  {
    toolId: 'atls-protocol',
    toolName: 'ATLS Protocol',
    keywords: [
      'atls',
      'advanced trauma life support',
      'trauma protocol',
      'trauma algorithm',
    ],
    requiredParameters: [],
    optionalParameters: ['injury_type'],
    description: 'Provides ATLS protocols for trauma management',
    category: 'protocol',
  },

  // ========================================
  // REFERENCE TOOLS
  // ========================================
  {
    toolId: 'differential-diagnosis',
    toolName: 'Differential Diagnosis Generator',
    keywords: [
      'differential',
      'ddx',
      'differential diagnosis',
      'possible diagnoses',
      'what could this be',
    ],
    requiredParameters: ['symptoms'],
    optionalParameters: ['patient_history', 'exam_findings'],
    description: 'Generates differential diagnoses based on clinical presentation',
    category: 'reference',
  },
  {
    toolId: 'antibiotic-guide',
    toolName: 'Antibiotic Selection Guide',
    keywords: [
      'antibiotic',
      'antimicrobial',
      'antibiotic choice',
      'empiric therapy',
      'infection treatment',
    ],
    requiredParameters: ['infection_type'],
    optionalParameters: ['allergies', 'renal_function', 'local_resistance'],
    description: 'Recommends antibiotic selection based on infection and patient factors',
    category: 'reference',
  },
];

/**
 * Match clinical tool patterns in a message
 * Returns array of potential tools with confidence scores
 */
export function matchToolPatterns(message: string): Array<{
  toolId: string;
  toolName: string;
  confidence: number;
  matchedKeywords: string[];
}> {
  const lowerMessage = message.toLowerCase();
  const matches: Array<{
    toolId: string;
    toolName: string;
    confidence: number;
    matchedKeywords: string[];
  }> = [];

  for (const pattern of CLINICAL_TOOL_PATTERNS) {
    const matchedKeywords: string[] = [];
    
    for (const keyword of pattern.keywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
      }
    }

    if (matchedKeywords.length > 0) {
      // Confidence based on:
      // - Number of keywords matched
      // - Length of keywords (longer = more specific)
      const avgKeywordLength = matchedKeywords.reduce((sum, kw) => sum + kw.length, 0) / matchedKeywords.length;
      const confidence = Math.min(
        0.5 + (matchedKeywords.length * 0.15) + (avgKeywordLength / 100),
        0.95
      );

      matches.push({
        toolId: pattern.toolId,
        toolName: pattern.toolName,
        confidence,
        matchedKeywords,
      });
    }
  }

  // "qsofa" contains substring "sofa" — prefer qSOFA tool when user clearly asked for bedside qSOFA / quick SOFA.
  const preferQsofa =
    /\bqsofa\b/.test(lowerMessage) ||
    lowerMessage.includes('quick sofa') ||
    lowerMessage.includes('quick sepsis score') ||
    lowerMessage.includes('sepsis bedside score') ||
    lowerMessage.includes('bedside sepsis score');
  const filtered = preferQsofa
    ? matches.filter((m) => m.toolId !== 'sofa-calculator')
    : matches;

  // Sort by confidence descending
  return filtered.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get tool pattern by ID
 */
export function getToolPattern(toolId: string): ToolPattern | undefined {
  return CLINICAL_TOOL_PATTERNS.find(p => p.toolId === toolId);
}

/**
 * Extract parameters from message for a specific tool
 */
export function extractToolParameters(
  message: string,
  toolId: string
): Record<string, any> {
  const pattern = getToolPattern(toolId);
  if (!pattern) return {};

  const parameters: Record<string, any> = {};

  // Use custom extractors if defined
  if (pattern.parameterExtractors) {
    for (const [param, regex] of Object.entries(pattern.parameterExtractors)) {
      const match = message.match(regex);
      if (match && match[1]) {
        parameters[param] = match[1].trim();
      }
    }
  }

  // Simple number extraction for common parameters
  const numberPatterns = {
    age: /age[:\s]+(\d+)/i,
    weight: /weight[:\s]+(\d+)/i,
    temperature: /temp[erature]*[:\s]+([\d.]+)/i,
    heart_rate: /hr[:\s]+(\d+)|heart rate[:\s]+(\d+)/i,
    blood_pressure: /bp[:\s]+(\d+\/\d+)|blood pressure[:\s]+(\d+\/\d+)/i,
    gcs: /gcs[:\s]+(\d+)/i,
  };

  for (const [param, regex] of Object.entries(numberPatterns)) {
    if (pattern.requiredParameters?.includes(param) || pattern.optionalParameters?.includes(param)) {
      const match = message.match(regex);
      if (match) {
        const value = match[1] || match[2];
        if (value) {
          parameters[param] = param === 'blood_pressure' ? value : parseFloat(value);
        }
      }
    }
  }

  return parameters;
}

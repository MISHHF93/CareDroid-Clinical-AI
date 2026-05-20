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
  category: 'calculator' | 'checker' | 'interpreter' | 'protocol' | 'reference' | 'fleet';
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
    description:
      'HAS-BLED bleeding risk score for anticoagulation decisions in atrial fibrillation',
    category: 'calculator',
  },
  {
    toolId: 'meld',
    toolName: 'MELD score',
    keywords: [
      'meld',
      'meld score',
      'model for end stage liver disease',
      'model for end-stage liver disease',
      'end stage liver disease score',
      'end-stage liver disease score',
      'liver disease severity score',
    ],
    requiredParameters: [],
    optionalParameters: ['bilirubin', 'inr', 'creatinine', 'dialysis'],
    description:
      'Calculates MELD (Model for End-stage Liver Disease) from bilirubin, INR, and creatinine with UNOS laboratory rules',
    category: 'calculator',
  },
  {
    toolId: 'meld-na',
    toolName: 'MELD-Na score',
    keywords: [
      'meld-na',
      'meld na',
      'meld sodium',
      'meld with sodium',
      'meld-na score',
      'liver transplant score',
      'unos meld sodium',
    ],
    requiredParameters: [],
    optionalParameters: ['bilirubin', 'inr', 'creatinine', 'sodium', 'dialysis'],
    description:
      'Calculates MELD-Na (MELD with UNOS sodium adjustment) for chronic liver disease severity',
    category: 'calculator',
  },
  {
    toolId: 'timi-ua-nstemi',
    toolName: 'TIMI risk score (UA/NSTEMI)',
    keywords: [
      'timi',
      'timi score',
      'timi acs',
      'timi nstemi',
      'timi unstable angina',
      'timi ua nstemi',
      'timi risk score',
      'unstable angina timi',
      'nstemi timi',
    ],
    requiredParameters: [],
    optionalParameters: [
      'age',
      'cad_risk_factors',
      'known_cad',
      'aspirin',
      'angina',
      'st_deviation',
      'troponin',
    ],
    description:
      'TIMI risk score for unstable angina / NSTEMI (7 binary criteria, 0–7) for 14-day event risk context',
    category: 'calculator',
  },
  {
    toolId: 'ascvd-risk',
    toolName: 'ASCVD 10-year risk (PCE)',
    keywords: [
      'ascvd',
      'ascvd risk',
      'ascvd score',
      'cardiovascular risk',
      'heart disease risk',
      'cv risk',
      'pooled cohort',
      'pooled cohort equations',
      '10 year ascvd',
      '10-year ascvd',
      'primary prevention ascvd',
      'atherosclerotic cardiovascular disease risk',
    ],
    requiredParameters: ['age', 'sex'],
    optionalParameters: [
      'race',
      'total_cholesterol',
      'hdl',
      'systolic_bp',
      'hypertension_treatment',
      'diabetes',
      'smoking',
    ],
    description:
      'ACC/AHA pooled cohort equations for 10-year ASCVD risk in primary prevention (ages 40–79)',
    category: 'calculator',
  },
  {
    toolId: 'ckd-staging',
    toolName: 'CKD staging (KDIGO)',
    keywords: [
      'ckd staging',
      'ckd stage',
      'kidney stage',
      'kidney disease staging',
      'gfr stage',
      'albuminuria stage',
      'kdigo ckd',
      'ckd heat map',
      'albuminuria category',
      'gfr category',
    ],
    requiredParameters: ['age', 'sex'],
    optionalParameters: ['creatinine', 'acr', 'albuminuria'],
    description:
      'KDIGO CKD staging with CKD-EPI 2021 eGFR, urine ACR albuminuria category, and combined prognostic risk',
    category: 'calculator',
  },
  {
    toolId: 'stop-bang',
    toolName: 'STOP-Bang (OSA screening)',
    keywords: [
      'stop bang',
      'stop-bang',
      'stopbang',
      'sleep apnea score',
      'osa risk',
      'sleep risk score',
      'obstructive sleep apnea screening',
      'sleep apnea screening',
      'osa screening questionnaire',
    ],
    requiredParameters: [],
    optionalParameters: [
      'snoring',
      'tiredness',
      'observed_apnea',
      'hypertension',
      'bmi',
      'age',
      'neck_circumference',
      'sex',
    ],
    description:
      'STOP-Bang questionnaire for obstructive sleep apnea screening (8 binary criteria, 0–8 score)',
    category: 'calculator',
  },
  {
    toolId: 'audit-c',
    toolName: 'AUDIT-C (alcohol screen)',
    keywords: [
      'audit c',
      'audit-c',
      'auditc',
      'alcohol screen',
      'alcohol use screen',
      'drinking screen',
      'audit consumption',
      'brief alcohol screen',
      'alcohol screening questionnaire',
    ],
    requiredParameters: [],
    optionalParameters: ['drinking_frequency', 'drinks_per_day', 'binge_frequency'],
    description:
      'AUDIT-C brief alcohol consumption screen (3 questions, 0–12) with sex-specific positive thresholds',
    category: 'calculator',
  },
  {
    toolId: 'phq9',
    toolName: 'PHQ-9 (depression screen)',
    keywords: [
      'phq9',
      'phq-9',
      'phq 9',
      'patient health questionnaire 9',
      'depression screen',
      'depression questionnaire',
      'mood screen',
      'depression symptom screen',
      'phq nine',
    ],
    requiredParameters: [],
    optionalParameters: [
      'q1_interest',
      'q2_mood',
      'q3_sleep',
      'q4_energy',
      'q5_appetite',
      'q6_self_esteem',
      'q7_concentration',
      'q8_psychomotor',
      'q9_self_harm',
    ],
    description:
      'PHQ-9 depression symptom screen (9 items, 0–27) with severity range; question 9 safety escalation',
    category: 'calculator',
  },
  {
    toolId: 'gad7',
    toolName: 'GAD-7 (anxiety screen)',
    keywords: [
      'gad7',
      'gad-7',
      'gad 7',
      'generalized anxiety disorder 7',
      'anxiety screen',
      'anxiety questionnaire',
      'generalized anxiety screen',
      'anxiety symptom screen',
      'gad seven',
    ],
    requiredParameters: [],
    optionalParameters: [
      'q1_nervous',
      'q2_worry_control',
      'q3_excessive_worry',
      'q4_relaxing',
      'q5_restless',
      'q6_irritable',
      'q7_afraid',
    ],
    description: 'GAD-7 anxiety symptom screen (7 items, 0–21) with severity range',
    category: 'calculator',
  },
  {
    toolId: 'heart-score',
    toolName: 'HEART score',
    keywords: [
      'heart score',
      'heart-score',
      'heart risk score',
      'chest pain score',
      'chest pain risk',
      'ed chest pain score',
      'heart pathway',
      'major adverse cardiac events heart',
    ],
    requiredParameters: [],
    optionalParameters: ['history', 'ecg', 'age', 'risk_factors', 'troponin'],
    description: 'HEART score for ED chest pain risk stratification (0–10)',
    category: 'calculator',
  },
  {
    toolId: 'abcd2',
    toolName: 'ABCD² score',
    keywords: [
      'abcd2',
      'abcd²',
      'abcd squared',
      'abcd score',
      'abcd2 score',
      'tia risk',
      'tia stroke risk',
      'stroke risk after tia',
      'transient ischemic attack score',
    ],
    requiredParameters: [],
    optionalParameters: [
      'age',
      'blood_pressure',
      'clinical_features',
      'duration',
      'diabetes',
    ],
    description: 'ABCD² score for short-term stroke risk after TIA (0–7)',
    category: 'calculator',
  },
  {
    toolId: 'centor-mcisaac',
    toolName: 'Centor / McIsaac score',
    keywords: [
      'centor',
      'centor score',
      'mcisaac',
      'mcisaac score',
      'centor mcisaac',
      'strep pharyngitis score',
      'strep throat score',
      'pharyngitis score',
      'modified centor',
    ],
    requiredParameters: [],
    optionalParameters: ['exudates', 'lymph_nodes', 'fever', 'cough', 'age'],
    description: 'Modified Centor/McIsaac score for GAS pharyngitis probability (0–5)',
    category: 'calculator',
  },
  {
    toolId: 'bishop-score',
    toolName: 'Bishop score',
    keywords: [
      'bishop score',
      'bishop-score',
      'cervical bishop',
      'cervical favorability',
      'cervical favourability',
      'induction score',
      'labour induction score',
    ],
    requiredParameters: [],
    optionalParameters: ['dilation', 'effacement', 'station', 'consistency', 'position'],
    description: 'Bishop score for cervical favourability before induction (0–13)',
    category: 'calculator',
  },
  {
    toolId: 'apgar-score',
    toolName: 'Apgar score',
    keywords: [
      'apgar',
      'apgar score',
      'newborn score',
      'neonatal apgar',
      'delivery room score',
      '1 minute apgar',
      '5 minute apgar',
    ],
    requiredParameters: [],
    optionalParameters: ['appearance', 'pulse', 'grimace', 'activity', 'respiration'],
    description: 'Apgar score for newborn status at 1 and 5 minutes (0–10)',
    category: 'calculator',
  },
  {
    toolId: 'braden-scale',
    toolName: 'Braden scale',
    keywords: [
      'braden',
      'braden scale',
      'pressure ulcer risk',
      'pressure injury risk',
      'bed sore risk',
      'nursing skin risk score',
    ],
    requiredParameters: [],
    optionalParameters: [
      'sensory',
      'moisture',
      'activity',
      'mobility',
      'nutrition',
      'friction',
    ],
    description: 'Braden scale for pressure injury risk (6–23; lower = higher risk)',
    category: 'calculator',
  },
  {
    toolId: 'morse-fall-scale',
    toolName: 'Morse Fall Scale',
    keywords: [
      'morse fall',
      'morse-fall',
      'morse fall scale',
      'fall risk score',
      'inpatient fall risk',
      'hospital fall scale',
      'nursing fall assessment',
      'morse score',
    ],
    requiredParameters: [],
    optionalParameters: [
      'fall_history',
      'secondary_diagnosis',
      'ambulatory_aid',
      'iv_line',
      'gait',
      'mental_status',
    ],
    description: 'Morse Fall Scale for inpatient fall risk (0–125)',
    category: 'calculator',
  },
  {
    toolId: 'ranson-criteria',
    toolName: 'Ranson criteria',
    keywords: [
      'ranson',
      'ranson criteria',
      'ranson score',
      'pancreatitis ranson',
      'acute pancreatitis severity ranson',
    ],
    requiredParameters: [],
    optionalParameters: ['admission_labs', '48_hour_criteria'],
    description: 'Ranson criteria for acute pancreatitis severity (0–11)',
    category: 'calculator',
  },
  {
    toolId: 'bisap-score',
    toolName: 'BISAP score',
    keywords: [
      'bisap',
      'bisap score',
      'pancreatitis bisap',
      'acute pancreatitis bisap',
      'pancreatitis mortality score',
    ],
    requiredParameters: [],
    optionalParameters: ['bun', 'mental_status', 'sirs', 'age', 'pleural_effusion'],
    description: 'BISAP score for early acute pancreatitis mortality risk (0–5)',
    category: 'calculator',
  },
  {
    toolId: 'fib4',
    toolName: 'FIB-4 index',
    keywords: [
      'fib4',
      'fib-4',
      'fib 4',
      'liver fibrosis score',
      'nafld fibrosis index',
      'hepatic fibrosis index',
    ],
    requiredParameters: ['age'],
    optionalParameters: ['ast', 'alt', 'platelets'],
    description: 'FIB-4 index for liver fibrosis risk from age, AST, ALT, and platelets',
    category: 'calculator',
  },
  {
    toolId: 'framingham-risk',
    toolName: 'Framingham 10-year CHD risk',
    keywords: [
      'framingham',
      'framingham risk',
      'framingham score',
      'framingham chd',
      'hard chd risk',
      '10 year chd risk',
      'framingham heart study risk',
      'atp iii risk',
    ],
    requiredParameters: ['age', 'sex'],
    optionalParameters: [
      'total_cholesterol',
      'hdl',
      'systolic_bp',
      'hypertension_treatment',
      'smoking',
    ],
    description:
      'Framingham ATP III point-based 10-year hard CHD risk (ages 30–74); alternative to ASCVD PCE',
    category: 'calculator',
  },
  {
    toolId: 'rome-iv-ibs',
    toolName: 'Rome IV IBS Criteria',
    keywords: [
      'rome iv ibs',
      'rome-iv-ibs',
      'rome iv',
      'rome 4',
      'ibs criteria',
      'irritable bowel syndrome criteria',
      'rome foundation ibs',
      'rome iv criteria',
      'ibs rome',
    ],
    requiredParameters: [],
    optionalParameters: [
      'abdominal_pain_frequency',
      'symptom_duration',
      'relation_to_defecation',
      'stool_frequency_change',
      'stool_form_change',
    ],
    description:
      'Rome IV IBS symptom criteria support (informational; does not diagnose irritable bowel syndrome)',
    category: 'calculator',
  },
  {
    toolId: 'apache2-calculator',
    toolName: 'APACHE-II Score',
    keywords: ['apache', 'apache-ii', 'apache 2', 'apache ii', 'acute physiology'],
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
    optionalParameters: ['chf', 'hypertension', 'diabetes', 'stroke_tia', 'vascular_disease'],
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
    optionalParameters: ['confusion', 'urea', 'respiratory_rate', 'blood_pressure'],
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
    keywords: ['wells', 'wells dvt', 'wells score', 'dvt risk', 'deep vein thrombosis'],
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
  {
    toolId: 'wells-pe',
    toolName: 'Wells PE Score',
    keywords: [
      'wells pe',
      'wells pulmonary embolism',
      'pulmonary embolism wells',
      'pe score',
      'wells score',
      'wells score pe',
      'pe wells',
      'pulmonary embolism score',
      'wells rule pe',
      'wells for pulmonary embolism',
    ],
    requiredParameters: [],
    optionalParameters: [
      'dvt_signs',
      'pe_likely',
      'heart_rate',
      'immobilization',
      'previous_pe',
      'hemoptysis',
      'malignancy',
    ],
    description:
      'Wells clinical prediction rule for pulmonary embolism — chat-assisted pre-test probability',
    category: 'calculator',
  },
  {
    toolId: 'perc',
    toolName: 'PERC (PE rule-out criteria)',
    keywords: [
      'perc',
      'perc rule',
      'pulmonary embolism rule out',
      'pulmonary embolism rule-out',
      'pe rule out',
      'pe rule-out',
      'rule out pe',
      'rule out pulmonary embolism',
      'perc criteria',
    ],
    requiredParameters: [],
    optionalParameters: [
      'age',
      'heart_rate',
      'spo2',
      'leg_swelling',
      'hemoptysis',
      'surgery',
      'prior_pe',
      'estrogen',
    ],
    description:
      'PERC checklist for pulmonary embolism rule-out in low pre-test probability patients (chat-assisted)',
    category: 'calculator',
  },
  {
    toolId: 'grace-acs',
    toolName: 'GRACE ACS Risk',
    keywords: [
      'grace',
      'grace score',
      'grace acs',
      'grace 2.0',
      'grace 2',
      'acs mortality risk',
      'acute coronary syndrome risk',
      'global registry acute coronary',
      'grace risk',
      'grace mortality',
    ],
    requiredParameters: [],
    optionalParameters: [
      'age',
      'heart_rate',
      'systolic_bp',
      'creatinine',
      'killip',
      'cardiac_arrest',
      'st_deviation',
      'troponin',
    ],
    description:
      'GRACE ACS mortality risk stratification for acute coronary syndrome (chat-assisted; prognosis only)',
    category: 'calculator',
  },
  {
    toolId: 'copd-gold',
    toolName: 'COPD GOLD Assessment',
    keywords: [
      'copd gold',
      'copd-gold',
      'gold copd',
      'gold copd classification',
      'copd assessment',
      'copd risk',
      'gold classification',
      'gold group',
      'gold a b e',
      'copd exacerbation group',
      'chronic obstructive pulmonary disease gold',
    ],
    requiredParameters: [],
    optionalParameters: [
      'symptom_burden',
      'mmrc',
      'cat_score',
      'exacerbation_history',
      'hospitalization_history',
    ],
    description:
      'COPD GOLD A/B/E grouping support from symptoms and exacerbations (chat-assisted; no therapy recommendations)',
    category: 'calculator',
  },
  {
    toolId: 'nihss',
    toolName: 'NIH Stroke Scale (NIHSS)',
    keywords: [
      'nihss',
      'nih stroke scale',
      'national institutes of health stroke scale',
      'stroke scale',
      'stroke severity score',
      'nih stroke score',
      'national institute stroke scale',
    ],
    requiredParameters: [],
    optionalParameters: [
      'loc',
      'loc_questions',
      'loc_commands',
      'gaze',
      'visual_fields',
      'facial_palsy',
      'motor_arm_left',
      'motor_arm_right',
      'motor_leg_left',
      'motor_leg_right',
      'ataxia',
      'sensory',
      'language',
      'dysarthria',
      'extinction',
    ],
    description:
      'NIH Stroke Scale structured neurologic deficit scoring (chat-assisted; does not replace urgent stroke evaluation)',
    category: 'calculator',
  },
  {
    toolId: 'canadian-c-spine',
    toolName: 'Canadian C-Spine Rule',
    keywords: [
      'canadian c spine',
      'canadian c-spine',
      'canadian c-spine rule',
      'canadian c spine rule',
      'c spine rule',
      'c-spine rule',
      'cervical spine rule',
      'neck trauma imaging',
      'neck trauma imaging rule',
      'c spine imaging rule',
      'canadian cervical spine',
    ],
    requiredParameters: [],
    optionalParameters: [
      'age',
      'dangerous_mechanism',
      'paresthesias',
      'rear_end_mvc',
      'midline_tenderness',
      'distracting_injury',
      'neck_rotation',
    ],
    description:
      'Canadian C-Spine Rule for cervical spine imaging in alert stable blunt trauma (chat-assisted)',
    category: 'calculator',
  },
  {
    toolId: 'ottawa-ankle',
    toolName: 'Ottawa Ankle Rule',
    keywords: [
      'ottawa ankle',
      'ottawa ankle rule',
      'ottawa foot rule',
      'ankle xray rule',
      'ankle x-ray rule',
      'ankle injury imaging',
      'foot xray rule',
      'foot x-ray rule',
      'ottawa rules ankle',
      'ankle radiograph rule',
    ],
    requiredParameters: [],
    optionalParameters: [
      'malleolar_pain',
      'lateral_malleolus_tenderness',
      'medial_malleolus_tenderness',
      'midfoot_pain',
      'navicular_tenderness',
      'fifth_metatarsal_tenderness',
      'weight_bearing',
    ],
    description:
      'Ottawa ankle and foot rules for radiography after acute ankle/foot injury (chat-assisted)',
    category: 'calculator',
  },
  {
    toolId: 'pecarn-head',
    toolName: 'PECARN Head Injury Rule',
    keywords: [
      'pecarn',
      'pecarn head',
      'pecarn head injury',
      'pecarn rule',
      'pediatric head injury',
      'pediatric head ct',
      'pediatric head trauma',
      'child head injury',
      'child head trauma',
      'child head trauma ct',
      'pediatric head injury rule',
      'head ct decision child',
      'minor head trauma child',
    ],
    requiredParameters: [],
    optionalParameters: [
      'age_category',
      'mental_status',
      'loss_of_consciousness',
      'vomiting',
      'severe_mechanism',
      'skull_fracture_signs',
    ],
    description:
      'PECARN pediatric head injury rule for CT decision support after minor blunt head trauma (chat-assisted)',
    category: 'calculator',
  },
  {
    toolId: 'nexus-cspine',
    toolName: 'NEXUS C-Spine Rule',
    keywords: [
      'nexus',
      'nexus c spine',
      'nexus c-spine',
      'nexus criteria',
      'nexus cervical spine',
      'nexus c-spine rule',
      'c spine nexus',
      'cervical spine nexus',
      'cervical spine imaging nexus',
      'neck trauma nexus',
    ],
    requiredParameters: [],
    optionalParameters: [
      'midline_tenderness',
      'intoxication',
      'neurologic_deficit',
      'distracting_injury',
      'alertness',
    ],
    description:
      'NEXUS criteria for cervical spine imaging decision support in blunt trauma (chat-assisted)',
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
    keywords: ['atls', 'advanced trauma life support', 'trauma protocol', 'trauma algorithm'],
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
  {
    toolId: 'procedures',
    toolName: 'Procedure Guide',
    keywords: [
      'procedure',
      'procedural',
      'step by step',
      'how to perform',
      'technique guide',
      'procedure steps',
      'central line',
      'lumbar puncture',
      'intubation steps',
    ],
    requiredParameters: [],
    optionalParameters: ['procedure_name', 'setting', 'complications'],
    description:
      'Step-by-step procedural guidance and checklists for clinical procedures (decision support only)',
    category: 'reference',
  },

  // ========================================
  // FLEET / LOGISTICS (operations decision support)
  // ========================================
  {
    toolId: 'dispatch-ai',
    toolName: 'Dispatch Intelligence Assistant',
    keywords: [
      'dispatch-ai',
      'dispatch ai',
      'dispatch intelligence',
      'dispatch assistant',
      'dispatch',
      'vehicle dispatch',
      'fleet dispatch',
      'assign vehicle',
      'vehicle assignment',
      'dispatch bottleneck',
      'prioritize requests',
      'dispatch queue',
    ],
    requiredParameters: [],
    optionalParameters: [
      'open_requests',
      'fleet_availability',
      'priorities',
      'constraints',
      'bottlenecks',
    ],
    description:
      'Conversational dispatch decision support: assignment options, prioritization, bottlenecks, and suggested actions (human approval required)',
    category: 'fleet',
  },
  {
    toolId: 'route-optimizer',
    toolName: 'Route Optimization Assistant',
    keywords: [
      'route optimizer',
      'route optimization',
      'optimize route',
      'fleet route',
      'route planner',
      'delivery route',
      'stop sequence',
      'travel estimates',
      'time windows route',
    ],
    requiredParameters: [],
    optionalParameters: [
      'destinations',
      'priorities',
      'traffic_constraints',
      'vehicle_limitations',
      'time_windows',
    ],
    description:
      'Multi-stop route sequencing with travel estimates and savings (decision support only)',
    category: 'fleet',
  },
  {
    toolId: 'predictive-maintenance',
    toolName: 'Predictive Maintenance Assistant',
    keywords: [
      'predictive maintenance',
      'maintenance assistant',
      'maintenance risk',
      'fleet maintenance',
      'vehicle maintenance score',
      'inspection window',
      'maintenance anomaly',
      'diagnostic codes maintenance',
    ],
    requiredParameters: [],
    optionalParameters: [
      'vehicle_age',
      'mileage',
      'maintenance_history',
      'diagnostic_codes',
      'battery_health',
      'telemetry',
    ],
    description:
      'Rule-based maintenance risk scoring, inspection windows, and anomaly indicators (decision support only)',
    category: 'fleet',
  },
  {
    toolId: 'fleet-command',
    toolName: 'Fleet Command Dashboard',
    keywords: [
      'fleet command',
      'fleet dashboard',
      'fleet overview',
      'fleet status',
      'vehicle fleet',
      'fleet telemetry',
      'fleet utilization',
      'active vehicles',
    ],
    requiredParameters: [],
    optionalParameters: ['region', 'vehicle_type', 'maintenance_window'],
    description:
      'Fleet operations dashboard: vehicle availability, maintenance, ETAs, energy, and utilization (decision support only)',
    category: 'fleet',
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
      const avgKeywordLength =
        matchedKeywords.reduce((sum, kw) => sum + kw.length, 0) / matchedKeywords.length;
      const confidence = Math.min(
        0.5 + matchedKeywords.length * 0.15 + avgKeywordLength / 100,
        0.95,
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
  let filtered = preferQsofa ? matches.filter((m) => m.toolId !== 'sofa-calculator') : matches;

  const preferWellsPe =
    /\bwells\s+pe\b/.test(lowerMessage) ||
    lowerMessage.includes('wells pulmonary embolism') ||
    lowerMessage.includes('pulmonary embolism wells') ||
    lowerMessage.includes('wells score pe') ||
    lowerMessage.includes('pe score') ||
    (lowerMessage.includes('wells') &&
      (lowerMessage.includes('pulmonary embolism') || /\bpe\b/.test(lowerMessage)) &&
      !lowerMessage.includes('dvt'));
  const preferWellsDvt =
    /\bwells\s+dvt\b/.test(lowerMessage) ||
    lowerMessage.includes('wells score for dvt') ||
    lowerMessage.includes('deep vein thrombosis');

  if (preferWellsPe) {
    filtered = filtered.filter((m) => m.toolId !== 'wells-dvt-calculator');
  } else if (preferWellsDvt) {
    filtered = filtered.filter((m) => m.toolId !== 'wells-pe');
  }

  const preferPerc =
    /\bperc\b/.test(lowerMessage) ||
    lowerMessage.includes('perc rule') ||
    lowerMessage.includes('pulmonary embolism rule out') ||
    lowerMessage.includes('pulmonary embolism rule-out') ||
    lowerMessage.includes('pe rule out') ||
    lowerMessage.includes('pe rule-out') ||
    (lowerMessage.includes('rule out') &&
      (lowerMessage.includes('pulmonary embolism') || /\bpe\b/.test(lowerMessage)) &&
      !lowerMessage.includes('wells'));

  if (preferPerc) {
    filtered = filtered.filter(
      (m) => m.toolId !== 'wells-pe' && m.toolId !== 'wells-dvt-calculator',
    );
  }

  const preferGraceAcs =
    /\bgrace\b/.test(lowerMessage) ||
    lowerMessage.includes('grace score') ||
    lowerMessage.includes('grace acs') ||
    lowerMessage.includes('acs mortality risk') ||
    lowerMessage.includes('acute coronary syndrome risk') ||
    lowerMessage.includes('global registry acute coronary');

  const preferTimiAcs =
    /\btimi\b/.test(lowerMessage) &&
    !/\bgrace\b/.test(lowerMessage) &&
    !lowerMessage.includes('grace acs');

  if (preferGraceAcs) {
    filtered = filtered.filter((m) => m.toolId !== 'timi-ua-nstemi');
  } else if (preferTimiAcs) {
    filtered = filtered.filter((m) => m.toolId !== 'grace-acs');
  }

  const preferAscvdRisk =
    /\bascvd\b/.test(lowerMessage) ||
    lowerMessage.includes('ascvd risk') ||
    lowerMessage.includes('ascvd score') ||
    lowerMessage.includes('cardiovascular risk') ||
    lowerMessage.includes('heart disease risk') ||
    lowerMessage.includes('cv risk') ||
    lowerMessage.includes('pooled cohort') ||
    lowerMessage.includes('10 year ascvd') ||
    lowerMessage.includes('10-year ascvd') ||
    (lowerMessage.includes('primary prevention') &&
      (lowerMessage.includes('ascvd') || lowerMessage.includes('cardiovascular')));

  if (preferAscvdRisk) {
    filtered = filtered.filter(
      (m) => m.toolId !== 'cha2ds2vasc-calculator' && m.toolId !== 'timi-ua-nstemi',
    );
  }

  const preferCkdStaging =
    lowerMessage.includes('ckd stage') ||
    lowerMessage.includes('ckd staging') ||
    lowerMessage.includes('kidney stage') ||
    lowerMessage.includes('kidney disease staging') ||
    lowerMessage.includes('gfr stage') ||
    lowerMessage.includes('albuminuria stage') ||
    lowerMessage.includes('kdigo') ||
    (lowerMessage.includes('albuminuria') && lowerMessage.includes('gfr')) ||
    (lowerMessage.includes('acr') && lowerMessage.includes('ckd'));

  if (preferCkdStaging) {
    filtered = filtered.filter(
      (m) => m.toolId !== 'gfr-calculator' && m.toolId !== 'cha2ds2vasc-calculator',
    );
  }

  const preferStopBang =
    lowerMessage.includes('stop bang') ||
    lowerMessage.includes('stop-bang') ||
    lowerMessage.includes('stopbang') ||
    lowerMessage.includes('sleep apnea score') ||
    lowerMessage.includes('osa risk') ||
    lowerMessage.includes('sleep risk score') ||
    (lowerMessage.includes('sleep apnea') && lowerMessage.includes('screen')) ||
    (lowerMessage.includes('obstructive sleep apnea') && !lowerMessage.includes('treatment'));

  if (preferStopBang) {
    filtered = filtered.filter((m) => m.toolId !== 'news2' && m.toolId !== 'qsofa');
  }

  const preferAuditC =
    lowerMessage.includes('audit c') ||
    lowerMessage.includes('audit-c') ||
    lowerMessage.includes('auditc') ||
    lowerMessage.includes('alcohol screen') ||
    lowerMessage.includes('alcohol use screen') ||
    lowerMessage.includes('drinking screen') ||
    (lowerMessage.includes('alcohol') && lowerMessage.includes('screen'));

  if (preferAuditC) {
    filtered = filtered.filter(
      (m) => m.toolId !== 'has-bled' && m.toolId !== 'cha2ds2vasc-calculator',
    );
  }

  const preferPhq9 =
    lowerMessage.includes('phq9') ||
    lowerMessage.includes('phq-9') ||
    lowerMessage.includes('phq 9') ||
    lowerMessage.includes('patient health questionnaire') ||
    lowerMessage.includes('depression screen') ||
    lowerMessage.includes('depression questionnaire') ||
    lowerMessage.includes('mood screen') ||
    (lowerMessage.includes('depression') && lowerMessage.includes('screen'));

  if (preferPhq9) {
    filtered = filtered.filter((m) => m.toolId !== 'differential-diagnosis');
  }

  const preferCopdGold =
    lowerMessage.includes('copd gold') ||
    lowerMessage.includes('copd-gold') ||
    lowerMessage.includes('gold copd') ||
    lowerMessage.includes('gold classification') ||
    lowerMessage.includes('copd assessment') ||
    lowerMessage.includes('copd risk') ||
    (lowerMessage.includes('copd') && lowerMessage.includes('gold'));

  if (preferCopdGold) {
    filtered = filtered.filter((m) => m.toolId !== 'differential-diagnosis');
  }

  const preferRomeIvIbs =
    lowerMessage.includes('rome iv') ||
    lowerMessage.includes('rome-iv') ||
    lowerMessage.includes('rome 4') ||
    lowerMessage.includes('ibs criteria') ||
    lowerMessage.includes('irritable bowel syndrome criteria') ||
    (lowerMessage.includes('rome') && lowerMessage.includes('ibs')) ||
    (lowerMessage.includes('irritable bowel') && lowerMessage.includes('criteria'));

  if (preferRomeIvIbs) {
    filtered = filtered.filter((m) => m.toolId !== 'differential-diagnosis');
  }

  const preferGad7 =
    lowerMessage.includes('gad7') ||
    lowerMessage.includes('gad-7') ||
    lowerMessage.includes('gad 7') ||
    lowerMessage.includes('generalized anxiety screen') ||
    lowerMessage.includes('anxiety screen') ||
    lowerMessage.includes('anxiety questionnaire') ||
    (lowerMessage.includes('anxiety') && lowerMessage.includes('screen'));

  if (preferGad7) {
    filtered = filtered.filter((m) => m.toolId !== 'differential-diagnosis' && m.toolId !== 'phq9');
  }

  const preferFleetCommand =
    lowerMessage.includes('fleet command') ||
    lowerMessage.includes('fleet dashboard') ||
    lowerMessage.includes('fleet overview') ||
    lowerMessage.includes('fleet status') ||
    lowerMessage.includes('fleet telemetry') ||
    lowerMessage.includes('vehicle fleet') ||
    (lowerMessage.includes('fleet') && lowerMessage.includes('utilization'));

  if (preferFleetCommand) {
    filtered = filtered.filter((m) => m.toolId !== 'differential-diagnosis');
  }

  const preferPredictiveMaintenance =
    lowerMessage.includes('predictive maintenance') ||
    lowerMessage.includes('maintenance assistant') ||
    lowerMessage.includes('maintenance risk score') ||
    lowerMessage.includes('fleet maintenance risk') ||
    (lowerMessage.includes('maintenance') &&
      (lowerMessage.includes('anomaly') ||
        lowerMessage.includes('inspection window') ||
        lowerMessage.includes('diagnostic code')));

  if (preferPredictiveMaintenance) {
    filtered = filtered.filter(
      (m) =>
        m.toolId !== 'differential-diagnosis' &&
        m.toolId !== 'fleet-command' &&
        m.toolId !== 'antibiotic-guide',
    );
  }

  const preferRouteOptimizer =
    lowerMessage.includes('route optimizer') ||
    lowerMessage.includes('route optimization') ||
    lowerMessage.includes('optimize route') ||
    lowerMessage.includes('route planner') ||
    lowerMessage.includes('delivery route') ||
    (lowerMessage.includes('fleet') &&
      lowerMessage.includes('route') &&
      lowerMessage.includes('stop'));

  if (preferRouteOptimizer) {
    filtered = filtered.filter(
      (m) =>
        m.toolId !== 'differential-diagnosis' &&
        m.toolId !== 'fleet-command' &&
        m.toolId !== 'predictive-maintenance',
    );
  }

  const preferDispatchAi =
    lowerMessage.includes('dispatch intelligence') ||
    lowerMessage.includes('dispatch assistant') ||
    lowerMessage.includes('dispatch-ai') ||
    lowerMessage.includes('dispatch ai') ||
    lowerMessage.includes('vehicle dispatch') ||
    lowerMessage.includes('fleet dispatch') ||
    (lowerMessage.includes('dispatch') &&
      (lowerMessage.includes('assign') ||
        lowerMessage.includes('bottleneck') ||
        lowerMessage.includes('priorit') ||
        lowerMessage.includes('queue')));

  if (preferDispatchAi) {
    filtered = filtered.filter(
      (m) =>
        m.toolId !== 'differential-diagnosis' &&
        m.toolId !== 'fleet-command' &&
        m.toolId !== 'route-optimizer' &&
        m.toolId !== 'predictive-maintenance',
    );
  }

  const preferNihss =
    /\bnihss\b/.test(lowerMessage) ||
    lowerMessage.includes('nih stroke scale') ||
    lowerMessage.includes('national institutes of health stroke scale') ||
    lowerMessage.includes('stroke severity score') ||
    (lowerMessage.includes('stroke scale') && !lowerMessage.includes('trauma'));

  if (preferNihss) {
    filtered = filtered.filter(
      (m) => m.toolId !== 'gcs-calculator' && m.toolId !== 'news2' && m.toolId !== 'qsofa',
    );
  }

  const preferCanadianCSpine =
    lowerMessage.includes('canadian c spine') ||
    lowerMessage.includes('canadian c-spine') ||
    lowerMessage.includes('canadian c-spine rule') ||
    lowerMessage.includes('c spine rule') ||
    lowerMessage.includes('c-spine rule') ||
    lowerMessage.includes('cervical spine rule') ||
    lowerMessage.includes('neck trauma imaging rule') ||
    (lowerMessage.includes('cervical spine') &&
      (lowerMessage.includes('imaging') ||
        lowerMessage.includes('x-ray') ||
        lowerMessage.includes('xray')) &&
      !lowerMessage.includes('stroke'));

  if (preferCanadianCSpine) {
    filtered = filtered.filter((m) => m.toolId !== 'nihss' && m.toolId !== 'gcs-calculator');
  }

  const preferOttawaAnkle =
    lowerMessage.includes('ottawa ankle') ||
    lowerMessage.includes('ottawa ankle rule') ||
    lowerMessage.includes('ankle xray rule') ||
    lowerMessage.includes('ankle x-ray rule') ||
    lowerMessage.includes('ankle injury imaging') ||
    lowerMessage.includes('foot xray rule') ||
    lowerMessage.includes('foot x-ray rule') ||
    (lowerMessage.includes('ankle') &&
      (lowerMessage.includes('xray') ||
        lowerMessage.includes('x-ray') ||
        lowerMessage.includes('radiograph')) &&
      !lowerMessage.includes('pulmonary'));

  if (preferOttawaAnkle) {
    filtered = filtered.filter((m) => m.toolId !== 'canadian-c-spine');
  }

  // Sort by confidence descending
  return filtered.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get tool pattern by ID
 */
export function getToolPattern(toolId: string): ToolPattern | undefined {
  return CLINICAL_TOOL_PATTERNS.find((p) => p.toolId === toolId);
}

/**
 * Extract parameters from message for a specific tool
 */
export function extractToolParameters(message: string, toolId: string): Record<string, any> {
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
    if (
      pattern.requiredParameters?.includes(param) ||
      pattern.optionalParameters?.includes(param)
    ) {
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

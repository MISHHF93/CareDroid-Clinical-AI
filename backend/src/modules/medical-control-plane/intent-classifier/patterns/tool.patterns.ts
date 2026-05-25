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
    toolId: 'calculator-recommender-ai',
    toolName: 'Calculator Recommendation AI',
    keywords: [
      'calculator recommender',
      'calculator recommendation',
      'calculator recommendations',
      'recommend calculator',
      'recommend calculators',
      'suggest calculator',
      'suggest calculators',
      'which calculator',
      'which score',
      'which risk score',
      'what calculator',
      'what score should i use',
      'tool recommendation',
    ],
    requiredParameters: [],
    optionalParameters: ['symptoms', 'chief_complaint', 'clinical_keywords'],
    description:
      'Suggests shipped CareDroid calculators and risk scores from symptoms, chief complaint, and clinical keywords',
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
      'cardiac risk calculator',
      'cardiac risk',
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
    toolId: 'egfr-ckd-epi',
    toolName: 'eGFR CKD-EPI 2021',
    keywords: ['egfr ckd epi', 'egfr-ckd-epi', 'ckd epi egfr', 'race free egfr', 'race-free egfr'],
    requiredParameters: [],
    optionalParameters: ['age', 'sex', 'creatinine'],
    description: 'Race-free CKD-EPI 2021 creatinine eGFR estimate',
    category: 'calculator',
  },
  {
    toolId: 'creatinine-clearance-cg',
    toolName: 'Creatinine Clearance Cockcroft-Gault',
    keywords: [
      'creatinine clearance cg',
      'creatinine-clearance-cg',
      'cockcroft gault',
      'cockcroft-gault',
      'crcl',
    ],
    requiredParameters: [],
    optionalParameters: ['age', 'sex', 'weight', 'creatinine'],
    description:
      'Cockcroft-Gault creatinine clearance estimate without medication dosing automation',
    category: 'calculator',
  },
  {
    toolId: 'fena',
    toolName: 'FeNa',
    keywords: ['fena', 'fractional excretion sodium', 'fractional excretion of sodium'],
    requiredParameters: [],
    optionalParameters: ['serum_sodium', 'urine_sodium', 'serum_creatinine', 'urine_creatinine'],
    description: 'Fractional excretion of sodium urine electrolyte pattern support',
    category: 'calculator',
  },
  {
    toolId: 'feurea',
    toolName: 'FeUrea',
    keywords: ['feurea', 'fractional excretion urea', 'fractional excretion of urea'],
    requiredParameters: [],
    optionalParameters: ['bun', 'urine_urea', 'serum_creatinine', 'urine_creatinine'],
    description: 'Fractional excretion of urea urine electrolyte pattern support',
    category: 'calculator',
  },
  {
    toolId: 'kfre',
    toolName: 'Kidney Failure Risk Equation',
    keywords: [
      'kfre',
      'kidney failure risk equation',
      'kidney failure risk',
      'renal failure risk equation',
    ],
    requiredParameters: [],
    optionalParameters: ['age', 'sex', 'egfr', 'acr'],
    description: 'Four-variable Kidney Failure Risk Equation 2-year and 5-year risk context',
    category: 'calculator',
  },
  {
    toolId: 'bun-creatinine-ratio',
    toolName: 'BUN/Creatinine Ratio',
    keywords: ['bun creatinine ratio', 'bun-creatinine-ratio', 'bun cr ratio', 'bun/cr ratio'],
    requiredParameters: [],
    optionalParameters: ['bun', 'creatinine'],
    description: 'BUN/creatinine ratio pattern support',
    category: 'calculator',
  },
  {
    toolId: 'corrected-sodium',
    toolName: 'Corrected Sodium',
    keywords: [
      'corrected sodium',
      'corrected-sodium',
      'sodium correction glucose',
      'glucose corrected sodium',
    ],
    requiredParameters: [],
    optionalParameters: ['sodium', 'glucose'],
    description: 'Corrected sodium estimate for hyperglycemia context',
    category: 'calculator',
  },
  {
    toolId: 'free-water-deficit',
    toolName: 'Free Water Deficit',
    keywords: [
      'free water deficit',
      'free-water-deficit',
      'water deficit',
      'hypernatremia water deficit',
    ],
    requiredParameters: [],
    optionalParameters: ['sodium', 'weight', 'target_sodium'],
    description: 'Free water deficit estimate from sodium, weight, and total body water factor',
    category: 'calculator',
  },
  {
    toolId: 'osmolal-gap',
    toolName: 'Osmolal Gap',
    keywords: ['osmolal gap', 'osmolal-gap', 'osmolar gap', 'osmolar-gap', 'serum osmolal gap'],
    requiredParameters: [],
    optionalParameters: ['measured_osmolality', 'sodium', 'glucose', 'bun', 'ethanol'],
    description: 'Measured versus calculated serum osmolality gap',
    category: 'calculator',
  },
  {
    toolId: 'homa-ir',
    toolName: 'HOMA-IR',
    keywords: ['homa-ir', 'homa ir', 'homa', 'insulin resistance calculator'],
    requiredParameters: [],
    optionalParameters: ['fasting_glucose', 'fasting_insulin'],
    description: 'HOMA-IR insulin resistance estimate from fasting glucose and insulin without dosing automation',
    category: 'calculator',
  },
  {
    toolId: 'corrected-calcium',
    toolName: 'Corrected Calcium',
    keywords: ['corrected calcium', 'corrected-calcium', 'albumin corrected calcium'],
    requiredParameters: [],
    optionalParameters: ['calcium', 'albumin'],
    description: 'Albumin-corrected total calcium estimate',
    category: 'calculator',
  },
  {
    toolId: 'serum-osmolality',
    toolName: 'Serum Osmolality',
    keywords: ['serum osmolality', 'serum-osmolality', 'calculated osmolality', 'calculated serum osmolality'],
    requiredParameters: [],
    optionalParameters: ['sodium', 'glucose', 'bun', 'ethanol'],
    description: 'Calculated serum osmolality from sodium, glucose, BUN, and optional ethanol',
    category: 'calculator',
  },
  {
    toolId: 'bsa',
    toolName: 'Body Surface Area',
    keywords: ['bsa', 'body surface area', 'body-surface-area', 'mosteller bsa'],
    requiredParameters: [],
    optionalParameters: ['height', 'weight'],
    description: 'Mosteller body surface area estimate without medication dosing automation',
    category: 'calculator',
  },
  {
    toolId: 'ideal-body-weight',
    toolName: 'Ideal Body Weight',
    keywords: ['ideal body weight', 'ideal-body-weight', 'ibw', 'devine body weight'],
    requiredParameters: [],
    optionalParameters: ['sex', 'height'],
    description: 'Devine ideal body weight estimate without medication dosing automation',
    category: 'calculator',
  },
  {
    toolId: 'adjusted-body-weight',
    toolName: 'Adjusted Body Weight',
    keywords: ['adjusted body weight', 'adjusted-body-weight', 'adjbw', 'adjusted weight'],
    requiredParameters: [],
    optionalParameters: ['sex', 'height', 'actual_weight', 'correction_factor'],
    description: 'Adjusted body weight estimate without medication or insulin dosing automation',
    category: 'calculator',
  },
  {
    toolId: 'waist-hip-ratio',
    toolName: 'Waist-to-Hip Ratio',
    keywords: ['waist hip ratio', 'waist to hip ratio', 'waist-to-hip ratio', 'waist-hip-ratio', 'whr'],
    requiredParameters: [],
    optionalParameters: ['sex', 'waist', 'hip'],
    description: 'Waist-to-hip ratio central adiposity context',
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
    toolId: 'bode-index',
    toolName: 'BODE Index',
    keywords: ['bode index', 'bode-index', 'bode score', 'copd prognosis score'],
    requiredParameters: [],
    optionalParameters: ['bmi', 'fev1_percent_predicted', 'six_minute_walk', 'mmrc'],
    description:
      'BODE Index for COPD prognosis context from BMI, obstruction, dyspnea, and exercise capacity',
    category: 'calculator',
  },
  {
    toolId: 'copd-gold-assessment',
    toolName: 'COPD GOLD Assessment',
    keywords: [
      'copd gold assessment',
      'copd-gold-assessment',
      'gold assessment calculator',
      'gold group calculator',
    ],
    requiredParameters: [],
    optionalParameters: ['mmrc', 'cat_score', 'exacerbations', 'hospitalizations', 'fev1'],
    description: 'COPD GOLD A/B/E grouping and optional spirometric grade context',
    category: 'calculator',
  },
  {
    toolId: 'aa-gradient',
    toolName: 'A-a Gradient',
    keywords: ['aa gradient', 'a-a gradient', 'alveolar arterial gradient', 'a a gradient'],
    requiredParameters: [],
    optionalParameters: ['age', 'fio2', 'pao2', 'paco2', 'atmospheric_pressure'],
    description: 'Alveolar-arterial oxygen gradient from ABG values and FiO2 assumptions',
    category: 'calculator',
  },
  {
    toolId: 'pao2-fio2-ratio',
    toolName: 'PaO2/FiO2 Ratio',
    keywords: ['pao2 fio2 ratio', 'pao2/fio2', 'pf ratio', 'p/f ratio', 'oxygenation ratio'],
    requiredParameters: [],
    optionalParameters: ['pao2', 'fio2'],
    description: 'PaO2/FiO2 oxygenation ratio context',
    category: 'calculator',
  },
  {
    toolId: 'rox-index',
    toolName: 'ROX Index',
    keywords: ['rox index', 'rox-index', 'high flow nasal cannula index', 'hfnc rox'],
    requiredParameters: [],
    optionalParameters: ['spo2', 'fio2', 'respiratory_rate'],
    description:
      'ROX Index from SpO2, FiO2, and respiratory rate for oxygenation monitoring context',
    category: 'calculator',
  },
  {
    toolId: 'pneumonia-severity-index',
    toolName: 'Pneumonia Severity Index',
    keywords: [
      'pneumonia severity index',
      'pneumonia-severity-index',
      'psi score',
      'pneumonia psi',
    ],
    requiredParameters: [],
    optionalParameters: ['age', 'sex', 'comorbidities', 'vitals', 'labs', 'oxygenation'],
    description: 'Pneumonia Severity Index risk class context for community-acquired pneumonia',
    category: 'calculator',
  },
  {
    toolId: 'asthma-severity-score',
    toolName: 'Asthma Severity Score',
    keywords: [
      'asthma severity score',
      'asthma-severity-score',
      'asthma severity',
      'asthma exacerbation severity',
    ],
    requiredParameters: [],
    optionalParameters: ['pef', 'spo2', 'respiratory_rate', 'speech', 'work_of_breathing'],
    description: 'Acute asthma exacerbation severity feature helper',
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
    toolId: 'cage',
    toolName: 'CAGE (alcohol screen)',
    keywords: ['cage', 'cage questionnaire', 'cage alcohol screen', 'cage alcohol questionnaire'],
    requiredParameters: [],
    optionalParameters: ['cut_down', 'annoyed', 'guilty', 'eye_opener'],
    description: 'CAGE alcohol screening questionnaire (0-4); screening only, no diagnosis',
    category: 'calculator',
  },
  {
    toolId: 'mmse',
    toolName: 'MMSE score entry',
    keywords: ['mmse', 'mini mental state', 'mini-mental-state', 'mini mental state exam'],
    requiredParameters: [],
    optionalParameters: ['orientation', 'registration', 'attention', 'recall', 'language', 'visuospatial'],
    description: 'MMSE cognitive screening score entry from governed administration (0-30)',
    category: 'calculator',
  },
  {
    toolId: 'moca-placeholder-workflow',
    toolName: 'MoCA placeholder workflow',
    keywords: ['moca', 'moca workflow', 'moca placeholder workflow', 'montreal cognitive assessment'],
    requiredParameters: [],
    optionalParameters: ['official_form', 'trained_administrator', 'accommodations', 'human_review'],
    description: 'MoCA governance workflow placeholder; no item display, administration, or scoring',
    category: 'calculator',
  },
  {
    toolId: 'pcl5',
    toolName: 'PCL-5 (PTSD symptom screen)',
    keywords: ['pcl5', 'pcl-5', 'ptsd checklist', 'ptsd symptom screen', 'trauma symptom screen'],
    requiredParameters: [],
    optionalParameters: ['event_criterion', 'item_scores', 'current_safety_concern'],
    description: 'PCL-5 PTSD symptom score entry (0-80) with current safety concern flag',
    category: 'calculator',
  },
  {
    toolId: 'mdq',
    toolName: 'Mood Disorder Questionnaire (MDQ)',
    keywords: ['mdq', 'mood disorder questionnaire', 'bipolar screen', 'bipolar questionnaire'],
    requiredParameters: [],
    optionalParameters: ['symptom_count', 'same_period', 'impairment', 'urgent_safety_concern'],
    description: 'Mood Disorder Questionnaire screening summary with urgent-safety flags',
    category: 'calculator',
  },
  {
    toolId: 'epworth-sleepiness-scale',
    toolName: 'Epworth Sleepiness Scale',
    keywords: ['epworth', 'epworth sleepiness scale', 'sleepiness scale', 'daytime sleepiness screen'],
    requiredParameters: [],
    optionalParameters: ['item_scores', 'safety_sensitive_activity'],
    description: 'Daytime sleepiness screen (0-24) with safety-sensitive activity flag',
    category: 'calculator',
  },
  {
    toolId: 'columbia-suicide-severity-workflow',
    toolName: 'Columbia suicide severity workflow entry',
    keywords: [
      'columbia suicide severity workflow',
      'columbia suicide screen',
      'cssrs workflow',
      'c-ssrs workflow',
      'suicide severity workflow',
    ],
    requiredParameters: [],
    optionalParameters: ['ideation', 'intent_or_plan', 'behavior', 'current_safety', 'direct_review'],
    description: 'Suicide-risk workflow entry with immediate safety review messaging; not official C-SSRS scoring',
    category: 'calculator',
  },
  {
    toolId: 'mental-health-screening-assistant',
    toolName: 'Mental Health Screening Assistant',
    keywords: ['mental health screening assistant', 'mental health screening', 'behavioral health screening'],
    requiredParameters: [],
    optionalParameters: ['screen_type', 'symptoms', 'safety_concerns'],
    description: 'Guided mental-health screening workflow with crisis-sensitive guardrails',
    category: 'calculator',
  },
  {
    toolId: 'suicide-risk-workflow-assistant',
    toolName: 'Suicide Risk Workflow Assistant',
    keywords: ['suicide risk workflow assistant', 'suicide risk workflow', 'suicide safety workflow'],
    requiredParameters: [],
    optionalParameters: ['ideation', 'intent', 'plan', 'behavior', 'direct_review'],
    description: 'Guided suicide-risk workflow support requiring immediate safety review when indicated',
    category: 'calculator',
  },
  {
    toolId: 'substance-use-screening-assistant',
    toolName: 'Substance Use Screening Assistant',
    keywords: ['substance use screening assistant', 'substance use screening', 'addiction screening workflow'],
    requiredParameters: [],
    optionalParameters: ['audit_c', 'cage', 'withdrawal', 'intoxication', 'co_ingestion'],
    description: 'Guided substance-use screening workflow without diagnosis, detox, or medication advice',
    category: 'calculator',
  },
  {
    toolId: 'cognitive-screening-assistant',
    toolName: 'Cognitive Screening Assistant',
    keywords: ['cognitive screening assistant', 'cognitive screening', 'memory screening workflow'],
    requiredParameters: [],
    optionalParameters: ['mmse', 'moca', 'delirium_flags', 'accommodations'],
    description: 'Guided cognitive screening workflow without dementia diagnosis or capacity determination',
    category: 'calculator',
  },
  {
    toolId: 'behavioral-analytics-dashboard',
    toolName: 'Behavioral Analytics Dashboard',
    keywords: ['behavioral analytics dashboard', 'behavioral health analytics', 'mental health analytics dashboard'],
    requiredParameters: [],
    optionalParameters: ['screening_volume', 'positive_screens', 'review_queue'],
    description: 'Behavioral-health screening analytics dashboard concept with human review tracking',
    category: 'reference',
  },
  {
    toolId: 'screening-trend-engine',
    toolName: 'Screening Trend Engine',
    keywords: ['screening trend engine', 'screening trends', 'mental health screening trends'],
    requiredParameters: [],
    optionalParameters: ['serial_scores', 'missing_data', 'review_queue'],
    description: 'Serial psychiatry screening trend engine concept; visibility only',
    category: 'reference',
  },
  {
    toolId: 'psychiatry-monitoring-dashboard',
    toolName: 'Psychiatry Monitoring Dashboard',
    keywords: ['psychiatry monitoring dashboard', 'psychiatric monitoring dashboard', 'behavioral monitoring dashboard'],
    requiredParameters: [],
    optionalParameters: ['review_queue', 'safety_flags', 'handoff_status'],
    description: 'Psychiatry monitoring dashboard concept with unresolved safety flag visibility',
    category: 'reference',
  },
  {
    toolId: 'crisis-escalation-audit-log',
    toolName: 'Crisis Escalation Audit Log',
    keywords: ['crisis escalation audit log', 'crisis audit log', 'suicide escalation audit'],
    requiredParameters: [],
    optionalParameters: ['phq9_item_9', 'columbia_flags', 'direct_review', 'timestamps'],
    description: 'Crisis escalation audit-log concept for suicide-safety workflow visibility',
    category: 'reference',
  },
  {
    toolId: 'population-screening-dashboard',
    toolName: 'Population Screening Dashboard',
    keywords: ['population screening dashboard', 'behavioral population screening', 'mental health population dashboard'],
    requiredParameters: [],
    optionalParameters: ['panel_completion', 'positive_screen_queue', 'follow_up_gaps'],
    description: 'Population behavioral-health screening dashboard concept; no individual diagnosis',
    category: 'reference',
  },
  {
    toolId: 'heart-score',
    toolName: 'HEART score',
    keywords: [
      'heart score',
      'heart-score',
      'heart risk score',
      'cardiac risk calculator',
      'cardiac risk',
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
    optionalParameters: ['age', 'blood_pressure', 'clinical_features', 'duration', 'diabetes'],
    description: 'ABCD² score for short-term stroke risk after TIA (0–7)',
    category: 'calculator',
  },
  {
    toolId: 'hunt-hess-scale',
    toolName: 'Hunt-Hess Scale',
    keywords: ['hunt hess', 'hunt-hess', 'hunt hess scale', 'sah grade', 'subarachnoid hemorrhage grade'],
    requiredParameters: [],
    optionalParameters: ['grade', 'mental_status', 'focal_deficit'],
    description: 'Hunt-Hess aneurysmal subarachnoid hemorrhage clinical severity grading',
    category: 'calculator',
  },
  {
    toolId: 'ich-score',
    toolName: 'ICH Score',
    keywords: ['ich score', 'intracerebral hemorrhage score', 'intracranial hemorrhage score', 'hemorrhage score'],
    requiredParameters: [],
    optionalParameters: ['gcs', 'volume', 'ivh', 'infratentorial_origin', 'age'],
    description: 'ICH Score severity context for spontaneous intracerebral hemorrhage',
    category: 'calculator',
  },
  {
    toolId: 'four-score',
    toolName: 'FOUR Score',
    keywords: ['four score', 'four-score', 'full outline unresponsiveness', 'coma four score', 'four coma score'],
    requiredParameters: [],
    optionalParameters: ['eye', 'motor', 'brainstem', 'respiration'],
    description: 'FOUR Score coma scale using eye, motor, brainstem, and respiration components',
    category: 'calculator',
  },
  {
    toolId: 'modified-rankin-scale',
    toolName: 'Modified Rankin Scale',
    keywords: ['modified rankin scale', 'modified-rankin-scale', 'rankin scale', 'mrs score', 'stroke disability score'],
    requiredParameters: [],
    optionalParameters: ['functional_status', 'dependence', 'walking'],
    description: 'Modified Rankin Scale global disability outcome documentation',
    category: 'calculator',
  },
  {
    toolId: 'nihss-summary-view',
    toolName: 'NIHSS Summary View',
    keywords: ['nihss summary', 'nihss summary view', 'nih stroke scale summary', 'stroke scale summary'],
    requiredParameters: [],
    optionalParameters: ['nihss_items', 'total_score', 'serial_exam'],
    description: 'NIHSS item summary view for stroke exam documentation without delaying stroke care',
    category: 'calculator',
  },
  {
    toolId: 'pediatric-gcs',
    toolName: 'Pediatric GCS',
    keywords: ['pediatric gcs', 'paediatric gcs', 'pediatric glasgow coma scale', 'child gcs'],
    requiredParameters: [],
    optionalParameters: ['eye_opening', 'verbal_response', 'motor_response'],
    description: 'Pediatric Glasgow Coma Scale with age-adjusted response descriptions',
    category: 'calculator',
  },
  {
    toolId: 'gestational-age-calculator',
    toolName: 'Gestational Age Calculator',
    keywords: ['gestational age calculator', 'gestational age', 'pregnancy dating', 'calculate gestational age'],
    requiredParameters: [],
    optionalParameters: ['lmp_date', 'conception_date', 'ultrasound_date', 'assessment_date'],
    description: 'Gestational age calculation from LMP, conception, or ultrasound dating',
    category: 'calculator',
  },
  {
    toolId: 'pediatric-bp-percentile',
    toolName: 'Pediatric BP Percentile',
    keywords: ['pediatric bp percentile', 'paediatric bp percentile', 'child blood pressure percentile', 'pediatric blood pressure'],
    requiredParameters: [],
    optionalParameters: ['age', 'sex', 'height_percentile', 'systolic_bp', 'diastolic_bp'],
    description: 'Pediatric blood pressure screening-band helper using AAP source-table context',
    category: 'calculator',
  },
  {
    toolId: 'pregnancy-due-date-calculator',
    toolName: 'Pregnancy Due Date Calculator',
    keywords: ['pregnancy due date calculator', 'pregnancy due date', 'estimated due date', 'edd calculator'],
    requiredParameters: [],
    optionalParameters: ['lmp_date', 'conception_date', 'ultrasound_date', 'gestational_age'],
    description: 'Estimated due date helper from LMP, conception, or ultrasound dating',
    category: 'calculator',
  },
  {
    toolId: 'fenton-growth-chart-helper',
    toolName: 'Fenton Growth Chart Helper',
    keywords: ['fenton growth chart helper', 'fenton growth chart', 'preterm growth percentile', 'neonatal growth percentile'],
    requiredParameters: [],
    optionalParameters: ['gestational_age', 'weight_percentile', 'length_percentile', 'head_circumference_percentile'],
    description: 'Neonatal growth percentile classification helper for Fenton chart review',
    category: 'calculator',
  },
  {
    toolId: 'neonatal-bilirubin-risk-helper',
    toolName: 'Neonatal Bilirubin Risk Helper',
    keywords: ['neonatal bilirubin risk helper', 'newborn bilirubin', 'bilirubin nomogram', 'neonatal jaundice helper'],
    requiredParameters: [],
    optionalParameters: ['age_hours', 'bilirubin', 'gestational_age', 'neurotoxicity_risk_factors'],
    description: 'Neonatal bilirubin nomogram review helper without phototherapy recommendations',
    category: 'calculator',
  },
  {
    toolId: 'pediatric-dose-safety-checker',
    toolName: 'Pediatric Dose Safety Checker',
    keywords: ['pediatric dose safety checker', 'paediatric dose safety checker', 'pediatric dose checker', 'pediatric medication safety'],
    requiredParameters: [],
    optionalParameters: ['medication', 'weight', 'governed_protocol'],
    description: 'Placeholder-only pediatric medication safety checklist without dose calculation',
    category: 'calculator',
  },
  {
    toolId: 'pediatric-sepsis-assistant',
    toolName: 'Pediatric Sepsis Assistant',
    keywords: ['pediatric sepsis assistant', 'paediatric sepsis assistant', 'pediatric sepsis workflow', 'child sepsis review'],
    requiredParameters: [],
    optionalParameters: ['infection_concern', 'age', 'vitals', 'perfusion', 'labs'],
    description: 'Pediatric sepsis workflow support without diagnosis, treatment, or medication dosing recommendations',
    category: 'calculator',
  },
  {
    toolId: 'pregnancy-workflow-assistant',
    toolName: 'Pregnancy Workflow Assistant',
    keywords: ['pregnancy workflow assistant', 'pregnancy workflow', 'prenatal workflow', 'pregnancy review'],
    requiredParameters: [],
    optionalParameters: ['gestational_age', 'symptoms', 'fetal_movement', 'bleeding', 'blood_pressure'],
    description: 'Pregnancy workflow support for dating, symptoms, fetal concerns, and handoff prompts',
    category: 'calculator',
  },
  {
    toolId: 'neonatal-assessment-assistant',
    toolName: 'Neonatal Assessment Assistant',
    keywords: ['neonatal assessment assistant', 'newborn assessment assistant', 'neonatal workflow', 'newborn review'],
    requiredParameters: [],
    optionalParameters: ['apgar', 'temperature', 'feeding', 'bilirubin', 'growth'],
    description: 'Neonatal assessment workflow support without replacing resuscitation or neonatal clinician assessment',
    category: 'calculator',
  },
  {
    toolId: 'ob-triage-assistant',
    toolName: 'OB Triage Assistant',
    keywords: ['ob triage assistant', 'obgyn triage assistant', 'obstetric triage assistant', 'labor triage assistant'],
    requiredParameters: [],
    optionalParameters: ['gestational_age', 'bleeding', 'fluid_leakage', 'contractions', 'fetal_movement'],
    description: 'OB triage workflow support without diagnosis, delivery timing, or disposition recommendations',
    category: 'calculator',
  },
  {
    toolId: 'neonatal-dashboard',
    toolName: 'Neonatal Dashboard',
    keywords: ['neonatal dashboard', 'newborn dashboard', 'nursery dashboard', 'nicu dashboard'],
    requiredParameters: [],
    optionalParameters: ['vitals', 'feeding', 'bilirubin', 'growth', 'screening'],
    description: 'Neonatal monitoring dashboard for visibility and human review queues',
    category: 'reference',
  },
  {
    toolId: 'maternal-monitoring-dashboard',
    toolName: 'Maternal Monitoring Dashboard',
    keywords: ['maternal monitoring dashboard', 'ob monitoring dashboard', 'pregnancy monitoring dashboard', 'postpartum monitoring'],
    requiredParameters: [],
    optionalParameters: ['blood_pressure', 'symptoms', 'labs', 'fetal_context', 'review_queue'],
    description: 'Maternal monitoring dashboard for trend visibility and human review queues',
    category: 'reference',
  },
  {
    toolId: 'pediatric-command-center',
    toolName: 'Pediatric Command Center',
    keywords: ['pediatric command center', 'paediatric command center', 'pediatric dashboard', 'pediatric operations'],
    requiredParameters: [],
    optionalParameters: ['pews', 'sepsis_reviews', 'vitals', 'growth', 'bp'],
    description: 'Pediatric command-center visibility for deterioration, sepsis, vitals, and growth review queues',
    category: 'reference',
  },
  {
    toolId: 'growth-trend-analytics',
    toolName: 'Growth Trend Analytics',
    keywords: ['growth trend analytics', 'growth trends', 'pediatric growth analytics', 'neonatal growth trends'],
    requiredParameters: [],
    optionalParameters: ['weight', 'height', 'length', 'head_circumference', 'percentiles'],
    description: 'Growth trend analytics for serial anthropometrics and percentile review',
    category: 'reference',
  },
  {
    toolId: 'perinatal-risk-dashboard',
    toolName: 'Perinatal Risk Dashboard',
    keywords: ['perinatal risk dashboard', 'perinatal dashboard', 'maternal fetal dashboard', 'ob newborn handoff'],
    requiredParameters: [],
    optionalParameters: ['maternal_risk', 'fetal_concerns', 'delivery_context', 'neonatal_follow_up'],
    description: 'Perinatal risk dashboard for maternal, fetal, delivery, and neonatal review queues',
    category: 'reference',
  },
  {
    toolId: 'seizure-assistant',
    toolName: 'Seizure Assistant',
    keywords: ['seizure assistant', 'seizure workflow', 'spell characterization', 'seizure review'],
    requiredParameters: [],
    optionalParameters: ['event_description', 'duration', 'recovery', 'triggers', 'medications'],
    description: 'Guided seizure review with status epilepticus and airway pathway reminders',
    category: 'calculator',
  },
  {
    toolId: 'stroke-workflow-assistant',
    toolName: 'Stroke Workflow Assistant',
    keywords: ['stroke workflow assistant', 'stroke workflow', 'stroke activation workflow', 'acute stroke handoff'],
    requiredParameters: [],
    optionalParameters: ['last_known_well', 'deficits', 'nihss', 'imaging_status', 'glucose'],
    description: 'Acute stroke workflow support that must not delay activation, imaging, or treatment pathways',
    category: 'calculator',
  },
  {
    toolId: 'headache-red-flag-assistant',
    toolName: 'Headache Red Flag Assistant',
    keywords: ['headache red flag assistant', 'headache red flags', 'thunderclap headache review', 'headache warning signs'],
    requiredParameters: [],
    optionalParameters: ['onset', 'neurologic_deficit', 'fever', 'pregnancy', 'cancer', 'trauma'],
    description: 'Headache red-flag review without diagnosis or imaging/disposition recommendations',
    category: 'calculator',
  },
  {
    toolId: 'vertigo-hints-assistant',
    toolName: 'Vertigo HINTS Assistant',
    keywords: ['vertigo hints assistant', 'hints exam', 'hints plus', 'acute vestibular syndrome'],
    requiredParameters: [],
    optionalParameters: ['nystagmus', 'head_impulse', 'skew', 'hearing', 'gait', 'neurologic_findings'],
    description: 'Vertigo/HINTS documentation support for trained exam workflows with stroke warnings',
    category: 'calculator',
  },
  {
    toolId: 'neuro-exam-assistant',
    toolName: 'Neuro Exam Assistant',
    keywords: ['neuro exam assistant', 'neurologic exam assistant', 'neurological exam assistant', 'neuro exam checklist'],
    requiredParameters: [],
    optionalParameters: ['mental_status', 'cranial_nerves', 'motor', 'sensory', 'coordination', 'gait'],
    description: 'Guided neurologic exam checklist and handoff prompts',
    category: 'calculator',
  },
  {
    toolId: 'neuro-telemetry-dashboard',
    toolName: 'Neuro Telemetry Dashboard',
    keywords: ['neuro telemetry dashboard', 'neurology telemetry dashboard', 'neurologic telemetry', 'neuro check dashboard'],
    requiredParameters: [],
    optionalParameters: ['neuro_checks', 'gcs', 'nihss', 'seizure_events', 'icp', 'data_freshness'],
    description: 'Neuro telemetry dashboard for trend visibility and human review queues',
    category: 'reference',
  },
  {
    toolId: 'stroke-command-center',
    toolName: 'Stroke Command Center',
    keywords: ['stroke command center', 'stroke dashboard', 'stroke activation dashboard', 'stroke operations'],
    requiredParameters: [],
    optionalParameters: ['activation_queue', 'last_known_well', 'imaging_milestones', 'handoff_status'],
    description: 'Stroke command-center operations visibility without treatment eligibility decisions',
    category: 'reference',
  },
  {
    toolId: 'neuro-monitoring-engine',
    toolName: 'Neuro Monitoring Engine',
    keywords: ['neuro monitoring engine', 'neurology monitoring engine', 'neurologic monitoring', 'neuro trends'],
    requiredParameters: [],
    optionalParameters: ['serial_exams', 'pupils', 'icp', 'sedation_context', 'review_queue'],
    description: 'Neuro monitoring trend visibility without autonomous escalation orders',
    category: 'reference',
  },
  {
    toolId: 'eeg-trend-dashboard',
    toolName: 'EEG Trend Dashboard',
    keywords: ['eeg trend dashboard', 'eeg trends', 'eeg dashboard', 'seizure burden dashboard'],
    requiredParameters: [],
    optionalParameters: ['eeg_status', 'seizure_burden', 'artifact', 'report_freshness'],
    description: 'EEG trend dashboard for report freshness and review queues without diagnosis or dosing',
    category: 'reference',
  },
  {
    toolId: 'neurology-timeline-ai',
    toolName: 'Neurology Timeline AI',
    keywords: ['neurology timeline ai', 'neuro timeline', 'neurologic timeline', 'stroke seizure timeline'],
    requiredParameters: [],
    optionalParameters: ['symptom_onset', 'exams', 'imaging', 'eeg', 'interventions'],
    description: 'Clinician-reviewed neurology timeline support for exams, imaging, EEG, and handoff chronology',
    category: 'reference',
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
    optionalParameters: ['sensory', 'moisture', 'activity', 'mobility', 'nutrition', 'friction'],
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
    toolId: 'maddrey-discriminant-function',
    toolName: 'Maddrey Discriminant Function',
    keywords: [
      'maddrey',
      'maddrey df',
      'maddrey discriminant function',
      'modified discriminant function',
      'alcoholic hepatitis score',
    ],
    requiredParameters: [],
    optionalParameters: ['patient_pt', 'control_pt', 'bilirubin'],
    description:
      'Maddrey DF for alcoholic hepatitis severe-range risk context from PT prolongation and bilirubin',
    category: 'calculator',
  },
  {
    toolId: 'apri',
    toolName: 'APRI',
    keywords: [
      'apri',
      'aspartate platelet ratio index',
      'ast platelet ratio index',
      'apri score',
      'liver fibrosis apri',
    ],
    requiredParameters: [],
    optionalParameters: ['ast', 'ast_uln', 'platelets'],
    description: 'AST to Platelet Ratio Index fibrosis screening context',
    category: 'calculator',
  },
  {
    toolId: 'glasgow-blatchford-score',
    toolName: 'Glasgow-Blatchford Score',
    keywords: [
      'glasgow blatchford',
      'glasgow-blatchford',
      'glasgow blatchford score',
      'gbs score',
      'upper gi bleed score',
      'gi bleed risk score',
    ],
    requiredParameters: [],
    optionalParameters: ['bun', 'hemoglobin', 'sex', 'systolic_bp', 'pulse', 'melena', 'syncope'],
    description: 'Pre-endoscopy upper GI bleeding risk stratification support',
    category: 'calculator',
  },
  {
    toolId: 'rockall-score',
    toolName: 'Rockall Score',
    keywords: ['rockall', 'rockall score', 'upper gi bleed rockall', 'post endoscopy bleed score'],
    requiredParameters: [],
    optionalParameters: ['age', 'shock', 'comorbidity', 'diagnosis', 'stigmata'],
    description: 'Upper GI bleeding risk score using clinical and endoscopic findings',
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
    toolId: 'shock-index',
    toolName: 'Shock Index',
    keywords: ['shock index', 'shock-index', 'hemodynamic index', 'heart rate over systolic'],
    requiredParameters: [],
    optionalParameters: ['heart_rate', 'systolic_bp'],
    description:
      'Hemodynamic screening index calculated as heart rate divided by systolic blood pressure',
    category: 'calculator',
  },
  {
    toolId: 'anion-gap',
    toolName: 'Anion Gap',
    keywords: [
      'anion gap',
      'anion-gap',
      'albumin corrected anion gap',
      'metabolic acidosis gap',
      'acid base gap',
    ],
    requiredParameters: [],
    optionalParameters: ['sodium', 'chloride', 'bicarbonate', 'albumin'],
    description: 'Serum anion gap with optional albumin correction for acid-base review',
    category: 'calculator',
  },
  {
    toolId: 'rass',
    toolName: 'RASS',
    keywords: [
      'rass',
      'rass score',
      'richmond agitation sedation scale',
      'sedation agitation score',
      'icu sedation scale',
    ],
    requiredParameters: [],
    optionalParameters: ['observed_level', 'score'],
    description:
      'Richmond Agitation-Sedation Scale for bedside sedation and agitation documentation',
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
    toolId: 'gi-bleed-workflow-assistant',
    toolName: 'GI Bleed Workflow Assistant',
    keywords: [
      'gi bleed workflow assistant',
      'gi bleed workflow',
      'upper gi bleed workflow',
      'gastrointestinal bleeding workflow',
      'gi bleed assistant',
    ],
    requiredParameters: [],
    optionalParameters: ['hemodynamics', 'hemoglobin', 'bun', 'melena', 'syncope', 'anticoagulants'],
    description:
      'Guided GI bleed review using GBS/Rockall context, hemodynamics, medications, comorbidities, and handoff prompts',
    category: 'calculator',
  },
  {
    toolId: 'liver-disease-assistant',
    toolName: 'Liver Disease Assistant',
    keywords: [
      'liver disease assistant',
      'hepatic disease assistant',
      'liver workflow',
      'cirrhosis review assistant',
      'hepatology assistant',
    ],
    requiredParameters: [],
    optionalParameters: ['bilirubin', 'inr', 'albumin', 'creatinine', 'sodium', 'ascites', 'encephalopathy'],
    description:
      'Guided liver disease review for Child-Pugh, MELD/MELD-Na, Maddrey DF, FIB-4/APRI, trends, and missing data',
    category: 'calculator',
  },
  {
    toolId: 'pancreatitis-workflow-assistant',
    toolName: 'Pancreatitis Workflow Assistant',
    keywords: [
      'pancreatitis workflow assistant',
      'pancreatitis workflow',
      'acute pancreatitis assistant',
      'pancreatitis severity workflow',
    ],
    requiredParameters: [],
    optionalParameters: ['ranson', 'bisap', 'bun', 'calcium', 'oxygenation', 'organ_failure'],
    description:
      'Guided pancreatitis severity review using Ranson, BISAP, organ-failure context, trends, and missing-data prompts',
    category: 'calculator',
  },
  {
    toolId: 'gi-surveillance-dashboard',
    toolName: 'GI Surveillance Dashboard',
    keywords: [
      'gi surveillance dashboard',
      'gastroenterology surveillance',
      'endoscopy surveillance dashboard',
      'colonoscopy follow up queue',
    ],
    requiredParameters: [],
    optionalParameters: ['endoscopy_follow_up', 'pathology_status', 'recall_queue', 'overdue_reviews'],
    description:
      'GI surveillance dashboard for endoscopy follow-up, pathology gaps, recall queues, and human review tracking',
    category: 'reference',
  },
  {
    toolId: 'hepatic-trend-analytics',
    toolName: 'Hepatic Trend Analytics',
    keywords: [
      'hepatic trend analytics',
      'liver trend analytics',
      'liver trends',
      'hepatic trends',
      'meld trend',
    ],
    requiredParameters: [],
    optionalParameters: ['bilirubin', 'inr', 'albumin', 'sodium', 'creatinine', 'platelets'],
    description:
      'Hepatic trend analytics for synthetic function, cholestasis, platelets, MELD/Child-Pugh inputs, and missing labs',
    category: 'reference',
  },
  {
    toolId: 'endoscopy-workflow-assistant',
    toolName: 'Endoscopy Workflow Assistant',
    keywords: [
      'endoscopy workflow assistant',
      'endoscopy workflow',
      'endoscopy queue',
      'endoscopy follow up',
      'scope workflow',
    ],
    requiredParameters: [],
    optionalParameters: ['indication', 'prep_status', 'anticoagulants', 'pathology_follow_up'],
    description:
      'Endoscopy workflow support for indication, preparation status, risk context, documentation, and follow-up queues',
    category: 'reference',
  },
  {
    toolId: 'cirrhosis-monitoring-engine',
    toolName: 'Cirrhosis Monitoring Engine',
    keywords: [
      'cirrhosis monitoring engine',
      'cirrhosis monitoring',
      'cirrhosis dashboard',
      'decompensation monitoring',
    ],
    requiredParameters: [],
    optionalParameters: ['ascites', 'encephalopathy', 'meld', 'child_pugh', 'platelets', 'surveillance_gaps'],
    description:
      'Cirrhosis monitoring workspace for decompensation features, liver scores, surveillance gaps, and review queues',
    category: 'reference',
  },
  {
    toolId: 'gi-command-center',
    toolName: 'GI Command Center',
    keywords: [
      'gi command center',
      'gastroenterology command center',
      'gi operations',
      'hepatology gi command',
      'gi service huddle',
    ],
    requiredParameters: [],
    optionalParameters: ['gi_bleed_queue', 'liver_reviews', 'pancreatitis_reviews', 'endoscopy_queue'],
    description:
      'GI command-center workflow for GI bleed, liver disease, pancreatitis, endoscopy, and surveillance queues',
    category: 'reference',
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
      'cha2ds2-vasc',
      'cha2ds2 vasc',
      'cha2ds2-vasc score',
      'cha2ds2 vasc score',
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
    toolId: 'mews',
    toolName: 'Modified Early Warning Score (MEWS)',
    keywords: [
      'mews',
      'modified early warning score',
      'adult early warning score',
      'calculate mews',
      'open mews',
      'deterioration score mews',
    ],
    requiredParameters: [],
    optionalParameters: ['respiratory_rate', 'heart_rate', 'systolic_bp', 'temperature', 'avpu'],
    description:
      'Modified Early Warning Score for adult deterioration screening from vital signs and AVPU',
    category: 'calculator',
  },
  {
    toolId: 'revised-trauma-score',
    toolName: 'Revised Trauma Score',
    keywords: [
      'revised trauma score',
      'rts',
      'trauma score',
      'trauma-score',
      'calculate rts',
      'calculate revised trauma score',
      'trauma physiology score',
    ],
    requiredParameters: [],
    optionalParameters: ['gcs', 'systolic_bp', 'respiratory_rate'],
    description:
      'Weighted Revised Trauma Score from coded GCS, systolic blood pressure, and respiratory rate',
    category: 'calculator',
  },
  {
    toolId: 'pews',
    toolName: 'Pediatric Early Warning Score (PEWS)',
    keywords: [
      'pews',
      'pediatric early warning score',
      'paediatric early warning score',
      'pediatric deterioration score',
      'calculate pews',
      'open pews',
    ],
    requiredParameters: [],
    optionalParameters: [
      'behavior',
      'cardiovascular_status',
      'respiratory_status',
      'nebulizer_frequency',
      'vomiting',
    ],
    description:
      'Pediatric Early Warning Score support with pediatric caution and local escalation context',
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
    toolId: 'asthma-exacerbation-assistant',
    toolName: 'Asthma Exacerbation Assistant',
    keywords: [
      'asthma exacerbation assistant',
      'asthma assistant',
      'asthma workflow',
      'acute asthma review',
    ],
    requiredParameters: [],
    optionalParameters: ['pef', 'spo2', 'respiratory_rate', 'severity_features'],
    description: 'Guided asthma exacerbation review with severity and reassessment prompts',
    category: 'calculator',
  },
  {
    toolId: 'ventilator-support-assistant',
    toolName: 'Ventilator Support Assistant',
    keywords: [
      'ventilator support assistant',
      'ventilator assistant',
      'vent support',
      'ventilator review',
    ],
    requiredParameters: [],
    optionalParameters: ['mode', 'settings', 'alarms', 'abg', 'oxygenation'],
    description: 'Ventilator support review for mode context, alarms, oxygenation, and ventilation',
    category: 'reference',
  },
  {
    toolId: 'oxygen-escalation-helper',
    toolName: 'Oxygen Escalation Helper',
    keywords: [
      'oxygen escalation helper',
      'oxygen escalation',
      'oxygen support review',
      'hypoxemia escalation',
    ],
    requiredParameters: [],
    optionalParameters: ['oxygen_device', 'fio2', 'spo2', 'work_of_breathing', 'rox', 'pf_ratio'],
    description: 'Oxygen escalation checklist support with local pathway reminders',
    category: 'calculator',
  },
  {
    toolId: 'copd-workflow-assistant',
    toolName: 'COPD Workflow Assistant',
    keywords: [
      'copd workflow assistant',
      'copd workflow',
      'copd assistant',
      'copd exacerbation review',
    ],
    requiredParameters: [],
    optionalParameters: ['gold_group', 'exacerbations', 'oxygenation', 'co2_retention'],
    description:
      'COPD workflow support for GOLD context, exacerbation concerns, and handoff prompts',
    category: 'calculator',
  },
  {
    toolId: 'ventilator-monitoring-dashboard',
    toolName: 'Ventilator Monitoring Dashboard',
    keywords: [
      'ventilator monitoring dashboard',
      'ventilator dashboard',
      'vent monitoring',
      'ventilator alarm dashboard',
    ],
    requiredParameters: [],
    optionalParameters: ['oxygenation', 'ventilation', 'alarms', 'settings', 'abg'],
    description: 'Ventilator monitoring dashboard for oxygenation, ventilation, alarms, and trends',
    category: 'reference',
  },
  {
    toolId: 'respiratory-telemetry-dashboard',
    toolName: 'Respiratory Telemetry Dashboard',
    keywords: [
      'respiratory telemetry dashboard',
      'respiratory telemetry',
      'respiratory dashboard',
      'spo2 trend dashboard',
    ],
    requiredParameters: [],
    optionalParameters: ['spo2', 'respiratory_rate', 'oxygen_device', 'alerts'],
    description:
      'Respiratory telemetry dashboard for SpO2, respiratory rate, device context, and gaps',
    category: 'reference',
  },
  {
    toolId: 'sleep-apnea-analytics',
    toolName: 'Sleep Apnea Analytics',
    keywords: [
      'sleep apnea analytics',
      'osa analytics',
      'sleep apnea dashboard',
      'sleep apnea trends',
    ],
    requiredParameters: [],
    optionalParameters: ['stop_bang', 'symptoms', 'adherence', 'sleep_study'],
    description:
      'Sleep apnea analytics for screening context, symptoms, adherence trends, and queues',
    category: 'reference',
  },
  {
    toolId: 'pulmonary-trend-engine',
    toolName: 'Pulmonary Trend Engine',
    keywords: [
      'pulmonary trend engine',
      'pulmonary trends',
      'respiratory trend engine',
      'oxygenation trends',
    ],
    requiredParameters: [],
    optionalParameters: ['spo2', 'fio2', 'pf_ratio', 'rox', 'spirometry', 'symptoms'],
    description:
      'Pulmonary trend engine for oxygenation indices, symptoms, and serial observations',
    category: 'reference',
  },
  {
    toolId: 'respiratory-command-center',
    toolName: 'Respiratory Command Center',
    keywords: [
      'respiratory command center',
      'respiratory command',
      'pulmonary command center',
      'respiratory operations',
    ],
    requiredParameters: [],
    optionalParameters: ['oxygen_queue', 'ventilator_queue', 'asthma_copd_reviews', 'sleep_queue'],
    description:
      'Respiratory command-center view for oxygen, ventilator, asthma/COPD, and sleep queues',
    category: 'reference',
  },
  {
    toolId: 'aki-staging-assistant',
    toolName: 'AKI Staging Assistant',
    keywords: [
      'aki staging assistant',
      'aki-staging-assistant',
      'aki staging',
      'acute kidney injury staging',
    ],
    requiredParameters: [],
    optionalParameters: ['baseline_creatinine', 'current_creatinine', 'urine_output', 'timing'],
    description:
      'Guided AKI staging support using creatinine, urine output, timing, and missing data',
    category: 'calculator',
  },
  {
    toolId: 'dialysis-readiness-helper',
    toolName: 'Dialysis Readiness Helper',
    keywords: [
      'dialysis readiness helper',
      'dialysis-readiness-helper',
      'dialysis readiness',
      'renal replacement readiness',
    ],
    requiredParameters: [],
    optionalParameters: [
      'potassium',
      'acid_base',
      'volume_status',
      'uremic_features',
      'access_status',
    ],
    description:
      'Dialysis readiness checklist support for access, symptoms, labs, volume context, and handoff',
    category: 'reference',
  },
  {
    toolId: 'electrolyte-disorder-assistant',
    toolName: 'Electrolyte Disorder Assistant',
    keywords: [
      'electrolyte disorder assistant',
      'electrolyte-disorder-assistant',
      'electrolyte assistant',
      'electrolyte review',
    ],
    requiredParameters: [],
    optionalParameters: ['sodium', 'potassium', 'bicarbonate', 'osmolality', 'kidney_function'],
    description: 'Guided electrolyte disorder review with severity flags and missing-data prompts',
    category: 'calculator',
  },
  {
    toolId: 'renal-monitoring-dashboard',
    toolName: 'Renal Monitoring Dashboard',
    keywords: [
      'renal monitoring dashboard',
      'renal-monitoring-dashboard',
      'kidney monitoring dashboard',
      'renal monitoring',
    ],
    requiredParameters: [],
    optionalParameters: ['creatinine', 'egfr', 'urine_output', 'electrolytes', 'acid_base'],
    description:
      'Renal monitoring dashboard for kidney function, urine output, electrolytes, and acid-base trends',
    category: 'reference',
  },
  {
    toolId: 'ckd-progression-predictor',
    toolName: 'CKD Progression Predictor',
    keywords: [
      'ckd progression predictor',
      'ckd-progression-predictor',
      'ckd progression',
      'kidney disease progression',
    ],
    requiredParameters: [],
    optionalParameters: ['egfr_slope', 'acr', 'kfre', 'follow_up'],
    description:
      'CKD progression workspace for eGFR slope, albuminuria, KFRE context, and longitudinal review',
    category: 'reference',
  },
  {
    toolId: 'dialysis-utilization-tracker',
    toolName: 'Dialysis Utilization Tracker',
    keywords: [
      'dialysis utilization tracker',
      'dialysis-utilization-tracker',
      'dialysis utilization',
      'dialysis capacity',
    ],
    requiredParameters: [],
    optionalParameters: [
      'scheduled_treatments',
      'completed_treatments',
      'missed_treatments',
      'access_issues',
    ],
    description:
      'Dialysis utilization tracker for completed treatments, missed sessions, access issues, and capacity',
    category: 'reference',
  },
  {
    toolId: 'electrolyte-trend-engine',
    toolName: 'Electrolyte Trend Engine',
    keywords: [
      'electrolyte trend engine',
      'electrolyte-trend-engine',
      'electrolyte trends',
      'electrolyte trending',
    ],
    requiredParameters: [],
    optionalParameters: ['sodium', 'potassium', 'bicarbonate', 'chloride', 'osmolality'],
    description:
      'Electrolyte trend engine for sodium, potassium, bicarbonate, osmolality, and kidney context',
    category: 'reference',
  },
  {
    toolId: 'fluid-balance-monitor',
    toolName: 'Fluid Balance Monitor',
    keywords: [
      'fluid balance monitor',
      'fluid-balance-monitor',
      'fluid balance',
      'intake output monitor',
    ],
    requiredParameters: [],
    optionalParameters: ['intake', 'output', 'urine_output', 'weight_change', 'volume_status'],
    description:
      'Fluid balance monitor for intake/output, weight change, urine output, and volume context',
    category: 'reference',
  },
  {
    toolId: 'diabetes-care-assistant',
    toolName: 'Diabetes Care Assistant',
    keywords: ['diabetes care assistant', 'diabetes-care-assistant', 'diabetes assistant', 'diabetes workflow'],
    requiredParameters: [],
    optionalParameters: ['glucose', 'a1c', 'hypoglycemia', 'hyperglycemia', 'complications'],
    description:
      'Guided diabetes review with glucose trends, A1c context, complications, missing data, and no insulin dosing automation',
    category: 'calculator',
  },
  {
    toolId: 'dka-pathway-assistant',
    toolName: 'DKA Pathway Assistant',
    keywords: ['dka pathway assistant', 'dka-pathway-assistant', 'dka assistant', 'dka pathway', 'hhs pathway'],
    requiredParameters: [],
    optionalParameters: ['glucose', 'ketones', 'anion_gap', 'bicarbonate', 'ph', 'potassium', 'osmolality'],
    description:
      'DKA/HHS pathway checklist support with no insulin, electrolyte, bicarbonate, or fluid dosing automation',
    category: 'calculator',
  },
  {
    toolId: 'thyroid-disorder-assistant',
    toolName: 'Thyroid Disorder Assistant',
    keywords: ['thyroid disorder assistant', 'thyroid-disorder-assistant', 'thyroid assistant', 'thyroid workflow'],
    requiredParameters: [],
    optionalParameters: ['tsh', 'free_t4', 't3', 'symptoms', 'pregnancy', 'medications'],
    description:
      'Guided thyroid disorder review for labs, symptoms, red flags, missing data, and no medication dosing automation',
    category: 'calculator',
  },
  {
    toolId: 'metabolic-syndrome-assistant',
    toolName: 'Metabolic Syndrome Assistant',
    keywords: [
      'metabolic syndrome assistant',
      'metabolic-syndrome-assistant',
      'metabolic syndrome workflow',
      'cardiometabolic review',
    ],
    requiredParameters: [],
    optionalParameters: ['waist', 'glucose', 'blood_pressure', 'triglycerides', 'hdl'],
    description:
      'Metabolic syndrome criteria review with risk-factor documentation and no diagnosis or treatment automation',
    category: 'calculator',
  },
  {
    toolId: 'glucose-telemetry-dashboard',
    toolName: 'Glucose Telemetry Dashboard',
    keywords: ['glucose telemetry dashboard', 'glucose-telemetry-dashboard', 'glucose telemetry', 'cgm dashboard'],
    requiredParameters: [],
    optionalParameters: ['glucose_trends', 'hypoglycemia', 'hyperglycemia', 'data_freshness'],
    description:
      'Backend glucose telemetry dashboard for trend visibility, freshness, and human review queues',
    category: 'reference',
  },
  {
    toolId: 'insulin-trend-engine',
    toolName: 'Insulin Trend Engine',
    keywords: ['insulin trend engine', 'insulin-trend-engine', 'insulin trends', 'insulin analytics'],
    requiredParameters: [],
    optionalParameters: ['documented_insulin', 'glucose_response', 'timing', 'data_gaps'],
    description:
      'Insulin trend visibility without autonomous dosing, dose calculation, or titration recommendations',
    category: 'reference',
  },
  {
    toolId: 'endocrine-monitoring-system',
    toolName: 'Endocrine Monitoring System',
    keywords: ['endocrine monitoring system', 'endocrine-monitoring-system', 'endocrine monitoring'],
    requiredParameters: [],
    optionalParameters: ['glucose', 'thyroid', 'calcium', 'osmolality', 'anthropometrics'],
    description:
      'Endocrine monitoring workspace for backend trend visibility, critical values, and missing-data review',
    category: 'reference',
  },
  {
    toolId: 'metabolic-analytics',
    toolName: 'Metabolic Analytics',
    keywords: ['metabolic analytics', 'metabolic-analytics', 'cardiometabolic analytics'],
    requiredParameters: [],
    optionalParameters: ['bmi', 'waist_hip_ratio', 'glucose', 'lipids', 'blood_pressure'],
    description:
      'Metabolic analytics for anthropometrics, glucose/lipid context, and review queues',
    category: 'reference',
  },
  {
    toolId: 'continuous-glucose-command-center',
    toolName: 'Continuous Glucose Command Center',
    keywords: [
      'continuous glucose command center',
      'continuous-glucose-command-center',
      'cgm command center',
      'continuous glucose monitoring command',
    ],
    requiredParameters: [],
    optionalParameters: ['cgm_freshness', 'hypoglycemia', 'hyperglycemia', 'sensor_gaps'],
    description:
      'CGM command-center dashboard for backend telemetry visibility without pump or insulin control',
    category: 'reference',
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
    toolId: 'differential-ai',
    toolName: 'Differential Diagnosis Assistant',
    keywords: [
      'differential ai',
      'ranked differential',
      'ranked differentials',
      'differential diagnosis assistant',
      'diagnostic differential assistant',
      'generate ranked ddx',
      'rank ddx',
    ],
    requiredParameters: ['symptoms'],
    optionalParameters: ['labs', 'history', 'demographics'],
    description:
      'Generates ranked differential diagnosis decision support with supporting evidence, suggested calculators, and explainability',
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

const TOOL_PATTERN_BY_ID = new Map(
  CLINICAL_TOOL_PATTERNS.map((pattern) => [pattern.toolId, pattern]),
);
const NORMALIZED_TOOL_PATTERNS = CLINICAL_TOOL_PATTERNS.map((pattern) => ({
  pattern,
  keywords: pattern.keywords.map((keyword) => ({
    original: keyword,
    normalized: keyword.toLowerCase(),
  })),
}));

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

  for (const { pattern, keywords } of NORMALIZED_TOOL_PATTERNS) {
    const matchedKeywords: string[] = [];

    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword.normalized)) {
        matchedKeywords.push(keyword.original);
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
    lowerMessage.includes('cardiac risk calculator') ||
    lowerMessage.includes('cardiac risk') ||
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
  return TOOL_PATTERN_BY_ID.get(toolId);
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
    age: /age[:\s]+(\d+)|(\d+)\s*(?:year|yr)[-\s]*old/i,
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
        const value = match[1] || match[2] || match[3];
        if (value) {
          parameters[param] = param === 'blood_pressure' ? value : parseFloat(value);
        }
      }
    }
  }

  return parameters;
}

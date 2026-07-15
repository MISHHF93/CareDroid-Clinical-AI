/**
 * Tool orchestrator registry — canonical executor IDs, aliases, and frontend contract maps.
 *
 * Drift tests in frontend `clinicalToolIdContract.test.js` parse this file.
 * Do not register tools here; only `tool-orchestrator.service.ts` calls registerTool().
 */

export const REGISTERED_EXECUTOR_TOOL_IDS = [
  'sofa-calculator',
  'drug-interactions',
  'lab-interpreter',
  'heart-score',
  'cha2ds2vasc-calculator',
  'wells-pe',
  'shock-index',
  'apache2-calculator',
  'anion-gap',
  'aa-gradient',
  'news2',
  'abcd2',
  'canadian-c-spine',
  'nexus-cspine',
  'gcs-calculator',
  'chads2',
  'duke-treadmill-score',
  'reynolds-risk-score',
  'has-bled',
  'timi-ua-nstemi',
  'framingham-risk',
  'grace-acs',
  'corrected-calcium',
  'corrected-sodium',
  'fena',
  'feurea',
  'osmolal-gap',
  'serum-osmolality',
  'pao2-fio2-ratio',
  'rox-index',
  'mews',
  'revised-trauma-score',
  'hunt-hess-scale',
  'ich-score',
  'four-score',
  'modified-rankin-scale',
  'pecarn-head',
  'wells-dvt-calculator',
  'abg-interpreter',
] as const;

export type RegisteredExecutorToolId = (typeof REGISTERED_EXECUTOR_TOOL_IDS)[number];

/** Legacy / NLU aliases accepted at POST /tools/:id/execute (resolved to canonical ids). */
export const EXECUTOR_ID_ALIASES: Readonly<Record<string, RegisteredExecutorToolId>> = {
  'drug-interaction-checker': 'drug-interactions',
  'drug-checker': 'drug-interactions',
  'drug-check': 'drug-interactions',
  'lab-interp': 'lab-interpreter',
  'lab-interpretation': 'lab-interpreter',
  sofa: 'sofa-calculator',
  'sofa-score': 'sofa-calculator',
  heart: 'heart-score',
  'heart-score-calculator': 'heart-score',
  wells: 'wells-pe',
  'wells-pe-score': 'wells-pe',
  'wells-score': 'wells-pe',
  gcs: 'gcs-calculator',
  'glasgow-coma-scale': 'gcs-calculator',
  'gcs-score': 'gcs-calculator',
  'news-2': 'news2',
  'news2-score': 'news2',
  'news2-calculator': 'news2',
  'cha2ds2-vasc': 'cha2ds2vasc-calculator',
  'chads2-vasc': 'cha2ds2vasc-calculator',
  cha2ds2vasc: 'cha2ds2vasc-calculator',
  'shock-index-calculator': 'shock-index',
  'anion-gap-calculator': 'anion-gap',
  'a-a-gradient': 'aa-gradient',
  'aa-gradient-calculator': 'aa-gradient',
  'apache-ii': 'apache2-calculator',
  apache2: 'apache2-calculator',
  'abcd2-score': 'abcd2',
  'canadian-cspine': 'canadian-c-spine',
  'nexus-c-spine': 'nexus-cspine',
  hasbled: 'has-bled',
  'has-bled-score': 'has-bled',
  timi: 'timi-ua-nstemi',
  'timi-score': 'timi-ua-nstemi',
  framingham: 'framingham-risk',
  grace: 'grace-acs',
  'grace-score': 'grace-acs',
  'duke-treadmill': 'duke-treadmill-score',
  reynolds: 'reynolds-risk-score',
  'chads2-score': 'chads2',
  'wells-dvt': 'wells-dvt-calculator',
  'wells-dvt-score': 'wells-dvt-calculator',
  'dvt-wells': 'wells-dvt-calculator',
  abg: 'abg-interpreter',
  'blood-gas-interpreter': 'abg-interpreter',
  'arterial-blood-gas': 'abg-interpreter',
};

/** Legacy LLM function names retained only for old tool_use payload normalization. */
export const LEGACY_LLM_TOOL_NAME_TO_EXECUTOR: Readonly<Record<string, RegisteredExecutorToolId>> =
  {
    sofa_calculator: 'sofa-calculator',
    drug_checker: 'drug-interactions',
    lab_interpreter: 'lab-interpreter',
  };

/**
 * Sidebar registry id → canonical executor id (mirrors frontend REGISTRY_ID_TO_ORCHESTRATOR_TOOL).
 */
export const REGISTRY_ID_TO_EXECUTOR_TOOL_ID: Readonly<Record<string, RegisteredExecutorToolId>> = {
  'drug-check': 'drug-interactions',
  'lab-interp': 'lab-interpreter',
  'sofa-score': 'sofa-calculator',
  // Registry / catalog ids that map to live POST executors (honesty: only these execute server-side)
  'heart-score': 'heart-score',
  'wells-pe': 'wells-pe',
  'gcs-calculator': 'gcs-calculator',
  news2: 'news2',
  'cha2ds2vasc-calculator': 'cha2ds2vasc-calculator',
  'calc-chads2vasc': 'cha2ds2vasc-calculator',
  'shock-index': 'shock-index',
  'anion-gap': 'anion-gap',
  'aa-gradient': 'aa-gradient',
  'apache2-calculator': 'apache2-calculator',
  abcd2: 'abcd2',
  'canadian-c-spine': 'canadian-c-spine',
  'nexus-cspine': 'nexus-cspine',
  chads2: 'chads2',
  'has-bled': 'has-bled',
  'timi-ua-nstemi': 'timi-ua-nstemi',
  'framingham-risk': 'framingham-risk',
  'grace-acs': 'grace-acs',
  'duke-treadmill-score': 'duke-treadmill-score',
  'reynolds-risk-score': 'reynolds-risk-score',
  // Batch 3/4 calculators — registered executors with no distinct registry-id alias (identity map).
  'corrected-calcium': 'corrected-calcium',
  'corrected-sodium': 'corrected-sodium',
  fena: 'fena',
  feurea: 'feurea',
  'osmolal-gap': 'osmolal-gap',
  'serum-osmolality': 'serum-osmolality',
  'pao2-fio2-ratio': 'pao2-fio2-ratio',
  'rox-index': 'rox-index',
  mews: 'mews',
  'revised-trauma-score': 'revised-trauma-score',
  'hunt-hess-scale': 'hunt-hess-scale',
  'ich-score': 'ich-score',
  'four-score': 'four-score',
  'modified-rankin-scale': 'modified-rankin-scale',
  'pecarn-head': 'pecarn-head',
  'wells-dvt-calculator': 'wells-dvt-calculator',
  'abg-interpreter': 'abg-interpreter',
};

export enum ToolExecutionErrorCode {
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  UNSUPPORTED_TOOL = 'UNSUPPORTED_TOOL',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_REQUEST = 'INVALID_REQUEST',
  EXECUTION_FAILED = 'EXECUTION_FAILED',
}

/**
 * NLU tool ids that appear in intent routing but have no registerTool() executor.
 * Used for structured UNSUPPORTED_TOOL responses (not fake executors).
 */
export const NLU_TOOL_IDS_WITHOUT_EXECUTOR = [
  'acls-protocol',
  'acs-workflow-assistant',
  'adjusted-body-weight',
  'ai-artifacts',
  'ai-command-center',
  'ai-cost-optimization',
  'ai-evaluation',
  'ai-gateway',
  'ai-governance',
  'ai-memory',
  'ai-rag',
  'ai-security',
  'ai-tool-calling',
  'ai-training',
  'aki-staging-assistant',
  'antibiotic-guide',
  'apgar-score',
  'apri',
  'arrhythmia-risk-classifier',
  'ascvd-risk',
  'asthma-exacerbation-assistant',
  'asthma-severity-score',
  'atls-protocol',
  'atrial-fibrillation-assistant',
  'audit-c',
  'bed-occupancy-calculator',
  'behavioral-analytics-dashboard',
  'bisap-score',
  'bishop-score',
  'bode-index',
  'braden-scale',
  'bsa',
  'bun-creatinine-ratio',
  'cage',
  'calculator-recommender-ai',
  'cardiac-telemetry-analyzer',
  'cardiology-command-center',
  'competency-dashboard',
  'centor-mcisaac',
  'child-pugh',
  'cirrhosis-monitoring-engine',
  'clinical-decision-support',
  'clinical-documentation-assistant',
  'clinical-knowledge-graph',
  'ckd-progression-predictor',
  'ckd-staging',
  'cognitive-screening-assistant',
  'columbia-suicide-severity-workflow',
  'continuous-glucose-command-center',
  'copd-gold',
  'copd-gold-assessment',
  'copd-workflow-assistant',
  'competency-platform',
  'creatinine-clearance-cg',
  'credentialing-platform',
  'crisis-escalation-audit-log',
  'curb65-calculator',
  'device-recommendation-assistant',
  'diabetes-care-assistant',
  'dialysis-readiness-helper',
  'dialysis-utilization-tracker',
  'differential-ai',
  'differential-diagnosis',
  'debrief-dashboard',
  'dispatch-ai',
  'dka-pathway-assistant',
  'dose-calculator',
  'ecg-interpretation-assistant',
  'ecg-trend-engine',
  'eeg-trend-dashboard',
  'egfr-ckd-epi',
  'electrolyte-disorder-assistant',
  'electrolyte-trend-engine',
  'endocrine-monitoring-system',
  'endoscopy-workflow-assistant',
  'epworth-sleepiness-scale',
  'fenton-growth-chart-helper',
  'fib4',
  'digital-operations-center',
  'fleet-command',
  'fluid-balance-monitor',
  'free-water-deficit',
  'gad7',
  'gestational-age-calculator',
  'gi-bleed-workflow-assistant',
  'gi-command-center',
  'gi-surveillance-dashboard',
  'glasgow-blatchford-score',
  'glucose-telemetry-dashboard',
  'growth-trend-analytics',
  'hcm-sudden-death-risk',
  'headache-red-flag-assistant',
  'heart-failure-assistant',
  'heart-failure-staging',
  'hepatic-trend-analytics',
  'homa-ir',
  'hospital-command-assistant',
  'ideal-body-weight',
  'insulin-trend-engine',
  'kfre',
  'laboratory-dashboard',
  'liver-disease-assistant',
  'maddrey-discriminant-function',
  'maternal-monitoring-dashboard',
  'mdq',
  'medical-3d-viewer',
  'meld',
  'meld-na',
  'mental-health-screening-assistant',
  'metabolic-analytics',
  'metabolic-syndrome-assistant',
  'mmse',
  'moca-placeholder-workflow',
  'moe-router',
  'morse-fall-scale',
  'neonatal-assessment-assistant',
  'neonatal-bilirubin-risk-helper',
  'neonatal-dashboard',
  'neuro-exam-assistant',
  'neuro-monitoring-engine',
  'neuro-telemetry-dashboard',
  'neurology-timeline-ai',
  'nihss',
  'nihss-summary-view',
  'ob-triage-assistant',
  'ottawa-ankle',
  'oxygen-escalation-helper',
  'pancreatitis-workflow-assistant',
  'pcl5',
  'pediatric-bp-percentile',
  'pediatric-command-center',
  'pediatric-dose-safety-checker',
  'pediatric-gcs',
  'pediatric-sepsis-assistant',
  'perc',
  'perinatal-risk-dashboard',
  'pews',
  'phq9',
  'pneumonia-severity-index',
  'population-screening-dashboard',
  'predictive-analytics-dashboard',
  'predictive-maintenance',
  'pregnancy-due-date-calculator',
  'pregnancy-workflow-assistant',
  'procedures',
  'protocol-lookup',
  'psychiatry-monitoring-dashboard',
  'pulmonary-trend-engine',
  'qsofa',
  'ranson-criteria',
  'rass',
  'remote-cardiology-monitoring-dashboard',
  'renal-monitoring-dashboard',
  'research-evidence-hub',
  'resource-allocation-assistant',
  'resource-utilization-index',
  'respiratory-command-center',
  'respiratory-telemetry-dashboard',
  'rockall-score',
  'rome-iv-ibs',
  'route-optimizer',
  'screening-trend-engine',
  'seizure-assistant',
  'scenario-player',
  'simulation-outcomes',
  'simulation-suite',
  'sleep-apnea-analytics',
  'staffing-ratio-calculator',
  'stemi-pathway-assistant',
  'stop-bang',
  'stroke-command-center',
  'stroke-workflow-assistant',
  'substance-use-screening-assistant',
  'suicide-risk-workflow-assistant',
  'thyroid-disorder-assistant',
  'turnaround-time-calculator',
  'ventilator-monitoring-dashboard',
  'ventilator-support-assistant',
  'vertigo-hints-assistant',
  'waist-hip-ratio',
] as const;

export interface ExecutorRequestContract {
  toolId: RegisteredExecutorToolId;
  requiredParameters: string[];
  optionalParameters: string[];
  responseDataKeys: string[];
  deterministic: boolean;
}

export const EXECUTOR_PARAMETER_ALIASES: Readonly<
  Record<RegisteredExecutorToolId, Readonly<Record<string, string>>>
> = {
  'sofa-calculator': {
    mechanical_ventilation: 'mechanicalVentilation',
    urine_output: 'urineOutput',
  },
  'drug-interactions': {
    severity_filter: 'severityFilter',
  },
  'lab-interpreter': {
    lab_values: 'labValues',
    patient_age: 'patientAge',
    patient_sex: 'patientSex',
    clinical_context: 'clinicalContext',
  },
  'heart-score': {},
  'cha2ds2vasc-calculator': {},
  'wells-pe': {},
  'shock-index': {
    heart_rate: 'heartRate',
    systolic_bp: 'systolicBp',
  },
  'apache2-calculator': {
    acute_renal_failure: 'acuteRenalFailure',
  },
  'anion-gap': {},
  'aa-gradient': {
    age_years: 'ageYears',
    fio2_pct: 'fio2Pct',
    pao2_mm_hg: 'pao2MmHg',
    paco2_mm_hg: 'paco2MmHg',
    atmospheric_pressure_mm_hg: 'atmosphericPressureMmHg',
    respiratory_quotient: 'respiratoryQuotient',
  },
  news2: {
    respiratory_rate: 'respiratoryRate',
    spo2_scale: 'spo2Scale',
    supplemental_oxygen: 'supplementalOxygen',
    systolic_bp: 'systolicBp',
    new_confusion: 'newConfusion',
  },
  abcd2: {
    age60_or_older: 'age60OrOlder',
    systolic_bp_mm_hg: 'systolicBpMmHg',
    diastolic_bp_mm_hg: 'diastolicBpMmHg',
    clinical_feature: 'clinicalFeature',
    duration_band: 'durationBand',
  },
  'canadian-c-spine': {
    age65_or_older: 'age65OrOlder',
    dangerous_mechanism: 'dangerousMechanism',
    paresthesias_in_extremities: 'paresthesiasInExtremities',
    simple_rear_end_mvc: 'simpleRearEndMvc',
    sitting_in_ed: 'sittingInEd',
    ambulatory_at_any_time: 'ambulatoryAtAnyTime',
    delayed_neck_pain_onset: 'delayedNeckPainOnset',
    no_midline_cervical_tenderness: 'noMidlineCervicalTenderness',
    no_distracting_painful_injury: 'noDistractingPainfulInjury',
    active_rotation_left45: 'activeRotationLeft45',
    active_rotation_right45: 'activeRotationRight45',
  },
  'nexus-cspine': {
    midline_tenderness: 'midlineTenderness',
    neurologic_deficit: 'neurologicDeficit',
    distracting_injury: 'distractingInjury',
    normal_alertness: 'normalAlertness',
  },
  'gcs-calculator': {},
  chads2: {
    congestive_heart_failure: 'congestiveHeartFailure',
    age75_or_older: 'age75OrOlder',
    stroke_tia: 'strokeTia',
  },
  'duke-treadmill-score': {
    exercise_minutes: 'exerciseMinutes',
    st_deviation_mm: 'stDeviationMm',
    angina_index: 'anginaIndex',
  },
  'reynolds-risk-score': {
    age_years: 'ageYears',
    systolic_bp_mm_hg: 'systolicBpMmHg',
    total_cholesterol_mg_dl: 'totalCholesterolMgDl',
    hdl_cholesterol_mg_dl: 'hdlCholesterolMgDl',
    hs_crp_mg_l: 'hsCrpMgL',
    parental_mi_before60: 'parentalMiBefore60',
    hba1c_pct: 'hba1cPct',
  },
  'has-bled': {
    renal_dysfunction: 'renalDysfunction',
    liver_dysfunction: 'liverDysfunction',
    stroke_history: 'strokeHistory',
    bleeding_history: 'bleedingHistory',
    labile_inr: 'labileInr',
    age_over65: 'ageOver65',
    bleeding_predisposing_drugs: 'bleedingPredisposingDrugs',
    alcohol_use: 'alcoholUse',
  },
  'timi-ua-nstemi': {
    age65_or_older: 'age65OrOlder',
    three_or_more_cad_risk_factors: 'threeOrMoreCadRiskFactors',
    known_cad_stenosis50: 'knownCadStenosis50',
    aspirin_last7_days: 'aspirinLast7Days',
    severe_angina: 'severeAngina',
    st_deviation: 'stDeviation',
    elevated_cardiac_markers: 'elevatedCardiacMarkers',
  },
  'framingham-risk': {
    age_years: 'ageYears',
    total_cholesterol_mg_dl: 'totalCholesterolMgDl',
    hdl_cholesterol_mg_dl: 'hdlCholesterolMgDl',
    systolic_bp_mm_hg: 'systolicBpMmHg',
    on_hypertension_treatment: 'onHypertensionTreatment',
  },
  'grace-acs': {
    age_years: 'ageYears',
    heart_rate_bpm: 'heartRateBpm',
    systolic_bp_mm_hg: 'systolicBpMmHg',
    creatinine_mg_dl: 'creatinineMgDl',
    killip_class: 'killipClass',
    cardiac_arrest_at_admission: 'cardiacArrestAtAdmission',
    st_segment_deviation: 'stSegmentDeviation',
    elevated_cardiac_enzymes: 'elevatedCardiacEnzymes',
  },
  'corrected-calcium': {
    calcium_mg_dl: 'calciumMgDl',
    albumin_g_dl: 'albuminGDl',
  },
  'corrected-sodium': {
    glucose_mg_dl: 'glucoseMgDl',
    correction_factor: 'correctionFactor',
  },
  fena: {
    serum_sodium: 'serumSodium',
    urine_sodium: 'urineSodium',
    serum_creatinine_mg_dl: 'serumCreatinineMgDl',
    urine_creatinine_mg_dl: 'urineCreatinineMgDl',
  },
  feurea: {
    bun_mg_dl: 'bunMgDl',
    urine_urea_nitrogen_mg_dl: 'urineUreaNitrogenMgDl',
    serum_creatinine_mg_dl: 'serumCreatinineMgDl',
    urine_creatinine_mg_dl: 'urineCreatinineMgDl',
  },
  'osmolal-gap': {
    glucose_mg_dl: 'glucoseMgDl',
    bun_mg_dl: 'bunMgDl',
    measured_osmolality: 'measuredOsmolality',
    ethanol_mg_dl: 'ethanolMgDl',
  },
  'serum-osmolality': {
    glucose_mg_dl: 'glucoseMgDl',
    bun_mg_dl: 'bunMgDl',
    ethanol_mg_dl: 'ethanolMgDl',
  },
  'pao2-fio2-ratio': {
    pao2_mm_hg: 'pao2MmHg',
    fio2_pct: 'fio2Pct',
  },
  'rox-index': {
    spo2_pct: 'spo2Pct',
    fio2_pct: 'fio2Pct',
    respiratory_rate: 'respiratoryRate',
  },
  mews: {
    respiratory_rate: 'respiratoryRate',
    heart_rate: 'heartRate',
    systolic_bp: 'systolicBp',
  },
  'revised-trauma-score': {
    systolic_bp: 'systolicBp',
    respiratory_rate: 'respiratoryRate',
  },
  'hunt-hess-scale': {},
  'ich-score': {
    volume_ml: 'volumeMl',
    intraventricular_hemorrhage: 'intraventricularHemorrhage',
    infratentorial_origin: 'infratentorialOrigin',
  },
  'four-score': {},
  'modified-rankin-scale': {},
  'pecarn-head': {
    age_category: 'ageCategory',
    altered_mental_status: 'alteredMentalStatus',
    loss_of_consciousness: 'lossOfConsciousness',
    severe_mechanism: 'severeMechanism',
    skull_fracture_signs: 'skullFractureSigns',
  },
  'wells-dvt-calculator': {
    active_cancer: 'activeCancer',
    paralysis_paresis_immobilization: 'paralysisParesisImmobilization',
    recently_bedridden_or_surgery: 'recentlyBedriddenOrSurgery',
    localized_tenderness: 'localizedTenderness',
    entire_leg_swollen: 'entireLegSwollen',
    calf_swelling_over_3cm: 'calfSwellingOver3cm',
    pitting_edema: 'pittingEdema',
    collateral_superficial_veins: 'collateralSuperficialVeins',
    previous_dvt: 'previousDvt',
    alternative_diagnosis_as_likely: 'alternativeDiagnosisAsLikely',
  },
  'abg-interpreter': {},
};

/** Request/response contracts for registered executors (documentation + validation hints). */
export const EXECUTOR_REQUEST_CONTRACTS: Readonly<
  Record<RegisteredExecutorToolId, ExecutorRequestContract>
> = {
  'sofa-calculator': {
    toolId: 'sofa-calculator',
    requiredParameters: [],
    optionalParameters: [
      'pao2',
      'fio2',
      'mechanicalVentilation',
      'platelets',
      'bilirubin',
      'map',
      'dopamine',
      'dobutamine',
      'epinephrine',
      'norepinephrine',
      'gcs',
      'creatinine',
      'urineOutput',
    ],
    responseDataKeys: [
      'totalScore',
      'respirationScore',
      'coagulationScore',
      'liverScore',
      'cardiovascularScore',
      'cnsScore',
      'renalScore',
      'mortalityEstimate',
    ],
    deterministic: true,
  },
  'drug-interactions': {
    toolId: 'drug-interactions',
    requiredParameters: ['medications'],
    optionalParameters: ['severityFilter'],
    responseDataKeys: ['interactions', 'summary'],
    deterministic: false,
  },
  'lab-interpreter': {
    toolId: 'lab-interpreter',
    requiredParameters: ['labValues'],
    optionalParameters: ['patientAge', 'patientSex', 'clinicalContext'],
    responseDataKeys: ['summary', 'criticalValues', 'interpretations'],
    deterministic: false,
  },
  'heart-score': {
    toolId: 'heart-score',
    requiredParameters: ['history', 'ecg', 'age', 'riskFactors', 'troponin'],
    optionalParameters: [],
    responseDataKeys: [
      'totalScore',
      'riskCategory',
      'riskCategoryLabel',
      'riskBand',
      'maceContext',
    ],
    deterministic: true,
  },
  'cha2ds2vasc-calculator': {
    toolId: 'cha2ds2vasc-calculator',
    requiredParameters: ['age', 'sex'],
    optionalParameters: ['chf', 'hypertension', 'diabetes', 'stroke', 'vascular'],
    responseDataKeys: ['score', 'severity', 'recommendation'],
    deterministic: true,
  },
  'wells-pe': {
    toolId: 'wells-pe',
    requiredParameters: [
      'clinicalDvtSigns',
      'peMostLikelyDiagnosis',
      'heartRateOver100',
      'immobilizationOrSurgery',
      'previousDvtOrPe',
      'hemoptysis',
      'malignancy',
    ],
    optionalParameters: [],
    responseDataKeys: ['score', 'breakdown', 'probabilityBand'],
    deterministic: true,
  },
  'shock-index': {
    toolId: 'shock-index',
    requiredParameters: ['heartRate', 'systolicBp'],
    optionalParameters: [],
    responseDataKeys: ['index', 'riskCategory', 'label'],
    deterministic: true,
  },
  'apache2-calculator': {
    toolId: 'apache2-calculator',
    requiredParameters: [
      'temperature',
      'map',
      'heartRate',
      'respiratoryRate',
      'oxygenation',
      'acidBase',
      'sodium',
      'potassium',
      'creatinine',
      'hematocrit',
      'wbc',
      'age',
      'chronicHealth',
      'gcs',
    ],
    optionalParameters: ['acuteRenalFailure'],
    responseDataKeys: [
      'total',
      'acutePhysiology',
      'gcsContribution',
      'renalAdjustment',
      'riskCategory',
    ],
    deterministic: true,
  },
  'anion-gap': {
    toolId: 'anion-gap',
    requiredParameters: ['sodium', 'chloride', 'bicarbonate'],
    optionalParameters: ['albumin'],
    responseDataKeys: ['anionGap', 'correctedAnionGap', 'riskCategory'],
    deterministic: true,
  },
  'aa-gradient': {
    toolId: 'aa-gradient',
    requiredParameters: ['ageYears', 'fio2Pct', 'pao2MmHg', 'paco2MmHg'],
    optionalParameters: ['atmosphericPressureMmHg', 'respiratoryQuotient'],
    responseDataKeys: ['alveolarOxygen', 'gradient', 'expectedUpperLimit', 'elevated'],
    deterministic: true,
  },
  news2: {
    toolId: 'news2',
    requiredParameters: [
      'respiratoryRate',
      'spo2',
      'spo2Scale',
      'systolicBp',
      'pulse',
      'temperature',
    ],
    optionalParameters: ['supplementalOxygen', 'newConfusion'],
    responseDataKeys: ['total', 'breakdown', 'spo2ScaleUsed', 'riskBand', 'hasRed'],
    deterministic: true,
  },
  abcd2: {
    toolId: 'abcd2',
    requiredParameters: ['systolicBpMmHg', 'diastolicBpMmHg', 'clinicalFeature', 'durationBand'],
    optionalParameters: ['age60OrOlder', 'diabetes'],
    responseDataKeys: ['score', 'riskCategory', 'strokeRiskContext'],
    deterministic: true,
  },
  'canadian-c-spine': {
    toolId: 'canadian-c-spine',
    requiredParameters: [],
    optionalParameters: [
      'age65OrOlder',
      'dangerousMechanism',
      'paresthesiasInExtremities',
      'simpleRearEndMvc',
      'sittingInEd',
      'ambulatoryAtAnyTime',
      'delayedNeckPainOnset',
      'noMidlineCervicalTenderness',
      'noDistractingPainfulInjury',
      'activeRotationLeft45',
      'activeRotationRight45',
    ],
    responseDataKeys: ['imagingIndicatedByRule', 'branch', 'romAssessed'],
    deterministic: true,
  },
  'nexus-cspine': {
    toolId: 'nexus-cspine',
    requiredParameters: [],
    optionalParameters: [
      'midlineTenderness',
      'intoxication',
      'neurologicDeficit',
      'distractingInjury',
      'normalAlertness',
    ],
    responseDataKeys: ['imagingIndicatedByRule', 'lowRiskByRule', 'triggeredCriteria'],
    deterministic: true,
  },
  'gcs-calculator': {
    toolId: 'gcs-calculator',
    requiredParameters: ['eye', 'verbal', 'motor'],
    optionalParameters: [],
    responseDataKeys: ['score', 'riskCategory', 'label'],
    deterministic: true,
  },
  chads2: {
    toolId: 'chads2',
    requiredParameters: [],
    optionalParameters: [
      'congestiveHeartFailure',
      'hypertension',
      'age75OrOlder',
      'diabetes',
      'strokeTia',
    ],
    responseDataKeys: ['score', 'breakdown', 'riskBand'],
    deterministic: true,
  },
  'duke-treadmill-score': {
    toolId: 'duke-treadmill-score',
    requiredParameters: ['exerciseMinutes', 'stDeviationMm', 'anginaIndex'],
    optionalParameters: [],
    responseDataKeys: ['score', 'riskBand'],
    deterministic: true,
  },
  'reynolds-risk-score': {
    toolId: 'reynolds-risk-score',
    requiredParameters: [
      'ageYears',
      'sex',
      'systolicBpMmHg',
      'totalCholesterolMgDl',
      'hdlCholesterolMgDl',
      'hsCrpMgL',
    ],
    optionalParameters: ['smoker', 'parentalMiBefore60', 'diabetes', 'hba1cPct'],
    responseDataKeys: ['points', 'riskCategory', 'riskBand'],
    deterministic: true,
  },
  'has-bled': {
    toolId: 'has-bled',
    requiredParameters: [
      'hypertension',
      'renalDysfunction',
      'liverDysfunction',
      'strokeHistory',
      'bleedingHistory',
      'labileInr',
      'ageOver65',
      'bleedingPredisposingDrugs',
      'alcoholUse',
    ],
    optionalParameters: [],
    responseDataKeys: ['total', 'breakdown', 'elevated'],
    deterministic: true,
  },
  'timi-ua-nstemi': {
    toolId: 'timi-ua-nstemi',
    requiredParameters: [
      'age65OrOlder',
      'threeOrMoreCadRiskFactors',
      'knownCadStenosis50',
      'aspirinLast7Days',
      'severeAngina',
      'stDeviation',
      'elevatedCardiacMarkers',
    ],
    optionalParameters: [],
    responseDataKeys: ['score', 'breakdown', 'riskBand'],
    deterministic: true,
  },
  'framingham-risk': {
    toolId: 'framingham-risk',
    requiredParameters: [
      'ageYears',
      'sex',
      'totalCholesterolMgDl',
      'hdlCholesterolMgDl',
      'systolicBpMmHg',
    ],
    optionalParameters: ['onHypertensionTreatment', 'smoker'],
    responseDataKeys: ['totalPoints', 'breakdown', 'tenYearRiskPct', 'riskBand'],
    deterministic: true,
  },
  'grace-acs': {
    toolId: 'grace-acs',
    requiredParameters: [
      'ageYears',
      'heartRateBpm',
      'systolicBpMmHg',
      'creatinineMgDl',
      'killipClass',
    ],
    optionalParameters: [
      'cardiacArrestAtAdmission',
      'stSegmentDeviation',
      'elevatedCardiacEnzymes',
    ],
    responseDataKeys: ['inHospitalMortalityPct', 'sixMonthMortalityPct', 'sixMonthRiskCategory'],
    deterministic: true,
  },
  'corrected-calcium': {
    toolId: 'corrected-calcium',
    requiredParameters: ['calciumMgDl', 'albuminGDl'],
    optionalParameters: [],
    responseDataKeys: ['correctedCalciumMgDl', 'correctedCalciumMmolL', 'severity'],
    deterministic: true,
  },
  'corrected-sodium': {
    toolId: 'corrected-sodium',
    requiredParameters: ['sodium', 'glucoseMgDl'],
    optionalParameters: ['correctionFactor'],
    responseDataKeys: ['correctedSodium', 'glucoseMgDl', 'severity'],
    deterministic: true,
  },
  fena: {
    toolId: 'fena',
    requiredParameters: [
      'serumSodium',
      'urineSodium',
      'serumCreatinineMgDl',
      'urineCreatinineMgDl',
    ],
    optionalParameters: [],
    responseDataKeys: ['fractionalExcretionPct', 'riskBand', 'severity'],
    deterministic: true,
  },
  feurea: {
    toolId: 'feurea',
    requiredParameters: [
      'bunMgDl',
      'urineUreaNitrogenMgDl',
      'serumCreatinineMgDl',
      'urineCreatinineMgDl',
    ],
    optionalParameters: [],
    responseDataKeys: ['fractionalExcretionPct', 'riskBand', 'severity'],
    deterministic: true,
  },
  'osmolal-gap': {
    toolId: 'osmolal-gap',
    requiredParameters: ['sodium', 'glucoseMgDl', 'bunMgDl', 'measuredOsmolality'],
    optionalParameters: ['ethanolMgDl'],
    responseDataKeys: ['calculatedOsmolality', 'osmolalGap', 'severity'],
    deterministic: true,
  },
  'serum-osmolality': {
    toolId: 'serum-osmolality',
    requiredParameters: ['sodium', 'glucoseMgDl', 'bunMgDl'],
    optionalParameters: ['ethanolMgDl'],
    responseDataKeys: ['calculatedOsmolality', 'severity'],
    deterministic: true,
  },
  'pao2-fio2-ratio': {
    toolId: 'pao2-fio2-ratio',
    requiredParameters: ['pao2MmHg', 'fio2Pct'],
    optionalParameters: [],
    responseDataKeys: ['ratio', 'riskBand', 'severity', 'label'],
    deterministic: true,
  },
  'rox-index': {
    toolId: 'rox-index',
    requiredParameters: ['spo2Pct', 'fio2Pct', 'respiratoryRate'],
    optionalParameters: [],
    responseDataKeys: ['roxIndex', 'riskBand', 'severity', 'label'],
    deterministic: true,
  },
  mews: {
    toolId: 'mews',
    requiredParameters: ['respiratoryRate', 'heartRate', 'systolicBp', 'temperature', 'avpu'],
    optionalParameters: [],
    responseDataKeys: ['totalScore', 'breakdown', 'riskCategory', 'severity', 'label'],
    deterministic: true,
  },
  'revised-trauma-score': {
    toolId: 'revised-trauma-score',
    requiredParameters: ['gcs', 'systolicBp', 'respiratoryRate'],
    optionalParameters: [],
    responseDataKeys: ['weighted', 'unweighted', 'riskCategory', 'severity', 'label'],
    deterministic: true,
  },
  'hunt-hess-scale': {
    toolId: 'hunt-hess-scale',
    requiredParameters: ['grade'],
    optionalParameters: [],
    responseDataKeys: ['grade', 'label', 'severity'],
    deterministic: true,
  },
  'ich-score': {
    toolId: 'ich-score',
    requiredParameters: [
      'age',
      'gcs',
      'volumeMl',
      'intraventricularHemorrhage',
      'infratentorialOrigin',
    ],
    optionalParameters: [],
    responseDataKeys: ['score', 'label', 'severity', 'components'],
    deterministic: true,
  },
  'four-score': {
    toolId: 'four-score',
    requiredParameters: ['eye', 'motor', 'brainstem', 'respiration'],
    optionalParameters: [],
    responseDataKeys: ['score', 'label', 'severity', 'components'],
    deterministic: true,
  },
  'modified-rankin-scale': {
    toolId: 'modified-rankin-scale',
    requiredParameters: ['score'],
    optionalParameters: [],
    responseDataKeys: ['score', 'label', 'severity'],
    deterministic: true,
  },
  'pecarn-head': {
    toolId: 'pecarn-head',
    requiredParameters: ['ageCategory'],
    optionalParameters: [
      'alteredMentalStatus',
      'lossOfConsciousness',
      'vomiting',
      'severeMechanism',
      'skullFractureSigns',
    ],
    responseDataKeys: ['ruleCriteriaMet', 'riskStratum', 'triggeredCriteria', 'severity'],
    deterministic: true,
  },
  'wells-dvt-calculator': {
    toolId: 'wells-dvt-calculator',
    requiredParameters: [
      'activeCancer',
      'paralysisParesisImmobilization',
      'recentlyBedriddenOrSurgery',
      'localizedTenderness',
      'entireLegSwollen',
      'calfSwellingOver3cm',
      'pittingEdema',
      'collateralSuperficialVeins',
      'previousDvt',
      'alternativeDiagnosisAsLikely',
    ],
    optionalParameters: [],
    responseDataKeys: ['score', 'breakdown', 'probabilityBand'],
    deterministic: true,
  },
  'abg-interpreter': {
    toolId: 'abg-interpreter',
    requiredParameters: ['pH', 'paco2', 'hco3'],
    optionalParameters: ['sodium', 'chloride', 'pao2', 'fio2'],
    responseDataKeys: [
      'primaryDisorder',
      'primaryDisorderLabel',
      'compensation',
      'anionGap',
      'oxygenation',
    ],
    deterministic: true,
  },
};

export interface UnsupportedOrchestratorToolDoc {
  nluToolId: string;
  registryId?: string;
  reason: string;
  frontendSurface: 'chat-assisted' | 'calculator-form' | 'clinical-page' | 'fleet';
}

/** Documented frontend-only / chat-only tools (no backend registerTool). */
export const UNSUPPORTED_ORCHESTRATOR_TOOL_DOCS: readonly UnsupportedOrchestratorToolDoc[] =
  NLU_TOOL_IDS_WITHOUT_EXECUTOR.map((nluToolId) => ({
    nluToolId,
    reason:
      nluToolId === 'dispatch-ai'
        ? 'Chat/NLU routing only; no POST /tools/:id/execute handler.'
        : 'Client-side calculator or chat-assisted workflow; no tool-orchestrator executor.',
    frontendSurface:
      nluToolId === 'dispatch-ai'
        ? ('chat-assisted' as const)
        : nluToolId.includes('fleet') ||
            nluToolId === 'route-optimizer' ||
            nluToolId === 'predictive-maintenance' ||
            nluToolId.includes('resource-allocation') ||
            nluToolId.includes('hospital-command') ||
            nluToolId.includes('device-recommendation')
          ? ('fleet' as const)
          : nluToolId.includes('protocol') ||
              nluToolId.includes('diagnosis') ||
              nluToolId.includes('antibiotic')
            ? ('clinical-page' as const)
            : ('calculator-form' as const),
  }));

const REGISTERED_SET = new Set<string>(REGISTERED_EXECUTOR_TOOL_IDS);
const UNSUPPORTED_SET = new Set<string>(NLU_TOOL_IDS_WITHOUT_EXECUTOR);

export function resolveExecutorToolId(toolId: string): {
  resolvedId: RegisteredExecutorToolId;
  aliased: boolean;
  requestedId: string;
} | null {
  if (!toolId || typeof toolId !== 'string') {
    return null;
  }
  const requestedId = toolId.trim();
  if (!requestedId) {
    return null;
  }

  if (REGISTERED_SET.has(requestedId)) {
    return {
      requestedId,
      resolvedId: requestedId as RegisteredExecutorToolId,
      aliased: false,
    };
  }

  const aliasTarget = EXECUTOR_ID_ALIASES[requestedId];
  if (aliasTarget) {
    return { requestedId, resolvedId: aliasTarget, aliased: true };
  }

  const fromRegistry = REGISTRY_ID_TO_EXECUTOR_TOOL_ID[requestedId];
  if (fromRegistry) {
    return { requestedId, resolvedId: fromRegistry, aliased: true };
  }

  return null;
}

export function resolveLegacyLlmToolName(toolName: string): RegisteredExecutorToolId | null {
  return LEGACY_LLM_TOOL_NAME_TO_EXECUTOR[String(toolName || '').trim()] ?? null;
}

export function classifyToolExecutionError(toolId: string): ToolExecutionErrorCode {
  const id = toolId?.trim() ?? '';
  if (UNSUPPORTED_SET.has(id)) {
    return ToolExecutionErrorCode.UNSUPPORTED_TOOL;
  }
  if (id in EXECUTOR_ID_ALIASES || id in REGISTRY_ID_TO_EXECUTOR_TOOL_ID) {
    return ToolExecutionErrorCode.TOOL_NOT_FOUND;
  }
  return ToolExecutionErrorCode.TOOL_NOT_FOUND;
}

/**
 * Executor mapping audit (2026-05) — single source for drift tests and ops reference.
 */
export const EXECUTOR_MAPPING_AUDIT = {
  registeredExecutorCount: REGISTERED_EXECUTOR_TOOL_IDS.length,
  registeredExecutorToolIds: [...REGISTERED_EXECUTOR_TOOL_IDS],
  registryIdToExecutor: { ...REGISTRY_ID_TO_EXECUTOR_TOOL_ID },
  executorAliases: { ...EXECUTOR_ID_ALIASES },
  frontendContract: 'src/data/clinicalToolIdContract.js REGISTRY_ID_TO_ORCHESTRATOR_TOOL',
  unsupportedDoc: 'src/data/unsupportedOrchestratorTools.js',
} as const;

export function validateExecutorRequestPayload(parameters: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (parameters === null || parameters === undefined) {
    errors.push('parameters is required');
  } else if (typeof parameters !== 'object' || Array.isArray(parameters)) {
    errors.push('parameters must be a plain object');
  }
  return { valid: errors.length === 0, errors };
}

function hasRequiredParameterValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string' && !value.trim()) return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

export function normalizeExecutorParameters(
  resolvedId: RegisteredExecutorToolId,
  parameters: Record<string, unknown>,
): Record<string, unknown> {
  const aliases = EXECUTOR_PARAMETER_ALIASES[resolvedId] || {};
  const normalized = { ...parameters };

  for (const [alias, canonical] of Object.entries(aliases)) {
    if (alias in normalized && !(canonical in normalized)) {
      normalized[canonical] = normalized[alias];
    }
    delete normalized[alias];
  }

  return normalized;
}

/**
 * Contract-level validation before tool-specific validate() (deterministic SOFA + required fields).
 */
export function validateExecutorContractParameters(
  resolvedId: RegisteredExecutorToolId,
  parameters: Record<string, unknown>,
): { valid: boolean; errors: string[] } {
  const contract = EXECUTOR_REQUEST_CONTRACTS[resolvedId];
  const normalizedParameters = normalizeExecutorParameters(resolvedId, parameters);
  const errors: string[] = [];

  for (const key of contract.requiredParameters) {
    if (!hasRequiredParameterValue(normalizedParameters[key])) {
      errors.push(`Missing required parameter: ${key}`);
    }
  }

  if (resolvedId === 'drug-interactions' && Array.isArray(normalizedParameters.medications)) {
    const meds = normalizedParameters.medications as unknown[];
    if (meds.some((m) => typeof m !== 'string' || !String(m).trim())) {
      errors.push('medications must be an array of non-empty drug name strings');
    }
  }

  if (resolvedId === 'lab-interpreter' && Array.isArray(normalizedParameters.labValues)) {
    const labs = normalizedParameters.labValues as unknown[];
    if (labs.length === 0) {
      errors.push('labValues must be a non-empty array');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function isKnownUnsupportedNluTool(toolId: string): boolean {
  return UNSUPPORTED_SET.has(String(toolId || '').trim());
}

export type ToolCapabilityStatus = 'executable' | 'unsupported' | 'unknown';

export interface ToolCapabilityDescription {
  requestedId: string;
  status: ToolCapabilityStatus;
  executable: boolean;
  resolvedId?: RegisteredExecutorToolId;
  aliased?: boolean;
  errorCode?: ToolExecutionErrorCode;
  /** Human-readable honesty message — never imply fake success */
  message: string;
  /** Where the user should go instead of POST /tools/:id/execute */
  suggestedSurface?: UnsupportedOrchestratorToolDoc['frontendSurface'] | 'orchestrator-api';
  reason?: string;
  doNotTreatAsSuccess: true;
  requiresClinicianReview: true;
}

/**
 * Honest capability probe for any tool id (execute vs client-only vs unknown).
 */
export function describeToolCapability(toolId: string): ToolCapabilityDescription {
  const requestedId = String(toolId || '').trim();
  const resolved = resolveExecutorToolId(requestedId);
  if (resolved) {
    return {
      requestedId,
      status: 'executable',
      executable: true,
      resolvedId: resolved.resolvedId,
      aliased: resolved.aliased,
      message: `Tool "${requestedId}" resolves to executable orchestrator id "${resolved.resolvedId}".`,
      suggestedSurface: 'orchestrator-api',
      doNotTreatAsSuccess: true,
      requiresClinicianReview: true,
    };
  }

  if (isKnownUnsupportedNluTool(requestedId)) {
    const doc = UNSUPPORTED_ORCHESTRATOR_TOOL_DOCS.find((d) => d.nluToolId === requestedId);
    return {
      requestedId,
      status: 'unsupported',
      executable: false,
      errorCode: ToolExecutionErrorCode.UNSUPPORTED_TOOL,
      message: `Tool "${requestedId}" is not available for server execution. Use the ${doc?.frontendSurface || 'client'} surface instead — do not treat chat routing as a completed clinical calculation.`,
      suggestedSurface: doc?.frontendSurface || 'calculator-form',
      reason: doc?.reason,
      doNotTreatAsSuccess: true,
      requiresClinicianReview: true,
    };
  }

  return {
    requestedId,
    status: 'unknown',
    executable: false,
    errorCode: ToolExecutionErrorCode.TOOL_NOT_FOUND,
    message: `Tool "${requestedId}" is not registered for server execution.`,
    suggestedSurface: 'calculator-form',
    doNotTreatAsSuccess: true,
    requiresClinicianReview: true,
  };
}

export function getExecutorCatalogSnapshot() {
  return {
    audit: EXECUTOR_MAPPING_AUDIT,
    contracts: EXECUTOR_REQUEST_CONTRACTS,
    parameterAliases: EXECUTOR_PARAMETER_ALIASES,
    registeredExecutorToolIds: [...REGISTERED_EXECUTOR_TOOL_IDS],
    registryIdToExecutor: { ...REGISTRY_ID_TO_EXECUTOR_TOOL_ID },
    executorAliases: { ...EXECUTOR_ID_ALIASES },
    unsupportedTools: [...UNSUPPORTED_ORCHESTRATOR_TOOL_DOCS],
    executableCount: REGISTERED_EXECUTOR_TOOL_IDS.length,
    unsupportedCount: NLU_TOOL_IDS_WITHOUT_EXECUTOR.length,
  };
}

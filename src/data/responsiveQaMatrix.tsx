/**
 * Responsive QA matrix — pages, viewports, and browsers for Playwright runs.
 * Paths are static so Node/Playwright can import without Vite resolution.
 * @see e2e/responsive-qa.spec.mjs
 * @see scripts/run-responsive-qa.mjs
 */

import {
  CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS,
  CLINICAL_TIER_B_CHAT_REGISTRY_IDS,
  CLINICAL_TIER_C_WORKFLOW_REGISTRY_IDS,
  CLINICAL_AI_PAGE_REGISTRY_IDS,
  HOSPITAL_OPERATIONS_REGISTRY_IDS,
  HOSPITAL_OPERATIONS_TIER_B_CHAT_REGISTRY_IDS,
  FLEET_TIER_B_CHAT_REGISTRY_IDS,
  REGISTRY,
} from './clinicalToolIdContract';
import { toolRegistryById } from './toolRegistry';
import { MOBILE_FIRST_BREAKPOINTS } from '../config/layout.config';

/** @typedef {{ id: string, width: number, height: number, label: string, tier?: string }} ResponsiveQaViewport */
/** @typedef {{ id: string, label: string, path: string, category: string, registryId?: string }} ResponsiveQaPage */

/**
 * Mobile-first acceptance widths (phones + tablets for device QA).
 * @see docs/mobile-first-responsive-audit.md
 */
export const MOBILE_FIRST_VIEWPORT_WIDTHS = Object.freeze([
  ...MOBILE_FIRST_BREAKPOINTS.phone,
  ...MOBILE_FIRST_BREAKPOINTS.tablet,
]);

export const MOBILE_WEB_QA_VIEWPORT_WIDTHS = MOBILE_FIRST_VIEWPORT_WIDTHS;

/** @type {readonly { width: number, height: number, label: string, tier: string }[]} */
const VIEWPORT_DEFS = [
  { width: 320, height: 568, label: 'Phone narrow (320)', tier: 'phone' },
  { width: 360, height: 800, label: 'Phone common (360)', tier: 'phone' },
  { width: 375, height: 812, label: 'Phone (375)', tier: 'phone' },
  { width: 390, height: 844, label: 'Phone tall (390)', tier: 'phone' },
  { width: 412, height: 915, label: 'Pixel 7 / 7 Pro (~412)', tier: 'phone' },
  { width: 430, height: 932, label: 'Phone large (430)', tier: 'phone' },
  { width: 480, height: 960, label: 'Phone extra large (480)', tier: 'phone' },
  { width: 600, height: 960, label: 'Small tablet / foldable (600)', tier: 'tablet' },
  { width: 768, height: 1024, label: 'Tablet portrait (768)', tier: 'tablet' },
  { width: 1024, height: 768, label: 'Tablet landscape (1024)', tier: 'tablet' },
  { width: 1280, height: 720, label: 'Desktop (1280)', tier: 'desktop' },
  { width: 1440, height: 900, label: 'Desktop (1440)', tier: 'desktop' },
  { width: 1920, height: 1080, label: 'Desktop wide (1920)', tier: 'desktop' },
];

export const RESPONSIVE_QA_VIEWPORTS = Object.freeze(
  VIEWPORT_DEFS.map((v) => ({
    id: `${v.width}x${v.height}`,
    width: v.width,
    height: v.height,
    label: v.label,
    tier: v.tier,
  }))
);

/** Playwright project names (Safari → webkit; Edge → msedge channel). */
export const RESPONSIVE_QA_BROWSER_PROJECTS = Object.freeze([
  { id: 'chromium', label: 'Chrome', engine: 'chromium' },
  { id: 'firefox', label: 'Firefox', engine: 'firefox' },
  { id: 'webkit', label: 'Safari (WebKit)', engine: 'webkit' },
  { id: 'msedge', label: 'Edge', engine: 'chromium', channel: 'msedge' },
]);

/** Browser zoom acceptance levels for manual and targeted Playwright checks. */
export const RESPONSIVE_QA_ZOOM_LEVELS = Object.freeze([80, 90, 100, 110, 125, 150]);

/** Dedicated routes for Tier A calculators (must match App.jsx). */
export const TIER_A_CALCULATOR_PATH_BY_REGISTRY_ID = Object.freeze({
  [REGISTRY.sofaScore]: '/tools/calculators/sofa',
  [REGISTRY.calcGfr]: '/tools/calculators/gfr',
  [REGISTRY.calcBmi]: '/tools/calculators/bmi',
  [REGISTRY.calcChads2vasc]: '/tools/calculators/chads2vasc',
  [REGISTRY.qsofa]: '/tools/calculators/qsofa',
  [REGISTRY.news2]: '/tools/calculators/news2',
  [REGISTRY.apache2Calculator]: '/tools/calculators/apache-ii',
  [REGISTRY.curb65Calculator]: '/tools/calculators/curb-65',
  [REGISTRY.gcsCalculator]: '/tools/calculators/gcs',
  [REGISTRY.mews]: '/tools/calculators/mews',
  [REGISTRY.revisedTraumaScore]: '/tools/calculators/revised-trauma-score',
  [REGISTRY.pews]: '/tools/calculators/pews',
  [REGISTRY.childPugh]: '/tools/calculators/child-pugh',
  [REGISTRY.hasBled]: '/tools/calculators/has-bled',
  [REGISTRY.meld]: '/tools/calculators/meld',
  [REGISTRY.meldNa]: '/tools/calculators/meld-na',
  [REGISTRY.timiUaNstemi]: '/tools/calculators/timi-ua-nstemi',
  [REGISTRY.ascvdRisk]: '/tools/calculators/ascvd-risk',
  [REGISTRY.bodeIndex]: '/tools/calculators/bode-index',
  [REGISTRY.copdGoldAssessment]: '/tools/calculators/copd-gold-assessment',
  [REGISTRY.aaGradient]: '/tools/calculators/aa-gradient',
  [REGISTRY.pao2Fio2Ratio]: '/tools/calculators/pao2-fio2-ratio',
  [REGISTRY.roxIndex]: '/tools/calculators/rox-index',
  [REGISTRY.pneumoniaSeverityIndex]: '/tools/calculators/pneumonia-severity-index',
  [REGISTRY.asthmaSeverityScore]: '/tools/calculators/asthma-severity-score',
  [REGISTRY.heartScore]: '/tools/calculators/heart-score',
  [REGISTRY.centorMcisaac]: '/tools/calculators/centor-mcisaac',
  [REGISTRY.bishopScore]: '/tools/calculators/bishop-score',
  [REGISTRY.apgarScore]: '/tools/calculators/apgar-score',
  [REGISTRY.bradenScale]: '/tools/calculators/braden-scale',
  [REGISTRY.morseFallScale]: '/tools/calculators/morse-fall-scale',
  [REGISTRY.ransonCriteria]: '/tools/calculators/ranson-criteria',
  [REGISTRY.bisapScore]: '/tools/calculators/bisap-score',
  [REGISTRY.fib4]: '/tools/calculators/fib4',
  [REGISTRY.maddreyDiscriminantFunction]: '/tools/calculators/maddrey-discriminant-function',
  [REGISTRY.apri]: '/tools/calculators/apri',
  [REGISTRY.glasgowBlatchfordScore]: '/tools/calculators/glasgow-blatchford-score',
  [REGISTRY.rockallScore]: '/tools/calculators/rockall-score',
  [REGISTRY.framinghamRisk]: '/tools/calculators/framingham-risk',
  [REGISTRY.dukeTreadmillScore]: '/tools/calculators/duke-treadmill-score',
  [REGISTRY.reynoldsRiskScore]: '/tools/calculators/reynolds-risk-score',
  [REGISTRY.hcmSuddenDeathRisk]: '/tools/calculators/hcm-sudden-death-risk',
  [REGISTRY.chads2]: '/tools/calculators/chads2',
  [REGISTRY.heartFailureStaging]: '/tools/calculators/heart-failure-staging',
  [REGISTRY.ckdStaging]: '/tools/calculators/ckd-staging',
  [REGISTRY.egfrCkdEpi]: '/tools/calculators/egfr-ckd-epi',
  [REGISTRY.creatinineClearanceCg]: '/tools/calculators/creatinine-clearance-cg',
  [REGISTRY.fena]: '/tools/calculators/fena',
  [REGISTRY.feurea]: '/tools/calculators/feurea',
  [REGISTRY.kfre]: '/tools/calculators/kfre',
  [REGISTRY.bunCreatinineRatio]: '/tools/calculators/bun-creatinine-ratio',
  [REGISTRY.correctedSodium]: '/tools/calculators/corrected-sodium',
  [REGISTRY.freeWaterDeficit]: '/tools/calculators/free-water-deficit',
  [REGISTRY.osmolalGap]: '/tools/calculators/osmolal-gap',
  [REGISTRY.stopBang]: '/tools/calculators/stop-bang',
  [REGISTRY.auditC]: '/tools/calculators/audit-c',
  [REGISTRY.phq9]: '/tools/calculators/phq9',
  [REGISTRY.gad7]: '/tools/calculators/gad7',
  [REGISTRY.cage]: '/tools/calculators/cage',
  [REGISTRY.mmse]: '/tools/calculators/mmse',
  [REGISTRY.mocaPlaceholderWorkflow]: '/tools/calculators/moca-placeholder-workflow',
  [REGISTRY.pcl5]: '/tools/calculators/pcl5',
  [REGISTRY.mdq]: '/tools/calculators/mdq',
  [REGISTRY.epworthSleepinessScale]: '/tools/calculators/epworth-sleepiness-scale',
  [REGISTRY.columbiaSuicideSeverityWorkflow]:
    '/tools/calculators/columbia-suicide-severity-workflow',
  [REGISTRY.abcd2]: '/tools/calculators/abcd2',
  [REGISTRY.huntHessScale]: '/tools/calculators/hunt-hess-scale',
  [REGISTRY.ichScore]: '/tools/calculators/ich-score',
  [REGISTRY.fourScore]: '/tools/calculators/four-score',
  [REGISTRY.modifiedRankinScale]: '/tools/calculators/modified-rankin-scale',
  [REGISTRY.nihssSummaryView]: '/tools/calculators/nihss-summary-view',
  [REGISTRY.pediatricGcs]: '/tools/calculators/pediatric-gcs',
  [REGISTRY.gestationalAgeCalculator]: '/tools/calculators/gestational-age-calculator',
  [REGISTRY.pediatricBpPercentile]: '/tools/calculators/pediatric-bp-percentile',
  [REGISTRY.pregnancyDueDateCalculator]: '/tools/calculators/pregnancy-due-date-calculator',
  [REGISTRY.fentonGrowthChartHelper]: '/tools/calculators/fenton-growth-chart-helper',
  [REGISTRY.neonatalBilirubinRiskHelper]: '/tools/calculators/neonatal-bilirubin-risk-helper',
  [REGISTRY.pediatricDoseSafetyChecker]: '/tools/calculators/pediatric-dose-safety-checker',
  [REGISTRY.wellsPe]: '/tools/calculators/wells-pe',
  [REGISTRY.perc]: '/tools/calculators/perc',
  [REGISTRY.graceAcs]: '/tools/calculators/grace-acs',
  [REGISTRY.nihss]: '/tools/calculators/nihss',
  [REGISTRY.canadianCSpine]: '/tools/calculators/canadian-c-spine',
  [REGISTRY.ottawaAnkle]: '/tools/calculators/ottawa-ankle',
  [REGISTRY.pecarnHead]: '/tools/calculators/pecarn-head',
  [REGISTRY.nexusCspine]: '/tools/calculators/nexus-cspine',
  [REGISTRY.shockIndex]: '/tools/calculators/shock-index',
  [REGISTRY.anionGap]: '/tools/calculators/anion-gap',
  [REGISTRY.rass]: '/tools/calculators/rass',
  [REGISTRY.bedOccupancyCalculator]: '/tools/calculators/bed-occupancy-calculator',
  [REGISTRY.staffingRatioCalculator]: '/tools/calculators/staffing-ratio-calculator',
  [REGISTRY.turnaroundTimeCalculator]: '/tools/calculators/turnaround-time-calculator',
  [REGISTRY.resourceUtilizationIndex]: '/tools/calculators/resource-utilization-index',
  [REGISTRY.homaIr]: '/tools/calculators/homa-ir',
  [REGISTRY.correctedCalcium]: '/tools/calculators/corrected-calcium',
  [REGISTRY.serumOsmolality]: '/tools/calculators/serum-osmolality',
  [REGISTRY.bsa]: '/tools/calculators/bsa',
  [REGISTRY.idealBodyWeight]: '/tools/calculators/ideal-body-weight',
  [REGISTRY.adjustedBodyWeight]: '/tools/calculators/adjusted-body-weight',
  [REGISTRY.waistHipRatio]: '/tools/calculators/waist-hip-ratio',
});

const TIER_B_LAUNCH_PATH = '/tools/calculators';

const CLINICAL_AI_PAGE_PATH_BY_REGISTRY_ID = Object.freeze({
  [REGISTRY.drugCheck]: '/tools/drug-checker',
  [REGISTRY.labInterp]: '/tools/lab-interpreter',
  [REGISTRY.abgInterpreter]: '/tools/lab-interpreter',
  [REGISTRY.protocols]: '/protocols',
  [REGISTRY.aclsProtocol]: '/protocols',
  [REGISTRY.atlsProtocol]: '/protocols',
  [REGISTRY.diagnosis]: '/tools/diagnosis',
  [REGISTRY.antibioticGuide]: '/tools/diagnosis',
  [REGISTRY.procedures]: '/tools/procedures',
  [REGISTRY.calculatorRecommenderAi]: '/tools/calculator-recommender',
});

const TIER_C_PAGE_PATH_BY_REGISTRY_ID = Object.freeze({
  [REGISTRY.ambientScribe]: '/tools/ambient-scribe',
  [REGISTRY.guidelineRag]: '/tools/guideline-rag',
  [REGISTRY.differentialAi]: '/tools/differential-ai',
  [REGISTRY.timelineAi]: '/tools/timeline-ai',
  [REGISTRY.patientSummaryAi]: '/tools/patient-summary-ai',
  [REGISTRY.orderSetAi]: '/tools/order-set-ai',
  [REGISTRY.aiExplainability]: '/tools/ai-explainability',
  [REGISTRY.clinicalAudit]: '/tools/clinical-audit',
  [REGISTRY.ventilatorMonitoringDashboard]: '/tools/pulmonology/ventilator-monitoring-dashboard',
  [REGISTRY.respiratoryTelemetryDashboard]: '/tools/pulmonology/respiratory-telemetry-dashboard',
  [REGISTRY.sleepApneaAnalytics]: '/tools/pulmonology/sleep-apnea-analytics',
  [REGISTRY.pulmonaryTrendEngine]: '/tools/pulmonology/pulmonary-trend-engine',
  [REGISTRY.respiratoryCommandCenter]: '/tools/pulmonology/respiratory-command-center',
  [REGISTRY.renalMonitoringDashboard]: '/tools/nephrology/renal-monitoring-dashboard',
  [REGISTRY.ckdProgressionPredictor]: '/tools/nephrology/ckd-progression-predictor',
  [REGISTRY.dialysisUtilizationTracker]: '/tools/nephrology/dialysis-utilization-tracker',
  [REGISTRY.electrolyteTrendEngine]: '/tools/nephrology/electrolyte-trend-engine',
  [REGISTRY.fluidBalanceMonitor]: '/tools/nephrology/fluid-balance-monitor',
  [REGISTRY.giSurveillanceDashboard]: '/tools/gastroenterology/gi-surveillance-dashboard',
  [REGISTRY.hepaticTrendAnalytics]: '/tools/gastroenterology/hepatic-trend-analytics',
  [REGISTRY.endoscopyWorkflowAssistant]: '/tools/gastroenterology/endoscopy-workflow-assistant',
  [REGISTRY.cirrhosisMonitoringEngine]: '/tools/gastroenterology/cirrhosis-monitoring-engine',
  [REGISTRY.giCommandCenter]: '/tools/gastroenterology/gi-command-center',
  [REGISTRY.glucoseTelemetryDashboard]: '/tools/endocrine/glucose-telemetry-dashboard',
  [REGISTRY.insulinTrendEngine]: '/tools/endocrine/insulin-trend-engine',
  [REGISTRY.endocrineMonitoringSystem]: '/tools/endocrine/endocrine-monitoring-system',
  [REGISTRY.metabolicAnalytics]: '/tools/endocrine/metabolic-analytics',
  [REGISTRY.continuousGlucoseCommandCenter]: '/tools/endocrine/continuous-glucose-command-center',
  [REGISTRY.neuroTelemetryDashboard]: '/tools/neurology/neuro-telemetry-dashboard',
  [REGISTRY.strokeCommandCenter]: '/tools/neurology/stroke-command-center',
  [REGISTRY.neuroMonitoringEngine]: '/tools/neurology/neuro-monitoring-engine',
  [REGISTRY.eegTrendDashboard]: '/tools/neurology/eeg-trend-dashboard',
  [REGISTRY.neurologyTimelineAi]: '/tools/neurology/neurology-timeline-ai',
  [REGISTRY.neonatalDashboard]: '/tools/pediatrics-obgyn/neonatal-dashboard',
  [REGISTRY.maternalMonitoringDashboard]: '/tools/pediatrics-obgyn/maternal-monitoring-dashboard',
  [REGISTRY.pediatricCommandCenter]: '/tools/pediatrics-obgyn/pediatric-command-center',
  [REGISTRY.growthTrendAnalytics]: '/tools/pediatrics-obgyn/growth-trend-analytics',
  [REGISTRY.perinatalRiskDashboard]: '/tools/pediatrics-obgyn/perinatal-risk-dashboard',
  [REGISTRY.behavioralAnalyticsDashboard]: '/tools/psychiatry/behavioral-analytics-dashboard',
  [REGISTRY.screeningTrendEngine]: '/tools/psychiatry/screening-trend-engine',
  [REGISTRY.psychiatryMonitoringDashboard]: '/tools/psychiatry/psychiatry-monitoring-dashboard',
  [REGISTRY.crisisEscalationAuditLog]: '/tools/psychiatry/crisis-escalation-audit-log',
  [REGISTRY.populationScreeningDashboard]: '/tools/psychiatry/population-screening-dashboard',
});

const TIER_B_LABEL_BY_REGISTRY_ID = Object.freeze({
  [REGISTRY.wellsPe]: 'Wells PE',
  [REGISTRY.perc]: 'PERC',
  [REGISTRY.graceAcs]: 'GRACE ACS',
  [REGISTRY.nihss]: 'NIHSS',
  [REGISTRY.canadianCSpine]: 'Canadian C-Spine',
  [REGISTRY.ottawaAnkle]: 'Ottawa Ankle',
  [REGISTRY.copdGold]: 'COPD GOLD',
  [REGISTRY.romeIvIbs]: 'Rome IV IBS',
  [REGISTRY.pecarnHead]: 'PECARN head injury',
  [REGISTRY.nexusCspine]: 'NEXUS C-Spine',
  [REGISTRY.giBleedWorkflowAssistant]: 'GI Bleed Workflow Assistant',
  [REGISTRY.liverDiseaseAssistant]: 'Liver Disease Assistant',
  [REGISTRY.pancreatitisWorkflowAssistant]: 'Pancreatitis Workflow Assistant',
  [REGISTRY.dispatchAi]: 'Dispatch Intelligence Assistant',
});

const FLEET_PAGES = Object.freeze([
  {
    id: 'fleet-live-map',
    label: 'Fleet live map',
    path: '/fleet/map',
    category: 'fleet',
    registryId: REGISTRY.fleetLiveMap,
  },
  {
    id: 'fleet-command',
    label: 'Fleet dashboard',
    path: '/fleet/command',
    category: 'fleet',
    registryId: REGISTRY.fleetCommand,
  },
  {
    id: 'fleet-route-optimizer',
    label: 'Route optimizer',
    path: '/fleet/route-optimizer',
    category: 'fleet',
    registryId: REGISTRY.routeOptimizer,
  },
  {
    id: 'fleet-predictive-maintenance',
    label: 'Predictive maintenance',
    path: '/fleet/predictive-maintenance',
    category: 'fleet',
    registryId: REGISTRY.predictiveMaintenance,
  },
]);

/**
 * @returns {readonly ResponsiveQaPage[]}
 */
export function buildResponsiveQaPages() {
  /** @type {ResponsiveQaPage[]} */
  const pages = [
    {
      id: 'dashboard',
      label: 'Command Dashboard',
      path: '/dashboard',
      category: 'core',
    },
    {
      id: 'assistant',
      label: 'Assistant',
      path: '/assistant',
      category: 'core',
    },
    {
      id: 'fleet-map',
      label: 'Fleet Map',
      path: '/fleet/map',
      category: 'core',
    },
    {
      id: 'tools-overview',
      label: 'Tool Library',
      path: '/tools',
      category: 'core',
    },
    {
      id: 'medical-iot',
      label: 'Medical IoT Dashboard',
      path: '/medical-iot',
      category: 'core',
      registryId: REGISTRY.medicalIotDashboard,
    },
    {
      id: 'live-map',
      label: 'Live Tracking Map',
      path: '/live-map',
      category: 'core',
      registryId: REGISTRY.liveTrackingMap,
    },
    {
      id: 'hospital-map',
      label: 'Hospital Map',
      path: '/hospital-map',
      category: 'core',
      registryId: REGISTRY.hospitalMap,
    },
    {
      id: 'devices',
      label: 'Device Fleet Management',
      path: '/devices',
      category: 'core',
      registryId: REGISTRY.deviceFleetManagement,
    },
    {
      id: 'clinical-alerts',
      label: 'Clinical Alerts',
      path: '/clinical/alerts',
      category: 'core',
    },
    {
      id: 'tools-catalog',
      label: 'Developer Catalog / Source Audit',
      path: '/tools/catalog',
      category: 'core',
    },
    {
      id: 'calculators-hub',
      label: 'Calculators hub (Tier B launch surface)',
      path: TIER_B_LAUNCH_PATH,
      category: 'core',
    },
    {
      id: 'artifacts',
      label: 'CareDroid Artifacts',
      path: '/artifacts',
      category: 'ai-system',
      registryId: REGISTRY.aiArtifacts,
    },
    {
      id: 'memory',
      label: 'AI Memory Dashboard',
      path: '/ai-memory',
      category: 'ai-system',
      registryId: REGISTRY.aiMemory,
    },
    {
      id: 'memory-legacy-route',
      label: 'AI Memory Dashboard legacy route',
      path: '/memory',
      category: 'ai-system',
      registryId: REGISTRY.aiMemory,
    },
    {
      id: 'training',
      label: 'AI Training Dashboard',
      path: '/training',
      category: 'ai-system',
      registryId: REGISTRY.aiTraining,
    },
    {
      id: 'costs',
      label: 'AI Cost Optimization',
      path: '/costs',
      category: 'ai-system',
      registryId: REGISTRY.aiCostOptimization,
    },
    {
      id: 'ai-evaluation',
      label: 'AI Evaluation',
      path: '/ai-evaluation',
      category: 'ai-system',
      registryId: REGISTRY.aiEvaluation,
    },
    {
      id: 'ai-command-center',
      label: 'AI Command Center',
      path: '/ai-command-center',
      category: 'ai-system',
      registryId: REGISTRY.aiCommandCenter,
    },
    {
      id: 'ai-governance',
      label: 'AI Governance Center',
      path: '/ai-governance',
      category: 'ai-system',
      registryId: REGISTRY.aiGovernance,
    },
    {
      id: 'ai-security',
      label: 'LLM Security Dashboard',
      path: '/security',
      category: 'ai-system',
      registryId: REGISTRY.aiSecurity,
    },
    {
      id: 'integrations-platform',
      label: 'Interoperability platform hub',
      path: '/integrations',
      category: 'platform',
    },
    {
      id: 'workflow-builder-ai',
      label: 'Workflow Builder AI platform shell',
      path: '/tools/workflow-builder-ai',
      category: 'platform',
    },
    {
      id: 'patient-workspace-platform',
      label: 'Patient Workspace platform shell',
      path: '/patients/demo-patient/workspace',
      category: 'platform',
    },
    {
      id: 'soap-builder',
      label: 'SOAP Builder documentation shell',
      path: '/tools/soap-builder',
      category: 'platform',
    },
    {
      id: 'regulatory-enterprise',
      label: 'Regulatory Classification enterprise route',
      path: '/regulatory',
      category: 'platform',
    },
    {
      id: 'equity-monitoring-enterprise',
      label: 'Bias and Equity Monitoring enterprise route',
      path: '/equity',
      category: 'platform',
    },
    {
      id: 'human-review-enterprise',
      label: 'Human Review Queue enterprise route',
      path: '/human-review',
      category: 'platform',
    },
    {
      id: 'privacy-enterprise',
      label: 'Consent and Privacy enterprise route',
      path: '/privacy',
      category: 'platform',
    },
    {
      id: 'system-health-enterprise',
      label: 'Deployment Observability enterprise route',
      path: '/system-health',
      category: 'platform',
    },
    {
      id: 'governance-platform',
      label: 'Governance platform hub',
      path: '/governance',
      category: 'platform',
    },
    {
      id: 'governance-clinical',
      label: 'Clinical Governance',
      path: '/governance/clinical',
      category: 'platform',
    },
    {
      id: 'ai-security-platform',
      label: 'AI Security platform alias',
      path: '/governance/ai-security',
      category: 'platform',
      registryId: REGISTRY.aiSecurity,
    },
    {
      id: 'regulatory-classification',
      label: 'Regulatory Classification',
      path: '/governance/regulatory',
      category: 'platform',
    },
    {
      id: 'validation-sandbox',
      label: 'Validation Sandbox',
      path: '/governance/validation',
      category: 'platform',
    },
    {
      id: 'human-review-queue',
      label: 'Human Review Queue',
      path: '/review',
      category: 'platform',
    },
    {
      id: 'audit-trail-spine',
      label: 'Audit Trail Spine',
      path: '/audit',
      category: 'platform',
    },
    {
      id: 'deployment-observability',
      label: 'Deployment Observability',
      path: '/operations/observability',
      category: 'platform',
    },
  ];

  const smokeRoutePages = [
    ['executive', 'Executive Command Center', '/executive', 'core'],
    ['discover', 'Discover CareDroid Capabilities', '/discover', 'core'],
    ['workflows', 'Workflows', '/workflows', 'core'],
    ['operations', 'Operations', '/operations', 'operations'],
    ['protocols', 'Protocol and Clinical Pathway Library', '/protocols', 'clinical'],
    ['research', 'Research and Evidence Hub', '/research', 'clinical'],
    ['documentation', 'Clinical Documentation Assistant', '/documentation', 'clinical'],
    ['knowledge-graph', 'Clinical Knowledge Graph', '/knowledge-graph', 'clinical'],
    ['predictive-analytics', 'Predictive Analytics Dashboard', '/predictive-analytics', 'analytics'],
    ['clinical-decision-support', 'Clinical Decision Support Engine', '/clinical-decision-support', 'clinical'],
    ['competencies', 'Competency Platform', '/competencies', 'simulation'],
    ['credentials', 'Credentialing Platform', '/credentials', 'simulation'],
    ['simulation', 'Medical Simulation Suite', '/simulation', 'simulation'],
    ['simulation-scenario', 'Sepsis Deterioration Scenario', '/simulation/sepsis-deterioration', 'simulation'],
    ['simulation-outcomes', 'Simulation Outcomes', '/simulation/outcomes', 'simulation'],
    ['laboratory', 'Laboratory', '/laboratory', 'clinical'],
    ['3d-viewer', '3D Viewer', '/3d-viewer', 'visualization'],
    ['analytics', 'Platform Analytics', '/analytics', 'analytics'],
    ['knowledge-hub', 'Knowledge Hub', '/knowledge-hub', 'knowledge'],
    ['workflow-mining', 'Workflow Mining', '/workflow-mining', 'operations'],
    ['workspace-dependency-graph', 'Workspace Dependency Graph', '/workspace-dependency-graph', 'operations'],
    ['organization-intelligence', 'Organization Intelligence', '/organization-intelligence', 'analytics'],
    ['department-intelligence', 'Department Intelligence', '/department-intelligence', 'analytics'],
    ['product-intelligence', 'Product Intelligence', '/product-intelligence', 'commercial'],
    ['expansion-opportunities', 'Expansion Opportunities', '/expansion-opportunities', 'commercial'],
    ['maturity-assessment', 'Hospital Maturity Assessment', '/maturity-assessment', 'commercial'],
    ['trackmind-maturity', 'TrackMind Maturity Dashboard', '/trackmind-maturity', 'commercial'],
    ['enterprise-platform', 'Enterprise Operating Platform', '/enterprise-platform', 'commercial'],
    ['platform-intelligence', 'Platform Intelligence Hub', '/platform-intelligence', 'commercial'],
    ['business-brain', 'Business Brain', '/business-brain', 'analytics'],
    ['saas-health-enterprise', 'SaaS Health Center', '/saas-health', 'platform'],
    ['governance-registry-enterprise', 'Platform Governance Registry', '/governance-registry', 'platform'],
    ['feature-flags', 'Feature Flag Center', '/feature-flags', 'platform'],
    ['plugins', 'Plugin Marketplace', '/plugins', 'platform'],
    ['dependency-map', 'Platform Wiring Map', '/dependency-map', 'platform'],
    ['dependency-graph', 'Asset Dependency Graph', '/dependency-graph', 'platform'],
    ['data-lineage', 'Data Lineage Explorer', '/data-lineage', 'platform'],
    ['self-diagnostics', 'Platform Self Diagnostics', '/self-diagnostics', 'platform'],
  ];

  const existingPaths = new Set(pages.map((page) => page.path));
  for (const [id, label, path, category] of smokeRoutePages) {
    if (existingPaths.has(path)) continue;
    pages.push({ id, label, path, category });
    existingPaths.add(path);
  }

  for (const registryId of CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS) {
    const path =
      TIER_A_CALCULATOR_PATH_BY_REGISTRY_ID[registryId] ||
      toolRegistryById[registryId]?.path ||
      `/tools/calculators/${registryId}`;
    pages.push({
      id: `tier-a-${registryId}`,
      label: `Tier A: ${registryId}`,
      path,
      category: 'tier-a',
      registryId: registryId as any,
    });
  }

  for (const registryId of [
    ...CLINICAL_TIER_B_CHAT_REGISTRY_IDS,
    ...FLEET_TIER_B_CHAT_REGISTRY_IDS,
    ...HOSPITAL_OPERATIONS_TIER_B_CHAT_REGISTRY_IDS,
  ]) {
    pages.push({
      id: `tier-b-${registryId}`,
      label: `Tier B launch: ${TIER_B_LABEL_BY_REGISTRY_ID[registryId] || registryId}`,
      path: TIER_B_LAUNCH_PATH,
      category: 'tier-b',
      registryId: registryId as any,
    });
  }

  for (const registryId of CLINICAL_AI_PAGE_REGISTRY_IDS) {
    const path =
      CLINICAL_AI_PAGE_PATH_BY_REGISTRY_ID[registryId] || toolRegistryById[registryId]?.path;
    if (!path) {
      throw new Error(`responsiveQaMatrix: missing clinical AI page path for ${registryId}`);
    }
    pages.push({
      id: `clinical-page-${registryId}`,
      label: `Clinical page: ${registryId}`,
      path,
      category: 'clinical-page',
      registryId: registryId as any,
    });
  }

  for (const registryId of CLINICAL_TIER_C_WORKFLOW_REGISTRY_IDS) {
    const path = TIER_C_PAGE_PATH_BY_REGISTRY_ID[registryId] || toolRegistryById[registryId]?.path;
    if (!path) {
      throw new Error(`responsiveQaMatrix: missing Tier C path for ${registryId}`);
    }
    pages.push({
      id: `tier-c-${registryId}`,
      label: `Tier C: ${registryId}`,
      path,
      category: 'tier-c',
      registryId: registryId as any,
    });
  }

  pages.push(...(FLEET_PAGES as any[]));

  for (const registryId of HOSPITAL_OPERATIONS_REGISTRY_IDS) {
    const path =
      registryId === REGISTRY.deviceBatteryIntelligence ? '/medical-iot' : '/hospital-map';
    pages.push({
      id: `hospital-ops-${registryId}`,
      label: `Hospital operations: ${registryId}`,
      path,
      category: 'hospital-ops',
      registryId: registryId as any,
    });
  }

  return Object.freeze(pages);
}

export const RESPONSIVE_QA_PAGES = buildResponsiveQaPages();

/**
 * Unique paths for faster browser runs (Tier B shares `/tools/calculators`).
 * @returns {Map<string, ResponsiveQaPage[]>}
 */
export function groupResponsiveQaPagesByPath() {
  /** @type {Map<string, ResponsiveQaPage[]>} */
  const byPath = new Map();
  for (const page of RESPONSIVE_QA_PAGES) {
    const list = byPath.get(page.path) || [];
    list.push(page);
    byPath.set(page.path, list);
  }
  return byPath;
}

/**
 * Full matrix cell count (pages × viewports × browsers).
 */
export function countResponsiveQaCells() {
  return (
    RESPONSIVE_QA_PAGES.length *
    RESPONSIVE_QA_VIEWPORTS.length *
    RESPONSIVE_QA_BROWSER_PROJECTS.length
  );
}

/**
 * Markdown table for QA documentation.
 */
export function formatResponsiveQaMatrixMarkdown() {
  const lines = [
    '# Responsive QA matrix',
    '',
    `Generated from \`src/data/responsiveQaMatrix.js\`. Total cells: **${countResponsiveQaCells()}** (${RESPONSIVE_QA_PAGES.length} pages × ${RESPONSIVE_QA_VIEWPORTS.length} viewports × ${RESPONSIVE_QA_BROWSER_PROJECTS.length} browsers). Zoom acceptance levels: ${RESPONSIVE_QA_ZOOM_LEVELS.join('%, ')}%.`,
    '',
    '## Browsers',
    '',
    '| ID | Label |',
    '| --- | --- |',
    ...RESPONSIVE_QA_BROWSER_PROJECTS.map((b) => `| ${b.id} | ${b.label} |`),
    '',
    '## Viewports',
    '',
    '| ID | Size | Label |',
    '| --- | --- | --- |',
    ...RESPONSIVE_QA_VIEWPORTS.map((v) => `| ${v.id} | ${v.width}×${v.height} | ${v.label} |`),
    '',
    '## Zoom',
    '',
    RESPONSIVE_QA_ZOOM_LEVELS.map((level) => `${level}%`).join(', '),
    '',
    '## Pages',
    '',
    '| ID | Category | Path | Label |',
    '| --- | --- | --- | --- |',
    ...RESPONSIVE_QA_PAGES.map((p) => `| ${p.id} | ${p.category} | \`${p.path}\` | ${p.label} |`),
    '',
    '## Rules',
    '',
    '- No horizontal scroll on `document` except inside designated data-table wrappers (`.catalog-table-wrap`, `.fleet-data-table-wrap`, `.logs-table-container`, `.tool-card-table-wrap`, `.cost-chart`).',
    '- Small-screen failures are blocking.',
    '',
  ];
  return lines.join('\n');
}

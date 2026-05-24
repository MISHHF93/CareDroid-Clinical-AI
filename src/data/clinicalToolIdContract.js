/**
 * Central tool ID contract — canonical registry, NLU, orchestrator, and alias maps.
 *
 * ## Canonical layers (one direction of truth)
 * | Layer | Constant | Used in |
 * |-------|----------|---------|
 * | Sidebar / workspace | `REGISTRY.*` | `toolRegistry.js`, App routes, catalog `sidebarToolId` |
 * | NLU / backend patterns | `NLU.*` | `clinicalIntentTools`, `tool.patterns.ts` |
 * | Calculator UI slug | `BUILTIN_CALC.*` | `Calculators.jsx`, `?calc=`, `builtinUiCalculators` |
 *
 * ## Migration (new tool)
 * 1. Add `REGISTRY.*` and, if NLU id differs, `NLU.*` here.
 * 2. Append to the correct `CANONICAL_TOOL_GROUPS` tier list below.
 * 3. Update `toolRegistry.js`, `clinicalIntentToolCatalog.js`, `tool.patterns.ts`.
 * 4. Add phrase aliases to `NLU_TO_REGISTRY_ID` only when needed for catalog/cost-tracking.
 * 5. If POST `/api/tools/:id/execute` — add `registerTool()` backend + `ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS`.
 *
 * ## Alias strategy
 * - **Registry id** is the canonical launch/sidebar key.
 * - **NLU toolId** may differ; map 1:1 via `ORCHESTRATOR_TO_REGISTRY_ID` or phrases via `NLU_TO_REGISTRY_ID`.
 * - **Calculator slugs** map via `BUILTIN_CALC_ID_TO_REGISTRY_ID`.
 * - **Backend keywords** live only in `tool.patterns.ts`; do not duplicate every keyword in `NLU_TO_REGISTRY_ID`.
 *
 * @see CANONICAL_TOOL_GROUPS — product grouping for audits and drift tests
 */

/** Bump when registry/NLU lists or maps change incompatibly. */
export const TOOL_ID_CONTRACT_VERSION = '1.8.0';

/** Shared SPA paths for tool launch (browser-safe). */
export const TOOL_LAUNCH_PATHS = Object.freeze({
  toolsOverview: '/tools',
  toolsCatalog: '/tools/catalog',
  calculatorsHub: '/tools/calculators',
  liveTrackingMap: '/live-map',
  hospitalMap: '/hospital-map',
  medicalIot: '/medical-iot',
  fleetCommand: '/fleet/command',
  fleetMap: '/fleet/map',
  predictiveMaintenance: '/fleet/predictive-maintenance',
  routeOptimizer: '/fleet/route-optimizer',
});

/** Canonical sidebar / registry ids (`toolRegistry.js`). */
export const REGISTRY = Object.freeze({
  drugCheck: 'drug-check',
  labInterp: 'lab-interp',
  sofaScore: 'sofa-score',
  calcGfr: 'calc-gfr',
  calcBmi: 'calc-bmi',
  calcChads2vasc: 'calc-chads2vasc',
  qsofa: 'qsofa',
  news2: 'news2',
  childPugh: 'child-pugh',
  hasBled: 'has-bled',
  meld: 'meld',
  meldNa: 'meld-na',
  timiUaNstemi: 'timi-ua-nstemi',
  ascvdRisk: 'ascvd-risk',
  ckdStaging: 'ckd-staging',
  stopBang: 'stop-bang',
  auditC: 'audit-c',
  phq9: 'phq9',
  gad7: 'gad7',
  heartScore: 'heart-score',
  centorMcisaac: 'centor-mcisaac',
  bishopScore: 'bishop-score',
  apgarScore: 'apgar-score',
  bradenScale: 'braden-scale',
  morseFallScale: 'morse-fall-scale',
  ransonCriteria: 'ranson-criteria',
  bisapScore: 'bisap-score',
  fib4: 'fib4',
  framinghamRisk: 'framingham-risk',
  wellsPe: 'wells-pe',
  perc: 'perc',
  graceAcs: 'grace-acs',
  copdGold: 'copd-gold',
  romeIvIbs: 'rome-iv-ibs',
  nihss: 'nihss',
  canadianCSpine: 'canadian-c-spine',
  ottawaAnkle: 'ottawa-ankle',
  pecarnHead: 'pecarn-head',
  nexusCspine: 'nexus-cspine',
  abcd2: 'abcd2',
  shockIndex: 'shock-index',
  anionGap: 'anion-gap',
  rass: 'rass',
  calculatorsHub: 'calculators',
  apache2Calculator: 'apache2-calculator',
  curb65Calculator: 'curb65-calculator',
  gcsCalculator: 'gcs-calculator',
  wellsDvtCalculator: 'wells-dvt-calculator',
  protocols: 'protocols',
  diagnosis: 'diagnosis',
  procedures: 'procedures',
  doseCalculator: 'dose-calculator',
  abgInterpreter: 'abg-interpreter',
  aclsProtocol: 'acls-protocol',
  atlsProtocol: 'atls-protocol',
  antibioticGuide: 'antibiotic-guide',
  ambientScribe: 'ambient-scribe',
  calculatorRecommenderAi: 'calculator-recommender-ai',
  guidelineRag: 'guideline-rag',
  differentialAi: 'differential-ai',
  timelineAi: 'timeline-ai',
  patientSummaryAi: 'patient-summary-ai',
  orderSetAi: 'order-set-ai',
  aiExplainability: 'ai-explainability',
  clinicalAudit: 'clinical-audit',
  dispatchAi: 'dispatch-ai',
  routeOptimizer: 'route-optimizer',
  predictiveMaintenance: 'predictive-maintenance',
  fleetCommand: 'fleet-command',
  liveTrackingMap: 'live-tracking-map',
  fleetLiveMap: 'fleet-live-map',
  medicalIotDashboard: 'medical-iot-dashboard',
  hospitalMap: 'hospital-map',
  deviceFleetManagement: 'device-fleet-management',
  telemetryMonitoring: 'telemetry-monitoring',
  deviceMaintenance: 'device-maintenance',
  hospitalOperationsCommand: 'hospital-operations-command',
});

/** NLU / backend pattern primary tool ids (`clinicalIntentTools`, tool.patterns.ts). */
export const NLU = Object.freeze({
  sofaCalculator: 'sofa-calculator',
  qsofa: 'qsofa',
  news2: 'news2',
  childPugh: 'child-pugh',
  hasBled: 'has-bled',
  meld: 'meld',
  meldNa: 'meld-na',
  timiUaNstemi: 'timi-ua-nstemi',
  ascvdRisk: 'ascvd-risk',
  ckdStaging: 'ckd-staging',
  stopBang: 'stop-bang',
  auditC: 'audit-c',
  phq9: 'phq9',
  gad7: 'gad7',
  heartScore: 'heart-score',
  centorMcisaac: 'centor-mcisaac',
  bishopScore: 'bishop-score',
  apgarScore: 'apgar-score',
  bradenScale: 'braden-scale',
  morseFallScale: 'morse-fall-scale',
  ransonCriteria: 'ranson-criteria',
  bisapScore: 'bisap-score',
  fib4: 'fib4',
  framinghamRisk: 'framingham-risk',
  apache2Calculator: 'apache2-calculator',
  cha2ds2vascCalculator: 'cha2ds2vasc-calculator',
  curb65Calculator: 'curb65-calculator',
  gcsCalculator: 'gcs-calculator',
  wellsDvtCalculator: 'wells-dvt-calculator',
  wellsPe: 'wells-pe',
  perc: 'perc',
  graceAcs: 'grace-acs',
  nihss: 'nihss',
  canadianCSpine: 'canadian-c-spine',
  ottawaAnkle: 'ottawa-ankle',
  pecarnHead: 'pecarn-head',
  nexusCspine: 'nexus-cspine',
  abcd2: 'abcd2',
  shockIndex: 'shock-index',
  anionGap: 'anion-gap',
  rass: 'rass',
  copdGold: 'copd-gold',
  romeIvIbs: 'rome-iv-ibs',
  dispatchAi: 'dispatch-ai',
  drugInteractions: 'drug-interactions',
  doseCalculator: 'dose-calculator',
  labInterpreter: 'lab-interpreter',
  abgInterpreter: 'abg-interpreter',
  protocolLookup: 'protocol-lookup',
  aclsProtocol: 'acls-protocol',
  atlsProtocol: 'atls-protocol',
  routeOptimizer: 'route-optimizer',
  predictiveMaintenance: 'predictive-maintenance',
  fleetCommand: 'fleet-command',
  differentialDiagnosis: 'differential-diagnosis',
  differentialAi: 'differential-ai',
  antibioticGuide: 'antibiotic-guide',
  procedures: 'procedures',
  calculatorRecommenderAi: 'calculator-recommender-ai',
});

/** Built-in calculator UI slugs (`Calculators.jsx`, `?calc=`). */
export const BUILTIN_CALC = Object.freeze({
  sofa: 'sofa',
  qsofa: 'qsofa',
  news2: 'news2',
  childPugh: 'child-pugh',
  hasBled: 'has-bled',
  meld: 'meld',
  meldNa: 'meld-na',
  timiUaNstemi: 'timi-ua-nstemi',
  ascvdRisk: 'ascvd-risk',
  ckdStaging: 'ckd-staging',
  stopBang: 'stop-bang',
  auditC: 'audit-c',
  phq9: 'phq9',
  gad7: 'gad7',
  heartScore: 'heart-score',
  centorMcisaac: 'centor-mcisaac',
  bishopScore: 'bishop-score',
  apgarScore: 'apgar-score',
  bradenScale: 'braden-scale',
  morseFallScale: 'morse-fall-scale',
  ransonCriteria: 'ranson-criteria',
  bisapScore: 'bisap-score',
  fib4: 'fib4',
  framinghamRisk: 'framingham-risk',
  abcd2: 'abcd2',
  shockIndex: 'shock-index',
  anionGap: 'anion-gap',
  rass: 'rass',
  gfr: 'gfr',
  egfr: 'egfr',
  bmi: 'bmi',
  chads2vasc: 'chads2vasc',
});

// —— Clinical calculators (Tier A dedicated forms) ——

export const LEGACY_TIER_A_CALCULATOR_REGISTRY_IDS = Object.freeze([
  REGISTRY.sofaScore,
  REGISTRY.calcGfr,
  REGISTRY.calcBmi,
  REGISTRY.calcChads2vasc,
]);

export const PR1_CALCULATOR_REGISTRY_IDS = Object.freeze([
  REGISTRY.qsofa,
  REGISTRY.news2,
  REGISTRY.childPugh,
  REGISTRY.hasBled,
]);

export const PR2_MELD_CALCULATOR_REGISTRY_IDS = Object.freeze([REGISTRY.meld, REGISTRY.meldNa]);

export const PR2_TIMI_CALCULATOR_REGISTRY_IDS = Object.freeze([REGISTRY.timiUaNstemi]);

export const PR2_TIER_A_CALCULATOR_REGISTRY_IDS = Object.freeze([
  ...PR2_MELD_CALCULATOR_REGISTRY_IDS,
  ...PR2_TIMI_CALCULATOR_REGISTRY_IDS,
]);

export const PR4A_TIER_A_CALCULATOR_REGISTRY_IDS = Object.freeze([
  REGISTRY.ascvdRisk,
  REGISTRY.ckdStaging,
  REGISTRY.stopBang,
  REGISTRY.auditC,
]);

export const PR4A_CALCULATOR_REGISTRY_IDS = Object.freeze([...PR4A_TIER_A_CALCULATOR_REGISTRY_IDS]);

export const PR5_TIER_A_CALCULATOR_REGISTRY_IDS = Object.freeze([REGISTRY.phq9, REGISTRY.gad7]);

export const PR5_CALCULATOR_REGISTRY_IDS = Object.freeze([...PR5_TIER_A_CALCULATOR_REGISTRY_IDS]);

export const PR8_TIER_A_CALCULATOR_REGISTRY_IDS = Object.freeze([
  REGISTRY.heartScore,
  REGISTRY.centorMcisaac,
  REGISTRY.bishopScore,
  REGISTRY.apgarScore,
  REGISTRY.bradenScale,
  REGISTRY.morseFallScale,
  REGISTRY.ransonCriteria,
  REGISTRY.bisapScore,
  REGISTRY.fib4,
  REGISTRY.framinghamRisk,
]);

export const PR8_CALCULATOR_REGISTRY_IDS = Object.freeze([...PR8_TIER_A_CALCULATOR_REGISTRY_IDS]);

export const PR10_TIER_A_CALCULATOR_REGISTRY_IDS = Object.freeze([REGISTRY.abcd2]);

export const PR10_CALCULATOR_REGISTRY_IDS = Object.freeze([...PR10_TIER_A_CALCULATOR_REGISTRY_IDS]);

export const PR11_TIER_A_CALCULATOR_REGISTRY_IDS = Object.freeze([
  REGISTRY.shockIndex,
  REGISTRY.anionGap,
  REGISTRY.rass,
]);

export const PR11_CALCULATOR_REGISTRY_IDS = Object.freeze([...PR11_TIER_A_CALCULATOR_REGISTRY_IDS]);

/** All Tier-A calculator registry ids (dedicated routes + forms when shipped). */
export const CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS = Object.freeze([
  ...LEGACY_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...PR1_CALCULATOR_REGISTRY_IDS,
  ...PR2_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...PR4A_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...PR5_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...PR8_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...PR10_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...PR11_TIER_A_CALCULATOR_REGISTRY_IDS,
]);

// —— Chat-assisted clinical tools (Tier B hub) ——

export const PR2_TIER_B_CHAT_CALCULATOR_IDS = Object.freeze([REGISTRY.wellsPe, REGISTRY.perc]);

export const PR3_TIER_B_CHAT_CALCULATOR_IDS = Object.freeze([
  REGISTRY.graceAcs,
  REGISTRY.nihss,
  REGISTRY.canadianCSpine,
  REGISTRY.ottawaAnkle,
]);

export const PR6_TIER_B_CHAT_CALCULATOR_IDS = Object.freeze([REGISTRY.copdGold]);

export const PR7_TIER_B_CHAT_CALCULATOR_IDS = Object.freeze([REGISTRY.romeIvIbs]);

export const PR9_TIER_B_CHAT_CALCULATOR_IDS = Object.freeze([
  REGISTRY.pecarnHead,
  REGISTRY.nexusCspine,
]);

export const CLINICAL_TIER_B_CHAT_REGISTRY_IDS = Object.freeze([
  ...PR2_TIER_B_CHAT_CALCULATOR_IDS,
  ...PR3_TIER_B_CHAT_CALCULATOR_IDS,
  ...PR6_TIER_B_CHAT_CALCULATOR_IDS,
  ...PR7_TIER_B_CHAT_CALCULATOR_IDS,
  ...PR9_TIER_B_CHAT_CALCULATOR_IDS,
]);

/** NLU hub chat tools with dedicated sidebar registry rows (guided chat from calculators hub). */
export const CLINICAL_NLU_HUB_CHAT_REGISTRY_IDS = Object.freeze([
  NLU.apache2Calculator,
  NLU.curb65Calculator,
  NLU.gcsCalculator,
  NLU.wellsDvtCalculator,
]);

export const PR2_CALCULATOR_REGISTRY_IDS = Object.freeze([
  ...PR2_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...PR2_TIER_B_CHAT_CALCULATOR_IDS,
]);

export const PR3_CALCULATOR_REGISTRY_IDS = Object.freeze([...PR3_TIER_B_CHAT_CALCULATOR_IDS]);

export const PR6_CALCULATOR_REGISTRY_IDS = Object.freeze([...PR6_TIER_B_CHAT_CALCULATOR_IDS]);

export const PR7_CALCULATOR_REGISTRY_IDS = Object.freeze([...PR7_TIER_B_CHAT_CALCULATOR_IDS]);

export const PR9_CALCULATOR_REGISTRY_IDS = Object.freeze([...PR9_TIER_B_CHAT_CALCULATOR_IDS]);

export const TIER_B_CHAT_CALCULATOR_REGISTRY_IDS = Object.freeze([
  ...CLINICAL_TIER_B_CHAT_REGISTRY_IDS,
  ...CLINICAL_NLU_HUB_CHAT_REGISTRY_IDS,
  REGISTRY.dispatchAi,
]);

// —— Fleet / logistics ——

export const FLEET_TIER_A_REGISTRY_IDS = Object.freeze([
  REGISTRY.fleetCommand,
  REGISTRY.predictiveMaintenance,
  REGISTRY.routeOptimizer,
]);

export const FLEET_TIER_B_CHAT_REGISTRY_IDS = Object.freeze([REGISTRY.dispatchAi]);

export const PR_FLEET_TIER_A_REGISTRY_IDS = FLEET_TIER_A_REGISTRY_IDS;

export const PR_FLEET_TIER_B_CHAT_REGISTRY_IDS = FLEET_TIER_B_CHAT_REGISTRY_IDS;

export const PR_FLEET_ALL_REGISTRY_IDS = Object.freeze([
  ...FLEET_TIER_A_REGISTRY_IDS,
  ...FLEET_TIER_B_CHAT_REGISTRY_IDS,
]);

// —— Medical IoT / device monitoring ——

export const MEDICAL_IOT_REGISTRY_IDS = Object.freeze([REGISTRY.medicalIotDashboard]);

// —— Live tracking maps ——

export const LIVE_TRACKING_MAP_REGISTRY_IDS = Object.freeze([
  REGISTRY.liveTrackingMap,
  REGISTRY.fleetLiveMap,
]);

// —— Hospital map / device operations ——

export const HOSPITAL_OPERATIONS_REGISTRY_IDS = Object.freeze([
  REGISTRY.hospitalMap,
  REGISTRY.deviceFleetManagement,
  REGISTRY.telemetryMonitoring,
  REGISTRY.deviceMaintenance,
  REGISTRY.hospitalOperationsCommand,
]);

// —— Clinical AI operations pages (non-calculator tools) ——

export const CLINICAL_AI_PAGE_REGISTRY_IDS = Object.freeze([
  REGISTRY.drugCheck,
  REGISTRY.labInterp,
  REGISTRY.abgInterpreter,
  REGISTRY.protocols,
  REGISTRY.aclsProtocol,
  REGISTRY.atlsProtocol,
  REGISTRY.diagnosis,
  REGISTRY.antibioticGuide,
  REGISTRY.procedures,
  REGISTRY.calculatorRecommenderAi,
]);

export const CLINICAL_TIER_C_WORKFLOW_REGISTRY_IDS = Object.freeze([
  REGISTRY.ambientScribe,
  REGISTRY.guidelineRag,
  REGISTRY.differentialAi,
  REGISTRY.timelineAi,
  REGISTRY.patientSummaryAi,
  REGISTRY.orderSetAi,
  REGISTRY.aiExplainability,
  REGISTRY.clinicalAudit,
]);

/** Chat-assisted calculator hub entries with dedicated sidebar rows. */
export const CLINICAL_DOSE_HUB_REGISTRY_IDS = Object.freeze([REGISTRY.doseCalculator]);

/**
 * Registry tools with NLU/chat coverage via backend keywords but no `clinicalIntentTools` row
 * (e.g. legacy eGFR/BMI/SOFA keyword routing).
 */
export const KEYWORD_ROUTED_REGISTRY_IDS = Object.freeze([
  REGISTRY.calcGfr,
  REGISTRY.calcBmi,
]);

/**
 * NLU profiles that route to the calculators hub (chat-assisted; dedicated sidebar registry rows).
 */
export const NLU_HUB_ONLY_PROFILE_TOOL_IDS = Object.freeze([
  NLU.apache2Calculator,
  NLU.curb65Calculator,
  NLU.gcsCalculator,
  NLU.wellsDvtCalculator,
]);

/**
 * Primary NLU tool ids shipped in `clinicalIntentTools` + backend `tool.patterns.ts`.
 * Hub-only NLU rows (apache2, curb65, gcs, wells-dvt) included.
 */
export const NLU_PROFILE_TOOL_IDS = Object.freeze([
  NLU.sofaCalculator,
  NLU.qsofa,
  NLU.news2,
  NLU.childPugh,
  NLU.hasBled,
  NLU.meld,
  NLU.meldNa,
  NLU.timiUaNstemi,
  NLU.ascvdRisk,
  NLU.ckdStaging,
  NLU.stopBang,
  NLU.auditC,
  NLU.phq9,
  NLU.gad7,
  NLU.heartScore,
  NLU.centorMcisaac,
  NLU.bishopScore,
  NLU.apgarScore,
  NLU.bradenScale,
  NLU.morseFallScale,
  NLU.ransonCriteria,
  NLU.bisapScore,
  NLU.fib4,
  NLU.framinghamRisk,
  NLU.apache2Calculator,
  NLU.cha2ds2vascCalculator,
  NLU.curb65Calculator,
  NLU.gcsCalculator,
  NLU.wellsDvtCalculator,
  NLU.wellsPe,
  NLU.perc,
  NLU.graceAcs,
  NLU.nihss,
  NLU.canadianCSpine,
  NLU.ottawaAnkle,
  NLU.pecarnHead,
  NLU.nexusCspine,
  NLU.abcd2,
  NLU.shockIndex,
  NLU.anionGap,
  NLU.rass,
  NLU.copdGold,
  NLU.romeIvIbs,
  NLU.dispatchAi,
  NLU.drugInteractions,
  NLU.doseCalculator,
  NLU.labInterpreter,
  NLU.abgInterpreter,
  NLU.protocolLookup,
  NLU.aclsProtocol,
  NLU.atlsProtocol,
  NLU.routeOptimizer,
  NLU.predictiveMaintenance,
  NLU.fleetCommand,
  NLU.differentialDiagnosis,
  NLU.differentialAi,
  NLU.antibioticGuide,
  NLU.procedures,
  NLU.calculatorRecommenderAi,
]);

export const BUILTIN_CALC_ID_TO_REGISTRY_ID = Object.freeze({
  [BUILTIN_CALC.sofa]: REGISTRY.sofaScore,
  [BUILTIN_CALC.chads2vasc]: REGISTRY.calcChads2vasc,
  [BUILTIN_CALC.qsofa]: REGISTRY.qsofa,
  [BUILTIN_CALC.news2]: REGISTRY.news2,
  [BUILTIN_CALC.childPugh]: REGISTRY.childPugh,
  [BUILTIN_CALC.hasBled]: REGISTRY.hasBled,
  [BUILTIN_CALC.meld]: REGISTRY.meld,
  [BUILTIN_CALC.meldNa]: REGISTRY.meldNa,
  [BUILTIN_CALC.timiUaNstemi]: REGISTRY.timiUaNstemi,
  [BUILTIN_CALC.ascvdRisk]: REGISTRY.ascvdRisk,
  [BUILTIN_CALC.ckdStaging]: REGISTRY.ckdStaging,
  [BUILTIN_CALC.stopBang]: REGISTRY.stopBang,
  [BUILTIN_CALC.auditC]: REGISTRY.auditC,
  [BUILTIN_CALC.phq9]: REGISTRY.phq9,
  [BUILTIN_CALC.gad7]: REGISTRY.gad7,
  [BUILTIN_CALC.heartScore]: REGISTRY.heartScore,
  [BUILTIN_CALC.centorMcisaac]: REGISTRY.centorMcisaac,
  [BUILTIN_CALC.bishopScore]: REGISTRY.bishopScore,
  [BUILTIN_CALC.apgarScore]: REGISTRY.apgarScore,
  [BUILTIN_CALC.bradenScale]: REGISTRY.bradenScale,
  [BUILTIN_CALC.morseFallScale]: REGISTRY.morseFallScale,
  [BUILTIN_CALC.ransonCriteria]: REGISTRY.ransonCriteria,
  [BUILTIN_CALC.bisapScore]: REGISTRY.bisapScore,
  [BUILTIN_CALC.fib4]: REGISTRY.fib4,
  [BUILTIN_CALC.framinghamRisk]: REGISTRY.framinghamRisk,
  [BUILTIN_CALC.abcd2]: REGISTRY.abcd2,
  [BUILTIN_CALC.shockIndex]: REGISTRY.shockIndex,
  [BUILTIN_CALC.anionGap]: REGISTRY.anionGap,
  [BUILTIN_CALC.rass]: REGISTRY.rass,
  [BUILTIN_CALC.gfr]: REGISTRY.calcGfr,
  [BUILTIN_CALC.egfr]: REGISTRY.calcGfr,
  [BUILTIN_CALC.bmi]: REGISTRY.calcBmi,
});

/** NLU / orchestrator id → sidebar registry id (1:1 for canonical NLU ids). */
export const ORCHESTRATOR_TO_REGISTRY_ID = Object.freeze({
  [NLU.sofaCalculator]: REGISTRY.sofaScore,
  [NLU.drugInteractions]: REGISTRY.drugCheck,
  [NLU.labInterpreter]: REGISTRY.labInterp,
  [NLU.apache2Calculator]: REGISTRY.apache2Calculator,
  [NLU.cha2ds2vascCalculator]: REGISTRY.calcChads2vasc,
  [NLU.curb65Calculator]: REGISTRY.curb65Calculator,
  [NLU.gcsCalculator]: REGISTRY.gcsCalculator,
  [NLU.wellsDvtCalculator]: REGISTRY.wellsDvtCalculator,
  [NLU.wellsPe]: REGISTRY.wellsPe,
  [NLU.perc]: REGISTRY.perc,
  [NLU.graceAcs]: REGISTRY.graceAcs,
  [NLU.nihss]: REGISTRY.nihss,
  [NLU.canadianCSpine]: REGISTRY.canadianCSpine,
  [NLU.ottawaAnkle]: REGISTRY.ottawaAnkle,
  [NLU.pecarnHead]: REGISTRY.pecarnHead,
  [NLU.nexusCspine]: REGISTRY.nexusCspine,
  [NLU.abcd2]: REGISTRY.abcd2,
  [NLU.shockIndex]: REGISTRY.shockIndex,
  [NLU.anionGap]: REGISTRY.anionGap,
  [NLU.rass]: REGISTRY.rass,
  [NLU.ascvdRisk]: REGISTRY.ascvdRisk,
  [NLU.ckdStaging]: REGISTRY.ckdStaging,
  [NLU.stopBang]: REGISTRY.stopBang,
  [NLU.auditC]: REGISTRY.auditC,
  [NLU.phq9]: REGISTRY.phq9,
  [NLU.gad7]: REGISTRY.gad7,
  [NLU.heartScore]: REGISTRY.heartScore,
  [NLU.centorMcisaac]: REGISTRY.centorMcisaac,
  [NLU.bishopScore]: REGISTRY.bishopScore,
  [NLU.apgarScore]: REGISTRY.apgarScore,
  [NLU.bradenScale]: REGISTRY.bradenScale,
  [NLU.morseFallScale]: REGISTRY.morseFallScale,
  [NLU.ransonCriteria]: REGISTRY.ransonCriteria,
  [NLU.bisapScore]: REGISTRY.bisapScore,
  [NLU.fib4]: REGISTRY.fib4,
  [NLU.framinghamRisk]: REGISTRY.framinghamRisk,
  [NLU.copdGold]: REGISTRY.copdGold,
  [NLU.romeIvIbs]: REGISTRY.romeIvIbs,
  [NLU.fleetCommand]: REGISTRY.fleetCommand,
  [NLU.predictiveMaintenance]: REGISTRY.predictiveMaintenance,
  [NLU.routeOptimizer]: REGISTRY.routeOptimizer,
  [NLU.dispatchAi]: REGISTRY.dispatchAi,
  dispatch: REGISTRY.dispatchAi,
  [NLU.doseCalculator]: REGISTRY.calculatorsHub,
  [NLU.abgInterpreter]: REGISTRY.labInterp,
  [NLU.protocolLookup]: REGISTRY.protocols,
  [NLU.aclsProtocol]: REGISTRY.protocols,
  [NLU.atlsProtocol]: REGISTRY.protocols,
  [NLU.differentialDiagnosis]: REGISTRY.diagnosis,
  [NLU.differentialAi]: REGISTRY.differentialAi,
  [NLU.antibioticGuide]: REGISTRY.diagnosis,
  [NLU.calculatorRecommenderAi]: REGISTRY.calculatorRecommenderAi,
});

/**
 * NLU ids registered in tool-orchestrator.service (POST /api/tools/:id/execute).
 * Do not add ids here unless backend registerTool() exists.
 */
export const ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS = Object.freeze([
  NLU.sofaCalculator,
  NLU.drugInteractions,
  NLU.labInterpreter,
]);

/** Registry id → backend POST /api/chat/message `tool` param (registered executors only). */
export const REGISTRY_ID_TO_ORCHESTRATOR_TOOL = Object.freeze({
  [REGISTRY.drugCheck]: NLU.drugInteractions,
  [REGISTRY.labInterp]: NLU.labInterpreter,
  [REGISTRY.sofaScore]: NLU.sofaCalculator,
});

/**
 * NLU profiles with backend involvement (`backendExecutable: true` in clinicalIntentTools).
 * Includes dispatch-ai (chat/NLU only). POST /tools/:id/execute applies only to
 * `ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS` (three registerTool executors).
 */
export const AI_EXECUTABLE_NLU_TOOL_IDS = Object.freeze([
  ...ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
  NLU.dispatchAi,
]);

/**
 * Product-facing canonical ID map (registry ids unless noted).
 * Disjoint registry groups union to `ALL_REGISTRY_TOOL_IDS`; NLU-only ids are separate.
 */
export const CANONICAL_TOOL_GROUPS = Object.freeze({
  aiOperationsPages: CLINICAL_AI_PAGE_REGISTRY_IDS,
  clinicalTierCWorkflows: CLINICAL_TIER_C_WORKFLOW_REGISTRY_IDS,
  clinicalCalculatorsTierA: CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS,
  clinicalChatAssistedTierB: Object.freeze([
    ...CLINICAL_TIER_B_CHAT_REGISTRY_IDS,
    ...CLINICAL_DOSE_HUB_REGISTRY_IDS,
  ]),
  clinicalNluHubChat: CLINICAL_NLU_HUB_CHAT_REGISTRY_IDS,
  clinicalCalculatorsHub: Object.freeze([REGISTRY.calculatorsHub]),
  fleetLogisticsTierA: FLEET_TIER_A_REGISTRY_IDS,
  fleetLogisticsTierBChat: FLEET_TIER_B_CHAT_REGISTRY_IDS,
  liveTrackingMaps: LIVE_TRACKING_MAP_REGISTRY_IDS,
  medicalIotDashboards: MEDICAL_IOT_REGISTRY_IDS,
  hospitalOperations: HOSPITAL_OPERATIONS_REGISTRY_IDS,
  nluHubOnlyProfiles: NLU_HUB_ONLY_PROFILE_TOOL_IDS,
  backendExecutors: ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
});

/** Every `toolRegistry.js` id — must match registry file exactly (drift tests). */
export const ALL_REGISTRY_TOOL_IDS = Object.freeze([
  ...CANONICAL_TOOL_GROUPS.aiOperationsPages,
  ...CANONICAL_TOOL_GROUPS.clinicalTierCWorkflows,
  ...CANONICAL_TOOL_GROUPS.clinicalCalculatorsTierA,
  ...CANONICAL_TOOL_GROUPS.clinicalChatAssistedTierB,
  ...CANONICAL_TOOL_GROUPS.clinicalNluHubChat,
  ...CANONICAL_TOOL_GROUPS.clinicalCalculatorsHub,
  ...CANONICAL_TOOL_GROUPS.fleetLogisticsTierA,
  ...CANONICAL_TOOL_GROUPS.fleetLogisticsTierBChat,
  ...CANONICAL_TOOL_GROUPS.liveTrackingMaps,
  ...CANONICAL_TOOL_GROUPS.medicalIotDashboards,
  ...CANONICAL_TOOL_GROUPS.hospitalOperations,
]);

/** NLU / legacy / phrase aliases → registry id (recommendations, catalog, cost tracking). */
export const NLU_TO_REGISTRY_ID = Object.freeze({
  'drug-checker': REGISTRY.drugCheck,
  'drug-interactions': REGISTRY.drugCheck,
  'drug-interaction-checker': REGISTRY.drugCheck,
  'lab-interpreter': REGISTRY.labInterp,
  'lab-interp': REGISTRY.labInterp,
  'sofa-calculator': REGISTRY.sofaScore,
  sofa_calculator: REGISTRY.sofaScore,
  'apache2-calculator': REGISTRY.apache2Calculator,
  'cha2ds2vasc-calculator': REGISTRY.calcChads2vasc,
  'curb65-calculator': REGISTRY.curb65Calculator,
  'gcs-calculator': REGISTRY.gcsCalculator,
  'wells-dvt-calculator': REGISTRY.wellsDvtCalculator,
  'dose-calculator': REGISTRY.doseCalculator,
  'abg-interpreter': REGISTRY.abgInterpreter,
  'protocol-lookup': REGISTRY.protocols,
  'acls-protocol': REGISTRY.aclsProtocol,
  'atls-protocol': REGISTRY.atlsProtocol,
  procedures: REGISTRY.procedures,
  'differential-diagnosis': REGISTRY.diagnosis,
  'differential-ai': REGISTRY.differentialAi,
  'ranked differential': REGISTRY.differentialAi,
  'ranked differentials': REGISTRY.differentialAi,
  'differential diagnosis assistant': REGISTRY.differentialAi,
  'timeline-ai': REGISTRY.timelineAi,
  'patient timeline': REGISTRY.timelineAi,
  'timeline assistant': REGISTRY.timelineAi,
  'clinical timeline': REGISTRY.timelineAi,
  'patient-summary-ai': REGISTRY.patientSummaryAi,
  'patient summary': REGISTRY.patientSummaryAi,
  'summary assistant': REGISTRY.patientSummaryAi,
  'clinical summary': REGISTRY.patientSummaryAi,
  'order-set-ai': REGISTRY.orderSetAi,
  'order set ai': REGISTRY.orderSetAi,
  'order set assistant': REGISTRY.orderSetAi,
  'order bundles': REGISTRY.orderSetAi,
  'protocol pathways': REGISTRY.orderSetAi,
  'ai-explainability': REGISTRY.aiExplainability,
  'ai explainability': REGISTRY.aiExplainability,
  explainability: REGISTRY.aiExplainability,
  'reasoning trace': REGISTRY.aiExplainability,
  'clinical-audit': REGISTRY.clinicalAudit,
  'clinical audit': REGISTRY.clinicalAudit,
  'execution logs': REGISTRY.clinicalAudit,
  'tool chain audit': REGISTRY.clinicalAudit,
  'antibiotic-guide': REGISTRY.antibioticGuide,
  'calculator-recommender-ai': REGISTRY.calculatorRecommenderAi,
  'calculator recommender': REGISTRY.calculatorRecommenderAi,
  'calculator-recommender': REGISTRY.calculatorRecommenderAi,
  'calculator recommendation': REGISTRY.calculatorRecommenderAi,
  'calculator recommendations': REGISTRY.calculatorRecommenderAi,
  'recommend calculators': REGISTRY.calculatorRecommenderAi,
  calculator: REGISTRY.calculatorsHub,
  'diagnosis-assistant': REGISTRY.diagnosis,
  'procedure-guide': REGISTRY.procedures,
  sofa: REGISTRY.sofaScore,
  qsofa: REGISTRY.qsofa,
  'q-sofa': REGISTRY.qsofa,
  'q sofa': REGISTRY.qsofa,
  'quick-sofa': REGISTRY.qsofa,
  'quick sofa': REGISTRY.qsofa,
  'quick-sepsis-score': REGISTRY.qsofa,
  'quick sepsis score': REGISTRY.qsofa,
  'sepsis-bedside-score': REGISTRY.qsofa,
  'sepsis bedside score': REGISTRY.qsofa,
  news2: REGISTRY.news2,
  'news-2': REGISTRY.news2,
  'news 2': REGISTRY.news2,
  'national-early-warning-score': REGISTRY.news2,
  'national early warning score': REGISTRY.news2,
  'early-warning-score': REGISTRY.news2,
  'early warning score': REGISTRY.news2,
  'deterioration-score': REGISTRY.news2,
  'deterioration score': REGISTRY.news2,
  'child-pugh': REGISTRY.childPugh,
  'child pugh': REGISTRY.childPugh,
  'ctp-score': REGISTRY.childPugh,
  'ctp score': REGISTRY.childPugh,
  'cirrhosis-score': REGISTRY.childPugh,
  'cirrhosis score': REGISTRY.childPugh,
  'liver-severity-score': REGISTRY.childPugh,
  'liver severity score': REGISTRY.childPugh,
  'has-bled': REGISTRY.hasBled,
  'has bled': REGISTRY.hasBled,
  hasbled: REGISTRY.hasBled,
  'bleeding risk': REGISTRY.hasBled,
  'af-bleeding-risk': REGISTRY.hasBled,
  'af bleeding risk': REGISTRY.hasBled,
  'anticoagulation-bleeding-risk': REGISTRY.hasBled,
  'anticoagulation bleeding risk': REGISTRY.hasBled,
  gfr: REGISTRY.calcGfr,
  egfr: REGISTRY.calcGfr,
  bmi: REGISTRY.calcBmi,
  chads: REGISTRY.calcChads2vasc,
  chads2vasc: REGISTRY.calcChads2vasc,
  'antibiotic-scripts': REGISTRY.drugCheck,
  'bleeding-risk': REGISTRY.hasBled,
  'meld score': REGISTRY.meld,
  'meld-score': REGISTRY.meld,
  'liver transplant score': REGISTRY.meldNa,
  'liver-transplant-score': REGISTRY.meldNa,
  'end stage liver disease score': REGISTRY.meld,
  'end-stage-liver-disease-score': REGISTRY.meld,
  'meld na': REGISTRY.meldNa,
  'meld-sodium': REGISTRY.meldNa,
  timi: REGISTRY.timiUaNstemi,
  'timi score': REGISTRY.timiUaNstemi,
  'timi-score': REGISTRY.timiUaNstemi,
  'timi acs': REGISTRY.timiUaNstemi,
  'timi-acs': REGISTRY.timiUaNstemi,
  'timi nstemi': REGISTRY.timiUaNstemi,
  'timi-nstemi': REGISTRY.timiUaNstemi,
  'timi unstable angina': REGISTRY.timiUaNstemi,
  'timi-unstable-angina': REGISTRY.timiUaNstemi,
  'wells pe': REGISTRY.wellsPe,
  'wells-pe': REGISTRY.wellsPe,
  'wells pe score': REGISTRY.wellsPe,
  'wells-pe-score': REGISTRY.wellsPe,
  'pulmonary embolism wells': REGISTRY.wellsPe,
  'pulmonary-embolism-wells': REGISTRY.wellsPe,
  'pe score': REGISTRY.wellsPe,
  'pe-score': REGISTRY.wellsPe,
  'wells pulmonary embolism': REGISTRY.wellsPe,
  'wells-pulmonary-embolism': REGISTRY.wellsPe,
  perc: REGISTRY.perc,
  'perc rule': REGISTRY.perc,
  'perc-rule': REGISTRY.perc,
  'pulmonary embolism rule out': REGISTRY.perc,
  'pulmonary-embolism-rule-out': REGISTRY.perc,
  'pe rule out': REGISTRY.perc,
  'pe-rule-out': REGISTRY.perc,
  grace: REGISTRY.graceAcs,
  'grace score': REGISTRY.graceAcs,
  'grace-score': REGISTRY.graceAcs,
  'grace acs': REGISTRY.graceAcs,
  'grace-acs': REGISTRY.graceAcs,
  'grace acs risk': REGISTRY.graceAcs,
  'grace-acs-risk': REGISTRY.graceAcs,
  'acs mortality risk': REGISTRY.graceAcs,
  'acs-mortality-risk': REGISTRY.graceAcs,
  'acute coronary syndrome risk': REGISTRY.graceAcs,
  'acute-coronary-syndrome-risk': REGISTRY.graceAcs,
  'global registry acute coronary events': REGISTRY.graceAcs,
  nihss: REGISTRY.nihss,
  'nih stroke scale': REGISTRY.nihss,
  'nih-stroke-scale': REGISTRY.nihss,
  'national institutes of health stroke scale': REGISTRY.nihss,
  'national-institutes-of-health-stroke-scale': REGISTRY.nihss,
  'stroke scale': REGISTRY.nihss,
  'stroke-scale': REGISTRY.nihss,
  'stroke severity score': REGISTRY.nihss,
  'stroke-severity-score': REGISTRY.nihss,
  'canadian c spine': REGISTRY.canadianCSpine,
  'canadian-c-spine': REGISTRY.canadianCSpine,
  'canadian c-spine rule': REGISTRY.canadianCSpine,
  'canadian-c-spine-rule': REGISTRY.canadianCSpine,
  'c spine rule': REGISTRY.canadianCSpine,
  'c-spine-rule': REGISTRY.canadianCSpine,
  'cervical spine rule': REGISTRY.canadianCSpine,
  'cervical-spine-rule': REGISTRY.canadianCSpine,
  'neck trauma imaging rule': REGISTRY.canadianCSpine,
  'neck-trauma-imaging-rule': REGISTRY.canadianCSpine,
  'ottawa ankle': REGISTRY.ottawaAnkle,
  'ottawa-ankle': REGISTRY.ottawaAnkle,
  'ottawa ankle rule': REGISTRY.ottawaAnkle,
  'ottawa-ankle-rule': REGISTRY.ottawaAnkle,
  'ankle xray rule': REGISTRY.ottawaAnkle,
  'ankle-xray-rule': REGISTRY.ottawaAnkle,
  'ankle injury imaging': REGISTRY.ottawaAnkle,
  'ankle-injury-imaging': REGISTRY.ottawaAnkle,
  'foot xray rule': REGISTRY.ottawaAnkle,
  'foot-xray-rule': REGISTRY.ottawaAnkle,
  pecarn: REGISTRY.pecarnHead,
  'pecarn head': REGISTRY.pecarnHead,
  'pecarn-head': REGISTRY.pecarnHead,
  'pecarn head injury': REGISTRY.pecarnHead,
  'pecarn head injury rule': REGISTRY.pecarnHead,
  'pecarn-head-injury': REGISTRY.pecarnHead,
  'pediatric head ct': REGISTRY.pecarnHead,
  'pediatric-head-ct': REGISTRY.pecarnHead,
  'pediatric head injury rule': REGISTRY.pecarnHead,
  'pediatric head injury pecarn': REGISTRY.pecarnHead,
  'pediatric-head-injury-pecarn': REGISTRY.pecarnHead,
  'pediatric-head-injury-rule': REGISTRY.pecarnHead,
  'child head trauma imaging rule': REGISTRY.pecarnHead,
  'child-head-trauma-imaging-rule': REGISTRY.pecarnHead,
  'pediatric head ct rule': REGISTRY.pecarnHead,
  'pediatric-head-ct-rule': REGISTRY.pecarnHead,
  'child head trauma ct': REGISTRY.pecarnHead,
  'child-head-trauma-ct': REGISTRY.pecarnHead,
  nexus: REGISTRY.nexusCspine,
  'nexus c spine': REGISTRY.nexusCspine,
  'nexus c-spine': REGISTRY.nexusCspine,
  'nexus-c-spine': REGISTRY.nexusCspine,
  'nexus-cspine': REGISTRY.nexusCspine,
  'nexus criteria': REGISTRY.nexusCspine,
  'nexus-criteria': REGISTRY.nexusCspine,
  'nexus cervical spine': REGISTRY.nexusCspine,
  'nexus-cervical-spine': REGISTRY.nexusCspine,
  'c spine nexus': REGISTRY.nexusCspine,
  'c-spine-nexus': REGISTRY.nexusCspine,
  'nexus c-spine rule': REGISTRY.nexusCspine,
  'nexus-c-spine-rule': REGISTRY.nexusCspine,
  'cervical spine nexus': REGISTRY.nexusCspine,
  'cervical-spine-nexus': REGISTRY.nexusCspine,
  abcd2: REGISTRY.abcd2,
  'abcd²': REGISTRY.abcd2,
  'abcd squared': REGISTRY.abcd2,
  'abcd-squared': REGISTRY.abcd2,
  'abcd2 score': REGISTRY.abcd2,
  'abcd2-score': REGISTRY.abcd2,
  'abcd score': REGISTRY.abcd2,
  'abcd-score': REGISTRY.abcd2,
  tia: REGISTRY.abcd2,
  'tia risk': REGISTRY.abcd2,
  'tia-risk': REGISTRY.abcd2,
  'tia stroke risk': REGISTRY.abcd2,
  'tia-stroke-risk': REGISTRY.abcd2,
  'shock-index': REGISTRY.shockIndex,
  'shock index': REGISTRY.shockIndex,
  'shock index calculator': REGISTRY.shockIndex,
  'hemodynamic index': REGISTRY.shockIndex,
  'anion-gap': REGISTRY.anionGap,
  'anion gap': REGISTRY.anionGap,
  'anion gap calculator': REGISTRY.anionGap,
  'albumin corrected anion gap': REGISTRY.anionGap,
  'rass': REGISTRY.rass,
  'rass score': REGISTRY.rass,
  'richmond agitation sedation scale': REGISTRY.rass,
  'sedation agitation score': REGISTRY.rass,
  ascvd: REGISTRY.ascvdRisk,
  'ascvd-score': REGISTRY.ascvdRisk,
  'cardiovascular risk': REGISTRY.ascvdRisk,
  'cardiovascular-risk': REGISTRY.ascvdRisk,
  'heart disease risk': REGISTRY.ascvdRisk,
  'heart-disease-risk': REGISTRY.ascvdRisk,
  'cv risk': REGISTRY.ascvdRisk,
  'cv-risk': REGISTRY.ascvdRisk,
  'ascvd score': REGISTRY.ascvdRisk,
  'ascvd-risk': REGISTRY.ascvdRisk,
  'pooled cohort': REGISTRY.ascvdRisk,
  'pooled cohort equations': REGISTRY.ascvdRisk,
  '10 year ascvd': REGISTRY.ascvdRisk,
  '10-year ascvd': REGISTRY.ascvdRisk,
  'ckd stage': REGISTRY.ckdStaging,
  'ckd-stage': REGISTRY.ckdStaging,
  'kidney stage': REGISTRY.ckdStaging,
  'kidney-stage': REGISTRY.ckdStaging,
  'kidney disease staging': REGISTRY.ckdStaging,
  'kidney-disease-staging': REGISTRY.ckdStaging,
  'gfr stage': REGISTRY.ckdStaging,
  'gfr-stage': REGISTRY.ckdStaging,
  'albuminuria stage': REGISTRY.ckdStaging,
  'albuminuria-stage': REGISTRY.ckdStaging,
  'ckd-staging': REGISTRY.ckdStaging,
  'stop bang': REGISTRY.stopBang,
  'stop-bang': REGISTRY.stopBang,
  'sleep apnea score': REGISTRY.stopBang,
  'sleep-apnea-score': REGISTRY.stopBang,
  'osa risk': REGISTRY.stopBang,
  'osa-risk': REGISTRY.stopBang,
  'sleep risk score': REGISTRY.stopBang,
  'sleep-risk-score': REGISTRY.stopBang,
  'audit c': REGISTRY.auditC,
  'audit-c': REGISTRY.auditC,
  'alcohol screen': REGISTRY.auditC,
  'alcohol-screen': REGISTRY.auditC,
  'alcohol use screen': REGISTRY.auditC,
  'alcohol-use-screen': REGISTRY.auditC,
  'drinking screen': REGISTRY.auditC,
  'drinking-screen': REGISTRY.auditC,
  phq9: REGISTRY.phq9,
  'phq-9': REGISTRY.phq9,
  'depression screen': REGISTRY.phq9,
  'depression-screen': REGISTRY.phq9,
  'depression questionnaire': REGISTRY.phq9,
  'depression-questionnaire': REGISTRY.phq9,
  'mood screen': REGISTRY.phq9,
  'mood-screen': REGISTRY.phq9,
  gad7: REGISTRY.gad7,
  'gad-7': REGISTRY.gad7,
  'anxiety screen': REGISTRY.gad7,
  'anxiety-screen': REGISTRY.gad7,
  'anxiety questionnaire': REGISTRY.gad7,
  'anxiety-questionnaire': REGISTRY.gad7,
  'generalized anxiety screen': REGISTRY.gad7,
  'generalized-anxiety-screen': REGISTRY.gad7,
  'heart score': REGISTRY.heartScore,
  'heart-score': REGISTRY.heartScore,
  heart: REGISTRY.heartScore,
  'chest pain score': REGISTRY.heartScore,
  'chest-pain-score': REGISTRY.heartScore,
  centor: REGISTRY.centorMcisaac,
  mcisaac: REGISTRY.centorMcisaac,
  'centor score': REGISTRY.centorMcisaac,
  'centor-score': REGISTRY.centorMcisaac,
  'mcisaac score': REGISTRY.centorMcisaac,
  'mcisaac-score': REGISTRY.centorMcisaac,
  'strep pharyngitis score': REGISTRY.centorMcisaac,
  'strep-pharyngitis-score': REGISTRY.centorMcisaac,
  'centor-mcisaac': REGISTRY.centorMcisaac,
  bishop: REGISTRY.bishopScore,
  'bishop score': REGISTRY.bishopScore,
  'bishop-score': REGISTRY.bishopScore,
  'cervical favorability': REGISTRY.bishopScore,
  'cervical-favorability': REGISTRY.bishopScore,
  apgar: REGISTRY.apgarScore,
  'apgar score': REGISTRY.apgarScore,
  'apgar-score': REGISTRY.apgarScore,
  braden: REGISTRY.bradenScale,
  'braden scale': REGISTRY.bradenScale,
  'braden-scale': REGISTRY.bradenScale,
  'pressure injury risk': REGISTRY.bradenScale,
  'pressure-injury-risk': REGISTRY.bradenScale,
  morse: REGISTRY.morseFallScale,
  'morse fall': REGISTRY.morseFallScale,
  'morse-fall': REGISTRY.morseFallScale,
  'morse fall scale': REGISTRY.morseFallScale,
  'morse-fall-scale': REGISTRY.morseFallScale,
  'fall risk score': REGISTRY.morseFallScale,
  'fall-risk-score': REGISTRY.morseFallScale,
  ranson: REGISTRY.ransonCriteria,
  'ranson criteria': REGISTRY.ransonCriteria,
  'ranson-criteria': REGISTRY.ransonCriteria,
  'pancreatitis severity ranson': REGISTRY.ransonCriteria,
  bisap: REGISTRY.bisapScore,
  'bisap score': REGISTRY.bisapScore,
  'bisap-score': REGISTRY.bisapScore,
  'pancreatitis bisap': REGISTRY.bisapScore,
  fib4: REGISTRY.fib4,
  'fib-4': REGISTRY.fib4,
  'liver fibrosis index': REGISTRY.fib4,
  'liver-fibrosis-index': REGISTRY.fib4,
  framingham: REGISTRY.framinghamRisk,
  'framingham risk': REGISTRY.framinghamRisk,
  'framingham-risk': REGISTRY.framinghamRisk,
  'framingham score': REGISTRY.framinghamRisk,
  'framingham-score': REGISTRY.framinghamRisk,
  'hard chd risk': REGISTRY.framinghamRisk,
  'hard-chd-risk': REGISTRY.framinghamRisk,
  'copd-gold': REGISTRY.copdGold,
  'gold copd': REGISTRY.copdGold,
  'gold-copd': REGISTRY.copdGold,
  'copd assessment': REGISTRY.copdGold,
  'copd-assessment': REGISTRY.copdGold,
  'copd risk': REGISTRY.copdGold,
  'copd-risk': REGISTRY.copdGold,
  'gold classification': REGISTRY.copdGold,
  'gold-classification': REGISTRY.copdGold,
  'rome-iv-ibs': REGISTRY.romeIvIbs,
  'rome iv': REGISTRY.romeIvIbs,
  'rome-iv': REGISTRY.romeIvIbs,
  'ibs criteria': REGISTRY.romeIvIbs,
  'ibs-criteria': REGISTRY.romeIvIbs,
  'irritable bowel syndrome criteria': REGISTRY.romeIvIbs,
  'irritable-bowel-syndrome-criteria': REGISTRY.romeIvIbs,
  'fleet command': REGISTRY.fleetCommand,
  'fleet dashboard': REGISTRY.fleetCommand,
  'fleet overview': REGISTRY.fleetCommand,
  'fleet-command': REGISTRY.fleetCommand,
  'fleet-dashboard': REGISTRY.fleetCommand,
  'fleet-overview': REGISTRY.fleetCommand,
  'predictive maintenance': REGISTRY.predictiveMaintenance,
  'predictive-maintenance': REGISTRY.predictiveMaintenance,
  'maintenance assistant': REGISTRY.predictiveMaintenance,
  'maintenance-assistant': REGISTRY.predictiveMaintenance,
  'fleet maintenance risk': REGISTRY.predictiveMaintenance,
  'fleet-maintenance-risk': REGISTRY.predictiveMaintenance,
  'route optimizer': REGISTRY.routeOptimizer,
  'route-optimizer': REGISTRY.routeOptimizer,
  'route optimization': REGISTRY.routeOptimizer,
  'route-optimization': REGISTRY.routeOptimizer,
  'fleet route planner': REGISTRY.routeOptimizer,
  'fleet-route-planner': REGISTRY.routeOptimizer,
  'live tracking': REGISTRY.liveTrackingMap,
  'live-tracking': REGISTRY.liveTrackingMap,
  'live tracking map': REGISTRY.liveTrackingMap,
  'live-tracking-map': REGISTRY.liveTrackingMap,
  'tracking map': REGISTRY.liveTrackingMap,
  'tracking-map': REGISTRY.liveTrackingMap,
  'fleet map': REGISTRY.fleetLiveMap,
  'fleet-map': REGISTRY.fleetLiveMap,
  'fleet live map': REGISTRY.fleetLiveMap,
  'fleet-live-map': REGISTRY.fleetLiveMap,
  'vehicle tracking': REGISTRY.fleetLiveMap,
  'vehicle-tracking': REGISTRY.fleetLiveMap,
  dispatch: REGISTRY.dispatchAi,
  'dispatch assistant': REGISTRY.dispatchAi,
  'dispatch-assistant': REGISTRY.dispatchAi,
  'dispatch-ai': REGISTRY.dispatchAi,
  'vehicle dispatch': REGISTRY.dispatchAi,
  'vehicle-dispatch': REGISTRY.dispatchAi,
  'fleet dispatch': REGISTRY.dispatchAi,
  'fleet-dispatch': REGISTRY.dispatchAi,
  'dispatch intelligence': REGISTRY.dispatchAi,
  'dispatch-intelligence': REGISTRY.dispatchAi,
  'medical-iot': REGISTRY.medicalIotDashboard,
  'medical-iot-dashboard': REGISTRY.medicalIotDashboard,
  'device monitoring': REGISTRY.medicalIotDashboard,
  'device-monitoring': REGISTRY.medicalIotDashboard,
  'connected devices': REGISTRY.medicalIotDashboard,
  'connected-devices': REGISTRY.medicalIotDashboard,
  'patient telemetry': REGISTRY.medicalIotDashboard,
  'patient-telemetry': REGISTRY.medicalIotDashboard,
  'vitals monitor': REGISTRY.medicalIotDashboard,
  'vitals-monitor': REGISTRY.medicalIotDashboard,
  'hospital map': REGISTRY.hospitalMap,
  'hospital-map': REGISTRY.hospitalMap,
  'floor plan': REGISTRY.hospitalMap,
  'floor-plan': REGISTRY.hospitalMap,
  'bed map': REGISTRY.hospitalMap,
  'bed-map': REGISTRY.hospitalMap,
  'beds with alerts': REGISTRY.hospitalMap,
  'beds-with-alerts': REGISTRY.hospitalMap,
  'device fleet': REGISTRY.deviceFleetManagement,
  'device-fleet': REGISTRY.deviceFleetManagement,
  'device fleet management': REGISTRY.deviceFleetManagement,
  'device-fleet-management': REGISTRY.deviceFleetManagement,
  'medical device inventory': REGISTRY.deviceFleetManagement,
  'medical-device-inventory': REGISTRY.deviceFleetManagement,
  'telemetry monitoring': REGISTRY.telemetryMonitoring,
  'telemetry-monitoring': REGISTRY.telemetryMonitoring,
  'telemetry gaps': REGISTRY.telemetryMonitoring,
  'telemetry-gaps': REGISTRY.telemetryMonitoring,
  'offline devices': REGISTRY.telemetryMonitoring,
  'offline-devices': REGISTRY.telemetryMonitoring,
  'low battery devices': REGISTRY.telemetryMonitoring,
  'low-battery-devices': REGISTRY.telemetryMonitoring,
  'device maintenance': REGISTRY.deviceMaintenance,
  'device-maintenance': REGISTRY.deviceMaintenance,
  'maintenance overdue': REGISTRY.deviceMaintenance,
  'maintenance-overdue': REGISTRY.deviceMaintenance,
  'calibration overdue': REGISTRY.deviceMaintenance,
  'calibration-overdue': REGISTRY.deviceMaintenance,
  'hospital operations command': REGISTRY.hospitalOperationsCommand,
  'hospital-operations-command': REGISTRY.hospitalOperationsCommand,
  'hospital operations': REGISTRY.hospitalOperationsCommand,
  'hospital-operations': REGISTRY.hospitalOperationsCommand,
});

/** Values every NLU_TO_REGISTRY_ID target must resolve to (registry id or hub). */
export function registryIdsReferencedByAliases() {
  return [...new Set(Object.values(NLU_TO_REGISTRY_ID))];
}

/** All canonical registry id strings (`REGISTRY` values). */
export function registryIdValues() {
  return [...new Set(Object.values(REGISTRY))];
}

/** All canonical NLU profile id strings (`NLU` values). */
export function nluToolIdValues() {
  return [...new Set(Object.values(NLU))];
}

/**
 * Primary NLU tool id for a registry id when one exists in `ORCHESTRATOR_TO_REGISTRY_ID`.
 * @param {string} registryId
 * @returns {string|null}
 */
export function registryToPrimaryNluToolId(registryId) {
  if (!registryId) return null;
  if (nluToolIdValues().includes(registryId)) return registryId;
  if (registryId === REGISTRY.calculatorsHub) return REGISTRY.calculatorsHub;
  for (const [nluId, regId] of Object.entries(ORCHESTRATOR_TO_REGISTRY_ID)) {
    if (nluId === 'dispatch') continue;
    if (regId === registryId) return nluId;
  }
  return null;
}

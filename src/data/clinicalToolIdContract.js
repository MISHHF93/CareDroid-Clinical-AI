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
export const TOOL_ID_CONTRACT_VERSION = '1.1.0';

/** Shared SPA paths for tool launch (browser-safe). */
export const TOOL_LAUNCH_PATHS = Object.freeze({
  toolsOverview: '/tools',
  toolsCatalog: '/tools/catalog',
  calculatorsHub: '/tools/calculators',
  fleetCommand: '/fleet/command',
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
  wellsPe: 'wells-pe',
  perc: 'perc',
  graceAcs: 'grace-acs',
  copdGold: 'copd-gold',
  romeIvIbs: 'rome-iv-ibs',
  nihss: 'nihss',
  canadianCSpine: 'canadian-c-spine',
  ottawaAnkle: 'ottawa-ankle',
  calculatorsHub: 'calculators',
  apache2Calculator: 'apache2-calculator',
  curb65Calculator: 'curb65-calculator',
  gcsCalculator: 'gcs-calculator',
  wellsDvtCalculator: 'wells-dvt-calculator',
  protocols: 'protocols',
  diagnosis: 'diagnosis',
  procedures: 'procedures',
  dispatchAi: 'dispatch-ai',
  routeOptimizer: 'route-optimizer',
  predictiveMaintenance: 'predictive-maintenance',
  fleetCommand: 'fleet-command',
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
  antibioticGuide: 'antibiotic-guide',
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

/** All Tier-A calculator registry ids (dedicated routes + forms when shipped). */
export const CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS = Object.freeze([
  ...LEGACY_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...PR1_CALCULATOR_REGISTRY_IDS,
  ...PR2_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...PR4A_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...PR5_TIER_A_CALCULATOR_REGISTRY_IDS,
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

export const CLINICAL_TIER_B_CHAT_REGISTRY_IDS = Object.freeze([
  ...PR2_TIER_B_CHAT_CALCULATOR_IDS,
  ...PR3_TIER_B_CHAT_CALCULATOR_IDS,
  ...PR6_TIER_B_CHAT_CALCULATOR_IDS,
  ...PR7_TIER_B_CHAT_CALCULATOR_IDS,
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

// —— Clinical AI operations pages (non-calculator tools) ——

export const CLINICAL_AI_PAGE_REGISTRY_IDS = Object.freeze([
  REGISTRY.drugCheck,
  REGISTRY.labInterp,
  REGISTRY.protocols,
  REGISTRY.diagnosis,
  REGISTRY.procedures,
]);

/**
 * Registry tools with NLU/chat coverage via backend keywords but no `clinicalIntentTools` row
 * (e.g. legacy eGFR/BMI/SOFA keyword routing).
 */
export const KEYWORD_ROUTED_REGISTRY_IDS = Object.freeze([
  REGISTRY.calcGfr,
  REGISTRY.calcBmi,
]);

/**
 * NLU profiles that route to the calculators hub only (no dedicated `Calculators.jsx` form).
 * Tier-B chat-assisted tools have registry rows; these are NLU-only until promoted.
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
  NLU.antibioticGuide,
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
  [NLU.ascvdRisk]: REGISTRY.ascvdRisk,
  [NLU.ckdStaging]: REGISTRY.ckdStaging,
  [NLU.stopBang]: REGISTRY.stopBang,
  [NLU.auditC]: REGISTRY.auditC,
  [NLU.phq9]: REGISTRY.phq9,
  [NLU.gad7]: REGISTRY.gad7,
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
  [NLU.antibioticGuide]: REGISTRY.diagnosis,
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
  clinicalCalculatorsTierA: CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS,
  clinicalChatAssistedTierB: CLINICAL_TIER_B_CHAT_REGISTRY_IDS,
  clinicalNluHubChat: CLINICAL_NLU_HUB_CHAT_REGISTRY_IDS,
  clinicalCalculatorsHub: Object.freeze([REGISTRY.calculatorsHub]),
  fleetLogisticsTierA: FLEET_TIER_A_REGISTRY_IDS,
  fleetLogisticsTierBChat: FLEET_TIER_B_CHAT_REGISTRY_IDS,
  nluHubOnlyProfiles: NLU_HUB_ONLY_PROFILE_TOOL_IDS,
  backendExecutors: ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
});

/** Every `toolRegistry.js` id — must match registry file exactly (drift tests). */
export const ALL_REGISTRY_TOOL_IDS = Object.freeze([
  ...CANONICAL_TOOL_GROUPS.aiOperationsPages,
  ...CANONICAL_TOOL_GROUPS.clinicalCalculatorsTierA,
  ...CANONICAL_TOOL_GROUPS.clinicalChatAssistedTierB,
  ...CANONICAL_TOOL_GROUPS.clinicalNluHubChat,
  ...CANONICAL_TOOL_GROUPS.clinicalCalculatorsHub,
  ...CANONICAL_TOOL_GROUPS.fleetLogisticsTierA,
  ...CANONICAL_TOOL_GROUPS.fleetLogisticsTierBChat,
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
  'dose-calculator': REGISTRY.calculatorsHub,
  'abg-interpreter': REGISTRY.labInterp,
  'protocol-lookup': REGISTRY.protocols,
  'acls-protocol': REGISTRY.protocols,
  'atls-protocol': REGISTRY.protocols,
  'differential-diagnosis': REGISTRY.diagnosis,
  'antibiotic-guide': REGISTRY.diagnosis,
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

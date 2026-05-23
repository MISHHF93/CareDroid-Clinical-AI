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
  FLEET_TIER_B_CHAT_REGISTRY_IDS,
  REGISTRY,
} from './clinicalToolIdContract.js';
import { MOBILE_FIRST_BREAKPOINTS } from '../layout/breakpoints.js';

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

/** @deprecated Use MOBILE_FIRST_VIEWPORT_WIDTHS — kept for regression imports */
export const ANDROID_QA_VIEWPORT_WIDTHS = MOBILE_FIRST_VIEWPORT_WIDTHS;

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

/** Dedicated routes for Tier A calculators (must match App.jsx). */
export const TIER_A_CALCULATOR_PATH_BY_REGISTRY_ID = Object.freeze({
  [REGISTRY.sofaScore]: '/tools/calculator/sofa',
  [REGISTRY.calcGfr]: '/tools/calculator/gfr',
  [REGISTRY.calcBmi]: '/tools/calculator/bmi',
  [REGISTRY.calcChads2vasc]: '/tools/calculator/chads2vasc',
  [REGISTRY.qsofa]: '/tools/calculators/qsofa',
  [REGISTRY.news2]: '/tools/calculators/news2',
  [REGISTRY.childPugh]: '/tools/calculators/child-pugh',
  [REGISTRY.hasBled]: '/tools/calculators/has-bled',
  [REGISTRY.meld]: '/tools/calculators/meld',
  [REGISTRY.meldNa]: '/tools/calculators/meld-na',
  [REGISTRY.timiUaNstemi]: '/tools/calculators/timi-ua-nstemi',
  [REGISTRY.ascvdRisk]: '/tools/calculators/ascvd-risk',
  [REGISTRY.heartScore]: '/tools/calculators/heart-score',
  [REGISTRY.centorMcisaac]: '/tools/calculators/centor-mcisaac',
  [REGISTRY.bishopScore]: '/tools/calculators/bishop-score',
  [REGISTRY.apgarScore]: '/tools/calculators/apgar-score',
  [REGISTRY.bradenScale]: '/tools/calculators/braden-scale',
  [REGISTRY.morseFallScale]: '/tools/calculators/morse-fall-scale',
  [REGISTRY.ransonCriteria]: '/tools/calculators/ranson-criteria',
  [REGISTRY.bisapScore]: '/tools/calculators/bisap-score',
  [REGISTRY.fib4]: '/tools/calculators/fib4',
  [REGISTRY.framinghamRisk]: '/tools/calculators/framingham-risk',
  [REGISTRY.ckdStaging]: '/tools/calculators/ckd-staging',
  [REGISTRY.stopBang]: '/tools/calculators/stop-bang',
  [REGISTRY.auditC]: '/tools/calculators/audit-c',
  [REGISTRY.phq9]: '/tools/calculators/phq9',
  [REGISTRY.gad7]: '/tools/calculators/gad7',
  [REGISTRY.abcd2]: '/tools/calculators/abcd2',
  [REGISTRY.shockIndex]: '/tools/calculators/shock-index',
  [REGISTRY.anionGap]: '/tools/calculators/anion-gap',
  [REGISTRY.rass]: '/tools/calculators/rass',
});

const TIER_B_LAUNCH_PATH = '/tools/calculators';

const CLINICAL_AI_PAGE_PATH_BY_REGISTRY_ID = Object.freeze({
  [REGISTRY.drugCheck]: '/tools/drug-checker',
  [REGISTRY.labInterp]: '/tools/lab-interpreter',
  [REGISTRY.abgInterpreter]: '/tools/lab-interpreter',
  [REGISTRY.protocols]: '/tools/protocols',
  [REGISTRY.aclsProtocol]: '/tools/protocols',
  [REGISTRY.atlsProtocol]: '/tools/protocols',
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
  [REGISTRY.dispatchAi]: 'Dispatch Intelligence Assistant',
});

const FLEET_PAGES = Object.freeze([
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
      label: 'Pulse',
      path: '/dashboard',
      category: 'core',
    },
    {
      id: 'chat',
      label: 'Chat',
      path: '/chat',
      category: 'core',
    },
    {
      id: 'tools-overview',
      label: 'Tools',
      path: '/tools',
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
  ];

  for (const registryId of CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS) {
    const path = TIER_A_CALCULATOR_PATH_BY_REGISTRY_ID[registryId];
    if (!path) {
      throw new Error(`responsiveQaMatrix: missing Tier A path for ${registryId}`);
    }
    pages.push({
      id: `tier-a-${registryId}`,
      label: `Tier A: ${registryId}`,
      path,
      category: 'tier-a',
      registryId,
    });
  }

  for (const registryId of [
    ...CLINICAL_TIER_B_CHAT_REGISTRY_IDS,
    ...FLEET_TIER_B_CHAT_REGISTRY_IDS,
  ]) {
    pages.push({
      id: `tier-b-${registryId}`,
      label: `Tier B launch: ${TIER_B_LABEL_BY_REGISTRY_ID[registryId] || registryId}`,
      path: TIER_B_LAUNCH_PATH,
      category: 'tier-b',
      registryId,
    });
  }

  for (const registryId of CLINICAL_AI_PAGE_REGISTRY_IDS) {
    const path = CLINICAL_AI_PAGE_PATH_BY_REGISTRY_ID[registryId];
    if (!path) {
      throw new Error(`responsiveQaMatrix: missing clinical AI page path for ${registryId}`);
    }
    pages.push({
      id: `clinical-page-${registryId}`,
      label: `Clinical page: ${registryId}`,
      path,
      category: 'clinical-page',
      registryId,
    });
  }

  for (const registryId of CLINICAL_TIER_C_WORKFLOW_REGISTRY_IDS) {
    const path = TIER_C_PAGE_PATH_BY_REGISTRY_ID[registryId];
    if (!path) {
      throw new Error(`responsiveQaMatrix: missing Tier C path for ${registryId}`);
    }
    pages.push({
      id: `tier-c-${registryId}`,
      label: `Tier C: ${registryId}`,
      path,
      category: 'tier-c',
      registryId,
    });
  }

  pages.push(...FLEET_PAGES);

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
    `Generated from \`src/data/responsiveQaMatrix.js\`. Total cells: **${countResponsiveQaCells()}** (${RESPONSIVE_QA_PAGES.length} pages × ${RESPONSIVE_QA_VIEWPORTS.length} viewports × ${RESPONSIVE_QA_BROWSER_PROJECTS.length} browsers).`,
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
    '## Pages',
    '',
    '| ID | Category | Path | Label |',
    '| --- | --- | --- | --- |',
    ...RESPONSIVE_QA_PAGES.map(
      (p) => `| ${p.id} | ${p.category} | \`${p.path}\` | ${p.label} |`
    ),
    '',
    '## Rules',
    '',
    '- No horizontal scroll on `document` except inside designated data-table wrappers (`.catalog-table-wrap`, `.fleet-data-table-wrap`, `.logs-table-container`, `.tool-card-table-wrap`, `.cost-chart`).',
    '- Small-screen failures are blocking.',
    '',
  ];
  return lines.join('\n');
}

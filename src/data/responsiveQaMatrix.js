/**
 * Responsive QA matrix — pages, viewports, and browsers for Playwright runs.
 * Paths are static so Node/Playwright can import without Vite resolution.
 * @see e2e/responsive-qa.spec.mjs
 * @see scripts/run-responsive-qa.mjs
 */

import {
  CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS,
  CLINICAL_TIER_B_CHAT_REGISTRY_IDS,
  REGISTRY,
} from './clinicalToolIdContract.js';

/** @typedef {{ id: string, width: number, height: number, label: string }} ResponsiveQaViewport */
/** @typedef {{ id: string, label: string, path: string, category: string, registryId?: string }} ResponsiveQaPage */

export const RESPONSIVE_QA_VIEWPORTS = Object.freeze([
  { id: '320x568', width: 320, height: 568, label: 'iPhone SE' },
  { id: '375x667', width: 375, height: 667, label: 'iPhone 8' },
  { id: '390x844', width: 390, height: 844, label: 'iPhone 14' },
  { id: '414x896', width: 414, height: 896, label: 'iPhone 11 Pro Max' },
  { id: '768x1024', width: 768, height: 1024, label: 'iPad portrait' },
  { id: '1024x768', width: 1024, height: 768, label: 'iPad landscape' },
  { id: '1280x720', width: 1280, height: 720, label: 'HD laptop' },
  { id: '1440x900', width: 1440, height: 900, label: 'MacBook Air' },
  { id: '1920x1080', width: 1920, height: 1080, label: 'Full HD' },
]);

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
  [REGISTRY.ckdStaging]: '/tools/calculators/ckd-staging',
  [REGISTRY.stopBang]: '/tools/calculators/stop-bang',
  [REGISTRY.auditC]: '/tools/calculators/audit-c',
  [REGISTRY.phq9]: '/tools/calculators/phq9',
  [REGISTRY.gad7]: '/tools/calculators/gad7',
});

const TIER_B_LAUNCH_PATH = '/tools/calculators';

const TIER_B_LABEL_BY_REGISTRY_ID = Object.freeze({
  [REGISTRY.wellsPe]: 'Wells PE',
  [REGISTRY.perc]: 'PERC',
  [REGISTRY.graceAcs]: 'GRACE ACS',
  [REGISTRY.nihss]: 'NIHSS',
  [REGISTRY.canadianCSpine]: 'Canadian C-Spine',
  [REGISTRY.ottawaAnkle]: 'Ottawa Ankle',
  [REGISTRY.copdGold]: 'COPD GOLD',
  [REGISTRY.romeIvIbs]: 'Rome IV IBS',
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
      label: 'Home / Dashboard',
      path: '/dashboard',
      category: 'core',
    },
    {
      id: 'tools-catalog',
      label: 'Clinical tool catalog',
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

  for (const registryId of CLINICAL_TIER_B_CHAT_REGISTRY_IDS) {
    pages.push({
      id: `tier-b-${registryId}`,
      label: `Tier B launch: ${TIER_B_LABEL_BY_REGISTRY_ID[registryId] || registryId}`,
      path: TIER_B_LAUNCH_PATH,
      category: 'tier-b',
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
    '- No horizontal scroll on `document` except inside designated data-table wrappers (`.catalog-table-wrap`).',
    '- Small-screen failures are blocking.',
    '',
  ];
  return lines.join('\n');
}

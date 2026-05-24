/**
 * Realistic Android device profiles for Playwright QA (CSS viewport pixels).
 * @see docs/qa/ANDROID_QA_MATRIX.md
 * @see e2e/android-device-qa.spec.mjs
 */

import { RESPONSIVE_QA_PAGES } from './responsiveQaMatrix.js';
import { REGISTRY } from './clinicalToolIdContract.js';

/** @typedef {{ width: number, height: number }} ViewportSize */
/** @typedef {{
 *   id: string,
 *   label: string,
 *   family: string,
 *   portrait: ViewportSize,
 *   landscape: ViewportSize,
 * }} AndroidQaDevice */

/** @type {readonly AndroidQaDevice[]} */
export const ANDROID_QA_DEVICES = Object.freeze([
  {
    id: 'pixel-7',
    label: 'Google Pixel 7',
    family: 'google',
    portrait: { width: 412, height: 915 },
    landscape: { width: 915, height: 412 },
  },
  {
    id: 'pixel-7-pro',
    label: 'Google Pixel 7 Pro',
    family: 'google',
    portrait: { width: 412, height: 892 },
    landscape: { width: 892, height: 412 },
  },
  {
    id: 'samsung-galaxy-s',
    label: 'Samsung Galaxy S (S24 class)',
    family: 'samsung',
    portrait: { width: 360, height: 780 },
    landscape: { width: 780, height: 360 },
  },
  {
    id: 'samsung-galaxy-a',
    label: 'Samsung Galaxy A (A54 class)',
    family: 'samsung',
    portrait: { width: 384, height: 854 },
    landscape: { width: 854, height: 384 },
  },
  {
    id: 'oneplus',
    label: 'OnePlus (11 class)',
    family: 'oneplus',
    portrait: { width: 412, height: 919 },
    landscape: { width: 919, height: 412 },
  },
  {
    id: 'motorola',
    label: 'Motorola Edge class',
    family: 'motorola',
    portrait: { width: 393, height: 873 },
    landscape: { width: 873, height: 393 },
  },
  {
    id: 'tablet',
    label: 'Android tablet (10" class)',
    family: 'tablet',
    portrait: { width: 800, height: 1280 },
    landscape: { width: 1280, height: 800 },
  },
]);

/** Core routes exercised on every device × orientation. */
export const ANDROID_QA_ROUTE_PAGES = Object.freeze(
  RESPONSIVE_QA_PAGES.filter((p) =>
    [
      'dashboard',
      'tools-catalog',
      'calculators-hub',
      'tier-a-has-bled',
      'tier-a-qsofa',
      'tier-a-sofaScore',
      'tier-b-wells-pe',
    ].includes(p.id)
  )
);

export const ANDROID_QA_CALCULATOR_PATHS = Object.freeze([
  '/tools/calculators/has-bled',
  '/tools/calculators/qsofa',
  '/tools/calculators/sofa',
]);

export const ANDROID_QA_INTERACTION_DEVICE_IDS = Object.freeze([
  'pixel-7',
  'samsung-galaxy-a',
  'tablet',
]);

export const ANDROID_QA_TOUCH_TARGET_MIN_PX = 44;

export const ANDROID_QA_SCENARIOS = Object.freeze([
  { id: 'routes', label: 'Routes render without overflow', category: 'routes' },
  { id: 'calculators', label: 'Calculator forms + reset visible', category: 'calculators' },
  { id: 'catalog', label: 'Catalog search, chips, launch', category: 'catalog' },
  { id: 'sidebar', label: 'Drawer open/close + backdrop', category: 'sidebar' },
  { id: 'backend', label: 'Stubbed API calls succeed', category: 'backend' },
  { id: 'landscape', label: 'Landscape orientation layout', category: 'landscape' },
  { id: 'touch', label: 'Touch targets ≥44px', category: 'touch' },
]);

/**
 * @param {'portrait'|'landscape'} orientation
 */
export function viewportForDevice(device, orientation = 'portrait') {
  return orientation === 'landscape' ? device.landscape : device.portrait;
}

export function countAndroidQaOverflowCells() {
  return ANDROID_QA_DEVICES.length * 2 * ANDROID_QA_ROUTE_PAGES.length;
}

export function formatAndroidQaMatrixMarkdown() {
  const lines = [
    '# Android device QA matrix',
    '',
    `**Generated from:** \`src/data/androidDeviceQaMatrix.js\``,
    '',
    '## Devices',
    '',
    '| ID | Device | Portrait | Landscape |',
    '| --- | --- | --- | --- |',
    ...ANDROID_QA_DEVICES.map(
      (d) =>
        `| ${d.id} | ${d.label} | ${d.portrait.width}×${d.portrait.height} | ${d.landscape.width}×${d.landscape.height} |`
    ),
    '',
    '## Scenarios',
    '',
    '| ID | Category | Description |',
    '| --- | --- | --- |',
    ...ANDROID_QA_SCENARIOS.map((s) => `| ${s.id} | ${s.category} | ${s.label} |`),
    '',
    '## Route pages (overflow grid)',
    '',
    '| Page ID | Path |',
    '| --- | --- |',
    ...ANDROID_QA_ROUTE_PAGES.map((p) => `| ${p.id} | \`${p.path}\` |`),
    '',
    `**Overflow cells:** ${countAndroidQaOverflowCells()} (devices × portrait/landscape × routes)`,
    '',
    '**Interaction smoke:** Pixel 7, Galaxy A, Tablet — sidebar, catalog, calculators, backend, touch.',
    '',
    '## Run',
    '',
    '```bash',
    'npm run qa:android',
    'npm run test:e2e:android',
    '```',
    '',
    '## Registry spot-check',
    '',
    `- HAS-BLED registry: \`${REGISTRY.hasBled}\``,
    `- Catalog: \`/tools/catalog\``,
    '',
  ];
  return lines.join('\n');
}

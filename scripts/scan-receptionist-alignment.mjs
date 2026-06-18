/**
 * Static + live alignment scan for Receptionist-Only Layout Consolidation.
 * Run: node scripts/scan-receptionist-alignment.mjs
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'qa', 'screenshots', 'reception-audit');
const reportPath = join(root, 'qa', 'receptionist-alignment-report.json');

const files = {
  header: readFileSync(join(root, 'src/components/Header.tsx'), 'utf8'),
  sidebar: readFileSync(join(root, 'src/components/Sidebar.tsx'), 'utf8'),
  appShell: readFileSync(join(root, 'src/components/AppShell.tsx'), 'utf8'),
  reception: readFileSync(join(root, 'src/pages/emergency/ReceptionWorkspace.jsx'), 'utf8'),
  rolePerms: readFileSync(join(root, 'src/config/emergencyRolePermissions.js'), 'utf8'),
  nav: readFileSync(join(root, 'src/config/unified-navigation.config.ts'), 'utf8'),
  userCtx: readFileSync(join(root, 'src/contexts/UserContext.jsx'), 'utf8'),
  app: readFileSync(join(root, 'src/App.jsx'), 'utf8'),
  metrics: readFileSync(join(root, 'src/components/reception/ArrivalMetricsPanel.jsx'), 'utf8'),
};

const checks = [];

function pass(id, detail) {
  checks.push({ id, status: 'pass', detail });
}

function fail(id, detail) {
  checks.push({ id, status: 'fail', detail });
}

// Static checks
if (files.userCtx.includes("role: 'registration_clerk'")) pass('default-role', 'Open access defaults to registration_clerk');
else fail('default-role', 'Default role is not registration_clerk');

if (files.nav.includes("registration_clerk: ['reception', 'patients']")) pass('clerk-nav-order', 'Clerk nav order is reception + patients');
else fail('clerk-nav-order', 'Clerk nav order missing or wrong');

const clerkRoutesMatch = files.rolePerms.match(
  /\[EMERGENCY_ROLE_IDS\.registrationClerk\]: Object\.freeze\(\{[\s\S]*?routes: \[([^\]]+)\]/,
);
const clerkRoutes = clerkRoutesMatch?.[1] || '';
if (clerkRoutes && !/queues|tools|platform/.test(clerkRoutes)) pass('clerk-routes-trim', `Clerk routes: ${clerkRoutes.trim()}`);
else fail('clerk-routes-trim', `Clerk routes still include queues/tools/platform: ${clerkRoutes.trim()}`);

if (!files.reception.includes('reception-workspace__hero')) pass('no-hero', 'No reception hero block');
else fail('no-hero', 'Hero block still present');

if (!files.reception.includes('reception-workspace__actions--secondary')) pass('no-secondary-actions', 'No duplicate secondary action row');
else fail('no-secondary-actions', 'Secondary actions still present');

if (files.reception.includes('ReceptionWorkQueues')) pass('tabbed-queues', 'Tabbed registration queues in use');
else fail('tabbed-queues', 'ReceptionWorkQueues not wired');

if (files.header.includes('screenCapabilities.isRegistrationScreen') && files.header.includes('open-reception-prepare')) pass('header-gating', 'Header uses screen mode + prepare event');
else fail('header-gating', 'Header registration gating incomplete');

if (files.header.includes('!screenCapabilities.isRegistrationScreen') && files.header.includes('open-command-palette')) pass('single-search', 'Command palette hidden on registration screen');
else fail('single-search', 'Duplicate search entry may remain on registration screen');

if (files.metrics.includes('selectEmsInboundCount') && !files.metrics.includes('selectEmergencyOperationalSummary')) pass('metrics-stable', 'ArrivalMetricsPanel uses stable selector');
else fail('metrics-stable', 'ArrivalMetricsPanel may still use unstable operational summary selector');

if (files.metrics.includes('receptionMetricRoute') || files.metrics.includes('receptionScoped')) pass('metrics-reception-routes', 'Metrics stay on reception for clerk');
else fail('metrics-reception-routes', 'Metrics may still link to queues route for clerk');

if (files.appShell.includes('showEmsCriticalOverlay') && files.appShell.includes('isRegistrationScreen')) pass('overlay-gating', 'AppShell gates EMS overlay and patient panel');
else fail('overlay-gating', 'AppShell overlay gating incomplete');

if (files.app.includes('EmergencyRouteGuard path={CANONICAL_ROUTES.workspace}')) pass('platform-guard', 'Platform route uses EmergencyRouteGuard');
else fail('platform-guard', 'Platform route unguarded');

if (files.app.includes('registrationClerk') && files.app.includes('emergencyReception')) pass('whiteboard-redirect', 'Clerk whiteboard redirect present');
else fail('whiteboard-redirect', 'Clerk whiteboard redirect missing');

if (files.sidebar.includes('useScreenModeCapabilities') && files.sidebar.includes('!screenCapabilities.isRegistrationScreen')) pass('sidebar-mobile-trim', 'Sidebar hides copilot on registration screen');
else fail('sidebar-mobile-trim', 'Sidebar mobile chrome not trimmed');

async function liveScan() {
  mkdirSync(outDir, { recursive: true });
  const baseURL = process.env.QA_BASE_URL || 'http://localhost:8000';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.addInitScript(() => {
    localStorage.setItem('caredroid_access_token', 'scan-token');
    localStorage.setItem(
      'caredroid_user_profile',
      JSON.stringify({
        id: 'scan-clerk',
        role: 'registration_clerk',
        name: 'Scan Clerk',
        email: 'scan@caredroid.local',
      }),
    );
  });

  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/emergency/reception/snapshot')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ emsArrivals: [{ id: 'a1', unitId: 'EMS-501', status: 'Inbound', etaMinutes: 12, complaint: 'Chest pain', severity: 'High' }], patients: [], metrics: {} }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });

  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(`${baseURL}/emergency/reception`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(outDir, 'scan-clerk-reception.png'), fullPage: true });

  const navIds = [
    ...new Set(
      await page.locator('[data-nav-id]').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-nav-id'))),
    ),
  ];
  const headerText = await page.locator('.emergency-os-header').innerText().catch(() => '');
  const hasErrorBoundary = await page.getByText(/encountered an error/i).count();
  const hasEmsPanel = await page.getByText(/Inbound ambulances/i).count();
  const hasOpsStrip = await page.getByText(/^CAP /).count();
  const commandPaletteButtons = await page.getByLabel('Open command palette').count();
  const prepareButtons = await page.locator('.emergency-os-header__action--primary').filter({ hasText: 'Prepare' }).count();

  if (hasErrorBoundary === 0) pass('live-no-crash', 'Reception page renders without error boundary');
  else fail('live-no-crash', 'Reception page shows error boundary');

  if (errors.length === 0) pass('live-no-js-errors', 'No page JavaScript errors');
  else fail('live-no-js-errors', errors.join('; '));

  if (navIds.every((id) => ['reception', 'patients'].includes(id))) pass('live-nav-minimal', `Sidebar nav ids: ${navIds.join(', ')}`);
  else fail('live-nav-minimal', `Unexpected nav ids: ${navIds.join(', ')}`);

  if (headerText.includes('Arrival Dashboard') && !headerText.includes('Emergency OS')) pass('live-branding', 'Header shows Arrival Dashboard branding');
  else fail('live-branding', 'Header branding leak');

  if (hasOpsStrip === 0) pass('live-no-ops-strip', 'No CAP/EMS ops strip on clerk reception');
  else fail('live-no-ops-strip', 'Ops strip visible on clerk reception');

  if (hasEmsPanel > 0) pass('live-ems-panel', 'EMS pre-arrival panel visible');
  else fail('live-ems-panel', 'EMS pre-arrival panel missing');

  if (commandPaletteButtons === 0) pass('live-single-search', 'No command palette search button on registration header');
  else fail('live-single-search', 'Command palette search button still visible');

  if (prepareButtons === 1) pass('live-prepare-entry', 'Single header Prepare entry (EMS cards use contextual Prepare registration)');
  else fail('live-prepare-entry', `Unexpected header Prepare buttons: ${prepareButtons}`);

  await browser.close();
}

await liveScan().catch((error) => {
  fail('live-scan', error.message);
});

const summary = {
  generatedAt: new Date().toISOString(),
  passed: checks.filter((c) => c.status === 'pass').length,
  failed: checks.filter((c) => c.status === 'fail').length,
  checks,
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(summary, null, 2)}\n`);

console.log(`Receptionist alignment scan: ${summary.passed} passed, ${summary.failed} failed`);
for (const check of checks.filter((c) => c.status === 'fail')) {
  console.log(`  FAIL  ${check.id}: ${check.detail}`);
}
console.log(`Report: ${reportPath}`);

if (summary.failed > 0) process.exit(1);

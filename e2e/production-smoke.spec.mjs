/* global process, URL, localStorage, document */
/**
 * Production deployment smoke tests.
 *
 * These checks run against a deployed URL only. They intentionally avoid local
 * webServer startup and network stubs so Vite proxy assumptions cannot mask
 * production routing, asset, API, or CORS failures.
 */

import { test, expect } from '@playwright/test';
import {
  ANDROID_QA_DEVICES,
  viewportForDevice,
} from '../src/data/androidDeviceQaMatrix.js';
import {
  dismissOverlays,
  measurePageOverflow,
  waitForAppReady,
} from './responsive-qa.helpers.mjs';

const DEFAULT_QA_USER = {
  id: 'production-smoke-user',
  email: 'production-smoke@caredroid.local',
  name: 'Production Smoke',
  role: 'physician',
  fullName: 'Production Smoke',
  isEmailVerified: true,
  twoFactorEnabled: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const AUTH_TOKEN_KEY = 'caredroid_access_token';
const USER_PROFILE_KEY = 'caredroid_user_profile';
const QA_AUTH_TOKEN = process.env.QA_AUTH_TOKEN?.trim() || 'production-smoke-token';
const QA_AUTH_PROFILE = parseAuthProfile(process.env.QA_AUTH_PROFILE_JSON);
const STRICT_API = process.env.QA_STRICT_API === 'true';
const ALLOW_AUTH_API_FAILURES = !STRICT_API && !process.env.QA_AUTH_TOKEN;
const ANDROID_DEVICE_IDS = new Set([
  'pixel-7',
  'pixel-7-pro',
  'samsung-galaxy-s',
  'samsung-galaxy-a',
]);

const DESKTOP_ROUTES = [
  { path: '/emergency/tools', label: 'medical tools overview' },
  { path: '/emergency/tools?source=calculators&filter=calculator', label: 'calculators hub' },
  { path: '/emergency/tools?source=calculators&filter=calculator&q=has-bled&open=has-bled', label: 'HAS-BLED calculator' },
  { path: '/emergency/tools?source=calculators&filter=calculator&q=qsofa&open=qsofa', label: 'qSOFA calculator' },
  { path: '/emergency/tools?source=tools&filter=clinical-tools&q=drug-check&open=drug-check', label: 'drug checker' },
  { path: '/emergency/tools?source=tools&filter=clinical-tools&q=lab-interp&open=lab-interp', label: 'lab interpreter' },
  { path: '/emergency/copilot?tool=wells-pe', label: 'chat-assisted Wells PE launch' },
];

const ANDROID_ROUTES = [
  { path: '/emergency/tools', label: 'medical tools overview' },
  { path: '/emergency/tools?source=calculators&filter=calculator', label: 'calculators hub' },
  { path: '/emergency/tools?source=calculators&filter=calculator&q=has-bled&open=has-bled', label: 'HAS-BLED calculator' },
  { path: '/emergency/copilot?tool=wells-pe', label: 'chat-assisted Wells PE launch' },
];

function parseAuthProfile(raw) {
  if (!raw) return DEFAULT_QA_USER;
  try {
    return { ...DEFAULT_QA_USER, ...JSON.parse(raw) };
  } catch (error) {
    throw new Error(`QA_AUTH_PROFILE_JSON is not valid JSON: ${error.message}`);
  }
}

async function seedProductionAuth(page) {
  await page.addInitScript(
    ({ token, profile, authTokenKey, userProfileKey }) => {
      localStorage.setItem(authTokenKey, token);
      localStorage.setItem(userProfileKey, JSON.stringify(profile));
    },
    {
      token: QA_AUTH_TOKEN,
      profile: QA_AUTH_PROFILE,
      authTokenKey: AUTH_TOKEN_KEY,
      userProfileKey: USER_PROFILE_KEY,
    }
  );
}

function isApiUrl(url) {
  try {
    return new URL(url).pathname.includes('/api/');
  } catch {
    return url.includes('/api/');
  }
}

function isAssetResponse(response) {
  const type = response.request().resourceType();
  try {
    const pathname = new URL(response.url()).pathname;
    return pathname.startsWith('/assets/') || ['script', 'stylesheet', 'image', 'font'].includes(type);
  } catch {
    return ['script', 'stylesheet', 'image', 'font'].includes(type);
  }
}

function installRuntimeAudit(page) {
  const audit = {
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    badResponses: [],
    apiHtmlResponses: [],
    duplicateApiPrefix: [],
    assetFailures: [],
  };

  page.on('console', (message) => {
    if (message.type() === 'error') {
      audit.consoleErrors.push(message.text());
    }
  });

  page.on('pageerror', (error) => {
    audit.pageErrors.push(error.message);
  });

  page.on('requestfailed', (request) => {
    audit.requestFailures.push({
      method: request.method(),
      url: request.url(),
      failure: request.failure()?.errorText || 'unknown failure',
    });
  });

  page.on('response', async (response) => {
    const url = response.url();
    const status = response.status();
    const api = isApiUrl(url);
    const headers = response.headers();
    const contentType = headers['content-type'] || '';
    const asset = isAssetResponse(response);

    if (url.includes('/api/api/')) {
      audit.duplicateApiPrefix.push(url);
    }

    if (api && contentType.includes('text/html')) {
      audit.apiHtmlResponses.push({ status, url, contentType });
    }

    if (status >= 400) {
      const record = {
        status,
        method: response.request().method(),
        url,
        resourceType: response.request().resourceType(),
        isApi: api,
        isAsset: asset,
      };
      audit.badResponses.push(record);
      if (asset) {
        audit.assetFailures.push(record);
      }
    }
  });

  return audit;
}

async function attachAndAssertRuntimeClean(audit, testInfo) {
  await testInfo.attach('runtime-audit', {
    body: JSON.stringify(audit, null, 2),
    contentType: 'application/json',
  });

  const badResponses = audit.badResponses.filter((response) => {
    const allowedAuthFailure =
      ALLOW_AUTH_API_FAILURES &&
      response.isApi &&
      ['GET', 'HEAD', 'OPTIONS'].includes(response.method) &&
      [401, 403].includes(response.status);
    return !allowedAuthFailure;
  });

  const failures = [
    ...audit.consoleErrors.map((message) => `console error: ${message}`),
    ...audit.pageErrors.map((message) => `page error: ${message}`),
    ...audit.requestFailures.map((request) => `request failed: ${request.method} ${request.url} (${request.failure})`),
    ...badResponses.map((response) => `HTTP ${response.status}: ${response.method} ${response.url}`),
    ...audit.apiHtmlResponses.map((response) => `API returned HTML: HTTP ${response.status} ${response.url}`),
    ...audit.duplicateApiPrefix.map((url) => `duplicate /api prefix: ${url}`),
    ...audit.assetFailures.map((response) => `asset failed: HTTP ${response.status} ${response.url}`),
  ];

  expect(failures, failures.join('\n')).toEqual([]);
}

async function waitForPublicPage(page) {
  await page.waitForFunction(
    () => !document.querySelector('.app-init-screen') && document.body?.innerText?.trim().length > 0,
    undefined,
    { timeout: 30_000 }
  );
}

async function assertProtectedRoute(page, path) {
  await seedProductionAuth(page);
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await waitForAppReady(page);
  await dismissOverlays(page);
  await expect(page.locator('.app-shell-page-body')).toBeVisible();

  const bodyText = await page.locator('body').innerText();
  expect(bodyText.trim().length).toBeGreaterThan(80);
}

test.describe('production browser runtime', () => {
  test('homepage loads without console, asset, or render failures', async ({ page }, testInfo) => {
    const audit = installRuntimeAudit(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForPublicPage(page);
    await expect(page.getByRole('heading', { level: 1, name: /caredroid-clinical-ai/i })).toBeVisible();
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    await attachAndAssertRuntimeClean(audit, testInfo);
  });

  for (const route of DESKTOP_ROUTES) {
    test(`${route.label} loads in deployed browser runtime`, async ({ page }, testInfo) => {
      const audit = installRuntimeAudit(page);

      await page.setViewportSize({ width: 1440, height: 900 });
      await assertProtectedRoute(page, route.path);
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

      await attachAndAssertRuntimeClean(audit, testInfo);
    });
  }
});

test.describe('production route fallback behavior', () => {
  test('calculator and chat-assisted fallback routes resolve correctly', async ({ page }, testInfo) => {
    const audit = installRuntimeAudit(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await assertProtectedRoute(page, '/tools/calculators/sofa');
    const sofaUrl = new URL(page.url());
    expect(sofaUrl.pathname).toBe('/emergency/tools');
    expect(sofaUrl.searchParams.get('source')).toBe('calculators');
    expect(sofaUrl.searchParams.get('open')).toBe('sofa');

    await assertProtectedRoute(page, '/tools/calculators/wells-pe');
    const wellsUrl = new URL(page.url());
    expect(wellsUrl.pathname).toBe('/emergency/tools');
    expect(wellsUrl.searchParams.get('source')).toBe('calculators');
    expect(wellsUrl.searchParams.get('open')).toBe('wells-pe');

    await assertProtectedRoute(page, '/tools/calculators/not-a-real-calc-xyz');
    await expect(page.getByRole('heading', { name: /tool not found/i })).toBeVisible();

    await assertProtectedRoute(page, '/tools/catalog/');
    expect(new URL(page.url()).pathname).toBe('/emergency/tools');

    await attachAndAssertRuntimeClean(audit, testInfo);
  });
});

test.describe('production Android runtime', () => {
  for (const device of ANDROID_QA_DEVICES.filter((candidate) => ANDROID_DEVICE_IDS.has(candidate.id))) {
    for (const orientation of ['portrait', 'landscape']) {
      for (const route of ANDROID_ROUTES) {
        test(`${device.label} ${orientation} ${route.label}`, async ({ page }, testInfo) => {
          const audit = installRuntimeAudit(page);

          await page.setViewportSize(viewportForDevice(device, orientation));
          await assertProtectedRoute(page, route.path);

          const overflow = await measurePageOverflow(page);
          await testInfo.attach('overflow-report', {
            body: JSON.stringify(overflow, null, 2),
            contentType: 'application/json',
          });
          expect(overflow.pass, JSON.stringify(overflow.offenders, null, 2)).toBe(true);

          await attachAndAssertRuntimeClean(audit, testInfo);
        });
      }
    }
  }
});

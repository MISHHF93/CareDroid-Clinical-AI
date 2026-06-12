type HttpMethod = 'GET' | 'POST';

type EndpointCheck = {
  method: HttpMethod;
  path: string;
  expectedStatus?: number;
  body?: unknown;
};

const BACKEND_URL = process.env.E2E_BACKEND_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.E2E_FRONTEND_URL || 'http://localhost:8000';

const backendChecks: EndpointCheck[] = [
  { method: 'GET', path: '/api/whiteboard', expectedStatus: 200 },
  { method: 'GET', path: '/api/capacity/dashboard', expectedStatus: 200 },
  { method: 'GET', path: '/api/ems/incoming', expectedStatus: 200 },
  { method: 'GET', path: '/api/reassessment/due', expectedStatus: 200 },
  {
    method: 'POST',
    path: '/api/copilot/query',
    expectedStatus: 200,
    body: { query: 'test', user_role: 'nurse' },
  },
  { method: 'GET', path: '/api/intake/session/test', expectedStatus: 404 },
];

const frontendRoutes = [
  '/',
  '/emergency/whiteboard',
  '/emergency/patients',
  '/emergency/ems',
  '/emergency/intake',
  '/emergency/queues',
  '/emergency/reassessment',
  '/emergency/capacity',
  '/emergency/boarding',
  '/emergency/referrals',
  '/emergency/copilot',
  '/emergency/analytics',
  '/emergency/settings',
  '/search',
];

async function request(url: string, options: RequestInit = {}) {
  try {
    const response = await fetch(url, options);
    const text = await response.text();
    return {
      reachable: true,
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get('content-type') || '',
      text,
    };
  } catch (error) {
    return {
      reachable: false,
      status: 0,
      ok: false,
      contentType: '',
      text: error instanceof Error ? error.message : 'fetch failed',
    };
  }
}

function looksLikeHtml(text = '') {
  return /<!doctype|<html|<div/i.test(text);
}

function parseJson(text = '') {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

async function testBackendEndpoints() {
  console.log('\n=== BACKEND ENDPOINT TRACE ===');

  for (const endpoint of backendChecks) {
    const response = await request(`${BACKEND_URL}${endpoint.path}`, {
      method: endpoint.method,
      headers: endpoint.body ? { 'content-type': 'application/json' } : undefined,
      body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
    });
    const payload = parseJson(response.text);
    const expected = endpoint.expectedStatus;
    const statusOk = expected ? response.status === expected : response.ok;
    const dataStatus = payload === null ? 'no-json' : 'json';
    const errorField = payload?.error ? ` error="${payload.error}"` : '';
    const result = !response.reachable ? 'NO_SERVER' : statusOk ? 'PASS' : 'FAIL';

    console.log(`${result} ${endpoint.method} ${endpoint.path} status=${response.status} data=${dataStatus}${errorField}`);
  }
}

async function testFrontendRoutes() {
  console.log('\n=== FRONTEND ROUTE TRACE ===');

  for (const route of frontendRoutes) {
    const response = await request(`${FRONTEND_URL}${route}`);
    const htmlStatus = looksLikeHtml(response.text) ? 'html' : 'non-html';
    const result = !response.reachable ? 'NO_SERVER' : response.status === 200 ? 'PASS' : 'FAIL';
    console.log(`${result} ${route} status=${response.status} content=${htmlStatus}`);
  }
}

async function traceDataFlow() {
  console.log('\n=== EMERGENCY OS DATA FLOW TRACE ===');

  const whiteboard = await request(`${BACKEND_URL}/api/whiteboard`);
  const whiteboardPayload = parseJson(whiteboard.text);
  console.log(
    `Whiteboard patients=${Array.isArray(whiteboardPayload?.patients) ? whiteboardPayload.patients.length : 'missing'} status=${whiteboard.status}`,
  );

  const ems = await request(`${BACKEND_URL}/api/ems/incoming`);
  const emsPayload = parseJson(ems.text);
  console.log(
    `EMS incoming=${Array.isArray(emsPayload?.patients) ? emsPayload.patients.length : 'missing'} status=${ems.status}`,
  );

  const reassessment = await request(`${BACKEND_URL}/api/reassessment/due`);
  const reassessmentPayload = parseJson(reassessment.text);
  console.log(`Reassessment due=${reassessmentPayload?.count ?? 'missing'} status=${reassessment.status}`);
}

async function runFullTrace() {
  console.log('========================================');
  console.log('   EMERGENCY OS END-TO-END TRACE');
  console.log('========================================');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);

  await testBackendEndpoints();
  await testFrontendRoutes();
  await traceDataFlow();
}

runFullTrace().catch((error) => {
  console.error('E2E trace failed', error);
  process.exitCode = 1;
});

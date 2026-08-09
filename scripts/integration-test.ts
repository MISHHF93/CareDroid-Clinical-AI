type EndpointCheck = {
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
};

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://localhost:3000';
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';

async function request(check: EndpointCheck): Promise<number | 'connect-failed'> {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}${check.path}`, {
      method: check.method,
      headers: check.body ? { 'Content-Type': 'application/json' } : undefined,
      body: check.body ? JSON.stringify(check.body) : undefined,
    });
    return response.status;
  } catch {
    return 'connect-failed';
  }
}

async function testBackendMounting() {
  console.log('\n=== Testing Backend Endpoints ===\n');

  const backendReady = await request({ method: 'GET', path: '/health' });
  if (backendReady === 'connect-failed') {
    console.log(`[SKIP] Backend server not reachable at ${BACKEND_BASE_URL}`);
    return;
  }

  const endpoints: EndpointCheck[] = [
    { method: 'GET', path: '/api/capacity/dashboard' },
    { method: 'GET', path: '/api/ems/incoming' },
    { method: 'GET', path: '/api/reassessment/due' },
    { method: 'POST', path: '/api/copilot/query', body: { query: 'How many EMS inbound?', user_role: 'charge_nurse' } },
    { method: 'POST', path: '/api/emergency/intake/sessions', body: { staff: 'integration-test' } },
  ];

  for (const endpoint of endpoints) {
    const status = await request(endpoint);
    const ok = status !== 'connect-failed' && status < 500;
    console.log(`${ok ? '[OK]' : '[FAIL]'} ${endpoint.method} ${endpoint.path} -> ${status}`);
  }
}

async function testFrontendRoutes() {
  console.log('\n=== Frontend Route Probe ===\n');
  try {
    await fetch(FRONTEND_BASE_URL, { method: 'GET' });
  } catch {
    console.log(`[SKIP] Frontend server not reachable at ${FRONTEND_BASE_URL}`);
    return;
  }

  const routes = [
    '/',
    '/ems',
    '/queues',
    '/reassessment',
    '/capacity',
    '/patients',
    '/copilot',
    '/settings',
    '/emergency/whiteboard',
    '/emergency/ems',
    '/emergency/queues',
    '/emergency/reassessment',
    '/emergency/capacity',
    '/emergency/patients',
    '/emergency/copilot',
    '/emergency/settings',
  ];

  for (const route of routes) {
    const response = await fetch(`${FRONTEND_BASE_URL}${route}`, { method: 'GET' });
    console.log(`${response.ok ? '[OK]' : '[FAIL]'} ${route} -> ${response.status}`);
  }
}

async function main() {
  await testBackendMounting();
  await testFrontendRoutes();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

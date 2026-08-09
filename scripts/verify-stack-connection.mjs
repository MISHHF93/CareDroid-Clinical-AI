#!/usr/bin/env node
import http from 'node:http';

const frontendPort = Number.parseInt(process.env.FRONTEND_PORT || process.env.VITE_DEV_PORT || '3000', 10);
const backendPort = Number.parseInt(process.env.BACKEND_PORT || process.env.PORT || '3350', 10);

const requestJson = (port, path, { method = 'GET', headers = {}, body } = {}) =>
  new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path,
        method,
        headers,
        timeout: 5000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({ status: res.statusCode || 0, body });
        });
      },
    );
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`timeout ${method} ${path}`));
    });
    req.on('error', reject);
    const payload = body ? JSON.stringify(body) : undefined;
    if (payload) {
      req.setHeader('Content-Type', 'application/json');
      req.setHeader('Content-Length', Buffer.byteLength(payload));
      req.write(payload);
    }
    req.end();
  });

const checks = [];

try {
  const backendHealth = await requestJson(backendPort, '/health');
  checks.push({
    label: `Backend /health (:${backendPort})`,
    ok: backendHealth.status === 200,
    detail: `HTTP ${backendHealth.status}`,
  });

  const proxyHealth = await requestJson(frontendPort, '/health');
  checks.push({
    label: `Frontend proxy /health (:${frontendPort})`,
    ok: proxyHealth.status === 200,
    detail: `HTTP ${proxyHealth.status}`,
  });

  const devSession = await requestJson(frontendPort, '/api/auth/dev-session', { method: 'POST' });
  const tokenMatch = devSession.body.match(/"accessToken":"([^"]+)"/);
  const token = tokenMatch?.[1] || '';
  checks.push({
    label: 'Dev session POST /api/auth/dev-session',
    ok: devSession.status === 200 && Boolean(token),
    detail: `HTTP ${devSession.status}${token ? ' · JWT issued' : ''}`,
  });

  const nluInfo = await requestJson(backendPort, '/api/nlu/model-info');
  checks.push({
    label: `NLU model-info (:${backendPort}/api/nlu)`,
    ok:
      nluInfo.status === 200 &&
      nluInfo.body.includes('"status":"loaded"') &&
      nluInfo.body.includes('mpnet'),
    detail: `HTTP ${nluInfo.status}`,
  });

  const nluPredict = await requestJson(backendPort, '/api/nlu/predict', {
    method: 'POST',
    body: { text: 'Can I combine warfarin with aspirin?' },
  });
  checks.push({
    label: 'NLU predict drug_interaction_check',
    ok:
      (nluPredict.status === 200 || nluPredict.status === 201) &&
      nluPredict.body.includes('drug_interaction_check'),
    detail: `HTTP ${nluPredict.status}`,
  });

  if (token) {
    const authHeaders = { Authorization: `Bearer ${token}` };
    for (const path of [
      '/api/emergency/whiteboard',
      '/api/emergency/reception/snapshot',
      '/api/emergency/queues',
      '/api/tools',
      '/api/training/dashboard',
    ]) {
      const response = await requestJson(frontendPort, path, { headers: authHeaders });
      checks.push({
        label: `Authenticated ${path}`,
        ok: response.status === 200,
        detail: `HTTP ${response.status}`,
      });
    }
  }
} catch (error) {
  checks.push({
    label: 'Connection probe',
    ok: false,
    detail: error instanceof Error ? error.message : String(error),
  });
}

let failed = 0;
console.log('CareDroid stack connection check\n');
for (const check of checks) {
  const status = check.ok ? 'OK' : 'FAIL';
  if (!check.ok) failed += 1;
  console.log(`[${status}] ${check.label} — ${check.detail}`);
}

if (failed > 0) {
  console.log('\nStart the full stack with: npm run dev:fullstack');
  process.exit(1);
}

console.log('\nBackend and reception-first frontend are connected.');

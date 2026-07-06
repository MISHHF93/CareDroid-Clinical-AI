#!/usr/bin/env node
/**
 * Verifies the in-process TypeScript AI stack (NLU + training metrics sync).
 * Requires the Nest backend to be running (default :3350).
 */
import http from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backendPort = Number.parseInt(process.env.BACKEND_PORT || process.env.PORT || '3350', 10);

const requestJson = (path, { method = 'GET', body } = {}) =>
  new Promise((resolveRequest, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        host: '127.0.0.1',
        port: backendPort,
        path,
        method,
        headers: {
          Accept: 'application/json',
          ...(payload
            ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
            : {}),
        },
        timeout: 15000,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = raw ? JSON.parse(raw) : null;
          } catch {
            parsed = raw;
          }
          resolveRequest({ status: res.statusCode || 0, body: parsed, raw });
        });
      },
    );
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`timeout ${method} ${path}`));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });

const checks = [];

const record = (label, ok, detail) => {
  checks.push({ label, ok, detail });
};

try {
  const health = await requestJson('/health');
  record('Backend /health', health.status === 200, `HTTP ${health.status}`);

  const nluHealth = await requestJson('/api/nlu/health');
  const nluHealthy =
    nluHealth.status === 200 &&
    nluHealth.body &&
    typeof nluHealth.body === 'object' &&
    nluHealth.body.modelLoaded === true;
  record(
    'NLU /api/nlu/health (model loaded)',
    nluHealthy,
    nluHealthy
      ? `model=${nluHealth.body.modelName}`
      : `HTTP ${nluHealth.status} · ${JSON.stringify(nluHealth.body)}`,
  );

  const modelInfo = await requestJson('/api/nlu/model-info');
  const modelLoaded =
    modelInfo.status === 200 &&
    modelInfo.body &&
    modelInfo.body.status === 'loaded' &&
    String(modelInfo.body.modelName || '').includes('mpnet');
  record(
    'NLU model-info (Xenova mpnet)',
    modelLoaded,
    modelLoaded ? modelInfo.body.modelName : JSON.stringify(modelInfo.body),
  );

  const predict = await requestJson('/api/nlu/predict', {
    method: 'POST',
    body: { text: 'Can I combine warfarin with aspirin?' },
  });
  const predictOk =
    predict.status === 200 || predict.status === 201
      ? predict.body?.intent === 'drug_interaction_check' && predict.body?.confidence >= 0.7
      : false;
  record(
    'NLU predict (drug interaction)',
    predictOk,
    predictOk
      ? `${predict.body.intent} @ ${(predict.body.confidence * 100).toFixed(1)}%`
      : `HTTP ${predict.status} · ${JSON.stringify(predict.body)}`,
  );

  const metricsPath = join(rootDir, 'backend', 'ml-services', 'nlu', 'metrics.json');
  if (existsSync(metricsPath)) {
    const metrics = JSON.parse(readFileSync(metricsPath, 'utf8'));
    const metricsOk =
      metrics.usedTrainedClassifier === true &&
      typeof metrics.accuracy === 'number' &&
      metrics.accuracy >= 0.9;
    record(
      'NLU metrics.json on disk',
      metricsOk,
      `accuracy=${metrics.accuracy}, arch=${metrics.architecture || 'unknown'}`,
    );
  } else {
    record('NLU metrics.json on disk', false, 'missing — run: cd backend && npm run nlu:pipeline');
  }

  const stalePaths = [
    'lib/ai/config.ts',
    'backend/src/config/nlu.config.ts',
    'docker-compose.yml',
  ];
  const staleHits = stalePaths.filter((rel) => {
    const content = readFileSync(join(rootDir, rel), 'utf8');
    return /localhost:8001|nlu:8001|distilbert-base-uncased|PYTHONUNBUFFERED/i.test(content);
  });
  record(
    'Config files free of Python NLU / port 8001',
    staleHits.length === 0,
    staleHits.length ? `stale refs in: ${staleHits.join(', ')}` : 'no stale sidecar references',
  );
} catch (error) {
  record('AI stack probe', false, error instanceof Error ? error.message : String(error));
}

let failed = 0;
console.log(`CareDroid AI stack verification (backend :${backendPort})\n`);
for (const check of checks) {
  const status = check.ok ? 'OK' : 'FAIL';
  if (!check.ok) failed += 1;
  console.log(`[${status}] ${check.label} — ${check.detail}`);
}

if (failed > 0) {
  console.log('\nStart backend: npm run dev:fullstack  (or npm run dev:api)');
  process.exit(1);
}

console.log('\nIn-process TypeScript NLU and AI config are wired correctly.');

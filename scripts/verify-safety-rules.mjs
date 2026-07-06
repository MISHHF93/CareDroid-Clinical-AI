#!/usr/bin/env node
/**
 * Verifies deterministic clinical safety rules: registry snapshot and priority-floor evaluation.
 */
import http from 'node:http';

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
const record = (label, ok, detail) => checks.push({ label, ok, detail });

try {
  const rules = await requestJson('/api/emergency/governance/safety-rules');
  const floors = rules.body?.cannotLowerPriorityFor;
  const rulesOk =
    rules.status === 200 &&
    Array.isArray(floors?.dpsScores) &&
    floors.dpsScores.includes(1) &&
    floors.dpsScores.includes(2) &&
    floors.conditions?.includes('sepsis') &&
    Array.isArray(rules.body?.requiredDisclaimers) &&
    rules.body.requiredDisclaimers.length >= 3;
  record(
    'Governance safety-rules registry',
    rulesOk,
    rulesOk
      ? `DPS floors=${floors.dpsScores.join(',')}, conditions=${floors.conditions.length}`
      : JSON.stringify(rules.body),
  );

  const blocked = await requestJson('/api/emergency/governance/evaluate-priority-change', {
    method: 'POST',
    body: {
      patient: {
        dpsScore: 2,
        chiefComplaint: 'Chest pain',
        vitals: { hr: 130, spO2: 90 },
      },
      requestedDps: 4,
    },
  });
  const blockedOk =
    blocked.status === 201 || blocked.status === 200
      ? blocked.body?.allowed === false &&
        Array.isArray(blocked.body?.floorReasons) &&
        blocked.body.floorReasons.length > 0
      : false;
  record(
    'Priority floor blocks DPS2 downgrade',
    blockedOk,
    blockedOk
      ? `floorReasons=${blocked.body.floorReasons.join(',')}`
      : `HTTP ${blocked.status} · ${JSON.stringify(blocked.body)}`,
  );

  const allowed = await requestJson('/api/emergency/governance/evaluate-priority-change', {
    method: 'POST',
    body: {
      patient: {
        dpsScore: 4,
        chiefComplaint: 'Minor laceration',
        vitals: { hr: 78, spO2: 99 },
      },
      requestedDps: 3,
    },
  });
  const allowedOk =
    allowed.status === 201 || allowed.status === 200
      ? allowed.body?.allowed === true && allowed.body?.requiresHumanReview === true
      : false;
  record(
    'Priority escalation allowed with human review',
    allowedOk,
    allowedOk ? allowed.body.message : `HTTP ${allowed.status} · ${JSON.stringify(allowed.body)}`,
  );
} catch (error) {
  record('Safety rules probe', false, error instanceof Error ? error.message : String(error));
}

let failed = 0;
console.log(`CareDroid safety rules verification (backend :${backendPort})\n`);
for (const check of checks) {
  const status = check.ok ? 'OK' : 'FAIL';
  if (!check.ok) failed += 1;
  console.log(`[${status}] ${check.label} — ${check.detail}`);
}

if (failed > 0) {
  console.log('\nStart backend: npm run dev:fullstack  (or npm run dev:api)');
  process.exit(1);
}

console.log('\nClinical safety rules are operational.');

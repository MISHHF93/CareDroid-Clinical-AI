#!/usr/bin/env node
/**
 * Live patient-journey performance + functional probe.
 *
 * Acts as multiple patients + a registration clerk against a running CareDroid stack:
 *   auth → create intake → OCR job → handoff → escalation → list/snapshot
 *
 * Usage:
 *   node scripts/patient-journey-performance.mjs
 *   BACKEND_PORT=3350 FRONTEND_PORT=5190 PATIENTS=8 node scripts/patient-journey-performance.mjs
 *
 * Writes:
 *   qa/patient-journey-performance-report.json
 *   qa/patient-journey-performance-report.md
 */
import http from 'node:http';
import https from 'node:https';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outJson = join(root, 'qa', 'patient-journey-performance-report.json');
const outMd = join(root, 'qa', 'patient-journey-performance-report.md');

const BACKEND_PORT = Number(process.env.BACKEND_PORT || process.env.PORT || 3350);
const FRONTEND_PORT = Number(process.env.FRONTEND_PORT || process.env.VITE_DEV_PORT || 5190);
const HOST = process.env.PERF_HOST || '127.0.0.1';
const PATIENT_COUNT = Math.max(1, Number(process.env.PATIENTS || 6));
const TIMEOUT_MS = Number(process.env.PERF_TIMEOUT_MS || 15000);

/** Synthetic ED arrivals — real-life mix of walk-in scenarios */
const PERSONAS = [
  {
    id: 'walkin-chest-pain',
    label: 'Walk-in chest pain (return visit risk)',
    firstName: 'Maria',
    lastName: 'Chen',
    dob: '1978-03-14',
    sex: 'F',
    chiefComplaint: 'Chest pain radiating to left arm for 45 minutes',
    preferredLanguage: 'English',
    interpreterNeeded: 'no',
    redFlags: ['Chest pain'],
    arrivalMode: 'walk-in',
    priority: 'P1',
    ocrText: 'First name: Maria\nLast name: Chen\nDate of birth: 1978-03-14\nSex: F',
  },
  {
    id: 'walkin-pediatric-fever',
    label: 'Parent with febrile child',
    firstName: 'Jamal',
    lastName: 'Okoye',
    dob: '2019-08-02',
    sex: 'M',
    chiefComplaint: 'Fever 39.2C and lethargy since last night',
    preferredLanguage: 'English',
    interpreterNeeded: 'no',
    redFlags: [],
    arrivalMode: 'walk-in',
    priority: 'P2',
    ocrText: 'First name: Jamal\nLast name: Okoye\nDate of birth: 2019-08-02',
  },
  {
    id: 'walkin-spanish-sob',
    label: 'Shortness of breath — Spanish speaker',
    firstName: 'Rosa',
    lastName: 'Alvarez',
    dob: '1965-11-30',
    sex: 'F',
    chiefComplaint: 'Shortness of breath and wheezing',
    preferredLanguage: 'Spanish',
    interpreterNeeded: 'yes',
    redFlags: ['Shortness of breath'],
    arrivalMode: 'walk-in',
    priority: 'P2',
    ocrText: 'Nombre: Rosa Alvarez\nFecha de nacimiento: 30/11/1965',
  },
  {
    id: 'unknown-collapse',
    label: 'Unknown / unresponsive at entrance',
    firstName: 'Unknown',
    lastName: 'Patient',
    dob: '',
    sex: 'U',
    chiefComplaint: 'Found unresponsive at ED entrance — crash registration',
    preferredLanguage: 'unknown',
    interpreterNeeded: 'unknown',
    redFlags: ['Unconscious'],
    arrivalMode: 'walk-in',
    priority: 'P1',
    ocrText: '',
    skipOcr: true,
    provisional: true,
  },
  {
    id: 'walkin-ankle',
    label: 'Minor ankle injury',
    firstName: 'Tyler',
    lastName: 'Brooks',
    dob: '1999-01-22',
    sex: 'M',
    chiefComplaint: 'Twisted ankle playing basketball, swelling',
    preferredLanguage: 'English',
    interpreterNeeded: 'no',
    redFlags: [],
    arrivalMode: 'walk-in',
    priority: 'P4',
    ocrText: 'First name: Tyler\nLast name: Brooks\nDate of birth: 1999-01-22\nHealth Card Number: HC-8899001',
  },
  {
    id: 'ems-style-transfer',
    label: 'Transfer-style arrival (staff-created)',
    firstName: 'Helen',
    lastName: 'Nguyen',
    dob: '1952-06-09',
    sex: 'F',
    chiefComplaint: 'Transfer for stroke symptoms — last known well 90 min ago',
    preferredLanguage: 'English',
    interpreterNeeded: 'no',
    redFlags: ['Stroke symptoms'],
    arrivalMode: 'transfer',
    priority: 'P1',
    ocrText: 'First name: Helen\nLast name: Nguyen\nDate of birth: 1952-06-09',
  },
  {
    id: 'walkin-psych',
    label: 'Mental health crisis walk-in',
    firstName: 'Alex',
    lastName: 'Rivera',
    dob: '1991-12-05',
    sex: 'Other',
    chiefComplaint: 'Suicidal ideation with plan — self-harm risk',
    preferredLanguage: 'English',
    interpreterNeeded: 'no',
    redFlags: ['Self-harm risk'],
    arrivalMode: 'walk-in',
    priority: 'P2',
    ocrText: '',
    skipOcr: true,
  },
  {
    id: 'walkin-abdominal',
    label: 'Abdominal pain walk-in',
    firstName: 'Priya',
    lastName: 'Singh',
    dob: '1988-04-18',
    sex: 'F',
    chiefComplaint: 'Severe abdominal pain since morning',
    preferredLanguage: 'English',
    interpreterNeeded: 'no',
    redFlags: [],
    arrivalMode: 'walk-in',
    priority: 'P3',
    ocrText: 'First name: Priya\nLast name: Singh\nDate of birth: 1988-04-18',
  },
];

function requestJson(port, path, { method = 'GET', headers = {}, body, token } = {}) {
  return new Promise((resolve) => {
    const started = performance.now();
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const reqHeaders = {
      Accept: 'application/json',
      ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
      ...headers,
    };
    if (token) reqHeaders.Authorization = `Bearer ${token}`;

    const req = http.request(
      {
        host: HOST,
        port,
        path,
        method,
        headers: reqHeaders,
        timeout: TIMEOUT_MS,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          const ms = Math.round(performance.now() - started);
          let json = null;
          try {
            json = raw ? JSON.parse(raw) : null;
          } catch {
            json = null;
          }
          resolve({
            ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
            status: res.statusCode || 0,
            ms,
            body: raw,
            json,
            path,
            method,
          });
        });
      },
    );
    req.on('timeout', () => {
      req.destroy();
      resolve({
        ok: false,
        status: 0,
        ms: TIMEOUT_MS,
        body: '',
        json: null,
        path,
        method,
        error: 'timeout',
      });
    });
    req.on('error', (error) => {
      resolve({
        ok: false,
        status: 0,
        ms: Math.round(performance.now() - started),
        body: '',
        json: null,
        path,
        method,
        error: error.message,
      });
    });
    if (payload) req.write(payload);
    req.end();
  });
}

async function probePort(port, path = '/health') {
  return requestJson(port, path);
}

async function obtainToken() {
  // Prefer frontend proxy (same path the browser uses)
  for (const port of [FRONTEND_PORT, BACKEND_PORT]) {
    const res = await requestJson(port, '/api/auth/dev-session', { method: 'POST', body: {} });
    const token =
      res.json?.accessToken ||
      res.json?.token ||
      res.json?.data?.accessToken ||
      res.json?.data?.token;
    if (res.ok && token) {
      return { token, via: port, ms: res.ms, raw: res };
    }
    // Some stacks use GET
    const getRes = await requestJson(port, '/api/auth/dev-session');
    const getToken =
      getRes.json?.accessToken ||
      getRes.json?.token ||
      getRes.json?.data?.accessToken;
    if (getRes.ok && getToken) {
      return { token: getToken, via: port, ms: getRes.ms, raw: getRes };
    }
  }
  // Fallback bypass if backend accepts it (dev only)
  return { token: process.env.DEV_BEARER_TOKEN || 'dev-bypass-token', via: 'bypass', ms: 0, raw: null };
}

function pickPersonas(n) {
  const list = [];
  for (let i = 0; i < n; i += 1) {
    const base = PERSONAS[i % PERSONAS.length];
    list.push({
      ...base,
      id: `${base.id}-${i + 1}`,
      // Unique MRN/name suffix so concurrent creates don't collide
      lastName: `${base.lastName}${i > PERSONAS.length - 1 ? `-${i + 1}` : ''}`,
      runIndex: i + 1,
    });
  }
  return list;
}

function patientPayload(persona) {
  const now = new Date().toISOString();
  const id = `perf-${persona.id}-${Date.now().toString(36)}`;
  return {
    id,
    mrn: `PERF-${Math.floor(100000 + Math.random() * 900000)}`,
    firstName: persona.firstName,
    lastName: persona.lastName,
    dob: persona.dob || now.slice(0, 10),
    age: persona.dob ? undefined : 40,
    sex: persona.sex === 'U' ? 'Other' : persona.sex,
    chiefComplaint: persona.chiefComplaint,
    complaintCategory: persona.redFlags[0] || 'General',
    state: 'Registration',
    priority: persona.priority,
    flags: persona.redFlags.length ? ['HighRisk', 'IdentityPending'].filter(Boolean) : [],
    vitals: [],
    notes: [
      {
        id: `note-${id}`,
        type: 'Intake',
        body: `Perf journey: ${persona.label}. Language: ${persona.preferredLanguage}; interpreter: ${persona.interpreterNeeded}.`,
        authorId: 'perf-harness',
        createdAt: now,
        metadata: {
          source: 'patient-journey-performance',
          preferredLanguage: persona.preferredLanguage,
          interpreterNeeded: persona.interpreterNeeded,
          personaId: persona.id,
        },
      },
    ],
    timeline: [],
    arrivalMode: persona.arrivalMode,
    registrationStatus: persona.provisional ? 'provisional' : 'in-progress',
    triagePending: true,
    arrivalTime: now,
    arrival: {
      arrivalMode: persona.arrivalMode,
      arrivalTimestamp: now,
      chiefComplaint: persona.chiefComplaint,
      state: 'Registration',
      triageAcuity: { code: persona.priority, status: 'suggested' },
      queueDestination: 'triage-queue',
      triagePending: true,
      registrationStatus: persona.provisional ? 'provisional' : 'in-progress',
      waitingRoomStatus: 'registered',
    },
  };
}

async function runPersonaJourney(apiPort, token, persona) {
  const steps = [];
  const t0 = performance.now();
  const patient = patientPayload(persona);
  let patientId = patient.id;
  let ocrJobId = null;
  let handoffOk = false;
  let escalateOk = false;
  let createOk = false;

  // 1) Create patient via intake
  const create = await requestJson(apiPort, '/api/emergency/intake', {
    method: 'POST',
    token,
    body: patient,
  });
  steps.push({ step: 'create_intake', ...create, patientId });
  createOk = create.ok;
  const createdId =
    create.json?.data?.patient?.id ||
    create.json?.patient?.id ||
    create.json?.data?.id ||
    patientId;
  if (create.ok && createdId) patientId = createdId;

  // 2) OCR path (optional)
  if (!persona.skipOcr && persona.ocrText) {
    const ocrCreate = await requestJson(apiPort, '/api/emergency/intake/ocr-jobs', {
      method: 'POST',
      token,
      body: {
        filename: `${persona.id}-id.jpg`,
        mimeType: 'image/jpeg',
        rawText: persona.ocrText,
        documentTypeHint: 'government_id',
        patientId,
        actor: 'perf-clerk',
      },
    });
    steps.push({ step: 'ocr_create', ...ocrCreate });
    ocrJobId = ocrCreate.json?.id || ocrCreate.json?.data?.id;
    if (ocrCreate.ok && ocrJobId && Array.isArray(ocrCreate.json?.extractedFields || ocrCreate.json?.data?.extractedFields)) {
      const fields = ocrCreate.json.extractedFields || ocrCreate.json.data.extractedFields || [];
      for (const field of fields.slice(0, 4)) {
        if (!field.field) continue;
        const review = await requestJson(
          apiPort,
          `/api/emergency/intake/ocr-jobs/${encodeURIComponent(ocrJobId)}/fields/${encodeURIComponent(field.field)}/review`,
          {
            method: 'POST',
            token,
            body: { decision: 'accepted', actor: 'perf-clerk' },
          },
        );
        steps.push({ step: `ocr_review_${field.field}`, ...review });
      }
      const apply = await requestJson(
        apiPort,
        `/api/emergency/intake/ocr-jobs/${encodeURIComponent(ocrJobId)}/apply`,
        {
          method: 'POST',
          token,
          body: { actor: 'perf-clerk', autoAcceptHighConfidence: true },
        },
      );
      steps.push({ step: 'ocr_apply', ...apply });
    }
  }

  // 3) Reception handoff → triage
  const handoff = await requestJson(apiPort, '/api/emergency/reception/handoff', {
    method: 'POST',
    token,
    body: {
      patientId,
      source: 'patient-journey-performance',
      actorName: 'Perf Registration Clerk',
      arrivalReason: persona.chiefComplaint,
      complaintCategory: patient.complaintCategory,
    },
  });
  steps.push({ step: 'reception_handoff', ...handoff });
  handoffOk = handoff.ok || (handoff.json?.data?.ok === true);

  // 4) Escalation for high-risk personas
  if (persona.priority === 'P1' || persona.redFlags.length >= 2) {
    const esc = await requestJson(apiPort, '/api/emergency/reception/escalation', {
      method: 'POST',
      token,
      body: {
        reasonId: 'urgent-triage-attention',
        reasonLabel: 'Urgent triage attention requested',
        patientId,
        detail: `Perf harness: ${persona.label}`,
        actorName: 'Perf Registration Clerk',
        severity: 'Critical',
        notifyTargets: ['triage', 'charge'],
      },
    });
    steps.push({ step: 'reception_escalation', ...esc });
    escalateOk = esc.ok || esc.json?.data?.ok === true;
  }

  const totalMs = Math.round(performance.now() - t0);
  const failed = steps.filter((s) => !s.ok && s.step !== 'ocr_apply'); // apply may fail without reviews on mock
  return {
    personaId: persona.id,
    label: persona.label,
    patientId,
    totalMs,
    createOk,
    handoffOk,
    escalateOk: persona.priority === 'P1' || persona.redFlags.length >= 2 ? escalateOk : null,
    ocrJobId,
    stepCount: steps.length,
    failedSteps: failed.map((s) => ({ step: s.step, status: s.status, error: s.error, ms: s.ms })),
    steps: steps.map((s) => ({
      step: s.step,
      ok: s.ok,
      status: s.status,
      ms: s.ms,
      error: s.error || null,
    })),
    pass: createOk && handoffOk && failed.filter((s) => s.step === 'create_intake' || s.step === 'reception_handoff').length === 0,
  };
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

function gradeJourney(avgMs, passRate) {
  if (passRate >= 0.95 && avgMs < 800) return { grade: 'A', label: 'Excellent — pilot ready' };
  if (passRate >= 0.85 && avgMs < 1500) return { grade: 'B', label: 'Good — acceptable pilot latency' };
  if (passRate >= 0.7 && avgMs < 3000) return { grade: 'C', label: 'Fair — investigate slow/failing steps' };
  if (passRate >= 0.5) return { grade: 'D', label: 'Poor — critical path unstable' };
  return { grade: 'F', label: 'Fail — platform not responding as an ED front door' };
}

function toMarkdown(report) {
  const lines = [];
  lines.push('# Patient Journey Performance Report');
  lines.push('');
  lines.push(`**Generated:** ${report.generatedAt}`);
  lines.push(`**Stack:** backend :${report.backendPort} · frontend :${report.frontendPort}`);
  lines.push(`**Auth:** ${report.auth.via} (${report.auth.ms}ms)`);
  lines.push(`**Patients simulated:** ${report.patientCount}`);
  lines.push(`**Overall grade:** **${report.grade.grade}** — ${report.grade.label}`);
  lines.push('');
  lines.push('## Platform probes');
  lines.push('');
  lines.push('| Check | OK | Status | ms |');
  lines.push('|-------|----|--------|-----|');
  for (const p of report.probes) {
    lines.push(`| ${p.label} | ${p.ok ? 'yes' : 'no'} | ${p.status} | ${p.ms} |`);
  }
  lines.push('');
  lines.push('## Latency summary (per full patient journey)');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Pass rate | ${(report.summary.passRate * 100).toFixed(1)}% (${report.summary.passed}/${report.summary.total}) |`);
  lines.push(`| Avg total | ${report.summary.avgTotalMs} ms |`);
  lines.push(`| p50 | ${report.summary.p50Ms} ms |`);
  lines.push(`| p95 | ${report.summary.p95Ms} ms |`);
  lines.push(`| Max | ${report.summary.maxMs} ms |`);
  lines.push('');
  lines.push('## Step latency averages');
  lines.push('');
  lines.push('| Step | Avg ms | Failures |');
  lines.push('|------|--------|----------|');
  for (const [step, stats] of Object.entries(report.stepStats)) {
    lines.push(`| ${step} | ${stats.avgMs} | ${stats.failures} |`);
  }
  lines.push('');
  lines.push('## Persona results (as if real arrivals)');
  lines.push('');
  lines.push('| # | Persona | Pass | Total ms | Create | Handoff | Escalate |');
  lines.push('|---|---------|------|----------|--------|---------|----------|');
  report.journeys.forEach((j, i) => {
    lines.push(
      `| ${i + 1} | ${j.label} | ${j.pass ? 'PASS' : 'FAIL'} | ${j.totalMs} | ${j.createOk ? 'ok' : 'fail'} | ${j.handoffOk ? 'ok' : 'fail'} | ${j.escalateOk === null ? '—' : j.escalateOk ? 'ok' : 'fail'} |`,
    );
  });
  lines.push('');
  lines.push('## Narrative (what the platform experienced)');
  lines.push('');
  lines.push(
    `We simulated **${report.patientCount} ED arrivals** as a registration clerk: from chest pain and stroke transfer to a Spanish-speaking SOB walk-in, a febrile child, a minor ankle injury, a psych crisis, and an unknown crash at the door.`,
  );
  lines.push('');
  lines.push(
    `Each “patient” triggered the same APIs the desk uses: **create intake → optional OCR review/apply → reception handoff → optional escalation**. The stack ${report.summary.passRate >= 0.85 ? '**responded like a working front door**' : '**struggled on critical path steps**'} with average journey latency **${report.summary.avgTotalMs} ms**.`,
  );
  if (report.failures.length) {
    lines.push('');
    lines.push('### Failures');
    lines.push('');
    for (const f of report.failures.slice(0, 20)) {
      lines.push(`- **${f.personaId}** / \`${f.step}\`: HTTP ${f.status}${f.error ? ` (${f.error})` : ''}`);
    }
  }
  lines.push('');
  lines.push('## Recommendation');
  lines.push('');
  lines.push(report.recommendation);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const generatedAt = new Date().toISOString();
  console.log('\nCareDroid patient-journey performance harness');
  console.log(`Target backend :${BACKEND_PORT}  frontend :${FRONTEND_PORT}  patients=${PATIENT_COUNT}\n`);

  const probes = [];
  const beHealth = await probePort(BACKEND_PORT, '/health');
  probes.push({ label: `Backend /health (:${BACKEND_PORT})`, ...beHealth });
  const bePatients = await requestJson(BACKEND_PORT, '/api/emergency/patients');
  probes.push({
    label: 'Backend GET /api/emergency/patients (unauth probe)',
    ok: bePatients.status === 200 || bePatients.status === 401 || bePatients.status === 403,
    status: bePatients.status,
    ms: bePatients.ms,
  });

  const feHealth = await probePort(FRONTEND_PORT, '/health');
  probes.push({ label: `Frontend proxy /health (:${FRONTEND_PORT})`, ...feHealth });
  const feRoot = await requestJson(FRONTEND_PORT, '/');
  probes.push({
    label: `Frontend / (:${FRONTEND_PORT})`,
    ok: feRoot.status > 0 && feRoot.status < 500,
    status: feRoot.status,
    ms: feRoot.ms,
  });

  if (!beHealth.ok) {
    const report = {
      generatedAt,
      backendPort: BACKEND_PORT,
      frontendPort: FRONTEND_PORT,
      auth: { via: 'none', ms: 0 },
      patientCount: 0,
      probes,
      journeys: [],
      summary: { passRate: 0, passed: 0, total: 0, avgTotalMs: 0, p50Ms: 0, p95Ms: 0, maxMs: 0 },
      stepStats: {},
      failures: [],
      grade: { grade: 'F', label: 'Backend not reachable — start npm run dev' },
      recommendation:
        'Start the CareDroid stack (`npm run dev`) so backend listens on 3350 and frontend on 5190, then re-run this harness.',
    };
    mkdirSync(dirname(outJson), { recursive: true });
    writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
    writeFileSync(outMd, toMarkdown(report));
    console.error('Backend not reachable. Wrote failure report to qa/patient-journey-performance-report.md');
    process.exit(2);
  }

  const auth = await obtainToken();
  console.log(`Auth via ${auth.via} in ${auth.ms}ms`);

  // Prefer backend port for API after we have a token; FE proxy if auth only worked there
  const apiPort = auth.via === FRONTEND_PORT ? FRONTEND_PORT : BACKEND_PORT;

  const authedPatients = await requestJson(apiPort, '/api/emergency/patients', { token: auth.token });
  probes.push({
    label: 'GET /api/emergency/patients (auth)',
    ok: authedPatients.ok,
    status: authedPatients.status,
    ms: authedPatients.ms,
  });

  const snapshot = await requestJson(apiPort, '/api/emergency/reception/snapshot', { token: auth.token });
  probes.push({
    label: 'GET /api/emergency/reception/snapshot (auth)',
    ok: snapshot.ok,
    status: snapshot.status,
    ms: snapshot.ms,
  });

  const personas = pickPersonas(PATIENT_COUNT);
  const journeys = [];
  console.log(`Running ${personas.length} patient journeys against :${apiPort} ...\n`);

  // Sequential for realistic clerk cadence (not pure parallel load)
  for (const persona of personas) {
    process.stdout.write(`  → ${persona.label} ... `);
    const result = await runPersonaJourney(apiPort, auth.token, persona);
    journeys.push(result);
    console.log(`${result.pass ? 'PASS' : 'FAIL'} ${result.totalMs}ms`);
  }

  // Optional concurrent burst (stress) — 3 parallel minors
  const burstPersonas = pickPersonas(3).map((p, i) => ({
    ...p,
    id: `burst-${p.id}`,
    lastName: `${p.lastName}-Burst${i}`,
  }));
  const burstStart = performance.now();
  const burstResults = await Promise.all(
    burstPersonas.map((p) => runPersonaJourney(apiPort, auth.token, p)),
  );
  const burstMs = Math.round(performance.now() - burstStart);

  const totals = journeys.map((j) => j.totalMs).sort((a, b) => a - b);
  const passed = journeys.filter((j) => j.pass).length;
  const passRate = journeys.length ? passed / journeys.length : 0;
  const avgTotalMs = totals.length
    ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length)
    : 0;

  const stepStats = {};
  for (const j of journeys) {
    for (const s of j.steps) {
      if (!stepStats[s.step]) stepStats[s.step] = { totalMs: 0, count: 0, failures: 0 };
      stepStats[s.step].totalMs += s.ms;
      stepStats[s.step].count += 1;
      if (!s.ok) stepStats[s.step].failures += 1;
    }
  }
  for (const key of Object.keys(stepStats)) {
    const s = stepStats[key];
    s.avgMs = s.count ? Math.round(s.totalMs / s.count) : 0;
    delete s.totalMs;
    delete s.count;
  }

  const failures = [];
  for (const j of journeys) {
    for (const f of j.failedSteps) {
      failures.push({ personaId: j.personaId, ...f });
    }
  }

  const grade = gradeJourney(avgTotalMs, passRate);
  const recommendation =
    grade.grade === 'A' || grade.grade === 'B'
      ? 'Reception critical path is executable under live HTTP load. Proceed with pilot desk training; keep monitoring p95 handoff latency and escalation fan-out across stations.'
      : grade.grade === 'C'
        ? 'Platform responds but latency or intermittent failures need attention on create/handoff/OCR/auth. Re-run after checking Nest logs and JWT permissions (READ_PHI/WRITE_PHI).'
        : 'Stabilize backend reachability, auth/dev-session, and PHI permissions before pilot. Use RECEPTION_HANDOFF.md golden path against a healthy stack.';

  const report = {
    generatedAt,
    backendPort: BACKEND_PORT,
    frontendPort: FRONTEND_PORT,
    apiPort,
    auth: { via: auth.via, ms: auth.ms },
    patientCount: journeys.length,
    probes,
    journeys,
    burst: {
      parallel: burstResults.length,
      wallClockMs: burstMs,
      passRate: burstResults.filter((j) => j.pass).length / Math.max(1, burstResults.length),
      results: burstResults.map((j) => ({
        id: j.personaId,
        pass: j.pass,
        totalMs: j.totalMs,
      })),
    },
    summary: {
      passRate,
      passed,
      total: journeys.length,
      avgTotalMs,
      p50Ms: percentile(totals, 50),
      p95Ms: percentile(totals, 95),
      maxMs: totals[totals.length - 1] || 0,
    },
    stepStats,
    failures,
    grade,
    recommendation,
  };

  mkdirSync(dirname(outJson), { recursive: true });
  writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(outMd, toMarkdown(report));

  console.log('\n=== Summary ===');
  console.log(`Grade: ${grade.grade} — ${grade.label}`);
  console.log(`Pass rate: ${(passRate * 100).toFixed(1)}% (${passed}/${journeys.length})`);
  console.log(`Avg journey: ${avgTotalMs}ms  p50=${report.summary.p50Ms}  p95=${report.summary.p95Ms}`);
  console.log(`Burst (3 parallel): wall ${burstMs}ms  pass ${(report.burst.passRate * 100).toFixed(0)}%`);
  console.log(`\nWrote:\n  ${outMd}\n  ${outJson}\n`);

  process.exit(passRate >= 0.7 && beHealth.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

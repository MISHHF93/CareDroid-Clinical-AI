#!/usr/bin/env node
/**
 * Offline reception desk performance microbench + optional live API probe.
 *
 * Usage:
 *   node scripts/reception-desk-performance.mjs
 *   PATIENTS=10 BACKEND_PORT=8000 node scripts/reception-desk-performance.mjs
 *
 * Writes:
 *   qa/reception-desk-performance-report.json
 *   qa/reception-desk-performance-report.md
 */
import http from 'node:http';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import ts from 'typescript';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, '.tmp-reception-perf');
const outJson = join(root, 'qa', 'reception-desk-performance-report.json');
const outMd = join(root, 'qa', 'reception-desk-performance-report.md');

const BACKEND_PORT = Number(process.env.BACKEND_PORT || process.env.PORT || 8000);
const HOST = process.env.PERF_HOST || '127.0.0.1';
const PATIENT_COUNT = Math.max(1, Number(process.env.PATIENTS || 8));
const ITERATIONS = Math.max(100, Number(process.env.PERF_ITERS || 2000));
const TIMEOUT_MS = Number(process.env.PERF_TIMEOUT_MS || 12000);

function transpile(rel) {
  const abs = join(root, rel);
  const source = readFileSync(abs, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: abs,
  });
  let code = result.outputText.replace(/from\s+['"](\.\.?\/[^'"]+)['"]/g, (_, spec) => {
    let next = spec.replace(/\.tsx?$/, '');
    if (!next.endsWith('.js')) next = `${next}.js`;
    return `from '${next}'`;
  });
  const outRel = rel.replace(/\.tsx?$/, '.js');
  const outAbs = join(outDir, outRel);
  mkdirSync(dirname(outAbs), { recursive: true });
  writeFileSync(outAbs, code);
  return outAbs;
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    n: sorted.length,
    minMs: Number(sorted[0]?.toFixed(4) ?? 0),
    maxMs: Number(sorted[sorted.length - 1]?.toFixed(4) ?? 0),
    meanMs: Number((sum / (sorted.length || 1)).toFixed(4)),
    p50Ms: Number(percentile(sorted, 50).toFixed(4)),
    p95Ms: Number(percentile(sorted, 95).toFixed(4)),
    p99Ms: Number(percentile(sorted, 99).toFixed(4)),
  };
}

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body == null ? null : JSON.stringify(body);
    const req = http.request(
      {
        host: HOST,
        port: BACKEND_PORT,
        path,
        method,
        headers: {
          Accept: 'application/json',
          ...(payload
            ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
            : {}),
          ...headers,
        },
        timeout: TIMEOUT_MS,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {
            json = { raw: text.slice(0, 200) };
          }
          resolve({ status: res.statusCode || 0, json });
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

async function timed(fn) {
  const t0 = performance.now();
  const result = await fn();
  return { result, ms: performance.now() - t0 };
}

async function main() {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(join(outDir, 'src/contracts'), { recursive: true });
  mkdirSync(join(outDir, 'src/services/interactiveAi'), { recursive: true });
  mkdirSync(join(outDir, 'src/config'), { recursive: true });
  writeFileSync(join(outDir, 'src/contracts/interactiveAi.js'), 'export default {};\n');
  writeFileSync(
    join(outDir, 'src/services/interactiveAi/actionProposalService.js'),
    'export default {};\n',
  );

  transpile('src/config/routes.config.ts');
  transpile('src/config/receptionSkillModel.ts');
  transpile('src/services/interactiveAi/promptNavigationIntent.ts');

  const skillMod = await import(
    pathToFileURL(join(outDir, 'src/config/receptionSkillModel.js')).href
  );
  const navMod = await import(
    pathToFileURL(join(outDir, 'src/services/interactiveAi/promptNavigationIntent.js')).href
  );

  const { resolveReceptionNextBestAction, RECEPTION_ARCHETYPE_SKILLS } = skillMod;
  const { resolvePromptNavigationIntent, applyNavigationProposal } = navMod;

  const clerkSkills = RECEPTION_ARCHETYPE_SKILLS.registration_clerk;
  const contexts = [
    {
      hasDraftComplaint: false,
      hasDraftIdentity: false,
      hasSavedDraft: false,
      redFlagCount: 0,
      urgency: null,
      duplicateHighConfidenceCount: 0,
      duplicateReviewCount: 0,
      verificationQueueCount: 0,
      pretriageQueueCount: 0,
      emsQueueCount: 0,
      lookupQueryEmpty: true,
      lookupResultsCount: 0,
      canCreatePatient: true,
      skillIds: clerkSkills,
    },
    {
      hasDraftComplaint: true,
      hasDraftIdentity: true,
      hasSavedDraft: false,
      redFlagCount: 3,
      urgency: 'critical',
      duplicateHighConfidenceCount: 0,
      duplicateReviewCount: 0,
      verificationQueueCount: 2,
      pretriageQueueCount: 4,
      emsQueueCount: 1,
      lookupQueryEmpty: false,
      lookupResultsCount: 0,
      canCreatePatient: true,
      skillIds: clerkSkills,
    },
    {
      hasDraftComplaint: true,
      hasDraftIdentity: true,
      hasSavedDraft: false,
      redFlagCount: 0,
      urgency: 'standard',
      duplicateHighConfidenceCount: 1,
      duplicateReviewCount: 1,
      verificationQueueCount: 0,
      pretriageQueueCount: 0,
      emsQueueCount: 0,
      lookupQueryEmpty: false,
      lookupResultsCount: 2,
      canCreatePatient: true,
      skillIds: clerkSkills,
    },
  ];

  const prompts = [
    'Open reception desk',
    'focus patient lookup',
    'Show OCR document scan',
    'open shift clearance',
    'Open the whiteboard',
    'What is ESI level 2?',
    'Launch HEART score for this patient',
  ];
  const perms = ['use_ai_chat', 'view_phi', 'view_operations'];

  for (let i = 0; i < 50; i++) {
    resolveReceptionNextBestAction(contexts[i % contexts.length]);
    resolvePromptNavigationIntent(prompts[i % prompts.length], {
      role: 'registration_clerk',
      permissions: perms,
    });
  }

  const nbaSamples = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const t0 = performance.now();
    resolveReceptionNextBestAction(contexts[i % contexts.length]);
    nbaSamples.push(performance.now() - t0);
  }

  const intentSamples = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const t0 = performance.now();
    resolvePromptNavigationIntent(prompts[i % prompts.length], {
      role: i % 5 === 0 ? 'physician' : 'registration_clerk',
      permissions: perms,
    });
    intentSamples.push(performance.now() - t0);
  }

  const applySamples = [];
  for (let i = 0; i < Math.min(500, ITERATIONS); i++) {
    const t0 = performance.now();
    applyNavigationProposal(
      {
        toolName: 'open_route',
        validatedArguments: { path: '/emergency/reception', label: 'Reception' },
      },
      { navigate: () => undefined },
    );
    applySamples.push(performance.now() - t0);
  }

  const offline = {
    iterations: ITERATIONS,
    nextBestAction: stats(nbaSamples),
    promptNavigationIntent: stats(intentSamples),
    applyNavigationProposal: stats(applySamples),
    budgets: {
      nextBestActionP95Ms: 1,
      promptIntentP95Ms: 2,
      applyNavP95Ms: 1,
    },
  };

  offline.pass =
    offline.nextBestAction.p95Ms <= offline.budgets.nextBestActionP95Ms &&
    offline.promptNavigationIntent.p95Ms <= offline.budgets.promptIntentP95Ms &&
    offline.applyNavigationProposal.p95Ms <= offline.budgets.applyNavP95Ms;

  let live = { available: false, patients: [], summary: null, note: null };
  try {
    const health = await timed(() => request('GET', '/api/health'));
    if (health.result.status >= 200 && health.result.status < 500) {
      live.available = true;
      live.healthMs = Number(health.ms.toFixed(1));

      let token = process.env.PERF_AUTH_TOKEN || process.env.DEV_BEARER_TOKEN || '';
      try {
        const session = await request('POST', '/api/auth/dev-session', {});
        token =
          session.json?.accessToken ||
          session.json?.token ||
          session.json?.data?.accessToken ||
          session.json?.data?.token ||
          token ||
          'dev-bypass-token';
        live.authMs = Number((await timed(async () => session)).ms.toFixed?.(1) || 0);
      } catch {
        token = token || 'dev-bypass-token';
      }
      live.auth = token ? 'bearer' : 'none';

      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      const creates = [];
      for (let i = 0; i < PATIENT_COUNT; i++) {
        const body = {
          firstName: `Perf${i}`,
          lastName: `Reception${Date.now() % 10000}`,
          chiefComplaint: i % 3 === 0 ? 'Chest pain' : 'Ankle injury',
          arrivalMode: 'walk-in',
          preferredLanguage: i % 4 === 0 ? 'Spanish' : 'English',
          sex: i % 2 === 0 ? 'F' : 'M',
        };
        const t0 = performance.now();
        let res;
        try {
          res = await request('POST', '/api/emergency/intake', body, authHeaders);
          if (res.status === 404 || res.status === 401) {
            res = await request('POST', '/api/emergency/patients', body, authHeaders);
          }
        } catch (e) {
          res = { status: 0, json: { error: String(e) } };
        }
        creates.push({
          index: i,
          status: res.status,
          ms: Number((performance.now() - t0).toFixed(1)),
          ok: res.status >= 200 && res.status < 300,
        });
      }
      const list = await timed(() => request('GET', '/api/emergency/patients', null, authHeaders));
      live.patients = creates;
      live.listMs = Number(list.ms.toFixed(1));
      live.listStatus = list.result.status;
      const okCreates = creates.filter((c) => c.ok);
      const createMs = okCreates.map((c) => c.ms);
      live.summary = {
        attempted: creates.length,
        succeeded: okCreates.length,
        create: stats(createMs.length ? createMs : [0]),
      };
    }
  } catch {
    live.available = false;
    live.note = 'Backend not reachable — offline microbench only';
  }

  // Live creates are best-effort; offline budgets gate the exit code.
  // Grade A only when live creates mostly succeed.
  const liveCreateRate =
    live.summary && live.summary.attempted ? live.summary.succeeded / live.summary.attempted : 0;
  const grade = !offline.pass
    ? 'C'
    : !live.available
      ? 'B'
      : liveCreateRate >= 0.9
        ? 'A'
        : liveCreateRate > 0
          ? 'B+'
          : 'B-';

  const report = {
    generatedAt: new Date().toISOString(),
    runner: 'scripts/reception-desk-performance.mjs',
    grade,
    offline,
    live,
  };

  mkdirSync(dirname(outJson), { recursive: true });
  writeFileSync(outJson, JSON.stringify(report, null, 2));

  const md = [
    '# Reception desk performance report',
    '',
    `**Generated:** ${report.generatedAt}`,
    `**Grade:** **${grade}**`,
    '',
    '## Offline microbench (pure desk logic)',
    '',
    '| Metric | p50 | p95 | p99 | budget p95 |',
    '|--------|----:|----:|----:|-----------:|',
    `| Next-best-action | ${offline.nextBestAction.p50Ms}ms | ${offline.nextBestAction.p95Ms}ms | ${offline.nextBestAction.p99Ms}ms | ≤${offline.budgets.nextBestActionP95Ms}ms |`,
    `| Prompt→open intent | ${offline.promptNavigationIntent.p50Ms}ms | ${offline.promptNavigationIntent.p95Ms}ms | ${offline.promptNavigationIntent.p99Ms}ms | ≤${offline.budgets.promptIntentP95Ms}ms |`,
    `| Apply navigation | ${offline.applyNavigationProposal.p50Ms}ms | ${offline.applyNavigationProposal.p95Ms}ms | ${offline.applyNavigationProposal.p99Ms}ms | ≤${offline.budgets.applyNavP95Ms}ms |`,
    '',
    `Offline budgets: **${offline.pass ? 'PASS' : 'FAIL'}** (${ITERATIONS} iterations)`,
    '',
    '## Live API',
    '',
    live.available
      ? [
          `Backend :${BACKEND_PORT} reachable (health ${live.healthMs}ms).`,
          `Creates: ${live.summary.succeeded}/${live.summary.attempted} ok · p95 ${live.summary.create.p95Ms}ms`,
          `List patients: status ${live.listStatus} in ${live.listMs}ms`,
        ].join('\n')
      : live.note || 'Backend not available — skipped live creates.',
    '',
  ].join('\n');

  writeFileSync(outMd, md);
  console.log(md);
  console.log(`\nWrote ${outJson}`);
  process.exit(offline.pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

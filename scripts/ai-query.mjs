#!/usr/bin/env node
/**
 * CareDroid AI development CLI — safe local query path.
 *
 * Default mode is deterministic (local adapter / heuristic node). Live providers
 * require explicit --live and configured API keys. Never prints secrets or env keys.
 *
 * Usage:
 *   npm run ai:query -- --role reception --task answer_question --query "..."
 *   npm run ai:query -- --mode node --intent triage_recommendation --input '{"symptoms":["chest pain"]}'
 *   npm run ai:query -- --providers
 *   npm run ai:query -- --scenario data/ai-scenarios/v1/reception-missing-info.json
 */

import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function parseArgs(argv) {
  const args = {
    role: 'reception',
    task: 'answer_question',
    channel: 'api',
    query: '',
    mode: 'local',
    live: false,
    intent: 'patient_intake_assist',
    input: '{}',
    scenario: '',
    providers: false,
    organizationId: 'dev-org',
    userId: 'dev-user',
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];
    const take = () => {
      i += 1;
      return next;
    };
    switch (token) {
      case '--help':
      case '-h':
        args.help = true;
        break;
      case '--role':
        args.role = take();
        break;
      case '--task':
        args.task = take();
        break;
      case '--channel':
        args.channel = take();
        break;
      case '--query':
        args.query = take();
        break;
      case '--mode':
        args.mode = take();
        break;
      case '--live':
        args.live = true;
        break;
      case '--intent':
        args.intent = take();
        break;
      case '--input':
        args.input = take();
        break;
      case '--scenario':
        args.scenario = take();
        break;
      case '--providers':
        args.providers = true;
        break;
      case '--organization-id':
        args.organizationId = take();
        break;
      case '--user-id':
        args.userId = take();
        break;
      default:
        if (token.startsWith('-')) {
          console.error(`Unknown flag: ${token}`);
          process.exitCode = 2;
        }
    }
  }
  return args;
}

function printHelp() {
  console.log(`CareDroid AI query CLI

Options:
  --role <role>              Caller role (default: reception)
  --task <task>              Unified task id (default: answer_question)
  --channel <channel>        Channel (default: api)
  --query <text>             Free-text query
  --mode local|node|live     Execution mode (default: local)
  --live                     Allow live provider (requires keys; not used in CI)
  --intent <intent>          careDroidAI structured intent (mode=node)
  --input <json>             Structured node input JSON
  --scenario <path>          Load a scenario fixture JSON
  --providers                Print adapter health only
  --organization-id <id>     Tenant id (default: dev-org)
  --user-id <id>             User id (default: dev-user)
  -h, --help                 Show help

Exit codes:
  0 success
  1 runtime failure / blocked safety
  2 usage error
`);
}

function redactSecrets(text) {
  return String(text || '')
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, '[redacted-key]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .replace(/api[_-]?key["']?\s*[:=]\s*["'][^"']+/gi, 'api_key=[redacted]');
}

function fingerprint(value) {
  return createHash('sha256')
    .update(String(value || ''))
    .digest('hex')
    .slice(0, 12);
}

async function loadLib() {
  // Prefer compiled-path free TS via dynamic import of .ts when vitest/tsx available is overkill;
  // reimplement minimal surfaces with pure JS for CLI reliability in plain Node.
  const contractsUrl = pathToFileURL(join(ROOT, 'lib/ai/unifiedAiContracts.ts')).href;
  const safetyUrl = pathToFileURL(join(ROOT, 'lib/ai/safetyPolicy.ts')).href;
  const registryUrl = pathToFileURL(join(ROOT, 'lib/ai/providers/registry.ts')).href;
  const careDroidUrl = pathToFileURL(join(ROOT, 'lib/ai/careDroidAI.ts')).href;

  // Node cannot import .ts natively. Use the sibling .mjs-compatible fallbacks via dynamic eval
  // through existing adapters' pure logic by spawning tsx if present; otherwise pure local path.
  let tsx;
  try {
    tsx = await import('tsx/esm/api');
  } catch {
    tsx = null;
  }

  if (tsx?.register) {
    tsx.register();
  }

  try {
    const [contracts, safety, registry, careDroid] = await Promise.all([
      import(contractsUrl),
      import(safetyUrl),
      import(registryUrl),
      import(careDroidUrl),
    ]);
    return { contracts, safety, registry, careDroid };
  } catch (error) {
    // Fallback: pure JS implementation for offline deterministic mode without tsx.
    return {
      contracts: await import(pathToFileURL(join(ROOT, 'scripts/lib/ai-query-contracts.mjs')).href),
      safety: {
        reviewAIRequestForSafety: ({ prompt, patientSpecific }) => {
          const unsafe = /\b(diagnose|prescribe)\b/i.test(prompt);
          return {
            allowed: !unsafe,
            requiresHumanReview: patientSpecific === true || unsafe,
            reasons: unsafe ? ['matched unsafe autonomous action pattern'] : [],
            disclaimer: 'Human review required. This is not a replacement for clinical judgment.',
          };
        },
      },
      registry: {
        listAdapterHealth: () => [
          {
            provider: 'local',
            ok: true,
            configured: true,
            detail: 'Deterministic local adapter (CLI fallback)',
          },
        ],
      },
      careDroid: null,
      fallbackError: error,
    };
  }
}

function loadScenario(path) {
  const full = resolve(process.cwd(), path);
  if (!existsSync(full)) {
    throw new Error(`Scenario file not found: ${full}`);
  }
  return JSON.parse(readFileSync(full, 'utf8'));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const started = Date.now();
  const requestId = randomUUID();
  const correlationId = randomUUID();

  if (args.scenario) {
    const scenario = loadScenario(args.scenario);
    args.role = scenario.role || args.role;
    args.task = scenario.task || args.task;
    args.channel = scenario.channel || args.channel;
    args.query = scenario.request?.query || scenario.query || args.query;
    args.intent = scenario.intent || args.intent;
    if (scenario.request?.input) {
      args.input = JSON.stringify(scenario.request.input);
    }
    if (scenario.mode) args.mode = scenario.mode;
  }

  const lib = await loadLib();

  if (args.providers) {
    const health = lib.registry.listAdapterHealth();
    console.log(
      JSON.stringify(
        {
          requestId,
          providers: health.map((h) => ({
            provider: h.provider,
            ok: h.ok,
            configured: h.configured,
            detail: redactSecrets(h.detail),
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  if (!args.query && args.mode !== 'node') {
    console.error('Missing --query (or provide --scenario / --mode node with --input).');
    process.exitCode = 2;
    return;
  }

  const envelope = {
    requestId,
    correlationId,
    organizationId: args.organizationId,
    userId: args.userId,
    role: args.role,
    permissions: ['use_ai_chat'],
    channel: args.channel,
    task: args.task,
    query: args.query || `structured:${args.intent}`,
    responseFormat: 'structured',
  };

  const validation = lib.contracts.validateUnifiedAiRequest(envelope);
  if (!validation.valid) {
    console.error(
      JSON.stringify({ requestId, status: 'failed', errors: validation.errors }, null, 2),
    );
    process.exitCode = 2;
    return;
  }

  const safety = lib.safety.reviewAIRequestForSafety({
    prompt: args.query || args.intent,
    patientSpecific: false,
  });
  if (!safety.allowed) {
    const blocked = lib.contracts.buildBlockedUnifiedResponse({
      requestId,
      correlationId,
      reasons: safety.reasons,
      disclaimer: safety.disclaimer,
    });
    console.log(JSON.stringify({ ...blocked, latencyMs: Date.now() - started }, null, 2));
    process.exitCode = 1;
    return;
  }

  if (args.mode === 'live' || args.live) {
    console.error(
      JSON.stringify(
        {
          requestId,
          status: 'provider_unavailable',
          content:
            'Live provider mode is intentionally not invoked by this CLI unless a dedicated live harness is approved. Use mode=local|node for deterministic development.',
          model: { provider: 'none', model: 'none' },
          safety: {
            allowed: false,
            requiresHumanReview: true,
            reasons: ['live_provider_not_enabled_in_cli'],
            disclaimer: safety.disclaimer,
          },
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
    return;
  }

  if (args.mode === 'node' && lib.careDroid?.runCareDroidAI) {
    let input = {};
    try {
      input = JSON.parse(args.input || '{}');
    } catch {
      console.error('Invalid --input JSON');
      process.exitCode = 2;
      return;
    }
    const response = await lib.careDroid.runCareDroidAI({
      intent: args.intent,
      input,
      context: {
        requestId,
        userRole: args.role,
        organizationId: args.organizationId,
        sourceScreen: 'ai-query-cli',
      },
    });
    const unified = lib.contracts.mapHeuristicNodeToUnifiedResponse({
      requestId,
      correlationId,
      intent: response.intent,
      status: response.status,
      content: response.reasoning?.join(' ') || response.nextActions?.join('; ') || response.status,
      confidence: response.confidence,
      requiresClinicianReview: response.requiresClinicianReview,
      model: 'careDroidAI-node-v1',
      latencyMs: Date.now() - started,
      missingInformation: [],
      uncertainty: response.warnings || [],
      humanReview: response.requiresClinicianReview
        ? { status: 'pending', reviewType: 'clinical_ai', severity: 'high' }
        : undefined,
    });
    console.log(
      JSON.stringify(
        {
          ...unified,
          structuredData: {
            intent: response.intent,
            priority: response.priority,
            nextActions: response.nextActions,
            redFlags: response.redFlags,
            assignedRole: response.assignedRole,
          },
          queryFingerprint: fingerprint(args.query || args.intent),
        },
        null,
        2,
      ),
    );
    process.exitCode = response.status === 'success' ? 0 : 1;
    return;
  }

  // Default local deterministic answer
  const content = [
    '[CareDroid local AI CLI]',
    `Role: ${args.role}`,
    `Task: ${args.task}`,
    `Channel: ${args.channel}`,
    'Deterministic degraded-mode response (no external LLM).',
    'Human review is required before any clinical action.',
    args.query ? `Query fingerprint: ${fingerprint(args.query)}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const response = {
    requestId,
    correlationId,
    status: 'needs_human_review',
    responseType: 'answer',
    content,
    evidence: [],
    citations: [],
    confidence: 0.4,
    uncertainty: ['Local adapter does not perform clinical reasoning.'],
    missingInformation: [],
    limitations: ['Deterministic local path only; live providers not called.'],
    toolExecutions: [],
    model: {
      provider: 'local',
      model: 'local-deterministic-v1',
      latencyMs: Date.now() - started,
      fallbackApplied: false,
    },
    safety: {
      allowed: true,
      requiresHumanReview: true,
      reasons: ['local_deterministic_path'],
      disclaimer: safety.disclaimer,
    },
    humanReview: { status: 'pending', reviewType: 'clinical_ai', severity: 'high' },
    createdAt: new Date().toISOString(),
  };

  console.log(JSON.stringify(response, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        status: 'failed',
        content: redactSecrets(error instanceof Error ? error.message : String(error)),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});

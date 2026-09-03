#!/usr/bin/env node
/**
 * Unified AI Node worker.
 *
 * Runs the existing artifact-capture + train-unified-models pipeline on a
 * loop instead of as a one-shot manual command, so the "one node" manifest
 * (backend/ml-services/models/manifest.json) stays current as new artifacts
 * accumulate. Each cycle:
 *   1. Capture artifacts (fast, always runs)
 *   2. Retrain the unified NLU + artifact-router heads, but ONLY if the
 *      captured corpus actually changed since the last cycle -- a full
 *      retrain takes ~1-2h (see backend/ml-services/models/worker-runs.jsonl
 *      for real timings), so re-running it on unchanged data would just burn
 *      an hour to reproduce the same classifier.
 *   3. Re-sync the unified manifest so both heads are merged into one node.
 *   4. Append a structured run record and sleep until the next cycle.
 *
 * This process does not commit or push anything -- trained classifier/metrics
 * files are regular tracked files, reviewed and committed like any other
 * change, not auto-published by the worker.
 *
 * Env vars:
 *   AI_NODE_WORKER_INTERVAL_MS  default 21600000 (6h)
 *   AI_NODE_WORKER_RUN_ONCE     'true' => run a single cycle and exit
 *   AI_NODE_WORKER_STEP_RETRIES default 3 (retries for transient Windows spawn failures)
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, appendFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = process.cwd();
const MODELS_DIR = path.join(ROOT, 'backend', 'ml-services', 'models');
const STATE_PATH = path.join(MODELS_DIR, 'worker-state.json');
const RUNS_LOG_PATH = path.join(MODELS_DIR, 'worker-runs.jsonl');
const LOCK_PATH = path.join(MODELS_DIR, '.worker.lock');

const INTERVAL_MS = Number(process.env.AI_NODE_WORKER_INTERVAL_MS || 6 * 60 * 60 * 1000);
const RUN_ONCE = process.env.AI_NODE_WORKER_RUN_ONCE === 'true';
const STEP_RETRIES = Math.max(1, Number(process.env.AI_NODE_WORKER_STEP_RETRIES || 3));

// Windows NTSTATUS values that show up as process exit codes when CreateProcess
// fails during DLL init / abort. Observed in worker-runs.jsonl as
// "Sync unified model directory failed with exit code 3221225794".
const TRANSIENT_WINDOWS_EXIT_CODES = new Set([
  0xc0000142, // STATUS_DLL_INIT_FAILED
  0xc0000005, // STATUS_ACCESS_VIOLATION (occasional flaky child crash at start)
  0xc000013a, // STATUS_CONTROL_C_EXIT (stray console signal during spawn)
]);

const WINDOWS_EXIT_NAMES = {
  0xc0000005: 'STATUS_ACCESS_VIOLATION',
  0xc000013a: 'STATUS_CONTROL_C_EXIT',
  0xc0000142: 'STATUS_DLL_INIT_FAILED',
};

function log(msg) {
  console.log(`[ai-node-worker] ${new Date().toISOString()} ${msg}`);
}

function readJson(p, fallback = null) {
  if (!existsSync(p)) return fallback;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

/** Normalize spawn exit status to unsigned 32-bit (Windows NTSTATUS-friendly). */
function toExitCode(status) {
  if (status == null || Number.isNaN(status)) return null;
  return status < 0 ? status >>> 0 : status;
}

function formatExitCode(status) {
  const code = toExitCode(status);
  if (code == null) return 'unknown';
  const name = WINDOWS_EXIT_NAMES[code];
  if (name) return `${code} (0x${code.toString(16).toUpperCase()} ${name})`;
  if (code > 0xff) return `${code} (0x${code.toString(16).toUpperCase()})`;
  return String(code);
}

function isTransientSpawnFailure(result) {
  if (result?.error) {
    const msg = String(result.error.message || result.error);
    // Node couldn't even create the child -- often flaky under Windows shell spawn.
    return /spawn|UNKNOWN|EPERM|EBUSY|EINVAL/i.test(msg);
  }
  const code = toExitCode(result?.status);
  return code != null && TRANSIENT_WINDOWS_EXIT_CODES.has(code);
}

/**
 * Resolve a command so Windows does not need `shell: true` for node/npm.
 * Shell-spawning `node` repeatedly was correlated with STATUS_DLL_INIT_FAILED
 * (exit 3221225794) in production worker logs.
 */
function resolveCommand(command, args) {
  if (command === 'node' || command === process.execPath) {
    return { command: process.execPath, args, shell: false };
  }

  if (command === 'npm' || command === 'npm.cmd') {
    const npmCli = path.join(
      path.dirname(process.execPath),
      'node_modules',
      'npm',
      'bin',
      'npm-cli.js',
    );
    if (existsSync(npmCli)) {
      return { command: process.execPath, args: [npmCli, ...args], shell: false };
    }
    // Fallback: npm.cmd still needs a shell on Windows.
    return {
      command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
      args,
      shell: process.platform === 'win32',
    };
  }

  return { command, args, shell: process.platform === 'win32' };
}

function sleepSyncMs(ms) {
  // Brief backoff between step retries without spawning another process
  // (spawn is exactly what we are retrying around on Windows).
  const sab = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(sab), 0, 0, Math.max(0, ms));
}

function runStep(label, command, args, options = {}) {
  log(`-- ${label}`);
  const resolved = resolveCommand(command, args);
  const maxAttempts = options.retries ?? STEP_RETRIES;
  let lastResult = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    lastResult = spawnSync(resolved.command, resolved.args, {
      cwd: options.cwd || ROOT,
      stdio: 'inherit',
      shell: resolved.shell,
      windowsHide: true,
      env: { ...process.env, ...(options.env || {}) },
    });

    if (!lastResult.error && lastResult.status === 0) {
      return lastResult;
    }

    const detail = lastResult.error
      ? `spawn error: ${lastResult.error.message}`
      : `exit code ${formatExitCode(lastResult.status)}${lastResult.signal ? ` signal=${lastResult.signal}` : ''}`;

    if (attempt < maxAttempts && isTransientSpawnFailure(lastResult)) {
      const backoffMs = 400 * attempt;
      log(
        `${label} transient failure (${detail}) -- retry ${attempt}/${maxAttempts} after ${backoffMs}ms`,
      );
      sleepSyncMs(backoffMs);
      continue;
    }

    throw new Error(`${label} failed with ${detail}`);
  }

  throw new Error(`${label} failed after ${maxAttempts} attempts`);
}

function isPidAlive(pid) {
  if (!pid || !Number.isFinite(pid)) return false;
  try {
    // signal 0 sends nothing -- it only checks whether the pid is a live process
    // we're allowed to signal (works cross-platform, incl. Windows via libuv).
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireLock() {
  if (existsSync(LOCK_PATH)) {
    const existing = readJson(LOCK_PATH, {});
    if (isPidAlive(existing.pid)) {
      throw new Error(
        `Lock file present (${LOCK_PATH}) -- another worker is running (pid ${existing.pid}, started ${existing.startedAt ?? 'unknown'}). ` +
          `Stop the other process (or delete the lock only if that pid is truly dead) before starting a second worker.`,
      );
    }
    // Stale lock: the recorded pid is dead (e.g. the process was force-killed
    // rather than given a chance to run its SIGINT/SIGTERM handler, which is
    // how this harness's own task-stop mechanism behaves on Windows). Safe to
    // reclaim automatically instead of requiring a manual delete every time.
    log(`Found stale lock from dead pid ${existing.pid ?? 'unknown'} -- reclaiming it.`);
  }
  writeFileSync(
    LOCK_PATH,
    JSON.stringify(
      {
        pid: process.pid,
        startedAt: new Date().toISOString(),
        intervalMs: INTERVAL_MS,
        cwd: ROOT,
      },
      null,
      2,
    ),
  );
}

function releaseLock() {
  if (!existsSync(LOCK_PATH)) return;
  const existing = readJson(LOCK_PATH, {});
  // Never delete another live worker's lock (e.g. if we lost ownership somehow).
  if (existing?.pid && existing.pid !== process.pid && isPidAlive(existing.pid)) {
    log(`Not releasing lock held by live pid ${existing.pid}.`);
    return;
  }
  try {
    unlinkSync(LOCK_PATH);
  } catch {
    // ignore races on shutdown
  }
}

function assertLockHeld() {
  const existing = readJson(LOCK_PATH, {});
  if (!existing || existing.pid !== process.pid) {
    throw new Error(
      `Lost worker lock (expected pid ${process.pid}, file has ${existing?.pid ?? 'nothing'}). Exiting to avoid dual workers.`,
    );
  }
}

function captureArtifactSignature() {
  // artifact-intelligence:generate writes these files every cycle; their
  // sizes are a cheap, honest proxy for "did the corpus change" -- no need
  // to hash content when a row-count delta already tells us what we need.
  const catalog = readJson(path.join(ROOT, 'data', 'artifacts', 'caredroid_artifacts.json'));
  const trainingCsvPath = path.join(ROOT, 'data', 'ml', 'artifact_training_dataset.csv');
  const trainingRows = existsSync(trainingCsvPath)
    ? readFileSync(trainingCsvPath, 'utf8').split(/\r?\n/).filter(Boolean).length - 1 // minus header
    : null;
  if (!Array.isArray(catalog)) return null;
  return { artifacts: catalog.length, trainingRows };
}

function signaturesEqual(a, b) {
  if (!a || !b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

function runCycle() {
  assertLockHeld();

  const state = readJson(STATE_PATH, { lastSignature: null, cycles: 0, attempts: 0 });
  state.attempts = (state.attempts ?? 0) + 1;
  // Persisted immediately, before any work runs, so repeated failures each get
  // their own attempt number instead of all logging as the same stuck "cycle N"
  // (cycles only increments on success further below).
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  const startedAt = new Date().toISOString();
  const record = { startedAt, attempt: state.attempts, cycle: state.cycles + 1 };

  try {
    runStep('Sync unified model directory', 'node', ['scripts/sync-unified-models.mjs']);
    runStep('Capture artifacts', 'npm', ['run', 'artifact-intelligence:generate']);

    const signature = captureArtifactSignature();
    record.artifactSignature = signature;
    const changed = !signaturesEqual(signature, state.lastSignature);
    record.corpusChanged = changed;

    if (changed || RUN_ONCE) {
      log(
        changed
          ? 'Corpus changed since last cycle -- retraining.'
          : 'First/forced run -- retraining.',
      );
      runStep('Retrain unified NLU + artifact-router heads', 'npm', [
        'run',
        'train:unified-models',
      ]);
      record.retrained = true;
      const nluMetrics = readJson(path.join(MODELS_DIR, 'nlu', 'metrics.json'));
      const artifactMetrics = readJson(path.join(MODELS_DIR, 'artifact-router', 'metrics.json'));
      record.nluAccuracy = nluMetrics?.accuracy ?? null;
      record.artifactRouterAccuracy = artifactMetrics?.accuracy ?? null;
      state.lastSignature = signature;
    } else {
      log(
        'Corpus unchanged since last cycle -- skipping the ~1-2h retrain, manifest already current.',
      );
      record.retrained = false;
    }

    state.cycles += 1;
    state.lastRunAt = new Date().toISOString();
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));

    record.status = 'ok';
  } catch (error) {
    record.status = 'error';
    record.error = error instanceof Error ? error.message : String(error);
    log(`Cycle failed: ${record.error}`);
  }

  record.finishedAt = new Date().toISOString();
  appendFileSync(RUNS_LOG_PATH, `${JSON.stringify(record)}\n`);
  return record;
}

let stopRequested = false;
process.on('SIGINT', () => {
  log('SIGINT received -- will stop after the current cycle.');
  stopRequested = true;
});
process.on('SIGTERM', () => {
  log('SIGTERM received -- will stop after the current cycle.');
  stopRequested = true;
});

async function sleepInterruptible(ms) {
  const slice = 1000;
  let remaining = ms;
  while (remaining > 0 && !stopRequested) {
    const wait = Math.min(slice, remaining);
    await delay(wait);
    remaining -= wait;
  }
}

async function main() {
  acquireLock();
  log(
    `Starting. pid=${process.pid} intervalMs=${INTERVAL_MS} runOnce=${RUN_ONCE} stepRetries=${STEP_RETRIES}`,
  );
  let consecutiveErrors = 0;
  try {
    for (;;) {
      const record = runCycle();
      const detail =
        record.status === 'error'
          ? ` -- ${record.error}`
          : record.retrained
            ? ` (retrained: nlu=${record.nluAccuracy}, artifact-router=${record.artifactRouterAccuracy})`
            : ' (no retrain needed)';
      log(`Attempt ${record.attempt} (cycle ${record.cycle}) ${record.status}${detail}`);

      if (record.status === 'error') {
        consecutiveErrors += 1;
      } else {
        consecutiveErrors = 0;
      }

      if (RUN_ONCE || stopRequested) break;

      // Back off when cycles fail so a flaky Windows spawn does not hammer every minute.
      const errorMultiplier =
        consecutiveErrors > 0 ? Math.min(2 ** Math.min(consecutiveErrors, 4), 16) : 1;
      const sleepMs = INTERVAL_MS * errorMultiplier;
      log(
        consecutiveErrors > 0
          ? `Sleeping ${Math.round(sleepMs / 1000)}s until next cycle (error backoff x${errorMultiplier}).`
          : `Sleeping ${Math.round(sleepMs / 60000)}m until next cycle.`,
      );
      await sleepInterruptible(sleepMs);
      if (stopRequested) break;
    }
  } finally {
    releaseLock();
    log('Stopped.');
  }
}

main().catch((error) => {
  releaseLock();
  console.error(error);
  process.exitCode = 1;
});

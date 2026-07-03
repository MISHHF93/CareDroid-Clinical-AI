#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backendDir = resolve(rootDir, 'backend');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const spawnDevProcess = (entry) => {
  const options = {
    cwd: entry.cwd,
    env: entry.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  };

  if (process.platform === 'win32') {
    return spawn('cmd.exe', ['/d', '/s', '/c', `${entry.command} ${entry.args.join(' ')}`], options);
  }

  return spawn(entry.command, entry.args, options);
};

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);

const backendOnly = args.has('--backend-only') || args.has('--api-only');
const frontendOnly = args.has('--frontend-only') || args.has('--web-only');
const forceRestart = args.has('--force-restart');

if (backendOnly && frontendOnly) {
  console.error('Choose either --backend-only or --frontend-only, not both.');
  process.exit(1);
}

const argValue = (name) => {
  const inline = rawArgs.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = rawArgs.indexOf(name);
  if (index >= 0) return rawArgs[index + 1];
  return undefined;
};

const parsePort = (value, fallback, label) => {
  const candidate = value || fallback;
  const port = Number.parseInt(candidate, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`Invalid ${label} port "${candidate}". Choose a value from 1 to 65535.`);
    process.exit(1);
  }
  return String(port);
};

const frontendPort = parsePort(
  argValue('--frontend-port') || process.env.FRONTEND_PORT || process.env.VITE_DEV_PORT,
  '5174',
  'frontend',
);
const backendPort = parsePort(
  argValue('--backend-port') || process.env.BACKEND_PORT || process.env.PORT,
  '3333',
  'backend',
);
const frontendOrigin = process.env.FRONTEND_URL || `http://localhost:${frontendPort}`;
const backendOrigin = process.env.VITE_API_PROXY_TARGET || `http://localhost:${backendPort}`;

const withDefaults = (defaults) => {
  const env = { ...process.env, FORCE_COLOR: process.env.FORCE_COLOR || '1' };
  for (const [key, value] of Object.entries(defaults)) {
    if (env[key] === undefined) {
      env[key] = value;
    }
  }
  return env;
};

const frontendEnv = withDefaults({
  VITE_API_URL: '',
  VITE_API_PROXY_TARGET: backendOrigin,
  VITE_DEV_PORT: frontendPort,
  FRONTEND_PORT: frontendPort,
  BACKEND_PORT: backendPort,
});

const backendEnv = withDefaults({
  NODE_ENV: 'development',
  PORT: backendPort,
  BACKEND_PORT: backendPort,
  FRONTEND_URL: frontendOrigin,
  CORS_ORIGIN: frontendOrigin,
  DATABASE_CLIENT: 'sqlite',
  SQLITE_PATH: 'caredroid.dev.sqlite',
  ENABLE_MONGOOSE_EMERGENCY_OS: 'false',
  NLU_SERVICE_ENABLED: 'false',
  ANOMALY_DETECTION_ENABLED: 'false',
  RAG_ENABLED: 'false',
  AI_ENABLED: 'false',
  REDIS_ENABLED: 'false',
  REDIS_HOST: '',
  ENCRYPTION_MASTER_KEY: '0000000000000000000000000000000000000000000000000000000000000000',
  DEV_LOGIN_EMAIL: 'dev@example.com',
  ENABLE_DEV_AUTH_BYPASS: 'true',
});

if (backendEnv.REDIS_ENABLED !== 'true') {
  backendEnv.REDIS_ENABLED = 'false';
  backendEnv.REDIS_HOST = '';
}

const isCareDroidHealthPayload = (rawBody = '') => {
  try {
    const parsed = JSON.parse(rawBody);
    if (parsed?.service === 'CareDroid API') return true;
    if (parsed?.components && typeof parsed?.responseTimeMs === 'number') return true;
    return /caredroid/i.test(JSON.stringify(parsed));
  } catch {
    return false;
  }
};

const probeHttpHealth = (port, path = '/health') =>
  new Promise((resolveProbe) => {
    const request = http.get(
      {
        host: '127.0.0.1',
        port,
        path,
        timeout: 1500,
      },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          resolveProbe({
            ok: response.statusCode === 200,
            body,
            caredroid: response.statusCode === 200 && isCareDroidHealthPayload(body),
            foreign:
              response.statusCode === 200 && !isCareDroidHealthPayload(body),
          });
        });
      },
    );

    request.on('timeout', () => {
      request.destroy();
      resolveProbe({ ok: false, body: '', caredroid: false, foreign: false });
    });
    request.on('error', () =>
      resolveProbe({ ok: false, body: '', caredroid: false, foreign: false }),
    );
  });

const probeBackendHealth = (port) =>
  probeHttpHealth(port, '/health').then((result) => result.caredroid);

const probeFrontendProxyHealth = (port) =>
  probeHttpHealth(port, '/health').then((result) => result.caredroid);

const probeForeignServiceOnPort = (port) =>
  probeHttpHealth(port, '/health').then((result) => result.foreign);

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

const waitForBackend = async (port, { timeoutMs = 180000, intervalMs = 750 } = {}) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await probeBackendHealth(port)) return true;
    await sleep(intervalMs);
  }
  return false;
};

const resolveBackendStartArgs = () => {
  const distMain = resolve(backendDir, 'dist', 'main.js');
  if (existsSync(distMain)) {
    return ['run', 'start:prod'];
  }
  return ['run', 'start:watch'];
};

const children = [];
let stopping = false;

const terminateChild = (child) => {
  if (child.killed || child.exitCode !== null || child.signalCode !== null) return;

  if (process.platform === 'win32' && child.pid) {
    const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
    });
    killer.on('error', () => child.kill());
    return;
  }

  child.kill();
};

const pipeWithPrefix = (stream, name, output) => {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    for (const line of lines) {
      output.write(`[${name}] ${line}\n`);
    }
  });
  stream.on('end', () => {
    if (buffer) {
      output.write(`[${name}] ${buffer}\n`);
    }
  });
};

const shutdown = (code = 0) => {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    terminateChild(child);
  }
  setTimeout(() => process.exit(code), 250);
};

const spawnManagedProcess = (entry) => {
  let child;
  try {
    child = spawnDevProcess(entry);
  } catch (error) {
    console.error(
      `[${entry.name}] failed to spawn ${entry.command} ${entry.args.join(' ')} in ${entry.cwd}`,
    );
    console.error(error?.stack || error?.message || error);
    shutdown(1);
    return null;
  }

  children.push(child);
  pipeWithPrefix(child.stdout, entry.name, process.stdout);
  pipeWithPrefix(child.stderr, entry.name, process.stderr);

  child.on('error', (error) => {
    if (stopping) return;
    console.error(
      `[${entry.name}] failed to start ${entry.command} ${entry.args.join(' ')} in ${entry.cwd}`,
    );
    console.error(error?.stack || error?.message || error);
    shutdown(1);
  });

  child.on('exit', async (code, signal) => {
    if (stopping) return;
    const exitCode = code ?? (signal ? 1 : 0);

    if (entry.name === 'api' && exitCode !== 0) {
      const healthy = await probeBackendHealth(backendPort);
      if (healthy) {
        console.warn(
          `[api] failed to bind port ${backendPort}, but an existing backend is healthy. Continuing.`,
        );
        return;
      }
    }

    if (entry.name === 'web' && exitCode !== 0) {
      const proxyHealthy = await probeFrontendProxyHealth(frontendPort);
      if (proxyHealthy) {
        console.warn(
          `[web] port ${frontendPort} is already serving CareDroid (Vite likely already running).`,
        );
        console.log(`Open ${frontendOrigin}`);
        process.exit(0);
        return;
      }
    }

    console.error(
      `[${entry.name}] exited${signal ? ` with signal ${signal}` : ` with code ${exitCode}`}`,
    );
    shutdown(exitCode);
  });

  return child;
};

const backendAlreadyHealthy = !forceRestart && (await probeBackendHealth(backendPort));
const frontendProxyHealthy =
  !forceRestart && (await probeFrontendProxyHealth(frontendPort));
const foreignServiceOnBackendPort =
  !backendAlreadyHealthy && (await probeForeignServiceOnPort(backendPort));
const foreignServiceOnFrontendPort =
  !frontendProxyHealthy && (await probeForeignServiceOnPort(frontendPort));

if (foreignServiceOnBackendPort) {
  console.error(
    `Port ${backendPort} is already in use by a non-CareDroid service (for example another local app on :3000 or :8000).`,
  );
  console.error(
    `Set BACKEND_PORT to a free port (default 3333) in .env / backend/.env, then rerun npm run dev:fullstack.`,
  );
  process.exit(1);
}

if (foreignServiceOnFrontendPort) {
  console.error(
    `Port ${frontendPort} is already in use by a non-CareDroid service (for example another app on :8000).`,
  );
  console.error(
    `Set FRONTEND_PORT / VITE_DEV_PORT to a free port (default 5174) in .env, then rerun npm run dev:fullstack.`,
  );
  process.exit(1);
}

if (!backendOnly && backendAlreadyHealthy && frontendProxyHealthy) {
  console.log('CareDroid local stack is already running.');
  console.log(`App:      ${frontendOrigin}`);
  console.log(`Backend:  http://localhost:${backendPort}`);
  console.log(`Health:   ${frontendOrigin}/health`);
  console.log('Use --force-restart to stop and relaunch both processes.');
  process.exit(0);
}

console.log('Starting CareDroid local stack...');
console.log(`App:      ${frontendOrigin}  (API proxied via /api)`);
console.log(`Backend:  http://localhost:${backendPort}  (internal Nest)`);
console.log(`Health:   ${frontendOrigin}/health`);
if (backendAlreadyHealthy) {
  console.log(
    `Backend already healthy on port ${backendPort}; skipping API restart. Use --force-restart to start a new instance.`,
  );
}
console.log('');

if (backendOnly && backendAlreadyHealthy) {
  console.log('Backend is ready. No additional processes started.');
  process.exit(0);
}

if (backendOnly && frontendOnly) {
  console.error('Nothing to start.');
  process.exit(1);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

if (!frontendOnly && !backendAlreadyHealthy) {
  const backendArgs = resolveBackendStartArgs();
  console.log(`[api] starting backend (${backendArgs.slice(1).join(' ')})...`);
  const apiChild = spawnManagedProcess({
    name: 'api',
    cwd: backendDir,
    command: npmCommand,
    args: backendArgs,
    env: backendEnv,
  });
  if (!apiChild) {
    process.exit(1);
  }

  if (!backendOnly) {
    console.log('[web] waiting for API health before starting Vite (avoids ERR_CONNECTION_REFUSED)...');
    const ready = await waitForBackend(backendPort);
    if (!ready) {
      console.error(
        `[web] backend did not respond on http://localhost:${backendPort}/health within 3 minutes.`,
      );
      shutdown(1);
      process.exit(1);
    }
    console.log('[web] API ready — starting Vite dev server.');
  }
}

if (!backendOnly) {
  spawnManagedProcess({
    name: 'web',
    cwd: rootDir,
    command: npmCommand,
    args: ['run', 'dev'],
    env: frontendEnv,
  });
}

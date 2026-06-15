#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backendDir = resolve(rootDir, 'backend');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const useShell = process.platform === 'win32';
const args = new Set(process.argv.slice(2));

const backendOnly = args.has('--backend-only') || args.has('--api-only');
const frontendOnly = args.has('--frontend-only') || args.has('--web-only');

if (backendOnly && frontendOnly) {
  console.error('Choose either --backend-only or --frontend-only, not both.');
  process.exit(1);
}

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
  VITE_API_PROXY_TARGET: 'http://localhost:3000',
});

const backendEnv = withDefaults({
  NODE_ENV: 'development',
  PORT: '3000',
  FRONTEND_URL: 'http://localhost:8000',
  CORS_ORIGIN: 'http://localhost:8000',
  DATABASE_CLIENT: 'sqlite',
  SQLITE_PATH: 'caredroid.dev.sqlite',
  ENABLE_MONGOOSE_EMERGENCY_OS: 'false',
  NLU_SERVICE_ENABLED: 'false',
  ANOMALY_DETECTION_ENABLED: 'false',
  RAG_ENABLED: 'false',
  AI_ENABLED: 'false',
  ENCRYPTION_MASTER_KEY: '0000000000000000000000000000000000000000000000000000000000000000',
  DEV_LOGIN_EMAIL: 'dev@example.com',
});

const commands = [
  !frontendOnly && {
    name: 'api',
    cwd: backendDir,
    command: npmCommand,
    args: ['run', 'start:dev'],
    env: backendEnv,
  },
  !backendOnly && {
    name: 'web',
    cwd: rootDir,
    command: npmCommand,
    args: ['run', 'dev'],
    env: frontendEnv,
  },
].filter(Boolean);

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

console.log('Starting CareDroid local stack...');
console.log('Frontend: http://localhost:8000');
console.log('Backend:  http://localhost:3000');
console.log('Health:   http://localhost:3000/health');
console.log('');

for (const entry of commands) {
  let child;
  try {
    child = spawn(entry.command, entry.args, {
      cwd: entry.cwd,
      env: entry.env,
      shell: useShell,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
  } catch (error) {
    console.error(`[${entry.name}] failed to spawn ${entry.command} ${entry.args.join(' ')} in ${entry.cwd}`);
    console.error(error?.stack || error?.message || error);
    shutdown(1);
    break;
  }

  children.push(child);
  pipeWithPrefix(child.stdout, entry.name, process.stdout);
  pipeWithPrefix(child.stderr, entry.name, process.stderr);

  child.on('error', (error) => {
    if (stopping) return;
    console.error(`[${entry.name}] failed to start ${entry.command} ${entry.args.join(' ')} in ${entry.cwd}`);
    console.error(error?.stack || error?.message || error);
    shutdown(1);
  });

  child.on('exit', (code, signal) => {
    if (stopping) return;
    const exitCode = code ?? (signal ? 1 : 0);
    console.error(`[${entry.name}] exited${signal ? ` with signal ${signal}` : ` with code ${exitCode}`}`);
    shutdown(exitCode);
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

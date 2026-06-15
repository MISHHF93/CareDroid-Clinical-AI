import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

describe('build and service config consistency', () => {
  it('keeps Docker Compose ports aligned with Vite and Nest defaults', () => {
    const compose = read('docker-compose.yml');
    const packageJson = read('package.json');

    expect(compose).toContain('- "3000:3000"');
    expect(compose).toContain('- "8000:8000"');
    expect(packageJson).toContain('"dev": "vite --port 8000 --strictPort"');
    expect(packageJson).toContain('"dev:lan": "vite --port 8000 --strictPort --host"');
    expect(read('vite.config.js')).toContain('strictPort: true');
    expect(compose).toContain(
      'VITE_API_PROXY_TARGET: ${VITE_API_PROXY_TARGET:-http://backend:3000}',
    );
    expect(compose).toContain(
      'DATABASE_URL: postgresql://${DB_USER:-postgres}:${DB_PASSWORD:-secure123}@postgres:5432/${DB_NAME:-caredroid}',
    );
    expect(read('backend/src/config/database.config.ts')).toContain('buildPostgresOptions');
    expect(read('backend/src/data-source.ts')).toContain('buildPostgresOptions');
  });

  it('keeps app-only Docker Compose aligned with local full-stack defaults', () => {
    const appCompose = read('docker-compose.app.yml');

    expect(appCompose).toContain("- '3000:3000'");
    expect(appCompose).toContain("- '8000:8000'");
    expect(appCompose).toContain('DATABASE_CLIENT: sqlite');
    expect(appCompose).toContain('SQLITE_PATH: /data/caredroid.dev.sqlite');
    expect(appCompose).toContain('VITE_API_PROXY_TARGET: http://backend:3000');
    expect(appCompose).toContain('NLU_SERVICE_ENABLED: ${NLU_SERVICE_ENABLED:-false}');
    expect(appCompose).toContain("ANOMALY_DETECTION_ENABLED: 'false'");
    expect(appCompose).toContain("RAG_ENABLED: 'false'");
  });

  it('keeps optional ML compose enabling tied to the NLU sidecar profile', () => {
    const appCompose = read('docker-compose.app.yml');
    const mlCompose = read('docker-compose.ml.yml');
    const packageJson = read('package.json');

    expect(appCompose).toContain('profiles:');
    expect(appCompose).toContain('- ml');
    expect(mlCompose).toContain("NLU_SERVICE_ENABLED: 'true'");
    expect(mlCompose).toContain('- nlu');
    expect(packageJson).toContain(
      '-f docker-compose.app.yml -f docker-compose.ml.yml --profile ml',
    );
  });

  it('does not allow Vercel same-origin /api unless a proxy is verified', () => {
    const vercel = read('vercel.json');
    const validator = read('scripts/validate-vercel-env.mjs');

    expect(vercel).toContain('VITE_ALLOW_SAME_ORIGIN_API:-false');
    expect(validator).toContain('VITE_SAME_ORIGIN_API_PROXY_VERIFIED');
    expect(validator).toContain('VITE_API_URL is required for Vercel frontend deploys');
    expect(validator).toContain('!isDemoMode');
  });

  it('allows static Vercel demo builds without a backend API origin', () => {
    const result = spawnSync(process.execPath, ['scripts/validate-vercel-env.mjs'], {
      cwd: root,
      env: {
        ...process.env,
        VERCEL: '1',
        VERCEL_ENV: 'production',
        VITE_ALLOW_SAME_ORIGIN_API: 'false',
        VITE_DEMO_MODE: 'true',
        VITE_ENABLE_DEV_AUTH_BYPASS: 'false',
        VITE_API_URL: '',
        VITE_HIDE_DIVISION_MODE: '',
        VITE_SAME_ORIGIN_API_PROXY_VERIFIED: '',
      },
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Vercel environment validation passed.');
  });

  it('keeps backend production entrypoint aligned with package.json', () => {
    expect(read('backend/package.json')).toContain('"start:prod": "node dist/backend/src/main.js"');
    expect(read('backend/Dockerfile')).toContain('CMD ["node", "dist/backend/src/main.js"]');
  });

  it('keeps frontend and backend Node runtime baselines aligned', () => {
    expect(read('.node-version').trim()).toBe('20');
    expect(read('package.json')).toContain('"node": ">=20.19.0"');
    expect(read('backend/package.json')).toContain('"node": ">=20.19.0"');
    expect(read('Dockerfile')).toContain('FROM node:20-alpine');
    expect(read('backend/Dockerfile')).toContain('FROM node:20-alpine');
  });

  it('keeps backend dev scripts pointed at the widened build entrypoint', () => {
    const backendPackageJson = read('backend/package.json');

    expect(backendPackageJson).toContain('"start": "nest start --entryFile backend/src/main"');
    expect(backendPackageJson).toContain(
      '"start:dev": "nest start --watch --entryFile backend/src/main"',
    );
    expect(read('backend/tsconfig.json')).toContain('"rootDir": ".."');
    expect(read('scripts/clean.mjs')).toContain("'backend/dist'");
    expect(read('scripts/dev-stack.mjs')).toContain("stdio: ['ignore', 'pipe', 'pipe']");
    expect(read('scripts/dev-stack.mjs')).toContain("spawn('taskkill'");
    expect(read('scripts/dev-stack.mjs')).toContain("DEV_LOGIN_EMAIL: 'dev@example.com'");
  });

  it('keeps anomaly detection optional until a service is explicitly configured', () => {
    const compose = read('docker-compose.yml');

    expect(read('backend/src/config/anomaly-detection.config.ts')).toContain(
      "ANOMALY_DETECTION_ENABLED === 'true'",
    );
    expect(compose).toContain('ANOMALY_DETECTION_ENABLED: ${ANOMALY_DETECTION_ENABLED:-false}');
    expect(compose).not.toContain('\n  anomaly-detection:');
    expect(compose).not.toContain('./backend/ml-services/anomaly-detection');
  });

  it('normalizes NLU defaults to port 8001', () => {
    expect(read('backend/.env.example')).toContain('NLU_SERVICE_URL=http://localhost:8001');
    expect(read('backend/src/config/nlu.config.ts')).toContain('http://localhost:8001');
    expect(read('docker-compose.yml')).toContain(
      'NLU_SERVICE_URL: ${NLU_SERVICE_URL:-http://nlu:8001}',
    );
  });

  it('separates backend NLU client threshold from sidecar inference threshold', () => {
    expect(read('backend/.env.example')).toContain('NLU_CONFIDENCE_THRESHOLD=0.7');
    expect(read('backend/src/config/nlu.config.ts')).toContain('NLU_CONFIDENCE_THRESHOLD');
    expect(read('backend/ml-services/nlu/.env.example')).toContain(
      'NLU_INFERENCE_CONFIDENCE_THRESHOLD=0.5',
    );
    expect(read('backend/ml-services/nlu/config.py')).toContain(
      'NLU_INFERENCE_CONFIDENCE_THRESHOLD',
    );
  });

  it('provides the root frontend Dockerfile used by docker-compose', () => {
    const dockerfile = read('Dockerfile');

    expect(dockerfile).toContain('EXPOSE 8000');
    expect(dockerfile).toContain('CMD ["npm", "run", "dev:lan"]');
  });

  it('keeps provider API keys out of browser config', () => {
    expect(read('.env.example')).not.toContain('VITE_ANTHROPIC_API_KEY=');
    expect(read('src/config/appConfig.js')).not.toContain('VITE_ANTHROPIC_API_KEY');
    expect(read('src/services/clinicalChatService.js')).toContain('/api/chat/message');
  });
});

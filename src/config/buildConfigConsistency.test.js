import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

describe('build and service config consistency', () => {
  it('keeps Docker Compose ports aligned with Vite and Nest defaults', () => {
    const compose = read('docker-compose.yml');

    expect(compose).toContain('- "3000:3000"');
    expect(compose).toContain('- "8000:8000"');
    expect(compose).toContain('VITE_API_PROXY_TARGET: ${VITE_API_PROXY_TARGET:-http://backend:3000}');
    expect(compose).toContain('DATABASE_URL: postgresql://${DB_USER:-postgres}:${DB_PASSWORD:-secure123}@postgres:5432/${DB_NAME:-caredroid}');
    expect(read('backend/src/config/database.config.ts')).toContain('buildPostgresOptions');
    expect(read('backend/src/data-source.ts')).toContain('buildPostgresOptions');
  });

  it('does not allow Vercel same-origin /api unless a proxy is verified', () => {
    const vercel = read('vercel.json');
    const validator = read('scripts/validate-vercel-env.mjs');

    expect(vercel).toContain('VITE_ALLOW_SAME_ORIGIN_API:-false');
    expect(validator).toContain('VITE_SAME_ORIGIN_API_PROXY_VERIFIED');
    expect(validator).toContain('VITE_API_URL is required for Vercel frontend deploys');
  });

  it('keeps backend production entrypoint aligned with package.json', () => {
    expect(read('backend/package.json')).toContain('"start:prod": "node dist/src/main.js"');
    expect(read('backend/Dockerfile')).toContain('CMD ["node", "dist/src/main.js"]');
  });

  it('normalizes NLU defaults to port 8001', () => {
    expect(read('backend/.env.example')).toContain('NLU_SERVICE_URL=http://localhost:8001');
    expect(read('backend/src/config/nlu.config.ts')).toContain('http://localhost:8001');
    expect(read('docker-compose.yml')).toContain('NLU_SERVICE_URL: ${NLU_SERVICE_URL:-http://nlu:8001}');
  });

  it('separates backend NLU client threshold from sidecar inference threshold', () => {
    expect(read('backend/.env.example')).toContain('NLU_CONFIDENCE_THRESHOLD=0.7');
    expect(read('backend/src/config/nlu.config.ts')).toContain('NLU_CONFIDENCE_THRESHOLD');
    expect(read('backend/ml-services/nlu/.env.example')).toContain('NLU_INFERENCE_CONFIDENCE_THRESHOLD=0.5');
    expect(read('backend/ml-services/nlu/config.py')).toContain('NLU_INFERENCE_CONFIDENCE_THRESHOLD');
  });

  it('provides the root frontend Dockerfile used by docker-compose', () => {
    const dockerfile = read('Dockerfile');

    expect(dockerfile).toContain('EXPOSE 8000');
    expect(dockerfile).toContain('CMD ["npm", "run", "dev:lan"]');
  });

  it('keeps provider API keys out of browser config', () => {
    expect(read('.env.example')).not.toContain('VITE_ANTHROPIC_API_KEY=');
    expect(read('src/config/appConfig.js')).not.toContain('VITE_ANTHROPIC_API_KEY');
    expect(read('src/services/openaiService.ts')).toContain('API_ROUTES.chat.message');
  });
});

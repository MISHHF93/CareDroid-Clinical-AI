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

  it('provides the root frontend Dockerfile used by docker-compose', () => {
    const dockerfile = read('Dockerfile');

    expect(dockerfile).toContain('EXPOSE 8000');
    expect(dockerfile).toContain('CMD ["npm", "run", "dev:lan"]');
  });
});

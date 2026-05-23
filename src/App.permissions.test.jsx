import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, 'App.jsx'), 'utf8');

function routeBlock(path) {
  const pathIndex = appSource.indexOf(`path: '${path}'`);
  const nextPathIndex = appSource.indexOf('\n    { path:', pathIndex + 1);
  return appSource.slice(pathIndex, nextPathIndex === -1 ? undefined : nextPathIndex);
}

describe('App clinical-intelligence route permissions', () => {
  it.each([
    '/tools/ambient-scribe',
    '/tools/differential-ai',
    '/tools/timeline-ai',
    '/tools/patient-summary-ai',
    '/tools/order-set-ai',
    '/tools/ai-explainability',
  ])('%s requires PHI read and AI chat permissions', (path) => {
    const block = routeBlock(path);

    expect(block).toContain('Permission.READ_PHI');
    expect(block).toContain('Permission.USE_AI_CHAT');
    expect(block).toContain('requireAllPermissions: true');
  });

  it('keeps guideline RAG available to USE_AI_CHAT users', () => {
    const block = routeBlock('/tools/guideline-rag');

    expect(block).toContain('permission: Permission.USE_AI_CHAT');
    expect(block).not.toContain('Permission.READ_PHI');
  });

  it('matches Clinical Audit to the backend audit-log permission', () => {
    const block = routeBlock('/tools/clinical-audit');

    expect(block).toContain('permission: Permission.VIEW_AUDIT_LOGS');
  });
});

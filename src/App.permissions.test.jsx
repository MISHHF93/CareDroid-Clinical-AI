import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  getFrontendVisibleToolInventory,
  TOOL_EXECUTOR_STATUS,
  TOOL_PERMISSION_LOGIC,
} from './data/toolInventory';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, 'App.jsx'), 'utf8');

function routeBlock(path) {
  const pathIndex = appSource.indexOf(`path: '${path}'`);
  const blockEnd = appSource.indexOf('\n    },', pathIndex + 1);
  return appSource.slice(pathIndex, blockEnd === -1 ? undefined : blockEnd + 7);
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

  it('keeps App route preflight aligned with canonical inventory permission policies', () => {
    const clinicalIntelligenceRecords = getFrontendVisibleToolInventory().filter(
      (record) =>
        record.executorStatus === TOOL_EXECUTOR_STATUS.PLATFORM &&
        record.endpoint?.startsWith('/api/clinical-intelligence/')
    );

    expect(clinicalIntelligenceRecords.length).toBeGreaterThan(0);

    for (const record of clinicalIntelligenceRecords) {
      const block = routeBlock(record.route);

      expect(block, `${record.id} route block`).toContain(`path: '${record.route}'`);
      expect(record.permissionPolicy, `${record.id} permission policy`).toBeTruthy();
      for (const permission of record.permissionPolicy.permissions) {
        expect(block, `${record.id} missing ${permission}`).toContain(`Permission.${permission}`);
      }
      if (
        record.permissionPolicy.logic === TOOL_PERMISSION_LOGIC.ALL &&
        record.permissionPolicy.permissions.length > 1
      ) {
        expect(block, `${record.id} should require all permissions`).toContain(
          'requireAllPermissions: true'
        );
      }
    }
  });
});

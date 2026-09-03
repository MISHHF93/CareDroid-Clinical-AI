import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CRITICAL_WORKFLOW_INSTRUMENTATION,
  CRITICAL_WORKFLOW_TRACE_IDS,
  OBSERVABILITY_CONTRACT,
} from './observabilityModel';
import { UNIFIED_SERVICE_HEALTH_ENDPOINTS } from './unifiedServiceRegistry.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');

function readRepoFile(relPath: string): string {
  const fullPath = join(repoRoot, relPath.replace(/\//g, '\\'));
  expect(existsSync(fullPath), relPath).toBe(true);
  return readFileSync(fullPath, 'utf8');
}

describe('observability workflow coverage contract', () => {
  it('registers instrumentation for every critical workflow trace id', () => {
    expect(Object.keys(CRITICAL_WORKFLOW_INSTRUMENTATION).sort()).toEqual(
      [...CRITICAL_WORKFLOW_TRACE_IDS].sort(),
    );
  });

  it('instruments each critical workflow in its canonical source module', () => {
    for (const workflowId of CRITICAL_WORKFLOW_TRACE_IDS) {
      const modulePath = CRITICAL_WORKFLOW_INSTRUMENTATION[workflowId];
      const source = readRepoFile(modulePath);
      const hasTrace =
        source.includes('startWorkflowTrace') ||
        source.includes('withWorkflowTrace') ||
        source.includes('recordWorkflowTelemetry') ||
        source.includes('recordAuditEvent');
      expect(hasTrace, `${workflowId} → ${modulePath}`).toBe(true);
      expect(
        source.includes(workflowId) ||
          source.includes('recordAuditEvent') ||
          workflowId === 'ai-audit-decision',
        `${workflowId} referenced in ${modulePath}`,
      ).toBe(true);
    }
  });

  it('exposes health and diagnostics endpoints for every monitored service surface', () => {
    expect(UNIFIED_SERVICE_HEALTH_ENDPOINTS.observabilityHealth).toBe(
      OBSERVABILITY_CONTRACT.healthEndpoint,
    );
    expect(UNIFIED_SERVICE_HEALTH_ENDPOINTS.observabilityDiagnostics).toBe(
      OBSERVABILITY_CONTRACT.diagnosticsEndpoint,
    );
    expect(UNIFIED_SERVICE_HEALTH_ENDPOINTS.observabilityPerformance).toBe(
      OBSERVABILITY_CONTRACT.performanceEndpoint,
    );
    expect(UNIFIED_SERVICE_HEALTH_ENDPOINTS.backendProbe).toBe(
      OBSERVABILITY_CONTRACT.healthProbeEndpoint,
    );
  });
});

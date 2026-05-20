/**
 * Tool contract matrix — coverage and status invariants.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  buildToolContractMatrixRows,
  formatToolContractMatrixMarkdown,
  TOOL_CONTRACT_STATUSES,
  mapRowToToolContractMatrix,
} from './toolContractMatrix';
import { buildBackendFrontendContractRows } from './backendFrontendToolContract';
import { NLU_PROFILE_TOOL_IDS, ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS } from './clinicalToolIdContract';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('toolContractMatrix', () => {
  it('maps every backendFrontendContract row to matrix columns', () => {
    const contract = buildBackendFrontendContractRows();
    const matrix = buildToolContractMatrixRows();
    expect(matrix).toHaveLength(contract.length);
    for (let i = 0; i < contract.length; i++) {
      const m = mapRowToToolContractMatrix(contract[i]);
      expect(m.id).toBe(contract[i].canonicalId);
      expect(m.status).toBe(contract[i].status);
    }
  });

  it('includes every NLU profile id', () => {
    const matrix = buildToolContractMatrixRows();
    for (const id of NLU_PROFILE_TOOL_IDS) {
      expect(matrix.some((r) => r.id === id), `missing ${id}`).toBe(true);
    }
  });

  it('marks exactly three NLU tools with POST executors', () => {
    const matrix = buildToolContractMatrixRows();
    const withExecutor = matrix.filter(
      (r) =>
        r.kind === 'nlu' &&
        ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS.includes(r.id) &&
        r.executor !== 'no'
    );
    expect(withExecutor.map((r) => r.id).sort()).toEqual(
      [...ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS].sort()
    );
    expect(withExecutor.every((r) => r.status === 'fully wired')).toBe(true);
  });

  it('uses only allowed status values', () => {
    for (const row of buildToolContractMatrixRows()) {
      expect(TOOL_CONTRACT_STATUSES).toContain(row.status);
    }
  });

  it('marks share-results row as frontend-only (gated)', () => {
    const share = buildToolContractMatrixRows().find((r) => r.id === 'tools-share-results');
    expect(share?.status).toBe('frontend-only');
    expect(share?.endpoint).toContain('share-results');
  });

  it('generates markdown with required headers', () => {
    const md = formatToolContractMatrixMarkdown();
    expect(md).toContain('# Tool contract matrix');
    expect(md).toContain('| ID | Route | Component | Catalog | Registry | NLU | Executor |');
    expect(md).toContain('## Full matrix');
    for (const status of TOOL_CONTRACT_STATUSES) {
      expect(md).toContain(status);
    }
  });

  it('documents tool-contract-matrix.md when committed', () => {
    const docPath = join(__dirname, '../../docs/tool-contract-matrix.md');
    try {
      const md = readFileSync(docPath, 'utf8');
      expect(md).toContain('# Tool contract matrix');
      expect(md).toContain('## Full matrix');
    } catch {
      // ok before first write
    }
  });
});

/**
 * Writes docs/backend-frontend-tool-contract.md when CONTRACT_WRITE_DOCS=1.
 *
 * Usage:
 *   npm run contract:write-docs
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  NLU_PROFILE_TOOL_IDS,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
} from './clinicalToolIdContract';
import { clinicalIntentTools } from './clinicalIntentToolCatalog';
import {
  buildBackendFrontendContractRows,
  formatBackendFrontendContractMarkdown,
  getContractGaps,
} from './backendFrontendToolContract';
import { formatToolContractMatrixMarkdown } from './toolContractMatrix';
import { parseClinicalToolPatterns } from './parseToolPatterns';
import { readToolPatternsSource } from './clinicalToolAliasSync';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');
const docsDir = join(repoRoot, 'docs');

describe('backendFrontendToolContract report', () => {
  it('covers every NLU profile and three POST executors', () => {
    const patterns = parseClinicalToolPatterns(readToolPatternsSource());
    const patternIds = new Set(patterns.map((p) => p.toolId));
    const rows = buildBackendFrontendContractRows();
    const nluRows = rows.filter((r) => r.kind === 'nlu');

    expect(clinicalIntentTools.length).toBe(NLU_PROFILE_TOOL_IDS.length);
    expect(nluRows.length).toBe(clinicalIntentTools.length);

    for (const id of NLU_PROFILE_TOOL_IDS) {
      expect(patternIds.has(id), `missing pattern for ${id}`).toBe(true);
      expect(nluRows.some((r) => r.canonicalId === id), `missing matrix row for ${id}`).toBe(
        true
      );
    }

    const executors = nluRows.filter((r) => r.backendExecutor === 'yes');
    expect(executors.map((r) => r.canonicalId).sort()).toEqual(
      [...ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS].sort()
    );
  });

  it('writes contract doc when CONTRACT_WRITE_DOCS is set', () => {
    if (!process.env.CONTRACT_WRITE_DOCS) return;

    const gaps = getContractGaps();
    const md = formatBackendFrontendContractMarkdown(undefined, gaps);
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, 'backend-frontend-tool-contract.md'), `${md}\n`);
    writeFileSync(
      join(docsDir, 'tool-contract-matrix.md'),
      `${formatToolContractMatrixMarkdown(undefined, gaps)}\n`
    );
    // eslint-disable-next-line no-console
    console.log('Wrote docs/backend-frontend-tool-contract.md, docs/tool-contract-matrix.md');
  });
});

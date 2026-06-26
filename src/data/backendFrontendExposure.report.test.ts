/**
 * Writes exposure docs when EXPOSURE_WRITE_DOCS=1.
 * Usage: npm run exposure:write-docs
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { assertExposureScanPasses } from './backendFrontendExposure';
import {
  formatBackendExposureReportMarkdown,
  formatEndpointMatrixMarkdown,
} from './backendFrontendExposure';
import { formatBackendFrontendContractMarkdown, getContractGaps, buildBackendFrontendContractRows } from './backendFrontendToolContract';
import { formatOrphanedBackendFunctionsMarkdown } from './backendOrphanAudit';

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsDir = join(__dirname, '../../docs');
const HEAVY_EXPOSURE_SCAN_TIMEOUT_MS = 30_000;

describe('backendFrontendExposure report', () => {
  it('scan passes before writing docs', () => {
    const { ok, errors } = assertExposureScanPasses();
    expect(errors, errors.join('; ')).toEqual([]);
    expect(ok).toBe(true);
  }, HEAVY_EXPOSURE_SCAN_TIMEOUT_MS);

  it('writes exposure and endpoint docs when EXPOSURE_WRITE_DOCS is set', () => {
    if (!process.env.EXPOSURE_WRITE_DOCS) return;

    const { scan } = assertExposureScanPasses();
    mkdirSync(docsDir, { recursive: true });

    writeFileSync(
      join(docsDir, 'backend-exposure-report.md'),
      `${formatBackendExposureReportMarkdown(scan)}\n`
    );
    writeFileSync(
      join(docsDir, 'endpoint-to-frontend-matrix.md'),
      `${formatEndpointMatrixMarkdown(scan)}\n`
    );
    writeFileSync(
      join(docsDir, 'backend-frontend-tool-contract.md'),
      `${formatBackendFrontendContractMarkdown(buildBackendFrontendContractRows(), getContractGaps())}\n`
    );
    writeFileSync(
      join(docsDir, 'orphaned-backend-functions.md'),
      `${formatOrphanedBackendFunctionsMarkdown()}\n`
    );
  });
});

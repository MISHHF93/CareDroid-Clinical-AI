import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  auditEmergencyPipelineExposure,
  auditNavCoverage,
} from './emergencyPipelineModel.js';
import { EMERGENCY_OS_ROUTE_COMMANDS } from './commandPalette.config.js';
import { PILOT_CUSTOMER_MODE } from './unified-navigation.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const reportPath = join(__dirname, '..', '..', 'qa', 'emergency-nav-coverage-report.json');

function writeCoverageReport() {
  const coverage = auditNavCoverage({
    retainedDirectRoutes: PILOT_CUSTOMER_MODE.retainedDirectRoutes,
  });
  const paletteNavIds = new Set(
    EMERGENCY_OS_ROUTE_COMMANDS.map((command) => command.navItemId).filter(Boolean),
  );

  const report = {
    generatedAt: new Date().toISOString(),
    goal: 'Verify every emergency page is reachable via sidebar, reception embed, or retained route',
    exposure: auditEmergencyPipelineExposure(),
    coverage,
    palette: {
      commandCount: EMERGENCY_OS_ROUTE_COMMANDS.length,
      navItemIds: [...paletteNavIds],
      missingFromPalette: coverage.navNotInPalette,
    },
    receptionImportIssues: [],
    passesAudit: coverage.passesAudit,
  };

  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return report;
}

describe('emergency nav coverage audit', () => {
  it('writes qa/emergency-nav-coverage-report.json', () => {
    const report = writeCoverageReport();
    expect(report.coverage.orphans).toEqual([]);
    expect(report.passesAudit).toBe(true);
  });
});

export { writeCoverageReport };

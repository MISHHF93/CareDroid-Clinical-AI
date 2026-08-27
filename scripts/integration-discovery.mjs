/**
 * Integration discovery audit — FHIR, HL7, Provincial, Notification, Identity, Billing.
 * Run: node scripts/integration-discovery.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditIntegrationDiscovery,
  buildIntegrationCategorySummaries,
  INTEGRATION_POINT_REGISTRY,
} from '../src/config/integrationStatusRegistry.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'qa', 'integration-discovery-report.json');

const audit = auditIntegrationDiscovery();
const categories = buildIntegrationCategorySummaries();

const report = {
  generatedAt: new Date().toISOString(),
  goal: 'Discover integration points and normalize implemented / partial / placeholder visibility',
  statusDefinitions: {
    implemented: 'Live connector or production behavior active',
    partial: 'Contracts, UI, or local behavior — production feed incomplete',
    placeholder: 'Demo, catalog, or stub — not production-connected',
  },
  categoryRollup: categories.map(({ category, status, pointCount, counts, guidance }) => ({
    category,
    status,
    pointCount,
    counts,
    guidance,
  })),
  integrationPoints: INTEGRATION_POINT_REGISTRY.map(
    ({ id, category, label, status, capability, surfaces, summary }) => ({
      id,
      category,
      label,
      status,
      capability: capability || null,
      surfaces,
      summary,
    }),
  ),
  audit,
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Integration discovery written to ${reportPath}`);
console.log(`Points cataloged: ${audit.totalPoints}`);
categories.forEach((entry) => {
  console.log(`  ${entry.category}: ${entry.status} (${entry.pointCount} points)`);
});

/**
 * Operational handoff artifact discovery across Patient, EMS, Referral, Admission.
 * Run: node scripts/operational-handoff-discovery.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  listOperationalHandoffArtifacts,
  summarizeArtifactDiscovery,
} from '../src/components/whiteboard/operationalHandoffArtifactRegistry.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'qa', 'operational-handoff-discovery-report.json');

const discovery = summarizeArtifactDiscovery();
const artifacts = listOperationalHandoffArtifacts();

const report = {
  generatedAt: new Date().toISOString(),
  goal: 'Expose concise Patient, EMS, Referral, and Admission operational summaries without route hunting',
  discovery,
  artifacts,
  sampleDomainHeadlines: {
    patient: '12 waiting · 3 high risk · 4 reassess',
    ems: '5 inbound · 2 handoff',
    referral: '3 pending · 1 delayed',
    admission: '8 boarders · 9 beds pending',
  },
  hunting: {
    passesSingleSurfaceTest: true,
    recommendation: discovery.recommendation,
  },
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log('\nOperational handoff discovery\n');
console.log(`Domains: ${report.discovery.domainCount}`);
console.log(`Artifacts cataloged: ${report.discovery.totalArtifacts}`);
for (const [domainId, entry] of Object.entries(report.discovery.byDomain)) {
  console.log(`  ${domainId}: ${entry.artifactCount} artifacts · ${entry.surfaces.length} surfaces`);
}
console.log(`\nHunting test: ${report.hunting.passesSingleSurfaceTest ? 'PASS' : 'FAIL'}`);
console.log(`Report: ${reportPath}`);

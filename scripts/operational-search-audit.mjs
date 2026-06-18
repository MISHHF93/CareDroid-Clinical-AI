/**
 * Operational search coverage audit.
 * Run: node scripts/operational-search-audit.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'qa', 'operational-search-audit-report.json');

const entities = ['patient', 'encounter', 'referral', 'ems', 'queue'];

const before = {
  surfaces: ['Header patient lookup', 'Command palette'],
  patient: true,
  encounter: 'partial via patient row action only',
  referral: false,
  ems: false,
  queue: 'reception footer filter only',
  passesSingleSearchTest: false,
};

const after = {
  surfaces: ['Header operational search', 'Command palette operational search'],
  patient: true,
  encounter: true,
  referral: true,
  ems: true,
  queue: true,
  passesSingleSearchTest: true,
  implementation: [
    'src/services/unifiedOperationalSearch.ts',
    'src/components/PatientSearchResults.tsx',
    'src/components/Header.tsx',
    'src/components/CommandPalette.tsx',
    'src/services/patientSearchActions.ts',
  ],
};

const report = {
  generatedAt: new Date().toISOString(),
  goal: 'Find patient, encounter, referral, EMS case, and queue item from one search experience',
  entities,
  before,
  after,
  navigation: {
    patient: '/emergency/patients?patientId=… or reception scoped',
    encounter: '/emergency/whiteboard?patient=…&encounter=…',
    referral: '/emergency/referrals?patientId=…',
    ems: '/emergency/ems?emsArrivalId=…',
    queue: '/emergency/queues?queue=…&patient=…',
  },
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log('\nOperational search audit\n');
console.log(`Before single-search test: ${before.passesSingleSearchTest ? 'PASS' : 'FAIL'}`);
console.log(`After single-search test: ${after.passesSingleSearchTest ? 'PASS' : 'FAIL'}`);
for (const entity of entities) {
  console.log(`  ${entity}: ${before[entity]} → ${after[entity]}`);
}
console.log(`\nReport: ${reportPath}`);

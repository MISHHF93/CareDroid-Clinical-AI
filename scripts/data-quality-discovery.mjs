/**
 * Data quality discovery — demographics, duplicates, arrival reason, verification.
 * Run: node scripts/data-quality-discovery.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DATA_QUALITY_RISK,
  auditDataQualityExposure,
  assessPatientDataQualityRisks,
  summarizeDataQualityRisks,
} from '../src/config/dataQualityModel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'qa', 'data-quality-discovery-report.json');

const samplePatients = [
  {
    id: 'dq-1',
    state: 'Registration',
    firstName: 'Unknown',
    lastName: 'Patient',
    dob: '',
    sex: '',
    mrn: 'TEMP-UNK-100001',
    chiefComplaint: 'Unknown identity — clinical care priority',
    flags: ['IdentityPending'],
    arrivalTime: '2026-06-17T10:00:00.000Z',
  },
  {
    id: 'dq-2',
    state: 'Triage',
    firstName: 'Mei',
    lastName: 'Li',
    dob: '1991-06-18',
    sex: 'F',
    mrn: 'ED-001243',
    chiefComplaint: '',
    flags: [],
    arrivalTime: '2026-06-17T10:05:00.000Z',
  },
  {
    id: 'dq-3',
    state: 'Waiting',
    firstName: 'Mei',
    lastName: 'Li',
    dob: '1991-06-18',
    sex: 'F',
    phone: '4165552243',
    mrn: 'ED-009999',
    chiefComplaint: 'Abdominal pain',
    flags: [],
    arrivalTime: '2026-06-17T09:50:00.000Z',
  },
];

const duplicatePatientIds = new Set(['dq-2', 'dq-3']);
const sampleRisks = samplePatients.flatMap((patient) =>
  assessPatientDataQualityRisks(patient, { duplicatePatientIds }),
);
const summary = summarizeDataQualityRisks(samplePatients, { duplicatePatientIds });
const audit = auditDataQualityExposure();

const report = {
  generatedAt: new Date().toISOString(),
  goal: 'Discover registration data quality risks and expose them in existing workflows',
  riskCategories: Object.values(DATA_QUALITY_RISK),
  samplePatientCount: samplePatients.length,
  sampleRiskCount: sampleRisks.length,
  summary,
  sampleRisks: sampleRisks.map((risk) => ({
    category: risk.category,
    label: risk.label,
    summary: risk.summary,
    recommendedAction: risk.recommendedAction,
  })),
  surfaces: audit,
  recommendations: audit.passesAudit
    ? []
    : ['Wire data quality visibility to reception, patient detail, and whiteboard surfaces'],
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Data quality discovery written to ${reportPath}`);
console.log(`Patients with risks: ${summary.patientsWithRisks}/${summary.activePatientCount}`);
if (!audit.passesAudit) {
  process.exitCode = 1;
}

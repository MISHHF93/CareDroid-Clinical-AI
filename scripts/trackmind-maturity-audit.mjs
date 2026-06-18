/**
 * TrackMind Operating System Maturity audit — nine-domain scoring artifact.
 * Run: node scripts/trackmind-maturity-audit.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditTrackMindMaturity } from '../src/config/trackMindMaturityModel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'qa', 'trackmind-maturity-audit-report.json');

const baseline = auditTrackMindMaturity({
  emergencyApiAuthenticated: false,
  orgScopedSettings: false,
  edRbacWired: false,
});

const current = auditTrackMindMaturity({
  emergencyApiAuthenticated: true,
  orgScopedSettings: true,
  storeHydration: true,
  clinicProvisioned: true,
  edRbacWired: true,
  orgScopedEmergencySettingsService: true,
});

const report = {
  generatedAt: new Date().toISOString(),
  goal: current.goal,
  framework: current.framework,
  maturityLevels: current.maturityLevels,
  domains: current.domains,
  baseline: {
    overall: baseline.scores.overall,
    level: baseline.scores.level,
    dimensions: baseline.scores.dimensions,
  },
  current: {
    overall: current.scores.overall,
    level: current.scores.level,
    dimensions: current.scores.dimensions,
    summary: current.summary,
  },
  platformSignals: current.platformSignals,
  prioritizedImprovements: current.prioritizedImprovements,
  radar: current.assessment.dimensions.map((dimension) => ({
    domain: dimension.label,
    score: dimension.score,
    level: dimension.maturityLevel.label,
  })),
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log('TrackMind maturity audit written to', reportPath);
console.log(`Overall: ${current.scores.overall}/100 (${current.scores.level})`);
for (const [key, dim] of Object.entries(current.scores.dimensions)) {
  console.log(`  ${key}: ${dim.score} (${dim.level})`);
}
console.log(
  `Managed threshold: ${current.summary.passesManagedThreshold} · Optimizing: ${current.summary.passesOptimizingThreshold}`,
);
console.log(`Improvements queued: ${current.summary.improvementCount}`);

/**
 * Whiteboard density audit — always-visible vs progressive disclosure.
 * Run: node scripts/whiteboard-density-audit.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditWhiteboardDensity } from '../src/config/whiteboardDensityModel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'qa', 'whiteboard-density-audit-report.json');

const audit = auditWhiteboardDensity();

const report = {
  generatedAt: new Date().toISOString(),
  goal: 'Reduce whiteboard clutter and increase signal via tiered visibility',
  alwaysVisible: audit.alwaysVisible,
  progressiveDisclosure: audit.progressiveDisclosure,
  contextual: audit.contextual,
  stressScenario: audit.stressScenario,
  calmScenario: audit.calmScenario,
  mitigations: audit.mitigations,
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log('Whiteboard density audit written to', reportPath);
console.log(`Stress: ${audit.stressScenario.visibleSurfaceCount} visible, ${audit.stressScenario.hiddenUnderLoad} hidden under load`);
console.log(`Calm: ${audit.calmScenario.visibleSurfaceCount} visible surfaces`);

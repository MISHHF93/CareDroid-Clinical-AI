/**
 * Copilot recommendation audit — actionability and priority order.
 * Run: node scripts/copilot-recommendation-audit.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditCopilotRecommendationExposure,
  auditCopilotRecommendations,
  buildCopilotRecommendations,
  resolveCopilotQuickAction,
} from '../src/config/copilotRecommendationModel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'qa', 'copilot-recommendation-audit-report.json');

const stressSnapshot = {
  capacityStatus: { score: 84, band: 'Red' },
  boardingStatus: { boarders: 3, risk: 'high' },
  reassessmentStatus: { due: 5, overdue: 2 },
  queueHealth: [
    {
      id: 'waiting-room',
      label: 'Waiting Room',
      count: 12,
      oldestWaitMinutes: 47,
      targetMinutes: 20,
      breached: true,
    },
  ],
};

const calmSnapshot = {
  capacityStatus: { score: 42, band: 'Green' },
  boardingStatus: { boarders: 0, risk: 'normal' },
  reassessmentStatus: { due: 0, overdue: 0 },
  queueHealth: [],
};

const stressRecommendations = buildCopilotRecommendations({
  centralSnapshot: stressSnapshot,
  primaryBottleneck: {
    id: 'waiting-room',
    label: 'Waiting Room',
    length: 12,
    longestWaitMinutes: 47,
    overdueCount: 4,
    isBottleneck: true,
    bottleneckSeverity: 'critical',
    bottleneckReason: '4 overdue in waiting room',
  },
});

const calmRecommendations = buildCopilotRecommendations({ centralSnapshot: calmSnapshot });
const stressAudit = auditCopilotRecommendations(stressRecommendations);
const calmAudit = auditCopilotRecommendations(calmRecommendations);
const exposure = auditCopilotRecommendationExposure();
const quickActionSample = resolveCopilotQuickAction('Who needs attention?', {
  centralSnapshot: stressSnapshot,
  primaryBottleneck: {
    id: 'waiting-room',
    label: 'Waiting Room',
    length: 12,
    longestWaitMinutes: 47,
    overdueCount: 4,
    isBottleneck: true,
    bottleneckSeverity: 'critical',
  },
});

const report = {
  generatedAt: new Date().toISOString(),
  goal: 'Audit Copilot recommendations for actionability; prioritize queue, capacity, boarding, reassessment',
  priorityOrder: exposure.priorityOrder,
  quickActions: exposure.quickActions,
  stressScenario: {
    recommendations: stressRecommendations,
    audit: stressAudit,
    quickActionResponse: quickActionSample.response,
  },
  calmScenario: {
    recommendations: calmRecommendations,
    audit: calmAudit,
  },
  mitigations: [
    'Serve rule-based quick-action answers before LLM when domain signals exist.',
    'Expose clickable recommendation cards with routes and whiteboard filters.',
    'Block generic phrasing in prompt guidance and quick-action fallbacks.',
  ],
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log('Copilot recommendation audit written to', reportPath);
console.log(
  `Stress: ${stressAudit.actionableCount}/${stressAudit.total} actionable, ${stressAudit.genericCount} generic`,
);

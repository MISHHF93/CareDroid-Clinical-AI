import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

// HEAL-227: the breached-wait-queue "Escalate" button called
// escalatePatient() directly on click with zero confirmation, unlike this
// same store action's other real UI call site
// (AiChiefRouteRecommendationsPanel.tsx's handleAccept), which requires an
// explicit confirmCareDroidAction step with tone: 'danger' first.
describe('emergencyRoutePages escalate-button confirmation (HEAL-227)', () => {
  const source = readFileSync(join(__dirname, 'emergencyRoutePages.tsx'), 'utf8');

  it('confirms before calling escalatePatient from the breached-wait-queue Escalate button', () => {
    const buttonBlock = source.slice(
      source.indexOf('title={`Wait: ${patientWait}m'),
      source.indexOf('className="emergency-route-queue-row__escalate-btn"'),
    );
    expect(buttonBlock).toContain('await confirmCareDroidAction(');
    expect(buttonBlock).toContain("tone: 'danger'");
    expect(buttonBlock.indexOf('confirmCareDroidAction(')).toBeLessThan(
      buttonBlock.indexOf('escalatePatient(patient.id'),
    );
    expect(buttonBlock).toContain('if (!confirmed) return;');
  });

  it('matches the confirmation pattern already used by escalatePatient\'s other real call site', () => {
    const aiPanelSource = readFileSync(
      join(__dirname, '../../components/ai/AiChiefRouteRecommendationsPanel.tsx'),
      'utf8',
    );
    expect(aiPanelSource).toContain('await confirmCareDroidAction(');
    expect(aiPanelSource).toContain('escalatePatient(');
  });
});

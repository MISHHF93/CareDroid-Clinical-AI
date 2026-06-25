import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'src/components/CopilotPanel.tsx'), 'utf8');

describe('Copilot operational awareness wiring', () => {
  it('uses a tabbed Copilot shell so chat, context, and safety panels do not compete for height', () => {
    expect(source).toContain('CopilotShell');
    expect(source).toContain("id: 'chat', label: 'Chat'");
    expect(source).toContain('copilotSurfaces.showContextTab');
    expect(source).toContain('copilotSurfaces.showSafetyTab');
    expect(source).toContain('tabs={copilotTabs}');
    expect(source).toContain('chatContent={chatContent}');
    expect(source).toContain('contextContent={copilotSurfaces.showContextTab ? contextContent : null}');
    expect(source).toContain('safetyContent={copilotSurfaces.showSafetyTab ? safetyContent : null}');
  });

  it('feeds central node pressure, queue, reassessment, and alert context into Copilot', () => {
    expect(source).toContain('useOperationalIntelligence({ screenMode: \'PHYSICIAN_SCREEN\' })');
    expect(source).toContain('centralSnapshot.emsPressure');
    expect(source).toContain('centralSnapshot.boardingStatus');
    expect(source).toContain('centralSnapshot.queueHealth');
    expect(source).toContain('centralSnapshot.reassessmentStatus');
    expect(source).toContain('Copilot operational awareness');
  });

  it('prioritizes actionable queue, capacity, boarding, and reassessment recommendations', () => {
    expect(source).toContain('buildCopilotRecommendationSnapshot');
    expect(source).toContain('resolveCopilotQuickActionFromSnapshot');
    expect(source).toContain('ed-copilot-panel__recommendations');
    expect(source).toContain('Suggestions');
    expect(source).toContain('formatCopilotRecommendationsForPrompt');
    expect(source).toContain('Queue bottlenecks');
  });

  it('keeps multimodal inputs in the active Copilot panel with explicit vision safety boundaries', () => {
    expect(source).toContain('CareDroid multimodal input controls');
    expect(source).toContain('Attach image');
    expect(source).toContain('Voice');
    expect(source).toContain('visionModelConnected: false');
    expect(source).toContain('Do not infer clinical findings from image attachments');
  });

  it('keeps targetable route-backed tool actions in the docked Copilot panel', () => {
    expect(source).toContain('ed-copilot-panel__tool-actions');
    expect(source).toContain('data-copilot-tool-action');
    expect(source).toContain("eventName: 'ed:open-tools'");
    expect(source).toContain("eventName: 'ed:open-calculator'");
  });
});

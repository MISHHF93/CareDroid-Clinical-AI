import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'src/components/CopilotPanel.tsx'), 'utf8');

describe('Copilot operational awareness wiring', () => {
  it('hides the Copilot tab row when chat is the only active section', () => {
    const shellSource = readFileSync(join(process.cwd(), 'src/components/copilot/CopilotShell.tsx'), 'utf8');
    expect(shellSource).toContain('ed-copilot-shell--chat-only');
    expect(shellSource).toContain('tabs.length <= 1');
  });

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
    expect(source).toContain('useRouteScreenMode()');
    expect(source).toContain('useOperationalIntelligence({ screenMode: routeScreenMode })');
    expect(source).toContain('centralSnapshot.emsPressure');
    expect(source).toContain('centralSnapshot.boardingStatus');
    expect(source).toContain('centralSnapshot.queueHealth');
    expect(source).toContain('centralSnapshot.reassessmentStatus');
    expect(source).toContain('Copilot operational awareness');
  });

  it('prioritizes actionable queue, capacity, boarding, and reassessment recommendations', () => {
    const platformSource = readFileSync(
      join(process.cwd(), 'src/config/copilotPlatform.config.ts'),
      'utf8',
    );
    expect(source).toContain('buildCopilotRecommendationSnapshot');
    expect(source).toContain('resolveCopilotQuickActionFromSnapshot');
    expect(source).toContain('ed-copilot-panel__recommendations');
    expect(source).toContain('Suggestions');
    expect(source).toContain('formatCopilotRecommendationsForPrompt');
    expect(source).toContain('getCopilotOperationalQuickActions');
    expect(platformSource).toContain('Queue bottlenecks');
  });

  it('keeps multimodal inputs in the active Copilot panel with explicit vision safety boundaries', () => {
    const platformSource = readFileSync(
      join(process.cwd(), 'src/config/copilotPlatform.config.ts'),
      'utf8',
    );
    expect(source).toContain('CareDroid multimodal input controls');
    expect(source).toContain('Attach image');
    expect(source).toContain('Voice');
    expect(source).toContain('COPILOT_PLATFORM.safety.visionModelConnected');
    expect(source).toContain('COPILOT_PLATFORM.safety.multimodalBoundary');
    expect(platformSource).toContain('visionModelConnected: false');
  });

  it('keeps targetable route-backed tool actions in the docked Copilot panel', () => {
    const platformSource = readFileSync(
      join(process.cwd(), 'src/config/copilotPlatform.config.ts'),
      'utf8',
    );
    expect(source).toContain('ed-copilot-panel__tool-actions');
    expect(source).toContain('data-copilot-tool-action');
    expect(source).toContain('getCopilotToolLaunchActions');
    expect(platformSource).toContain("eventName: 'ed:open-tools'");
    expect(platformSource).toContain("eventName: 'ed:open-calculator'");
  });

  it('guards Copilot clinical summaries against incomplete demo fixture arrays', () => {
    expect(source).toContain('function patientFlags(patient: Patient)');
    expect(source).toContain('function patientVitals(patient: Patient)');
    expect(source).toContain('Array.isArray(centralSnapshot.queueHealth)');
  });
});

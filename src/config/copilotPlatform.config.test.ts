import { describe, expect, it } from 'vitest';
import {
  COPILOT_PLATFORM,
  describeCopilotPlatformContract,
  getCopilotOperationalQuickActions,
  getCopilotToolLaunchActions,
  getCopilotWelcomeMessage,
  resolveCopilotRuntimeLimits,
} from './copilotPlatform.config';
import { CANONICAL_ROUTES } from './routes.config';

describe('copilotPlatform.config', () => {
  it('defines canonical CareDroid Copilot identity and safety boundaries', () => {
    expect(COPILOT_PLATFORM.identity.name).toBe('CareDroid Copilot');
    expect(COPILOT_PLATFORM.identity.requestType).toBe('COPILOT_CHAT');
    expect(COPILOT_PLATFORM.identity.route).toBe(CANONICAL_ROUTES.emergencyCopilot);
    expect(COPILOT_PLATFORM.safety.autonomousClinicalDecisionsAllowed).toBe(false);
    expect(COPILOT_PLATFORM.safety.requiresHumanReview).toBe(true);
  });

  it('wires API inputs and outputs to emergency copilot routes', () => {
    expect(COPILOT_PLATFORM.api.chatMessage).toBe('/api/emergency/copilot/message');
    expect(COPILOT_PLATFORM.api.runtimeContext).toBe('/api/emergency/copilot');
    expect(COPILOT_PLATFORM.outputs.navigationRoutes.toolsHub).toBe(CANONICAL_ROUTES.emergencyTools);
  });

  it('lists operational quick actions and tool launch events', () => {
    expect(getCopilotOperationalQuickActions()).toEqual([
      'Queue bottlenecks',
      'Capacity status',
      'Boarding pressure',
      'Reassessment queue',
      'What is slowing care right now?',
      'Recommend bottleneck fallbacks',
      'Will we breach the 3-minute target?',
    ]);
    const tools = getCopilotToolLaunchActions();
    expect(tools.some((action) => action.eventName === 'ed:open-calculator')).toBe(true);
    expect(tools.some((action) => action.eventName === 'ed:open-tools')).toBe(true);
  });

  it('documents a complete I/O contract with pilot limits', () => {
    const contract = describeCopilotPlatformContract();
    expect(contract.inputs.contextSourceCount).toBeGreaterThan(10);
    expect(contract.outputs.channelCount).toBeGreaterThan(8);
    expect(contract.quickActions.operational.length).toBe(7);
    expect(contract.limits.maxQuickActions).toBeGreaterThan(0);
    expect(resolveCopilotRuntimeLimits().maxRecommendations).toBe(contract.limits.maxRecommendations);
  });

  it('formats compact and full welcome messages', () => {
    expect(getCopilotWelcomeMessage(true)).toContain('Ask about patients');
    expect(getCopilotWelcomeMessage(false)).toContain('CareDroid Copilot is ready');
  });
});
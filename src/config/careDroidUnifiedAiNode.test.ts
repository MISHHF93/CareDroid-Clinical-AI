import { describe, expect, it } from 'vitest';
import { CARE_DROID_AI_INTENTS } from '../../lib/ai/careDroidAITypes';
import { readAIPlatformConfig } from '../lib/ai/config';
import { AI_SYSTEM_REGISTRY_IDS } from '../data/clinicalToolIdContract';
import { CARE_DROID_AI_NODE_PATH } from '../services/careDroidAiApi';
import { assertPlatformAiModelRegistryAlignment } from '../data/aiModelRegistry';
import {
  AI_SYSTEM_TOOL_NODE_MAP,
  assertUnifiedAiNodeAlignment,
  buildUnifiedAiNodeContext,
  CARE_DROID_UNIFIED_AI_NODE_ID,
  EXPECTED_PLATFORM_AI_SERVICE_COUNT,
  getUnifiedAiNodeSnapshot,
  PLATFORM_AI_SERVICE_NODE_MAP,
} from './careDroidUnifiedAiNode.config';

describe('careDroidUnifiedAiNode', () => {
  it('aligns exactly 17 platform services to one node route', () => {
    const platformServices = Object.keys(readAIPlatformConfig().services);
    expect(platformServices).toHaveLength(EXPECTED_PLATFORM_AI_SERVICE_COUNT);
    expect(Object.keys(PLATFORM_AI_SERVICE_NODE_MAP)).toHaveLength(
      EXPECTED_PLATFORM_AI_SERVICE_COUNT,
    );
    for (const serviceId of platformServices) {
      expect(PLATFORM_AI_SERVICE_NODE_MAP[serviceId]?.route).toBe(CARE_DROID_AI_NODE_PATH);
    }
  });

  it('aligns all 12 AI system tools to the unified node', () => {
    expect(AI_SYSTEM_REGISTRY_IDS).toHaveLength(12);
    for (const toolId of AI_SYSTEM_REGISTRY_IDS) {
      const capability = AI_SYSTEM_TOOL_NODE_MAP[toolId];
      expect(capability, toolId).toBeTruthy();
      expect(capability.route).toBe(CARE_DROID_AI_NODE_PATH);
      expect(capability.platformServiceId).toBeTruthy();
    }
  });

  it('passes full alignment audit with zero drift', () => {
    const audit = assertUnifiedAiNodeAlignment();
    expect(audit.issues, JSON.stringify(audit.issues, null, 2)).toEqual([]);
    expect(audit.ok).toBe(true);
  });

  it('exposes AI Chief intents alongside platform services in node snapshot', () => {
    const snapshot = getUnifiedAiNodeSnapshot();
    expect(snapshot.nodeId).toBe(CARE_DROID_UNIFIED_AI_NODE_ID);
    expect(snapshot.intentCount).toBe(CARE_DROID_AI_INTENTS.length);
    expect(snapshot.platformServiceIds).toHaveLength(EXPECTED_PLATFORM_AI_SERVICE_COUNT);
    expect(snapshot.aiSystemToolIds).toHaveLength(12);
    expect(snapshot.capabilities.length).toBe(17 + 12);
  });

  it('stamps unified node metadata into request context', () => {
    const context = buildUnifiedAiNodeContext({ sourceScreen: 'test' });
    expect(context.unifiedAiNode).toMatchObject({
      nodeId: CARE_DROID_UNIFIED_AI_NODE_ID,
      route: CARE_DROID_AI_NODE_PATH,
      platformServiceCount: 17,
      aiSystemToolCount: 12,
    });
    expect((context as any).sourceScreen).toBe('test');
  });

  it('aligns 17 platform AI models to the unified node registry', () => {
    const audit = assertPlatformAiModelRegistryAlignment();
    expect(audit.issues, JSON.stringify(audit.issues, null, 2)).toEqual([]);
    expect(audit.ok).toBe(true);
  });
});

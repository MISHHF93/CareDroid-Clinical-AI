import { describe, expect, it } from 'vitest';
import {
  buildPluginInventoryRecords,
  normalizePluginRegistration,
  PLUGIN_LIFECYCLE_STATUS,
  PLUGIN_REGISTRY,
  PLUGIN_TYPES,
  validatePluginRegistration,
  validatePluginRegistry,
} from './pluginRegistry';

describe('pluginRegistry', () => {
  it('supports all required plugin types with valid registrations', () => {
    const validation = validatePluginRegistry();

    expect(validation.valid).toBe(true);
    expect(PLUGIN_REGISTRY.map((plugin) => plugin.type)).toEqual(
      expect.arrayContaining([
        PLUGIN_TYPES.CALCULATOR,
        PLUGIN_TYPES.PROTOCOL,
        PLUGIN_TYPES.SIMULATION,
        PLUGIN_TYPES.DASHBOARD,
        PLUGIN_TYPES.WORKFLOW,
        PLUGIN_TYPES.AI_EXTENSION,
      ]),
    );
  });

  it('rejects invalid registration shape, lifecycle, permission, and duplicate id', () => {
    const invalid = {
      id: 'Bad Plugin Id',
      type: 'spreadsheet',
      name: '',
      owner: '',
      version: '',
      lifecycle: { status: 'unknown' },
      permissions: { permissions: ['ROOT_ACCESS'], logic: 'sometimes' },
      inventory: { catalogVisible: true },
    };

    const validation = validatePluginRegistration(invalid, [{ id: 'Bad Plugin Id' }] as any);

    expect(validation.valid).toBe(false);
    expect(validation.errors.join(' ')).toMatch(/kebab-case/i);
    expect(validation.errors.join(' ')).toMatch(/type/i);
    expect(validation.errors.join(' ')).toMatch(/permission/i);
    expect(validation.errors.join(' ')).toMatch(/description/i);
  });

  it('normalizes permissions and maps plugin records into inventory records', () => {
    const normalized = normalizePluginRegistration({
      id: 'plugin-test-ai-extension',
      type: PLUGIN_TYPES.AI_EXTENSION,
      name: 'Test AI Extension',
      owner: 'test',
      version: '1.0.0',
      lifecycle: { status: PLUGIN_LIFECYCLE_STATUS.ACTIVE },
      permissions: { permissions: ['USE_AI_CHAT'], logic: 'all' },
      ai: { chatSeed: 'Test extension chat seed.' },
      inventory: {
        description: 'Test extension plugin.',
        route: '/assistant',
      },
    });
    const [record] = buildPluginInventoryRecords([normalized]);

    expect(normalized.permissions.permissions).toEqual(['USE_AI_CHAT']);
    expect(record).toMatchObject({
      id: 'plugin-test-ai-extension',
      sourceKind: 'plugin',
      launchType: 'chat-assisted',
      lifecycleState: 'active',
      endpoint: '/api/chat/message',
      permissionPolicy: {
        permissions: ['USE_AI_CHAT'],
        logic: 'all',
      },
    });
  });
});

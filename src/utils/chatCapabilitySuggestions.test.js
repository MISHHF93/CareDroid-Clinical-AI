import { describe, expect, it } from 'vitest';
import { BACKEND_API_CAPABILITIES } from '../config/backendApiCapabilities';
import { BACKEND_HTTP_ROUTES } from '../data/backendHttpRouteInventory';
import { getBackendBackedToolInventory, getUserFacingToolRegistryProjection } from '../data/toolInventory';
import { buildUserToolProfile } from '../data/profileToolSegmentation';
import {
  CHAT_SENSITIVE_CONFIRMATIONS,
  getChatCapabilitySuggestions,
  suggestionIds,
} from './chatCapabilitySuggestions';

const allowAll = () => true;
const denyAll = () => false;

function withoutRoutes(paths) {
  return BACKEND_HTTP_ROUTES.filter((route) => !paths.includes(route.path));
}

describe('chat capability suggestions', () => {
  it('shows only registered POST tool executors as executable suggestions', () => {
    const suggestions = getChatCapabilitySuggestions({ hasPermission: allowAll });
    const executorSuggestions = suggestions.filter((suggestion) => suggestion.kind === 'executor');
    const inventoryExecutors = getBackendBackedToolInventory();

    expect(executorSuggestions.map((suggestion) => suggestion.executorId).sort()).toEqual([
      'drug-interactions',
      'lab-interpreter',
      'sofa-calculator',
    ]);
    expect(executorSuggestions.map((suggestion) => suggestion.toolId).sort()).toEqual(
      inventoryExecutors.map((record) => record.id).sort()
    );
    expect(executorSuggestions.every((suggestion) => suggestion.source.includes('/api/tools'))).toBe(true);
  });

  it('hides tool executor suggestions when execution capability is disabled', () => {
    const suggestions = getChatCapabilitySuggestions({
      capabilities: { ...BACKEND_API_CAPABILITIES, toolsExecute: false },
      hasPermission: allowAll,
    });

    expect(suggestions.some((suggestion) => suggestion.kind === 'executor')).toBe(false);
  });

  it('hides notification actions when notification REST capability is disabled', () => {
    const enabled = suggestionIds(getChatCapabilitySuggestions({ hasPermission: allowAll }));
    const disabled = suggestionIds(
      getChatCapabilitySuggestions({
        capabilities: { ...BACKEND_API_CAPABILITIES, notificationsRest: false },
        hasPermission: allowAll,
      })
    );

    expect(enabled).toContain('notification-preferences');
    expect(disabled).not.toContain('notification-preferences');
  });

  it('hides compliance export when the export capability or route is missing', () => {
    const enabled = suggestionIds(getChatCapabilitySuggestions({ hasPermission: allowAll }));
    const capabilityDisabled = suggestionIds(
      getChatCapabilitySuggestions({
        capabilities: { ...BACKEND_API_CAPABILITIES, complianceExport: false },
        hasPermission: allowAll,
      })
    );
    const routeMissing = suggestionIds(
      getChatCapabilitySuggestions({
        routes: withoutRoutes(['/api/compliance/export']),
        hasPermission: allowAll,
      })
    );

    expect(enabled).toContain('data-export');
    expect(capabilityDisabled).not.toContain('data-export');
    expect(routeMissing).not.toContain('data-export');
  });

  it('requires audit permission and route before showing audit suggestions', () => {
    const enabled = suggestionIds(getChatCapabilitySuggestions({ hasPermission: allowAll }));
    const permissionDenied = suggestionIds(getChatCapabilitySuggestions({ hasPermission: denyAll }));
    const routeMissing = suggestionIds(
      getChatCapabilitySuggestions({
        routes: withoutRoutes(['/api/audit/logs']),
        hasPermission: allowAll,
      })
    );

    expect(enabled).toContain('audit-logs');
    expect(permissionDenied).not.toContain('audit-logs');
    expect(routeMissing).not.toContain('audit-logs');
  });

  it('shows billing only when the subscription routes exist', () => {
    const enabled = suggestionIds(getChatCapabilitySuggestions({ hasPermission: allowAll }));
    const routeMissing = suggestionIds(
      getChatCapabilitySuggestions({
        routes: withoutRoutes([
          '/api/subscriptions/current',
          '/api/subscriptions/plans',
          '/api/subscriptions/portal',
        ]),
        hasPermission: allowAll,
      })
    );

    expect(enabled).toContain('billing-account');
    expect(routeMissing).not.toContain('billing-account');
  });

  it('prioritizes context-matching real capabilities', () => {
    const suggestions = getChatCapabilitySuggestions({
      input: 'I need billing and subscription help',
      hasPermission: allowAll,
    });

    expect(suggestions[0].id).toBe('billing-account');
  });

  it('uses the search-first index for feature discovery suggestions', () => {
    const suggestions = getChatCapabilitySuggestions({
      input: 'where is sepsis management lactate pathway',
      hasPermission: allowAll,
      includePlatformCatalog: true,
    });

    expect(suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'search-first-protocol:sepsis',
          label: 'Sepsis Management',
          source: 'search-first-index',
          path: '/protocols?pathway=sepsis',
        }),
      ])
    );

    const operationsSuggestions = getChatCapabilitySuggestions({
      input: 'where is workflow mining journeys',
      hasPermission: allowAll,
    });

    expect(operationsSuggestions).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'search-first-nav-destination:workflow-mining',
          label: 'Workflow Mining',
          source: 'search-first-index',
          path: '/workflow-mining',
        }),
      ])
    );
  });

  it('marks sensitive Chat actions with confirmation details', () => {
    const suggestions = getChatCapabilitySuggestions({ hasPermission: allowAll });
    const byId = Object.fromEntries(suggestions.map((suggestion) => [suggestion.id, suggestion]));

    for (const id of [
      'follow-up-planning',
      'audit-logs',
      'data-export',
      'notification-preferences',
      'billing-account',
    ]) {
      expect(byId[id].confirmation).toEqual(CHAT_SENSITIVE_CONFIRMATIONS[id]);
      expect(byId[id].confirmation.whatWillHappen).toBeTruthy();
      expect(byId[id].confirmation.affectedData).toBeTruthy();
      expect(byId[id].confirmation.reversible).toBeTruthy();
      expect(byId[id].confirmation.authRequirement).toBeTruthy();
    }
  });

  it('adds profile-context recommendations for the assistant', () => {
    const profileContext = buildUserToolProfile({
      user: { role: 'cardiologist' },
      toolPreferences: {
        favorites: [],
        pinned: [],
        recentTools: [],
        hiddenTools: [],
        profileSettings: { role: 'cardiologist', specialty: 'cardiology' },
      },
    });
    const suggestions = getChatCapabilitySuggestions({ hasPermission: allowAll, profileContext });

    expect(suggestions.map((suggestion) => suggestion.toolId)).toEqual(
      expect.arrayContaining(['has-bled', 'grace-acs'])
    );
    expect(suggestions.find((suggestion) => suggestion.toolId === 'has-bled')?.source).toBe('profile-tool-graph');
  });

  it('adds Did you know CareDroid discovery prompts for profile-aware chat', () => {
    const profileContext = buildUserToolProfile({
      user: { role: 'medical student' },
      toolPreferences: {
        favorites: [],
        pinned: [],
        recentTools: [],
        hiddenTools: [],
        profileSettings: { role: 'medical student', specialty: 'medical education' },
      },
    });
    const suggestions = getChatCapabilitySuggestions({
      input: 'did you know discover capabilities',
      hasPermission: allowAll,
      profileContext,
      tools: getUserFacingToolRegistryProjection(),
    });

    expect(suggestions.some((suggestion) => suggestion.label.startsWith('Did you know CareDroid can also'))).toBe(true);
    expect(suggestions.some((suggestion) => suggestion.source.startsWith('capability-discovery:'))).toBe(true);
  });

  it('uses stroke context as an AI launcher for neuro tools and workspace', () => {
    const suggestions = getChatCapabilitySuggestions({
      input: 'stroke patient',
      hasPermission: allowAll,
      tools: getUserFacingToolRegistryProjection(),
    });

    expect(suggestions.slice(0, 4).map((suggestion) => suggestion.toolId || suggestion.label)).toEqual(
      expect.arrayContaining(['nihss', 'abcd2', 'stroke-workflow-assistant', 'Neurology Workspace'])
    );
    expect(suggestions.find((suggestion) => suggestion.label === 'Neurology Workspace')?.path).toBe('/workspace/neurology');
  });

  it('uses chest pain context as an AI launcher for ACS tools and cardiology workspace', () => {
    const profileContext = buildUserToolProfile({
      user: { role: 'cardiologist' },
      toolPreferences: { favorites: [], pinned: [], recentTools: [], hiddenTools: [], profileSettings: { role: 'cardiologist' } },
    });
    const suggestions = getChatCapabilitySuggestions({
      input: 'chest pain',
      hasPermission: allowAll,
      profileContext,
      workspaceContext: { activeWorkspaceId: 'cardiology' },
      recentToolIds: ['heart-score'],
      tools: getUserFacingToolRegistryProjection(),
    });

    expect(suggestions.slice(0, 4).map((suggestion) => suggestion.toolId || suggestion.label)).toEqual(
      expect.arrayContaining(['heart-score', 'timi-ua-nstemi', 'acs-workflow-assistant', 'Cardiology Workspace'])
    );
    expect(suggestions[0].toolId).toBe('heart-score');
  });

  it('uses ventilator context as an AI launcher for respiratory tools and workspace', () => {
    const suggestions = getChatCapabilitySuggestions({
      input: 'ventilator settings worsening oxygenation',
      hasPermission: allowAll,
      workspaceContext: { activeWorkspaceId: 'respiratory' },
      tools: getUserFacingToolRegistryProjection(),
    });

    expect(suggestions.slice(0, 3).map((suggestion) => suggestion.toolId || suggestion.label)).toEqual(
      expect.arrayContaining(['rox-index', 'pao2-fio2-ratio', 'Respiratory Workspace'])
    );
  });

  it('filters profile-aware suggestions through the SaaS compiler for registration-clerk', () => {
    const suggestions = getChatCapabilitySuggestions({
      input: 'chest pain',
      hasPermission: allowAll,
      saasRole: 'registration-clerk',
      tools: getUserFacingToolRegistryProjection(),
    });

    const toolIds = suggestions.map((suggestion) => suggestion.toolId).filter(Boolean);
    expect(toolIds).not.toContain('protocols');
    expect(toolIds).not.toContain('acs-workflow-assistant');
  });
});

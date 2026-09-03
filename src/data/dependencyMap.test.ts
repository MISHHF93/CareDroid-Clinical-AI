import { describe, expect, it } from 'vitest';
import {
  DEPENDENCY_ISSUE_TYPES,
  buildDependencyMap,
  detectDependencyIssues,
} from './dependencyMap';

describe('dependencyMap', () => {
  it('builds route to inventory to api to backend to service to executor chains', () => {
    const map = buildDependencyMap({
      contractRows: [
        {
          canonicalId: 'demo-tool',
          canonicalInventoryId: 'demo-tool',
          displayName: 'Demo Tool',
          frontendRoute: '/demo',
          frontendApiClient: 'demoApi.js',
          apiEndpoint: 'GET /api/demo',
          orchestratorToolId: 'demo-executor',
          backendExecutor: 'yes',
          status: 'fully wired',
          kind: 'nlu',
        },
      ],
      backendRoutes: [{ method: 'GET', path: '/api/demo', controller: 'DemoController' }],
      frontendApiCalls: [{ id: 'demo', method: 'GET', path: '/api/demo', client: 'demoApi.js' }],
    });

    expect(map.dependencies[0]).toMatchObject({
      frontendRoute: '/demo',
      inventoryEntry: 'demo-tool',
      apiClient: 'demoApi.js',
      backendEndpoint: 'GET /api/demo',
      backendController: 'DemoController',
      service: 'DemoService',
      executor: 'demo-executor',
    });
  });

  it('detects orphan UI, orphan backend, broken, and duplicate dependencies', () => {
    const dependencies = [
      {
        id: 'dep-1',
        displayName: 'Duplicate A',
        frontendRoute: '/wired',
        inventoryEntry: 'same',
        apiClient: 'sameClient.js',
        backendEndpoint: 'GET /api/wired',
        status: 'fully wired',
      },
      {
        id: 'dep-2',
        displayName: 'Duplicate B',
        frontendRoute: '/wired',
        inventoryEntry: 'same',
        apiClient: 'sameClient.js',
        backendEndpoint: 'GET /api/wired',
        status: 'fully wired',
      },
    ];
    const issues = detectDependencyIssues({
      dependencies,
      routeNodes: [{ id: 'unwired', path: '/unwired', inventoryLinks: 0 }],
      frontendApiCalls: [
        { id: 'missing', method: 'POST', path: '/api/missing', client: 'missingApi.js' },
      ],
      backendRoutes: [
        { method: 'GET', path: '/api/wired', controller: 'DemoController' },
        { method: 'GET', path: '/api/orphan', controller: 'OrphanController' },
      ],
    });

    expect(issues.map((issue) => issue.type)).toEqual(
      expect.arrayContaining([
        DEPENDENCY_ISSUE_TYPES.ORPHAN_UI,
        DEPENDENCY_ISSUE_TYPES.ORPHAN_BACKEND,
        DEPENDENCY_ISSUE_TYPES.BROKEN_DEPENDENCY,
        DEPENDENCY_ISSUE_TYPES.DUPLICATE_DEPENDENCY,
      ]),
    );
  });
});

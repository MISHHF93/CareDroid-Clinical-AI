import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import { isInShellRoute } from './inShellRouteAllowlist';

describe('inShellRouteAllowlist', () => {
  it.each([
    CANONICAL_ROUTES.discover,
    CANONICAL_ROUTES.knowledgeGraph,
    CANONICAL_ROUTES.knowledgeHub,
    CANONICAL_ROUTES.simulation,
    CANONICAL_ROUTES.competencies,
    CANONICAL_ROUTES.fleetCommand,
    CANONICAL_ROUTES.fleetMap,
    '/fleet/live-map',
    '/live-map',
    '/maps',
    '/operations',
    '/maps',
    '/admin',
    '/profile',
    '/lab',
    '/governance/clinical',
    CANONICAL_ROUTES.aiGovernance,
    CANONICAL_ROUTES.integrationHub,
    CANONICAL_ROUTES.workspace,
    CANONICAL_ROUTES.platformStart,
  ])('treats %s as an in-shell route', (path) => {
    expect(isInShellRoute(path)).toBe(true);
  });

  it.each(['/cosmos', '/surveillance', '/digital-twin', '/vehicle'])(
    'does not treat retired extension %s as in-shell',
    (path) => {
      expect(isInShellRoute(path)).toBe(false);
    },
  );
});

import { describe, expect, it } from 'vitest';
import { buildRouteHealthGraph, ROUTE_HEALTH_STATES } from './routeHealth';

describe('route health graph', () => {
  const graph = buildRouteHealthGraph();

  it('classifies every registered route into a normalized health state', () => {
    const validStates = new Set(Object.values(ROUTE_HEALTH_STATES));

    expect(graph.routes.length).toBeGreaterThan(0);
    expect(graph.routes.every((route) => route.path && validStates.has(route.status))).toBe(true);
    expect(graph.routes.find((route) => route.path === '/emergency/whiteboard')?.status).toBe(
      ROUTE_HEALTH_STATES.ACTIVE
    );
    expect(graph.routes.find((route) => route.path === '/dashboard')?.status).toBe(
      ROUTE_HEALTH_STATES.ALIAS
    );
    expect(graph.routes.find((route) => route.path === '/home')?.status).toBe(
      ROUTE_HEALTH_STATES.ALIAS
    );
    expect(graph.routes.find((route) => route.path === '/ai')?.status).toBe(
      ROUTE_HEALTH_STATES.ALIAS
    );
    expect(graph.routes.find((route) => route.path === '/tools/*')?.status).toBe(
      ROUTE_HEALTH_STATES.ALIAS
    );
  });

  it('has no blank routes', () => {
    expect(graph.blankRoutes).toEqual([]);
  });

  it('has no unreachable active or hidden routes', () => {
    expect(graph.unreachableRoutes).toEqual([]);
  });

  it('has no duplicate route ownership conflicts', () => {
    expect(graph.duplicateOwnership).toEqual([]);
  });

  it('has no orphan pages', () => {
    expect(graph.orphanPages).toEqual([]);
  });
});

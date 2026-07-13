import type { Application, RequestHandler } from 'express';
import { getRouteList, registerAllRoutes, ROUTES } from './routes-registry';

const REQUESTED_ROUTE_PATHS = [
  '/capacity',
  '/ems',
  '/surge',
  '/boarding',
  '/protocol',
  '/deterioration',
  '/copilot',
  '/intake',
  '/moh',
  '/wearable',
  '/iot',
  '/simulation',
  '/governance',
  '/handover',
  '/federated',
  '/digital-twin',
];

describe('API routes registry', () => {
  it('exposes all requested v1 route groups in discovery metadata', () => {
    const routeList = getRouteList();
    const paths = routeList.map((route) => route.path);

    expect(paths).toEqual(expect.arrayContaining(REQUESTED_ROUTE_PATHS));
    expect(routeList).toHaveLength(ROUTES.length);
    expect(routeList.every((route) => route.version === 'v1')).toBe(true);
    expect(routeList.every((route) => route.enabled)).toBe(true);
  });

  it('does not expose router internals in discovery metadata', () => {
    const routeList = getRouteList();
    const capacityRoute = routeList.find((route) => route.path === '/capacity');

    expect(capacityRoute).toMatchObject({
      path: '/capacity',
      fullPath: '/api/capacity',
      version: 'v1',
      enabled: true,
    });
    expect(capacityRoute).not.toHaveProperty('router');
  });

  it('builds full paths from a custom API prefix', () => {
    const capacityRoute = getRouteList({ apiPrefix: '/api/emergency/' }).find(
      (route) => route.path === '/capacity',
    );

    expect(capacityRoute?.fullPath).toBe('/api/emergency/capacity');
  });

  it('mounts middleware before every legacy router and can disable discovery', () => {
    const middleware: RequestHandler = (_req, _res, next) => next();
    const app = {
      get: jest.fn(),
      use: jest.fn(),
    } as unknown as Application;

    registerAllRoutes(app, {
      mountDiscovery: false,
      middleware: [middleware],
    });

    expect(app.get).not.toHaveBeenCalled();
    expect(app.use).toHaveBeenCalledTimes(ROUTES.length);
    expect(app.use).toHaveBeenCalledWith('/api/capacity', middleware, ROUTES[1].router);
  });
});

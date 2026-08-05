import { getRouteList, ROUTES } from './routes-registry';

const REQUESTED_ROUTE_PATHS = [
  '/intake',
  '/moh',
  '/wearable',
  '/iot',
  '/simulation',
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
    const intakeRoute = routeList.find((route) => route.path === '/intake');

    expect(intakeRoute).toMatchObject({
      path: '/intake',
      fullPath: '/api/intake',
      version: 'v1',
      enabled: true,
    });
    expect(intakeRoute).not.toHaveProperty('router');
  });

  it('builds full paths from a custom API prefix', () => {
    const intakeRoute = getRouteList({ apiPrefix: '/api/emergency/' }).find(
      (route) => route.path === '/intake',
    );

    expect(intakeRoute?.fullPath).toBe('/api/emergency/intake');
  });
});

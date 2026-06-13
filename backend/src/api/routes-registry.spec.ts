import { getRouteList, ROUTES } from './routes-registry';

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

    expect(routeList[0]).toMatchObject({
      path: '/capacity',
      fullPath: '/api/capacity',
      version: 'v1',
      enabled: true,
    });
    expect(routeList[0]).not.toHaveProperty('router');
  });

  it('builds full paths from a custom API prefix', () => {
    expect(getRouteList({ apiPrefix: '/api/emergency/' })[0].fullPath).toBe(
      '/api/emergency/capacity',
    );
  });
});

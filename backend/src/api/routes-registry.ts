import type { Application, RequestHandler, Router } from 'express';
import digitalTwinRoutes from './digital-twin.routes';
import federatedRoutes from './federated.routes';
import handoverRoutes from './handover.routes';
import healthRoutes from './health.routes';
import intakeRoutes from './smart-intake.routes';
import iotRoutes from './iot.routes';
import mohRoutes from './moh.routes';
import simulationRoutes from './simulation.routes';
import wearableRoutes from './wearable.routes';

export type ApiRouteVersion = 'v1';

export interface ApiRouteRegistration {
  path: string;
  router: Router;
  version: ApiRouteVersion;
  enabled: boolean;
  description: string;
}

export interface ApiRouteListItem {
  path: string;
  fullPath: string;
  version: ApiRouteVersion;
  enabled: boolean;
  description: string;
}

export interface RegisterAllRoutesOptions {
  apiPrefix?: string;
  mountDiscovery?: boolean;
  mountRoutes?: boolean;
  /** Optional Express middleware chain applied to every mounted legacy route group. */
  middleware?: RequestHandler[];
}

const DEFAULT_API_PREFIX = '/api';

export const ROUTES: ApiRouteRegistration[] = [
  {
    path: '/health',
    router: healthRoutes,
    version: 'v1',
    enabled: true,
    description: 'comprehensive system health checks',
  },
  {
    path: '/intake',
    router: intakeRoutes,
    version: 'v1',
    enabled: true,
    description: 'smart patient intake',
  },
  {
    path: '/moh',
    router: mohRoutes,
    version: 'v1',
    enabled: true,
    description: 'Ministry of Health FHIR',
  },
  {
    path: '/wearable',
    router: wearableRoutes,
    version: 'v1',
    enabled: true,
    description: 'wearable devices',
  },
  {
    path: '/iot',
    router: iotRoutes,
    version: 'v1',
    enabled: true,
    description: 'IoT sensors',
  },
  {
    path: '/simulation',
    router: simulationRoutes,
    version: 'v1',
    enabled: true,
    description: 'real-time simulation',
  },
  {
    path: '/handover',
    router: handoverRoutes,
    version: 'v1',
    enabled: true,
    description: 'smart handover',
  },
  {
    path: '/federated',
    router: federatedRoutes,
    version: 'v1',
    enabled: true,
    description: 'federated learning',
  },
  {
    path: '/digital-twin',
    router: digitalTwinRoutes,
    version: 'v1',
    enabled: true,
    description: 'digital twin',
  },
];

function normalizeApiPrefix(apiPrefix = DEFAULT_API_PREFIX) {
  const trimmedPrefix = apiPrefix.trim();
  if (!trimmedPrefix || trimmedPrefix === '/') return '';
  return `/${trimmedPrefix.replace(/^\/+|\/+$/g, '')}`;
}

function joinRoutePath(apiPrefix: string, routePath: string) {
  const normalizedPrefix = normalizeApiPrefix(apiPrefix);
  const normalizedRoutePath = `/${routePath.replace(/^\/+/, '')}`;
  return `${normalizedPrefix}${normalizedRoutePath}`;
}

export function getRouteList(options: Pick<RegisterAllRoutesOptions, 'apiPrefix'> = {}) {
  const apiPrefix = normalizeApiPrefix(options.apiPrefix);

  return ROUTES.map<ApiRouteListItem>((route) => ({
    path: route.path,
    fullPath: joinRoutePath(apiPrefix, route.path),
    version: route.version,
    enabled: route.enabled,
    description: route.description,
  }));
}

export function registerAllRoutes(app: Application, options: RegisterAllRoutesOptions = {}) {
  const apiPrefix = normalizeApiPrefix(options.apiPrefix);
  const mountedRoutes: ApiRouteListItem[] = [];

  if (options.mountDiscovery !== false) {
    app.get(joinRoutePath(apiPrefix, '/routes'), (_req, res) => {
      const routes = getRouteList({ apiPrefix });
      res.json({ count: routes.length, routes });
    });
  }

  if (options.mountRoutes === false) {
    return mountedRoutes;
  }

  for (const route of ROUTES) {
    if (!route.enabled) continue;

    app.use(joinRoutePath(apiPrefix, route.path), ...(options.middleware || []), route.router);
    mountedRoutes.push({
      path: route.path,
      fullPath: joinRoutePath(apiPrefix, route.path),
      version: route.version,
      enabled: route.enabled,
      description: route.description,
    });
  }

  return mountedRoutes;
}

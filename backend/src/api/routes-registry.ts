import type { Application, RequestHandler, Router } from 'express';
import boardingRoutes from './boarding.routes';
import capacityRoutes from './capacity.routes';
import copilotRoutes from './copilot.routes';
import deteriorationRoutes from './deterioration.routes';
import digitalTwinRoutes from './digital-twin.routes';
import emsRoutes from './ems.routes';
import federatedRoutes from './federated.routes';
import governanceRoutes from './governance.routes';
import handoverRoutes from './handover.routes';
import healthRoutes from './health.routes';
import intakeRoutes from './smart-intake.routes';
import iotRoutes from './iot.routes';
import mohRoutes from './moh.routes';
import protocolRoutes from './protocol.routes';
import reassessmentRoutes from './reassessment.routes';
import simulationRoutes from './simulation.routes';
import surgeRoutes from './surge.routes';
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
    path: '/capacity',
    router: capacityRoutes,
    version: 'v1',
    enabled: true,
    description: 'capacity dashboard',
  },
  {
    path: '/ems',
    router: emsRoutes,
    version: 'v1',
    enabled: true,
    description: 'EMS intake and tracking',
  },
  {
    path: '/surge',
    router: surgeRoutes,
    version: 'v1',
    enabled: true,
    description: 'surge capacity and MCI',
  },
  {
    path: '/boarding',
    router: boardingRoutes,
    version: 'v1',
    enabled: true,
    description: 'boarding metrics',
  },
  {
    path: '/protocol',
    router: protocolRoutes,
    version: 'v1',
    enabled: true,
    description: 'clinical protocol triggers',
  },
  {
    path: '/deterioration',
    router: deteriorationRoutes,
    version: 'v1',
    enabled: true,
    description: 'deterioration prediction',
  },
  {
    path: '/copilot',
    router: copilotRoutes,
    version: 'v1',
    enabled: true,
    description: 'ED Copilot',
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
    path: '/governance',
    router: governanceRoutes,
    version: 'v1',
    enabled: true,
    description: 'AI governance',
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
  {
    path: '/reassessment',
    router: reassessmentRoutes,
    version: 'v1',
    enabled: true,
    description: 'reassessment queue and scheduling',
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

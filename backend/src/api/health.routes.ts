import { Router, type Request } from 'express';
import mongoose from 'mongoose';
import { Socket } from 'net';
import { connect as connectTls } from 'tls';
import type { Server as SocketIOServer } from 'socket.io';
import { checkServiceHealth } from '../services/service-registry';

type ComponentStatus = 'healthy' | 'degraded' | 'unhealthy' | 'not-configured';
type OverallStatus = 'healthy' | 'degraded' | 'unhealthy';

interface ComponentHealth {
  status: ComponentStatus;
  responseTimeMs: number;
  checkedAt: string;
  configured: boolean;
  critical: boolean;
  details?: Record<string, unknown>;
  error?: string;
}

interface TimedComponentInput {
  status: ComponentStatus;
  configured: boolean;
  critical: boolean;
  details?: Record<string, unknown>;
  error?: string;
}

type HealthComponents = Record<string, ComponentHealth>;

const router = Router();
const CHECK_TIMEOUT_MS = Number(process.env.HEALTH_CHECK_TIMEOUT_MS || 2000);
const MONGOOSE_STATE_NAMES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
  99: 'uninitialized',
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function configuredValue(...keys: string[]): string | null {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim()) return value.trim();
  }

  return null;
}

async function timedComponent(
  critical: boolean,
  check: () => Promise<Omit<TimedComponentInput, 'critical'>>,
): Promise<ComponentHealth> {
  const startedAt = Date.now();

  try {
    const result = await check();
    return {
      ...result,
      critical,
      checkedAt: new Date().toISOString(),
      responseTimeMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      status: critical ? 'unhealthy' : 'degraded',
      configured: true,
      critical,
      checkedAt: new Date().toISOString(),
      responseTimeMs: Date.now() - startedAt,
      error: errorMessage(error),
    };
  }
}

async function checkDatabaseConnectivity(): Promise<ComponentHealth> {
  return timedComponent(true, async () => {
    const readyState = mongoose.connection.readyState;
    const mongoConfigured = Boolean(
      configuredValue('MONGODB_URI', 'DATABASE_MONGO_URI') || readyState !== 0,
    );
    const stateName = MONGOOSE_STATE_NAMES[readyState] || `state-${readyState}`;

    if (!mongoConfigured) {
      return {
        status: 'not-configured',
        configured: false,
        details: {
          connector: 'mongoose',
          readyState,
          stateName,
          message: 'Mongoose is not connected and no MongoDB URI is configured.',
        },
      };
    }

    if (readyState !== 1) {
      return {
        status: 'unhealthy',
        configured: true,
        details: {
          connector: 'mongoose',
          readyState,
          stateName,
        },
        error: `Mongoose connection is ${stateName}.`,
      };
    }

    if (!mongoose.connection.db) {
      return {
        status: 'degraded',
        configured: true,
        details: {
          connector: 'mongoose',
          readyState,
          stateName,
        },
        error: 'Mongoose connection is ready but no database handle is available.',
      };
    }

    const ping = await mongoose.connection.db.admin().ping();
    return {
      status: 'healthy',
      configured: true,
      details: {
        connector: 'mongoose',
        readyState,
        stateName,
        ping,
      },
    };
  });
}

function summarizeServiceStatuses(services: Record<string, { status?: unknown }>) {
  const statuses = Object.entries(services).map(([name, service]) => ({
    name,
    status: typeof service.status === 'string' ? service.status : 'unknown',
  }));
  const unhealthy = statuses.filter((service) =>
    ['failed', 'unhealthy', 'error'].includes(service.status.toLowerCase()),
  );
  const degraded = statuses.filter((service) =>
    ['degraded', 'not_connected', 'not-configured', 'unknown'].includes(
      service.status.toLowerCase(),
    ),
  );

  return { statuses, unhealthy, degraded };
}

async function checkRegisteredServices(): Promise<ComponentHealth> {
  return timedComponent(true, async () => {
    const summary = await checkServiceHealth();
    const { unhealthy, degraded } = summarizeServiceStatuses(summary.services);

    if (unhealthy.length > 0 || summary.totals.failed > 0) {
      return {
        status: 'unhealthy',
        configured: true,
        details: {
          generatedAt: summary.generatedAt,
          totals: summary.totals,
          unhealthyServices: unhealthy,
          degradedServices: degraded,
          services: summary.services,
        },
        error: `${unhealthy.length || summary.totals.failed} registered service(s) failed health checks.`,
      };
    }

    return {
      status: degraded.length > 0 ? 'degraded' : 'healthy',
      configured: true,
      details: {
        generatedAt: summary.generatedAt,
        totals: summary.totals,
        degradedServices: degraded,
        services: summary.services,
      },
    };
  });
}

function socketServerDetails(name: string, server: SocketIOServer | undefined) {
  if (!server) return null;
  const serverRecord = server as unknown as {
    path?: () => string;
    engine?: { clientsCount?: number };
    sockets?: { sockets?: Map<string, unknown> };
  };

  return {
    name,
    path: typeof serverRecord.path === 'function' ? serverRecord.path() : undefined,
    clients: serverRecord.engine?.clientsCount ?? serverRecord.sockets?.sockets?.size ?? 0,
  };
}

async function checkWebSocketStatus(req: Request): Promise<ComponentHealth> {
  return timedComponent(false, async () => {
    const servers = [
      socketServerDetails('ems', req.app.get('io') as SocketIOServer | undefined),
      socketServerDetails(
        'edge-ai-ambulance',
        req.app.get('edgeAIAmbulanceIo') as SocketIOServer | undefined,
      ),
    ].filter(Boolean);

    if (servers.length === 0) {
      return {
        status: 'not-configured',
        configured: false,
        details: {
          message: 'No Socket.IO servers are registered on the Express app.',
        },
      };
    }

    return {
      status: 'healthy',
      configured: true,
      details: {
        servers,
      },
    };
  });
}

function resolveMqttUrl(): string | null {
  const explicitUrl = configuredValue('MQTT_BROKER_URL', 'MQTT_URL', 'MQTT_SERVER_URL');
  if (explicitUrl) return explicitUrl;

  const host = configuredValue('MQTT_HOST');
  if (!host) return null;

  const port = configuredValue('MQTT_PORT') || '1883';
  const protocol = configuredValue('MQTT_PROTOCOL') || 'mqtt';
  return `${protocol}://${host}:${port}`;
}

function connectToBroker(url: URL): Promise<void> {
  const port = Number(url.port || (url.protocol === 'mqtts:' ? 8883 : 1883));
  const host = url.hostname;

  return new Promise((resolve, reject) => {
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onConnect = () => {
      cleanup();
      socket.destroy();
      resolve();
    };
    const onTimeout = () => {
      cleanup();
      socket.destroy();
      reject(new Error(`MQTT broker connection timed out after ${CHECK_TIMEOUT_MS}ms.`));
    };
    const cleanup = () => {
      socket.removeListener('connect', onConnect);
      socket.removeListener('error', onError);
      socket.removeListener('timeout', onTimeout);
    };

    const socket =
      url.protocol === 'mqtts:'
        ? connectTls({ host, port, servername: host })
        : new Socket().connect(port, host);

    socket.setTimeout(CHECK_TIMEOUT_MS);
    socket.once('connect', onConnect);
    socket.once('error', onError);
    socket.once('timeout', onTimeout);
  });
}

async function checkMqttBroker(): Promise<ComponentHealth> {
  return timedComponent(false, async () => {
    const mqttUrl = resolveMqttUrl();

    if (!mqttUrl) {
      return {
        status: 'not-configured',
        configured: false,
        details: {
          message: 'No MQTT broker environment variables are configured.',
          supportedEnv: ['MQTT_BROKER_URL', 'MQTT_URL', 'MQTT_SERVER_URL', 'MQTT_HOST'],
        },
      };
    }

    const parsedUrl = new URL(mqttUrl.includes('://') ? mqttUrl : `mqtt://${mqttUrl}`);
    await connectToBroker(parsedUrl);

    return {
      status: 'healthy',
      configured: true,
      details: {
        protocol: parsedUrl.protocol.replace(':', ''),
        host: parsedUrl.hostname,
        port: Number(parsedUrl.port || (parsedUrl.protocol === 'mqtts:' ? 8883 : 1883)),
      },
    };
  });
}

async function probeHttpEndpoint(endpoint: string) {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is unavailable in this Node runtime.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

  try {
    let response = await fetch(endpoint, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        accept: 'application/fhir+json, application/json;q=0.9, */*;q=0.1',
      },
    });
    let method = 'HEAD';

    if (response.status === 405 || response.status === 501) {
      response = await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          accept: 'application/fhir+json, application/json;q=0.9, */*;q=0.1',
        },
      });
      method = 'GET';
    }

    return {
      method,
      statusCode: response.status,
      statusText: response.statusText,
      reachable: response.status < 500,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkExternalApi(label: string, envKeys: string[]): Promise<ComponentHealth> {
  return timedComponent(false, async () => {
    const configuredEndpoint = configuredValue(...envKeys);

    if (!configuredEndpoint) {
      return {
        status: 'not-configured',
        configured: false,
        details: {
          label,
          supportedEnv: envKeys,
        },
      };
    }

    let endpoint: string;
    try {
      endpoint = new URL(configuredEndpoint).toString();
    } catch {
      return {
        status: 'degraded',
        configured: true,
        details: {
          label,
          endpoint: configuredEndpoint,
          supportedEnv: envKeys,
        },
        error: `${label} endpoint is not a valid URL.`,
      };
    }

    const probe = await probeHttpEndpoint(endpoint);
    return {
      status: probe.reachable ? 'healthy' : 'degraded',
      configured: true,
      details: {
        label,
        endpoint,
        ...probe,
      },
      error: probe.reachable ? undefined : `${label} returned HTTP ${probe.statusCode}.`,
    };
  });
}

function determineOverallStatus(components: HealthComponents): OverallStatus {
  const checks = Object.values(components);
  const configuredChecks = checks.filter((check) => check.configured);

  if (configuredChecks.some((check) => check.critical && check.status === 'unhealthy')) {
    return 'unhealthy';
  }

  if (
    checks.some((check) => check.critical && check.status === 'degraded') ||
    configuredChecks.some((check) => ['degraded', 'unhealthy'].includes(check.status))
  ) {
    return 'degraded';
  }

  return 'healthy';
}

router.get('/', async (req, res) => {
  const startedAt = Date.now();
  const [database, services, websocket, mqtt, mohFhirApi, wearableApi] = await Promise.all([
    checkDatabaseConnectivity(),
    checkRegisteredServices(),
    checkWebSocketStatus(req),
    checkMqttBroker(),
    checkExternalApi('MoH FHIR', [
      'MOH_FHIR_BASE_URL',
      'MOH_FHIR_URL',
      'FHIR_BASE_URL',
      'FHIR_API_URL',
    ]),
    checkExternalApi('Wearable API', [
      'WEARABLE_API_URL',
      'WEARABLES_API_URL',
      'WEARABLE_RPM_API_URL',
      'WEARABLE_BASE_URL',
    ]),
  ]);
  const components: HealthComponents = {
    database,
    services,
    websocket,
    mqtt,
    mohFhirApi,
    wearableApi,
  };
  const status = determineOverallStatus(components);

  return res.status(status === 'unhealthy' ? 503 : 200).json({
    status,
    timestamp: new Date().toISOString(),
    responseTimeMs: Date.now() - startedAt,
    components,
  });
});

export default router;

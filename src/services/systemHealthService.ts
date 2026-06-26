import { apiFetchJson, getApiErrorMessage } from './apiClient';
import { recordAutomationFailure } from './automationAuditLogger';

const UNKNOWN = 'unknown';

export function normalizeHealthPayload(data: any = {}) {
  return {
    status: data.apiHealth || data.status || UNKNOWN,
    service: data.service || 'CareDroid backend',
    frontendVersion: data.frontendVersion || UNKNOWN,
    backendVersion: data.backendVersion || data.version || UNKNOWN,
    gitCommit: data.gitCommit || data.commit || data.commitSha || UNKNOWN,
    buildTimestamp: data.buildTimestamp || data.timestamp || UNKNOWN,
    vercelEnvironment: data.vercelEnvironment || data.environment || UNKNOWN,
    deploymentStatus: data.deploymentStatus || UNKNOWN,
  };
}

export function compareDeploymentCommits(frontendCommit, backendCommit) {
  const frontend = String(frontendCommit || '').trim();
  const backend = String(backendCommit || '').trim();

  if (!frontend || !backend || frontend === UNKNOWN || backend === UNKNOWN) {
    return {
      status: 'unknown',
      label: 'Commit comparison unavailable',
      detail: 'One side did not publish a commit hash.',
    };
  }

  const frontendShort = frontend.slice(0, 12);
  const backendShort = backend.slice(0, 12);
  const matches =
    frontend === backend ||
    frontend.startsWith(backend) ||
    backend.startsWith(frontend) ||
    frontendShort === backendShort;

  return matches
    ? {
        status: 'match',
        label: 'Frontend and backend commits match',
        detail: `${frontendShort} is serving on both surfaces.`,
      }
    : {
        status: 'mismatch',
        label: 'Frontend and backend commits differ',
        detail: `Frontend ${frontendShort}, backend ${backendShort}.`,
      };
}

async function readJsonEndpoint(path) {
  try {
    const { response, data } = await apiFetchJson(path, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      timeoutMs: 5000,
    });

    return {
      ok: response.ok,
      statusCode: response.status,
      data,
      message: response.ok ? '' : getApiErrorMessage(null, response),
    };
  } catch (error: any) {
    await recordAutomationFailure({
      triggerFired: `System health probe failed for ${path}`,
      actionSelected: 'Read observability health endpoint',
      toolCalled: 'system-health',
      backendEndpoint: path,
      error,
    });
    return {
      ok: false,
      statusCode: 0,
      data: null,
      message: getApiErrorMessage(error),
    };
  }
}

export async function fetchDeploymentTruth() {
  const [backendProbe, systemHealth] = await Promise.all([
    readJsonEndpoint('/health'),
    readJsonEndpoint('/api/system-health'),
  ]);

  return {
    backendProbe,
    systemHealth,
    backendHealth: normalizeHealthPayload(systemHealth.data || backendProbe.data || {}),
    sourceStatus: systemHealth.ok ? 'live' : backendProbe.ok ? 'probe-only' : 'offline',
    message: systemHealth.message || backendProbe.message || '',
  };
}

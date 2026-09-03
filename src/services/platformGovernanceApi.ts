import { apiFetchJson, getApiErrorMessage } from './apiClient';

const SURFACE_ENDPOINTS = Object.freeze({
  governance: '/api/governance/clinical/readiness',
  'ai-security': '/api/governance/ai-security/summary',
  regulatory: '/api/governance/regulatory/capabilities',
  equity: '/api/governance/equity/summary',
  validation: '/api/governance/validation/scenarios',
  review: '/api/review/items',
  consent: '/api/consent/demo-patient',
  privacy: '/api/privacy/access-log',
  audit: '/api/audit/integrity/status',
  observability: '/api/operations/observability/summary',
  interoperability: '/api/source-provenance/synthetic-source',
});

function patientIdFromPath(pathname = '') {
  return pathname.match(/^\/patients\/([^/]+)/)?.[1] || 'demo-patient';
}

function endpointForSurface(surface = 'governance', pathname = '') {
  const patientId = patientIdFromPath(pathname);
  if (pathname === '/ai-governance') return '/api/ai-governance/summary';
  if (pathname === '/security') return '/api/security/summary';
  if (pathname === '/integrations') return '/api/interoperability/summary';
  if (pathname === '/regulatory') return '/api/regulatory/summary';
  if (pathname === '/equity') return '/api/equity/summary';
  if (pathname === '/human-review') return '/api/human-review/items';
  if (pathname === '/privacy') return '/api/privacy/summary';
  if (pathname === '/audit') return '/api/ehr-audit/summary';
  if (pathname === '/system-health') return '/api/system-health';
  if (/^\/patients\/[^/]+\/source-data/.test(pathname)) {
    return `/api/patients/${patientId}/source-data`;
  }
  if (/^\/patients\/[^/]+\/review/.test(pathname)) {
    return `/api/patients/${patientId}/review-items`;
  }
  if (/^\/patients\/[^/]+\/privacy/.test(pathname)) {
    return `/api/privacy/patient/${patientId}/access-log`;
  }
  if (/^\/patients\/[^/]+\/consent/.test(pathname) || /^\/consent\/[^/]+/.test(pathname)) {
    return `/api/consent/${patientId}`;
  }
  if (pathname.includes('/privacy/requests')) return '/api/privacy/requests';
  if (pathname.includes('/audit/ai')) return '/api/audit/runs/demo-run';
  if (pathname.includes('/audit/phi')) return `/api/audit/patients/${patientId}/access`;
  if (pathname.includes('/operations/deployments')) return '/api/operations/deployments/current';
  if (pathname.includes('/operations/service-health')) return '/api/operations/service-health';
  if (pathname.includes('/operations/incidents')) return '/api/operations/incidents';
  if (pathname.includes('/validation/runs')) return '/api/governance/validation/runs/demo-run';
  if (pathname.includes('/validation/release-gates')) {
    return '/api/governance/validation/release-gates/clinical-governance';
  }
  if (pathname.includes('/equity/metrics')) return '/api/governance/equity/metrics';
  if (pathname.includes('/equity/cohorts')) return '/api/governance/equity/cohorts';
  if (pathname.includes('/equity/reports')) return '/api/governance/equity/summary';
  if (pathname.includes('/regulatory/evidence')) {
    return '/api/governance/regulatory/evidence/clinical-governance';
  }
  if (pathname.includes('/regulatory/capabilities'))
    return '/api/governance/regulatory/capabilities';
  if (pathname.includes('/ai-security/incidents')) return '/api/governance/ai-security/incidents';
  if (pathname.includes('/clinical/policies')) return '/api/governance/clinical/policies';
  return SURFACE_ENDPOINTS[surface] || SURFACE_ENDPOINTS.governance;
}

export const LOCAL_PLATFORM_GOVERNANCE_STATE = Object.freeze({
  status: 'local_fallback',
  generatedAt: new Date(0).toISOString(),
  readiness: {
    criticality: 'P0',
    blocked: true,
    blockers: ['backend_unavailable'],
  },
  counts: {
    policies: 0,
    releaseGates: 0,
    safetyFindings: 0,
    securityEvents: 0,
    classifications: 0,
    equityMetrics: 0,
    validationScenarios: 0,
    reviewItems: 0,
    consentRecords: 0,
    privacyRequests: 0,
    observabilityEvents: 0,
    sourceProvenance: 0,
  },
  safety: {
    autonomousActionTaken: false,
    failClosed: true,
    demoExternalConnectors: true,
  },
});

/**
 * Found 2026-08-07: the interoperability surface's real backend response
 * (InteroperabilityController.getSummary(), mounted at
 * /api/interoperability/summary) sets `status: 'synthetic_ready'` -- a
 * real, deliberate non-live marker (this endpoint is entirely
 * synthetic/demo data, confirmed by its own `uiStates.connectionState:
 * 'demo_unconfigured'` and `provenance.freshness: 'demo'` fields) -- but
 * the previous `status.includes('demo')` check only recognized the literal
 * word "demo", so this surface silently reported sourceStatus: 'live' to
 * the FHIR + HL7 Integration governance page, the opposite of what
 * StateSourceNotice's demo/live legend promises. Widened to match this
 * codebase's other non-live vocabulary (synthetic/mock/simulated), not
 * just "demo".
 */
function isNonLiveSourceStatus(status: unknown): boolean {
  if (typeof status !== 'string') return false;
  return /demo|synthetic|mock|simulated/i.test(status);
}

export async function fetchPlatformGovernanceSurface(surface = 'governance', pathname = '') {
  const endpoint = endpointForSurface(surface, pathname);
  try {
    const { response, data } = await apiFetchJson(endpoint, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return {
        ok: false,
        data: LOCAL_PLATFORM_GOVERNANCE_STATE,
        sourceStatus: 'fallback',
        message: getApiErrorMessage(null, response),
      };
    }

    return {
      ok: true,
      data,
      sourceStatus: isNonLiveSourceStatus(data?.status) ? 'demo' : 'live',
      message: '',
    };
  } catch (error: any) {
    return {
      ok: false,
      data: LOCAL_PLATFORM_GOVERNANCE_STATE,
      sourceStatus: 'fallback',
      message: getApiErrorMessage(error),
    };
  }
}

export async function evaluatePlatformGate(payload: any = {}) {
  try {
    const { response, data } = await apiFetchJson('/api/security/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return {
      ok: response.ok,
      data,
      message: response.ok ? '' : getApiErrorMessage(null, response),
    };
  } catch (error: any) {
    return { ok: false, data: null, message: getApiErrorMessage(error) };
  }
}

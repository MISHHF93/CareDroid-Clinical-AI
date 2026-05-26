import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';

export const ARTIFACT_TYPE_OPTIONS = Object.freeze([
  { value: 'calculator', label: 'Calculators' },
  { value: 'workflow', label: 'Workflows' },
  { value: 'prompt', label: 'Prompts' },
  { value: 'dashboard', label: 'Dashboards' },
  { value: 'template', label: 'Templates' },
  { value: 'protocol', label: 'Protocols' },
  { value: 'telemetry_schema', label: 'Telemetry schemas' },
  { value: 'map', label: 'Maps' },
  { value: 'ai_output', label: 'AI outputs' },
]);

export const LOCAL_ARTIFACTS = Object.freeze([
  {
    id: 'apache-ii-calculator',
    type: 'calculator',
    title: 'APACHE II Calculator',
    description:
      'Critical-care severity calculator for ICU risk stratification and escalation planning.',
    tags: ['critical-care', 'calculator', 'risk-score'],
    relationships: [
      {
        artifactId: 'sepsis-escalation-workflow',
        type: 'supports',
        label: 'Feeds sepsis escalation',
      },
    ],
    version: '1.2.0',
    createdAt: '2026-01-15T09:00:00.000Z',
  },
  {
    id: 'sepsis-escalation-workflow',
    type: 'workflow',
    title: 'Sepsis Escalation Workflow',
    description:
      'Stepwise care team workflow for screening, bundle activation, reassessment, and handoff.',
    tags: ['workflow', 'sepsis', 'emergency'],
    relationships: [
      {
        artifactId: 'antimicrobial-timeout-protocol',
        type: 'uses',
        label: 'Requires protocol review',
      },
      {
        artifactId: 'triage-handoff-prompt',
        type: 'generates',
        label: 'Creates handoff prompt',
      },
    ],
    version: '2.0.0',
    createdAt: '2026-01-20T10:30:00.000Z',
  },
  {
    id: 'triage-handoff-prompt',
    type: 'prompt',
    title: 'Triage Handoff Prompt',
    description:
      'Reusable prompt pattern for summarizing acute findings, pending tasks, and follow-up questions.',
    tags: ['prompt', 'handoff', 'assistant'],
    relationships: [{ artifactId: 'ai-rounding-summary-output', type: 'produces' }],
    version: '1.4.1',
    createdAt: '2026-02-03T08:15:00.000Z',
  },
  {
    id: 'clinical-operations-dashboard',
    type: 'dashboard',
    title: 'Clinical Operations Dashboard',
    description:
      'Dashboard for surfacing queue load, high-risk alerts, device freshness, and workflow throughput.',
    tags: ['dashboard', 'operations', 'telemetry'],
    relationships: [
      { artifactId: 'device-vitals-telemetry-schema', type: 'observes' },
      { artifactId: 'hospital-capacity-map', type: 'visualizes' },
    ],
    version: '1.1.0',
    createdAt: '2026-02-10T14:00:00.000Z',
  },
  {
    id: 'discharge-summary-template',
    type: 'template',
    title: 'Discharge Summary Template',
    description:
      'Structured note template for diagnosis, course, medication changes, follow-up, and safety netting.',
    tags: ['template', 'documentation', 'discharge'],
    relationships: [{ artifactId: 'ai-rounding-summary-output', type: 'reuses' }],
    version: '1.0.3',
    createdAt: '2026-02-12T12:45:00.000Z',
  },
  {
    id: 'antimicrobial-timeout-protocol',
    type: 'protocol',
    title: 'Antimicrobial Timeout Protocol',
    description:
      'Clinical protocol for reassessing antimicrobial coverage, culture results, and de-escalation timing.',
    tags: ['protocol', 'medication', 'stewardship'],
    relationships: [{ artifactId: 'sepsis-escalation-workflow', type: 'governs' }],
    version: '3.1.0',
    createdAt: '2026-02-18T16:20:00.000Z',
  },
  {
    id: 'device-vitals-telemetry-schema',
    type: 'telemetry_schema',
    title: 'Device Vitals Telemetry Schema',
    description:
      'Schema for normalized bed-side device observations, freshness windows, alerts, and provenance.',
    tags: ['telemetry', 'schema', 'medical-iot'],
    relationships: [{ artifactId: 'clinical-operations-dashboard', type: 'powers' }],
    version: '1.5.0',
    createdAt: '2026-03-01T11:10:00.000Z',
  },
  {
    id: 'hospital-capacity-map',
    type: 'map',
    title: 'Hospital Capacity Map',
    description:
      'Operational map layer for floor capacity, device locations, transport status, and bed readiness.',
    tags: ['map', 'operations', 'capacity'],
    relationships: [{ artifactId: 'clinical-operations-dashboard', type: 'feeds' }],
    version: '0.9.0',
    createdAt: '2026-03-06T13:25:00.000Z',
  },
  {
    id: 'ai-rounding-summary-output',
    type: 'ai_output',
    title: 'AI Rounding Summary Output',
    description:
      'AI-generated clinical summary artifact with problems, overnight events, risks, and follow-up prompts.',
    tags: ['ai-output', 'rounding', 'summary'],
    relationships: [
      { artifactId: 'discharge-summary-template', type: 'informs' },
      { artifactId: 'triage-handoff-prompt', type: 'derived-from' },
    ],
    version: '1.3.2',
    createdAt: '2026-03-10T09:40:00.000Z',
  },
]);

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const search = query.toString();
  return search ? `?${search}` : '';
}

function fallbackFilters(artifacts = LOCAL_ARTIFACTS) {
  return {
    types: ARTIFACT_TYPE_OPTIONS.map((type) => type.value),
    tags: [...new Set(artifacts.flatMap((artifact) => artifact.tags || []))].sort(),
  };
}

async function requestJson(path, options = {}) {
  try {
    const response = await apiFetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const data = await parseApiResponse(response, { fallback: {} });
    if (!response.ok) {
      return { ok: false, data: null, message: data?.message || getApiErrorMessage(null, response) };
    }
    return { ok: true, data, message: '' };
  } catch (error) {
    return { ok: false, data: null, message: getApiErrorMessage(error) };
  }
}

export async function fetchArtifacts(params = {}) {
  const result = await requestJson(`/api/artifacts${buildQuery(params)}`);
  if (!result.ok) {
    return { ...result, artifacts: [], count: 0, filters: fallbackFilters() };
  }
  const artifacts = result.data?.artifacts || result.data?.data?.artifacts || [];
  return {
    ok: true,
    artifacts,
    count: result.data?.count ?? artifacts.length,
    filters: result.data?.filters || fallbackFilters(artifacts),
    message: '',
  };
}

export async function fetchArtifactGraph(params = {}) {
  const result = await requestJson(`/api/artifacts/graph${buildQuery(params)}`);
  if (!result.ok) {
    return { ...result, nodes: [], edges: [] };
  }
  return {
    ok: true,
    nodes: result.data?.nodes || [],
    edges: result.data?.edges || [],
    message: '',
  };
}

export async function fetchArtifactVersions(artifactId) {
  if (!artifactId) {
    return { ok: false, versions: [], message: 'Artifact id is required.' };
  }

  const result = await requestJson(`/api/artifacts/${encodeURIComponent(artifactId)}/versions`);
  if (!result.ok) {
    return { ...result, versions: [] };
  }
  return {
    ok: true,
    artifactId,
    versions: result.data?.versions || [],
    message: '',
  };
}

export default {
  ARTIFACT_TYPE_OPTIONS,
  LOCAL_ARTIFACTS,
  fetchArtifacts,
  fetchArtifactGraph,
  fetchArtifactVersions,
};

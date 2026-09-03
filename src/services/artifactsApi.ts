import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';
import { buildArtifactCatalog } from '../data/artifactIntelligence';

function displayLabel(value) {
  return String(value || '')
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function toDisplayArtifact(artifact) {
  const dependencies =
    artifact.dependencies && artifact.dependencies !== 'unknown'
      ? artifact.dependencies.split('|')
      : [];
  return {
    ...artifact,
    id: artifact.artifactId,
    title: artifact.name,
    tags: artifact.tags === 'unknown' ? [] : artifact.tags.split('|'),
    relationships: dependencies.slice(0, 8).map((artifactId) => ({
      artifactId,
      type: 'depends-on',
      label: 'Dependency',
    })),
    version: '1.0.0',
    createdAt: '2026-06-01T00:00:00.000Z',
  };
}

const localCanonicalArtifacts = buildArtifactCatalog();

export const ARTIFACT_TYPE_OPTIONS = Object.freeze(
  [...new Set(localCanonicalArtifacts.map((artifact) => artifact.type))]
    .sort()
    .map((value) => ({ value, label: displayLabel(value) })),
);

export const LOCAL_ARTIFACTS = Object.freeze(localCanonicalArtifacts.map(toDisplayArtifact));

function buildQuery(params: any = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value as string);
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

async function requestJson(path, options: any = {}) {
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
      return {
        ok: false,
        data: null,
        message: data?.message || getApiErrorMessage(null, response),
      };
    }
    return { ok: true, data, message: '' };
  } catch (error: any) {
    return { ok: false, data: null, message: getApiErrorMessage(error) };
  }
}

export async function fetchArtifacts(params: any = {}) {
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

export async function fetchArtifactGraph(params: any = {}) {
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

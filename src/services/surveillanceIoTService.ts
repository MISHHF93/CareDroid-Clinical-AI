import type { SurveillanceNexusSnapshot } from '../types/surveillanceIoT';
import { BACKEND_API_CAPABILITY_STATUS } from '../config/backendApiCapabilities';

const API_BASE = '/api';

function buildDemoSnapshot(): SurveillanceNexusSnapshot {
  const generatedAt = new Date().toISOString();
  return {
    source: 'frontend-demo-surveillance-nexus',
    sourceLabel: 'Local demo fallback',
    demo: true,
    generatedAt,
    zones: [],
    cameras: [],
    iotDevices: [],
    healthMetrics: [],
    alertRules: [],
    alerts: [],
    incidentLinks: [],
    integrationContracts: [],
    kpiArtifacts: [
      { id: 'health_score', label: 'Platform health score', value: '—', domain: 'audit' },
    ],
  };
}

async function fetchJson(path: string) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Surveillance API ${path} failed (${response.status})`);
  }
  return response.json();
}

export async function fetchSurveillanceNexusSnapshot(): Promise<{
  snapshot: SurveillanceNexusSnapshot;
  capability: string;
}> {
  if ((BACKEND_API_CAPABILITY_STATUS as any).surveillanceNexus === 'disabled') {
    return { snapshot: buildDemoSnapshot(), capability: 'disabled' };
  }

  try {
    const envelope = await fetchJson('/surveillance/nexus/snapshot');
    const snapshot = (envelope?.data || envelope) as SurveillanceNexusSnapshot;
    return {
      snapshot: {
        ...snapshot,
        source: envelope?.source || snapshot.source,
        sourceLabel: envelope?.sourceLabel || snapshot.sourceLabel,
        demo: envelope?.demo ?? snapshot.demo ?? true,
      },
      capability: BACKEND_API_CAPABILITY_STATUS.surveillanceNexus,
    };
  } catch {
    return { snapshot: buildDemoSnapshot(), capability: 'fallback' };
  }
}

export function formatSurveillanceTime(value: string | undefined): string {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
}

export function statusTone(status: string): string {
  if (status === 'online' || status === 'ready') return 'good';
  if (status === 'degraded' || status === 'acknowledged' || status === 'stale') return 'warning';
  if (status === 'offline' || status === 'critical' || status === 'open') return 'critical';
  if (status === 'maintenance' || status === 'disabled') return 'neutral';
  return 'neutral';
}

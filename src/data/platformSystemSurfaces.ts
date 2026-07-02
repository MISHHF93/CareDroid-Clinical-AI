import {
  PLATFORM_SYSTEM_CAPABILITIES,
  PLATFORM_SYSTEM_PACKS,
  getPlatformSystemCapabilityByPath,
} from './platformSystems';

type PlatformCapability = NonNullable<ReturnType<typeof getPlatformSystemCapabilityByPath>>;

const ICON_BY_PACK = Object.freeze({
  [PLATFORM_SYSTEM_PACKS.INTEROPERABILITY]: 'route',
  [PLATFORM_SYSTEM_PACKS.AI_WORKFLOW]: 'journey',
  [PLATFORM_SYSTEM_PACKS.PATIENT_WORKSPACE]: 'emergency-patients',
  [PLATFORM_SYSTEM_PACKS.DOCUMENTATION]: 'notes',
  [PLATFORM_SYSTEM_PACKS.GOVERNANCE]: 'shield-check',
});

const ICON_BY_CAPABILITY = Object.freeze({
  'workflow-builder-ai': 'journey',
  'soap-builder': 'notes',
  'patient-workspace': 'emergency-patients',
  'fhir-connector': 'route',
  'hl7-bridge': 'route',
  'calculator-recommender': 'clinical-tools',
  'clinical-reasoning-engine': 'stethoscope',
});

const DEMO_VIEWS_BY_CAPABILITY = Object.freeze({
  'workflow-builder-ai': {
    chart: [
      { name: 'Triage context', value: 92 },
      { name: 'Calculator step', value: 88 },
      { name: 'AI summary', value: 84 },
      { name: 'Documentation', value: 79 },
    ],
    rows: [
      { label: 'Assess acuity', detail: 'Use ED triage context and vitals before tool selection', status: 'draft' },
      { label: 'Launch qSOFA', detail: 'Bedside calculator with missing-data prompts', status: 'linked' },
      { label: 'Patient summary AI', detail: 'Draft summary with citations and review gate', status: 'review' },
      { label: 'SOAP draft', detail: 'Unsigned documentation draft only', status: 'blocked' },
    ],
  },
  'soap-builder': {
    chart: [
      { name: 'Subjective', value: 86 },
      { name: 'Objective', value: 82 },
      { name: 'Assessment', value: 78 },
      { name: 'Plan', value: 74 },
    ],
    rows: [
      { label: 'Subjective', detail: 'Chief complaint, HPI, and symptom timeline from verified facts', status: 'draft' },
      { label: 'Objective', detail: 'Vitals, exam, and imported labs with source labels', status: 'draft' },
      { label: 'Assessment', detail: 'Problem list with uncertainty and missing-data callouts', status: 'review' },
      { label: 'Plan', detail: 'Draft plan only — no autonomous orders or signatures', status: 'blocked' },
    ],
  },
  'patient-workspace': {
    chart: [
      { name: 'Imports', value: 81 },
      { name: 'Timeline', value: 88 },
      { name: 'Tools', value: 76 },
      { name: 'Documentation', value: 72 },
      { name: 'Risk history', value: 69 },
    ],
    rows: [
      { label: 'Context shell', detail: 'Patient imports, source provenance, and missing-data flags', status: 'ready' },
      { label: 'Timeline live', detail: 'Facts, notes, AI drafts, and tool outputs in one stream', status: 'ready' },
      { label: 'Summary AI', detail: 'Review-required patient summary with citations', status: 'review' },
      { label: 'Care plan view', detail: 'Human-authored tasks without autonomous order changes', status: 'ready' },
    ],
  },
});

function tierScore(tier: string) {
  if (tier === 'A') return 90;
  if (tier === 'B' || tier === 'B/C') return 78;
  return 66;
}

function statusTone(status: string): 'good' | 'warning' | 'critical' | 'neutral' {
  if (status === 'ready' || status === 'linked' || status === 'live') return 'good';
  if (status === 'draft' || status === 'review') return 'warning';
  if (status === 'blocked') return 'critical';
  return 'neutral';
}

function remoteTone(remoteState: Record<string, unknown> | null | undefined): 'good' | 'warning' | 'critical' | 'neutral' {
  const status = String(remoteState?.status || 'demo');
  if (status.includes('available') || status === 'live') return 'good';
  if (status.includes('review')) return 'warning';
  if (status.includes('unavailable') || status.includes('blocked')) return 'critical';
  return 'neutral';
}

export function buildPlatformSystemSurfaceView({
  capability = null as PlatformCapability | null,
  hubPack = null as string | null,
  patientId = 'demo-patient',
  remoteState = null as Record<string, unknown> | null,
  contractResult = null as Record<string, unknown> | null,
  loading = false,
  error = '',
}: {
  capability?: PlatformCapability | null;
  hubPack?: string | null;
  patientId?: string;
  remoteState?: Record<string, unknown> | null;
  contractResult?: Record<string, unknown> | null;
  loading?: boolean;
  error?: string;
} = {}) {
  const packCapabilities = hubPack
    ? PLATFORM_SYSTEM_CAPABILITIES.filter((item) => item.pack === hubPack)
    : PLATFORM_SYSTEM_CAPABILITIES;
  const demoView = capability ? (DEMO_VIEWS_BY_CAPABILITY as Record<string, typeof DEMO_VIEWS_BY_CAPABILITY['workflow-builder-ai']>)[capability.id] : null;
  const iconKey =
    (capability && (ICON_BY_CAPABILITY as Record<string, string>)[capability.id]) ||
    (hubPack && (ICON_BY_PACK as Record<string, string>)[hubPack]) ||
    'clinical-tools';

  const title = capability?.name || `${hubPack || 'Platform Systems'} Hub`;
  const summary =
    capability?.summary ||
    'Launchable platform systems that add patient context, interoperability, documentation support, auditability, cost controls, and explainability to the tool roadmap.';

  const chart = demoView?.chart ||
    (hubPack
      ? packCapabilities.map((item) => ({ name: item.name, value: tierScore(item.tier) })).slice(0, 8)
      : []);

  const rows =
    demoView?.rows ||
    packCapabilities.slice(0, 6).map((item) => ({
      label: item.name,
      detail: item.summary,
      status: item.requiresHumanReview ? 'review' : 'ready',
    }));

  return {
    title,
    summary,
    iconKey,
    eyebrow: capability ? `${capability.pack} · Tier ${capability.tier}` : 'CareDroid platform systems',
    chart,
    rows,
    metrics: [
      {
        label: 'Contract state',
        value: loading ? 'Loading' : String(remoteState?.status || 'demo'),
        hint: 'Backend capability or pack contract',
        tone: loading ? 'neutral' : remoteTone(remoteState),
      },
      {
        label: 'Human review',
        value: capability?.requiresHumanReview === false ? 'Optional' : 'Required',
        hint: 'No autonomous clinical action',
        tone: capability?.requiresHumanReview === false ? 'neutral' : 'warning',
      },
      {
        label: 'Patient context',
        value: capability?.route.includes(':patientId') ? patientId : 'N/A',
        hint: 'Scoped workspace identifier',
        tone: 'neutral',
      },
      {
        label: 'Demo contract',
        value: contractResult ? String(contractResult.status || 'completed') : 'Not run',
        hint: 'Explicit confirmation required',
        tone: contractResult ? 'good' : 'neutral',
      },
    ],
    contract: {
      endpoint: capability?.endpoint?.replace(':patientId', patientId) || '/api/platform-systems/packs/:pack',
      method: capability?.method || 'GET',
      requestDto: capability?.requestDto || 'Pack summary DTO',
      responseDto: capability?.responseDto || 'Pack summary DTO',
      executor: 'Platform API only, not /api/tools/:id/execute',
    },
    safetyBullets: [
      'Drafts, recommendations, imports, exports, and policy changes require human review and explicit confirmation.',
      'Demo/mock state stays labeled until real integrations are configured and validated.',
      'AI output remains decision support or draft-only until reviewed.',
    ],
    packCapabilities,
    error,
    statusTone,
  };
}
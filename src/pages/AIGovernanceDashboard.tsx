import { useEffect, useMemo, useState } from 'react';
import {
  LOCAL_AI_GOVERNANCE_REGISTRY,
  fetchAIGovernanceRegistry,
  fetchEmergencyGovernanceCompliance,
  validateEmergencyGovernancePrompts,
} from '../services/emergencyGovernanceApi';
import {
  BACKEND_HTTP_ROUTES,
  OPTIONAL_RUNTIME_BACKEND_ROUTES,
} from '../data/backendHttpRouteInventory';

interface ComplianceReport {
  period: { start: string; end: string };
  totalInteractions: number;
  interactionsByService: Record<string, number>;
  safetyViolations: number;
  averageLatencyMs: number;
  humanReviewRate: number;
  estimatedCost: number;
  storageMode?: string;
  serviceCount?: number;
  promptTemplateCount?: number;
}

interface AIServiceConfig {
  name: string;
  provider: string;
  model: string;
  purpose: string;
  owner?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  regulatoryCategory?: string;
  requiresHumanReview: boolean;
  auditLevel: 'none' | 'basic' | 'full';
  safetyConstraints: string[];
}

interface GovernanceRegistry {
  services: Record<string, AIServiceConfig>;
  safetyRules: {
    cannotLowerPriorityFor: {
      dpsScores: number[];
      conditions: string[];
      abnormalVitals?: string[];
    };
    requiredDisclaimers: string[];
    rateLimits: Record<string, { requestsPerMinute: number }>;
  };
  storageMode?: string;
  governanceFrameworks?: string[];
}

interface BackendRoute {
  method: string;
  path: string;
  controller: string;
  notes?: string;
  runtime?: string;
  mountFlag?: string;
}

interface BackendSurfaceGroup {
  id: string;
  label: string;
  status: string;
  guidance: string;
  routes: BackendRoute[];
}

const emptyReport: ComplianceReport = {
  period: { start: '', end: '' },
  totalInteractions: 0,
  interactionsByService: {},
  safetyViolations: 0,
  averageLatencyMs: 0,
  humanReviewRate: 0,
  estimatedCost: 0,
};

function SummaryCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'good' | 'warning';
}) {
  const color = tone === 'good' ? '#34D399' : tone === 'warning' ? '#F87171' : '#F9FAFB';

  return (
    <article style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 12, padding: 16 }}>
      <div style={{ color: '#9CA3AF', fontSize: 12 }}>{label}</div>
      <div style={{ color, fontSize: 24, fontWeight: 700, marginTop: 6 }}>{value}</div>
    </article>
  );
}

function groupBackendSurfaces(): BackendSurfaceGroup[] {
  const routes = BACKEND_HTTP_ROUTES as readonly BackendRoute[];
  const optionalRoutes = OPTIONAL_RUNTIME_BACKEND_ROUTES as readonly BackendRoute[];
  const routeMatches = (route: BackendRoute, fragments: string[]) =>
    fragments.some((fragment) => route.path.includes(fragment) || route.controller.includes(fragment));

  return [
    {
      id: 'emergency-core',
      label: 'Emergency OS Core',
      status: 'Mounted as Emergency OS workflow',
      guidance: 'These surfaces are allowed to drive left-sidebar clinical workflows.',
      routes: routes.filter((route) => route.path.startsWith('/api/emergency/')),
    },
    {
      id: 'emergency-optional',
      label: 'Emergency Optional Runtime',
      status: 'Capability guarded',
      guidance: 'These Mongoose-backed routes stay behind guarded service clients until runtime mount is confirmed.',
      routes: [...optionalRoutes],
    },
    {
      id: 'ai-clinical',
      label: 'AI, Chat, Tools, Clinical Intelligence',
      status: 'Governed service surface',
      guidance: 'Expose through Copilot, tools, or governance pages with human-review controls.',
      routes: routes.filter((route) =>
        routeMatches(route, ['Chat', 'AI', 'Tool', 'ClinicalIntelligence', '/api/chat', '/api/ai', '/api/tools'])
      ),
    },
    {
      id: 'governance-admin',
      label: 'Governance, Security, Audit',
      status: 'Admin/governance only',
      guidance: 'Do not add these to clinical workflow navigation; keep them in governance/admin views.',
      routes: routes.filter((route) =>
        routeMatches(route, ['Governance', 'Security', 'Audit', 'Compliance', 'Privacy', 'HumanReview'])
      ),
    },
    {
      id: 'platform-legacy',
      label: 'Platform, Tenant, Product, Organization',
      status: 'Legacy/platform administration',
      guidance: 'Represented here for traceability; not promoted into Emergency OS bedside workflows.',
      routes: routes.filter((route) =>
        routeMatches(route, [
          'Platform',
          'Tenant',
          'Organization',
          'Product',
          'Subscriptions',
          'Workspaces',
          'WhiteLabel',
        ])
      ),
    },
    {
      id: 'operations-demo',
      label: 'Operations, Fleet, IoT, Simulation',
      status: 'Demo/future operational surface',
      guidance: 'Keep clearly labeled until live integrations and ownership are confirmed.',
      routes: routes.filter((route) =>
        routeMatches(route, ['Fleet', 'HospitalMap', 'Telemetry', 'MedicalIot', 'Simulation', 'Device'])
      ),
    },
  ];
}

export default function AIGovernanceDashboard() {
  const [report, setReport] = useState<ComplianceReport>(emptyReport);
  const [registry, setRegistry] = useState<GovernanceRegistry>(
    LOCAL_AI_GOVERNANCE_REGISTRY as GovernanceRegistry
  );
  const [promptValidation, setPromptValidation] = useState<Record<string, { valid: boolean; issues: string[] }>>({});
  const [promptValidationAvailable, setPromptValidationAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    async function fetchDashboard() {
      try {
        const [complianceResult, registryResult, validationResult] = await Promise.all([
          fetchEmergencyGovernanceCompliance(30),
          fetchAIGovernanceRegistry(),
          validateEmergencyGovernancePrompts(),
        ]);
        if (!alive) return;
        if (!complianceResult.ok) {
          setError(complianceResult.message || 'AI governance compliance report is unavailable.');
          setReport(emptyReport);
        } else {
          setReport({ ...emptyReport, ...complianceResult.data });
          setError('');
        }
        if (registryResult.ok && registryResult.data) {
          setRegistry(registryResult.data);
        } else {
          setRegistry(LOCAL_AI_GOVERNANCE_REGISTRY as GovernanceRegistry);
        }
        if (validationResult.ok && validationResult.data) {
          setPromptValidation(validationResult.data);
          setPromptValidationAvailable(true);
        } else {
          setPromptValidation({});
          setPromptValidationAvailable(false);
        }
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'AI governance compliance report is unavailable.');
        setPromptValidation({});
        setPromptValidationAvailable(false);
      } finally {
        if (alive) setLoading(false);
      }
    }

    void fetchDashboard();
    return () => {
      alive = false;
    };
  }, []);

  const serviceEntries = useMemo(
    () =>
      Object.entries(registry.services).map(([id, config]) => ({
        id,
        ...config,
        interactions: report.interactionsByService[id] || 0,
      })),
    [registry.services, report.interactionsByService],
  );

  const validationIssues = Object.values(promptValidation).flatMap((result) => result.issues || []);
  const backendSurfaceGroups = useMemo(() => groupBackendSurfaces(), []);
  const totalBackendRoutes = backendSurfaceGroups.reduce((sum, group) => sum + group.routes.length, 0);

  return (
    <main style={{ padding: 24, color: '#F9FAFB', minHeight: '100%' }}>
      <header style={{ marginBottom: 24 }}>
        <p style={{ color: '#60A5FA', margin: 0, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' }}>
          Emergency OS
        </p>
        <h1 style={{ margin: '6px 0 0', fontSize: 26 }}>AI Governance Dashboard</h1>
        <p style={{ color: '#9CA3AF', maxWidth: 760 }}>
          Enterprise oversight for AI usage, safety constraints, human review, and audit posture. Live metrics use the formal governance API with a labeled local fallback for offline development.
        </p>
        <p style={{ color: '#6B7280', marginTop: 8, fontSize: 12 }}>
          Registry source: {registry.storageMode || report.storageMode || 'api'} | Frameworks: {(registry.governanceFrameworks || []).join(', ') || 'NIST AI RMF, WHO, HIPAA, FDA SaMD'}
        </p>
      </header>

      {loading ? <p style={{ color: '#9CA3AF' }}>Loading governance dashboard...</p> : null}
      {error ? (
        <div style={{ background: '#3F1D1D', border: '1px solid #7F1D1D', borderRadius: 12, padding: 14, marginBottom: 20 }}>
          {error}
        </div>
      ) : null}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <SummaryCard label="Total AI Interactions" value={report.totalInteractions} />
        <SummaryCard
          label="Safety Violations"
          value={report.safetyViolations}
          tone={report.safetyViolations > 0 ? 'warning' : 'good'}
        />
        <SummaryCard label="Human Review Rate" value={`${Math.round(report.humanReviewRate * 100)}%`} />
        <SummaryCard label="Avg Latency" value={`${Math.round(report.averageLatencyMs)}ms`} />
        <SummaryCard label="Estimated Cost" value={`$${report.estimatedCost.toFixed(2)}`} />
        <SummaryCard label="Governed Services" value={serviceEntries.length} />
        <SummaryCard label="Backend Routes Traced" value={totalBackendRoutes} />
      </section>

      {!loading && !serviceEntries.length ? (
        <div style={{ padding: 16, border: '1px solid #1F2937', borderRadius: 12, background: '#111827', color: '#9CA3AF', marginBottom: 24 }}>
          No AI governance registry entries are available.
        </div>
      ) : null}

      <section style={{ background: '#0B1220', border: '1px solid #1F2937', borderRadius: 14, marginBottom: 24 }}>
        <div style={{ padding: 18, borderBottom: '1px solid #1F2937' }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>AI Services Registry</h2>
          <p style={{ margin: '6px 0 0', color: '#9CA3AF', fontSize: 13 }}>
            Registry entries describe configured AI and rule services; local prediction models are advisory registry entries, not live backend endpoints.
          </p>
        </div>
        <div style={{ padding: 18, display: 'grid', gap: 12 }}>
          {serviceEntries.map((service) => (
            <article key={service.id} style={{ border: '1px solid #1F2937', borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <strong>{service.name}</strong>
                <span style={{ color: service.requiresHumanReview ? '#FBBF24' : '#34D399' }}>
                  {service.requiresHumanReview ? 'Human review required' : 'Rule/extraction support'}
                </span>
              </div>
              <p style={{ color: '#9CA3AF', margin: '8px 0' }}>{service.purpose}</p>
              <div style={{ color: '#CBD5E1', fontSize: 13 }}>
                Provider: {service.provider} | Model: {service.model} | Owner: {service.owner || 'Clinical Informatics'} | Risk: {service.riskLevel || 'medium'} | Audit: {service.auditLevel} | Interactions: {service.interactions}
              </div>
              <div style={{ color: '#9CA3AF', fontSize: 12, marginTop: 8 }}>
                Safety constraints: {service.safetyConstraints.join('; ')}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={{ background: '#0B1220', border: '1px solid #1F2937', borderRadius: 14, marginBottom: 24 }}>
        <div style={{ padding: 18, borderBottom: '1px solid #1F2937' }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Enforced Safety Rules</h2>
        </div>
        <div style={{ padding: 18, display: 'grid', gap: 18 }}>
          <div>
            <h3 style={{ marginTop: 0 }}>Cannot Lower Priority For</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {registry.safetyRules.cannotLowerPriorityFor.dpsScores.map((score) => (
                <span key={score} style={{ background: '#7F1D1D', color: '#FECACA', padding: '4px 8px', borderRadius: 999 }}>
                  DPS {score}
                </span>
              ))}
              {registry.safetyRules.cannotLowerPriorityFor.conditions.map((condition) => (
                <span key={condition} style={{ background: '#7F1D1D', color: '#FECACA', padding: '4px 8px', borderRadius: 999 }}>
                  {condition}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3>Required Disclaimers</h3>
            <ul style={{ color: '#CBD5E1' }}>
              {registry.safetyRules.requiredDisclaimers.map((disclaimer) => (
                <li key={disclaimer}>{disclaimer}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Rate Limits</h3>
            <div style={{ display: 'grid', gap: 6, color: '#CBD5E1' }}>
              {Object.entries(registry.safetyRules.rateLimits).map(([role, limits]) => (
                <div key={role} style={{ display: 'flex', justifyContent: 'space-between', maxWidth: 360 }}>
                  <span>{role}</span>
                  <span>{limits.requestsPerMinute} requests/minute</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3>Prompt Validation</h3>
            {validationIssues.length ? (
              <ul style={{ color: '#FCA5A5' }}>
                {validationIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            ) : !promptValidationAvailable ? (
              <p style={{ color: '#FBBF24' }}>Prompt validation is unavailable; keep human review enabled until the validation API responds.</p>
            ) : (
              <p style={{ color: '#34D399' }}>All registered prompt templates include required variables and human-review language.</p>
            )}
          </div>
        </div>
      </section>

      <section style={{ background: '#0B1220', border: '1px solid #1F2937', borderRadius: 14 }}>
        <div style={{ padding: 18, borderBottom: '1px solid #1F2937' }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Backend Surface Console</h2>
          <p style={{ margin: '6px 0 0', color: '#9CA3AF', fontSize: 13 }}>
            Controlled route trace for mounted backend surfaces. Legacy, platform, and demo APIs are visible here for governance review instead of being added to clinical left-sidebar workflows.
          </p>
        </div>
        <div style={{ padding: 18, display: 'grid', gap: 12 }}>
          {backendSurfaceGroups.map((group) => (
            <article key={group.id} style={{ border: '1px solid #1F2937', borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <strong>{group.label}</strong>
                <span style={{ color: group.id.includes('optional') ? '#FBBF24' : '#93C5FD' }}>
                  {group.status} | {group.routes.length} routes
                </span>
              </div>
              <p style={{ color: '#9CA3AF', margin: '8px 0' }}>{group.guidance}</p>
              <div style={{ display: 'grid', gap: 6, color: '#CBD5E1', fontSize: 12 }}>
                {group.routes.slice(0, 8).map((route) => (
                  <div key={`${group.id}-${route.method}-${route.path}`} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ color: '#60A5FA', minWidth: 48 }}>{route.method}</span>
                    <code>{route.path}</code>
                    <span style={{ color: '#6B7280' }}>{route.controller}</span>
                    {route.mountFlag ? <span style={{ color: '#FBBF24' }}>{route.mountFlag}</span> : null}
                  </div>
                ))}
                {group.routes.length > 8 ? (
                  <div style={{ color: '#6B7280' }}>+{group.routes.length - 8} more routes in the route inventory.</div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

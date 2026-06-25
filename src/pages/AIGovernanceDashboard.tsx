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
import { PageShell } from '../components/ui/CareDroidPrimitives';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import './AIGovernanceDashboard.css';

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
  const toneClass =
    tone === 'good'
      ? ' dashboard-summary-card--good'
      : tone === 'warning'
        ? ' dashboard-summary-card--warning'
        : '';

  return (
    <article className={`dashboard-summary-card${toneClass}`}>
      <div className="dashboard-summary-card__label">{label}</div>
      <div className="dashboard-summary-card__value">{value}</div>
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
      label: 'CareDroid Core',
      status: 'Mounted as CareDroid workflow',
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
      guidance: 'Represented here for traceability; not promoted into CareDroid bedside workflows.',
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
    <PageShell
      className="ai-governance-dashboard"
      contentClassName="cd-page-stack cd-page-stack--compact ai-governance-dashboard__content"
      eyebrow="CareDroid"
      title="AI Governance Dashboard"
      description="Enterprise oversight for AI usage, safety constraints, human review, and audit posture. Live metrics use the formal governance API with a labeled local fallback for offline development."
      leadingIcon={<NavIcon icon={CHROME_ICONS.shield} size={28} />}
    >
      <p className="dashboard-meta-line">
        Registry source: {registry.storageMode || report.storageMode || 'api'} | Frameworks:{' '}
        {(registry.governanceFrameworks || []).join(', ') || 'NIST AI RMF, WHO, HIPAA, FDA SaMD'}
      </p>

      {loading ? <p className="dashboard-loading">Loading governance dashboard...</p> : null}
      {error ? <div className="dashboard-banner--error">{error}</div> : null}

      <section className="dashboard-metric-grid">
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
        <div className="dashboard-empty">No AI governance registry entries are available.</div>
      ) : null}

      <section className="dashboard-panel">
        <div className="dashboard-panel__header">
          <h2 className="dashboard-panel__title">AI Services Registry</h2>
          <p className="dashboard-panel__lead">
            Registry entries describe configured AI and rule services; local prediction models are advisory registry entries, not live backend endpoints.
          </p>
        </div>
        <div className="dashboard-panel__body">
          {serviceEntries.map((service) => (
            <article key={service.id} className="dashboard-card">
              <div className="dashboard-card__header">
                <strong>{service.name}</strong>
                <span
                  className={`dashboard-status${service.requiresHumanReview ? ' dashboard-status--review' : ' dashboard-status--ok'}`}
                >
                  {service.requiresHumanReview ? 'Human review required' : 'Rule/extraction support'}
                </span>
              </div>
              <p className="dashboard-card__purpose">{service.purpose}</p>
              <div className="dashboard-card__meta">
                Provider: {service.provider} | Model: {service.model} | Owner: {service.owner || 'Clinical Informatics'} | Risk: {service.riskLevel || 'medium'} | Audit: {service.auditLevel} | Interactions: {service.interactions}
              </div>
              <div className="dashboard-card__detail">
                Safety constraints: {service.safetyConstraints.join('; ')}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-panel">
        <div className="dashboard-panel__header">
          <h2 className="dashboard-panel__title">Enforced Safety Rules</h2>
        </div>
        <div className="dashboard-panel__body dashboard-panel__body--loose">
          <div>
            <h3>Cannot Lower Priority For</h3>
            <div className="dashboard-chip-row">
              {registry.safetyRules.cannotLowerPriorityFor.dpsScores.map((score) => (
                <span key={score} className="dashboard-chip--danger">
                  DPS {score}
                </span>
              ))}
              {registry.safetyRules.cannotLowerPriorityFor.conditions.map((condition) => (
                <span key={condition} className="dashboard-chip--danger">
                  {condition}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3>Required Disclaimers</h3>
            <ul className="dashboard-list">
              {registry.safetyRules.requiredDisclaimers.map((disclaimer) => (
                <li key={disclaimer}>{disclaimer}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Rate Limits</h3>
            <div className="dashboard-rate-list">
              {Object.entries(registry.safetyRules.rateLimits).map(([role, limits]) => (
                <div key={role} className="dashboard-rate-row">
                  <span>{role}</span>
                  <span>{limits.requestsPerMinute} requests/minute</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3>Prompt Validation</h3>
            {validationIssues.length ? (
              <ul className="dashboard-list dashboard-list--danger">
                {validationIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            ) : !promptValidationAvailable ? (
              <p className="dashboard-text--warning">
                Prompt validation is unavailable; keep human review enabled until the validation API responds.
              </p>
            ) : (
              <p className="dashboard-text--success">
                All registered prompt templates include required variables and human-review language.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="dashboard-panel">
        <div className="dashboard-panel__header">
          <h2 className="dashboard-panel__title">Backend Surface Console</h2>
          <p className="dashboard-panel__lead">
            Controlled route trace for mounted backend surfaces. Legacy, platform, and demo APIs are visible here for governance review instead of being added to clinical left-sidebar workflows.
          </p>
        </div>
        <div className="dashboard-panel__body">
          {backendSurfaceGroups.map((group) => (
            <article key={group.id} className="dashboard-card">
              <div className="dashboard-card__header">
                <strong>{group.label}</strong>
                <span
                  className={`dashboard-status${group.id.includes('optional') ? ' dashboard-status--warn' : ' dashboard-status--info'}`}
                >
                  {group.status} | {group.routes.length} routes
                </span>
              </div>
              <p className="dashboard-card__purpose">{group.guidance}</p>
              <div className="dashboard-route-list">
                {group.routes.slice(0, 8).map((route) => (
                  <div key={`${group.id}-${route.method}-${route.path}`} className="dashboard-route-row">
                    <span className="dashboard-route-row__method">{route.method}</span>
                    <code>{route.path}</code>
                    <span className="dashboard-route-row__controller">{route.controller}</span>
                    {route.mountFlag ? (
                      <span className="dashboard-route-row__flag">{route.mountFlag}</span>
                    ) : null}
                  </div>
                ))}
                {group.routes.length > 8 ? (
                  <div className="dashboard-route-row__overflow">
                    +{group.routes.length - 8} more routes in the route inventory.
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
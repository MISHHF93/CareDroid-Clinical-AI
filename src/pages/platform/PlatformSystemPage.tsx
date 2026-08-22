import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { MetricCard, VisualizationPanel } from '../../components/dashboard/DashboardVisualizations';
import { CategoryBarChart } from '../../components/dashboard/DashboardCharts';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import {
  PLATFORM_SYSTEM_PACKS,
  getPlatformSystemCapabilitiesByPack,
  getPlatformSystemCapabilityByPath,
} from '../../data/platformSystems';
import { buildPlatformSystemSurfaceView } from '../../data/platformSystemSurfaces';
import {
  fetchPlatformSystemCapability,
  fetchPlatformSystemHub,
  postPlatformSystemContract,
} from '../../services/platformSystemsApi';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import {
  buildPlatformSystemModuleChart,
  platformSystemScoreTone,
} from '../../utils/platformSystemChartModel';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import './PlatformSystemPage.css';

const HUB_BY_PATH = Object.freeze({
  '/integrations': PLATFORM_SYSTEM_PACKS.INTEROPERABILITY,
  '/governance': PLATFORM_SYSTEM_PACKS.GOVERNANCE,
});

function capabilityPath(capability: { route: string }, patientId = 'demo-patient') {
  return capability.route.replace(':patientId', patientId);
}

function inferHubPack(pathname: string) {
  if ((HUB_BY_PATH as Record<string, string>)[pathname]) return (HUB_BY_PATH as Record<string, string>)[pathname];
  if (pathname.includes('/workflows')) return PLATFORM_SYSTEM_PACKS.AI_WORKFLOW;
  if (pathname.includes('/documentation')) return PLATFORM_SYSTEM_PACKS.DOCUMENTATION;
  return null;
}

function demoPayloadFor(capability: { id: string }, patientId: string) {
  return {
    capabilityId: capability.id,
    patientId,
    mode: 'demo',
    source: 'CareDroid platform systems mock contract',
    confirmationRequired: true,
  };
}

const PLATFORM_ACTIONS = [
  { label: 'Tool library', route: '/tools' },
  { label: 'Workflows', route: CANONICAL_ROUTES.workflows },
  { label: 'Knowledge hub', route: CANONICAL_ROUTES.knowledgeHub },
  { label: 'AI governance', route: CANONICAL_ROUTES.aiGovernance },
];

export default function PlatformSystemPage({ pack }: { pack?: string }) {
  const location = useLocation();
  const { patientId = 'demo-patient' } = useParams();
  const capability = getPlatformSystemCapabilityByPath(location.pathname);
  const hubPack = pack || inferHubPack(location.pathname) || capability?.pack || null;
  const packCapabilities = useMemo(
    () => (hubPack ? getPlatformSystemCapabilitiesByPack(hubPack) : []),
    [hubPack],
  );
  const [remoteState, setRemoteState] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [contractResult, setContractResult] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      const response = capability
        ? await fetchPlatformSystemCapability(capability.id)
        : await fetchPlatformSystemHub(hubPack || 'all');
      if (cancelled) return;
      if (response.ok) {
        setRemoteState(response.data as Record<string, unknown>);
      } else {
        setError(response.message || 'Backend platform contract is unavailable.');
        setRemoteState(null);
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [capability, hubPack]);

  const view = useMemo(
    () =>
      buildPlatformSystemSurfaceView({
        capability,
        hubPack,
        patientId,
        remoteState,
        contractResult,
        loading,
        error,
      }),
    [capability, hubPack, patientId, remoteState, contractResult, loading, error],
  );
  useRouteChromeRegistration({ title: view.title || 'Platform Systems' });
  const moduleChart = useMemo(() => buildPlatformSystemModuleChart(view.chart), [view.chart]);

  const runDemoContract = async () => {
    if (!capability) return;
    setContractResult(null);
    const endpoint = capability.endpoint.replace(':patientId', patientId);
    const response =
      capability.method === 'POST'
        ? await postPlatformSystemContract(endpoint, demoPayloadFor(capability, patientId))
        : await fetchPlatformSystemCapability(capability.id);
    setContractResult(
      response.ok
        ? (response.data as Record<string, unknown>)
        : { status: 'demo_unavailable', message: response.message },
    );
  };

  return (
    <main className="platform-system-page" aria-label={view.title}>
      <header className="platform-system-page__header">
        <div className="platform-system-page__title-row">
          <GraphicIconBadge iconKey={view.iconKey} accent="brand" size="md" />
          <div>
            <p className="platform-system-page__eyebrow">{view.eyebrow}</p>
            <p className="platform-system-page-title-text" data-testid="cd-page-title-text">{view.title}</p>
            <p>{view.summary}</p>
          </div>
        </div>
        <div className="platform-system-page__actions">
          {PLATFORM_ACTIONS.map((action) => (
            <Link key={action.route} to={action.route}>
              {action.label}
            </Link>
          ))}
          {capability ? (
            <button type="button" onClick={runDemoContract}>
              Run demo contract
            </button>
          ) : null}
        </div>
      </header>

      {error ? <p className="platform-system-page__error">{error}</p> : null}

      <StateSourceNotice
        title="Platform systems source state"
        states={[DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.SIMULATED, DEMO_LIVE_STATES.BACKEND_UNAVAILABLE]}
        details="Platform capability contracts load from backend APIs with demo review-required fallbacks when integrations are unavailable."
      />

      <div className="platform-system-page__metrics" role="group" aria-label="Platform system summary metrics">
        {view.metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            hint={metric.hint}
            tone={metric.tone as 'good' | 'warning' | 'critical' | 'neutral'}
          />
        ))}
      </div>

      {moduleChart.length > 0 ? (
        <div className="platform-system-page__charts">
          <VisualizationPanel
            title={capability ? 'Module readiness' : 'Pack capabilities'}
            description="Demo readiness scores for workflow, documentation, or patient-context modules."
            badge="Modules"
          >
            <CategoryBarChart
              data={moduleChart}
              title="Module readiness"
              color="var(--app-chart-1)"
              emptyMessage="Module chart appears when platform capabilities are registered."
            />
          </VisualizationPanel>
        </div>
      ) : null}

      <section className="platform-system-page__panel" aria-label="Safety state">
        <h2>Safety state</h2>
        <ul className="platform-system-page__list">
          {view.safetyBullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </section>

      <section className="platform-system-page__panel" aria-label="Backend contract">
        <h2>Backend contract</h2>
        <div className="platform-system-page__table" role="table">
          <div className="platform-system-page__table-head platform-system-page__table-row--two-col" role="row">
            <span role="columnheader">Field</span>
            <span role="columnheader">Value</span>
          </div>
          <div className="platform-system-page__table-row platform-system-page__table-row--two-col" role="row">
            <span role="cell">Endpoint</span>
            <span role="cell">{view.contract.endpoint}</span>
          </div>
          <div className="platform-system-page__table-row platform-system-page__table-row--two-col" role="row">
            <span role="cell">Method</span>
            <span role="cell">{view.contract.method}</span>
          </div>
          <div className="platform-system-page__table-row platform-system-page__table-row--two-col" role="row">
            <span role="cell">DTO</span>
            <span role="cell">
              {view.contract.requestDto} → {view.contract.responseDto}
            </span>
          </div>
          <div className="platform-system-page__table-row platform-system-page__table-row--two-col" role="row">
            <span role="cell">Executor</span>
            <span role="cell">{view.contract.executor}</span>
          </div>
        </div>
      </section>

      <section className="platform-system-page__panel" aria-label="Capability modules">
        <h2>{capability ? 'Workflow modules' : `${hubPack || 'Platform'} capabilities`}</h2>
        <div className="platform-system-page__table" role="table">
          <div className="platform-system-page__table-head" role="row">
            <span role="columnheader">Module</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Detail</span>
          </div>
          {view.rows.map((row) => (
            <div key={row.label} className="platform-system-page__table-row" role="row">
              <span role="cell">{row.label}</span>
              <span role="cell">
                <span className={`platform-system-page__pill platform-system-page__pill--${view.statusTone(row.status)}`}>
                  {row.status}
                </span>
              </span>
              <span role="cell">{row.detail}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="platform-system-page__panel" aria-labelledby="platform-capabilities-title">
        <h2 id="platform-capabilities-title">
          {hubPack ? `${hubPack} capabilities` : 'Platform capabilities'}
        </h2>
        <p>Every capability has a canonical ID, route, permission policy, API contract, and safety state.</p>
        <div className="platform-system-page__cards">
          {(packCapabilities.length ? packCapabilities : view.packCapabilities).map((item) => (
            <Link key={item.id} className="platform-system-page__card" to={capabilityPath(item, patientId)}>
              <span className="platform-system-page__card-meta">
                {item.pack} · Tier {item.tier}
              </span>
              <strong>{item.name}</strong>
              <span>{item.summary}</span>
              <span className={`platform-system-page__pill platform-system-page__pill--${platformSystemScoreTone(tierScore(item.tier))}`}>
                {item.criticality}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function tierScore(tier: string) {
  if (tier === 'A') return 90;
  if (tier === 'B' || tier === 'B/C') return 78;
  return 66;
}
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import useProfileNavigate from '../../hooks/useProfileNavigate';
import ApiStateBanner from '../../components/ApiStateBanner';
import {
  PLATFORM_SYSTEM_CAPABILITIES,
  PLATFORM_SYSTEM_PACKS,
  getPlatformSystemCapabilitiesByPack,
  getPlatformSystemCapabilityByPath,
} from '../../data/platformSystems';
import {
  fetchPlatformSystemCapability,
  fetchPlatformSystemHub,
  postPlatformSystemContract,
} from '../../services/platformSystemsApi';
import './PlatformSystemPage.css';

const HUB_BY_PATH = Object.freeze({
  '/integrations': PLATFORM_SYSTEM_PACKS.INTEROPERABILITY,
  '/governance': PLATFORM_SYSTEM_PACKS.GOVERNANCE,
});

function capabilityPath(capability, patientId = 'demo-patient') {
  return capability.route.replace(':patientId', patientId);
}

function inferHubPack(pathname) {
  if (HUB_BY_PATH[pathname]) return HUB_BY_PATH[pathname];
  if (pathname.includes('/workflows')) return PLATFORM_SYSTEM_PACKS.AI_WORKFLOW;
  if (pathname.includes('/documentation')) return PLATFORM_SYSTEM_PACKS.DOCUMENTATION;
  return null;
}

function demoPayloadFor(capability, patientId) {
  return {
    capabilityId: capability.id,
    patientId,
    mode: 'demo',
    source: 'CareDroid platform systems mock contract',
    confirmationRequired: true,
  };
}

export default function PlatformSystemPage({ pack }) {
  const location = useLocation();
  const { profileNavigate } = useProfileNavigate();
  const { patientId = 'demo-patient' } = useParams();
  const capability = getPlatformSystemCapabilityByPath(location.pathname);
  const hubPack = pack || inferHubPack(location.pathname) || capability?.pack;
  const packCapabilities = useMemo(
    () =>
      hubPack
        ? getPlatformSystemCapabilitiesByPack(hubPack)
        : PLATFORM_SYSTEM_CAPABILITIES,
    [hubPack]
  );
  const [remoteState, setRemoteState] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [contractResult, setContractResult] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      const response = capability
        ? await fetchPlatformSystemCapability(capability.id)
        : await fetchPlatformSystemHub(hubPack || 'all');
      if (cancelled) return;
      if (response.ok) {
        setRemoteState(response.data);
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

  const runDemoContract = async () => {
    if (!capability) return;
    setContractResult(null);
    const endpoint = capability.endpoint.replace(':patientId', patientId);
    const response =
      capability.method === 'POST'
        ? await postPlatformSystemContract(endpoint, demoPayloadFor(capability, patientId))
        : await fetchPlatformSystemCapability(capability.id);
    setContractResult(response.ok ? response.data : { status: 'demo_unavailable', message: response.message });
  };

  const title = capability?.name || `${hubPack || 'Platform Systems'} Hub`;
  const subtitle =
    capability?.summary ||
    'Launchable platform systems that add patient context, interoperability, documentation support, auditability, cost controls, and explainability to the tool roadmap.';

  return (
    <section className="platform-system-page" aria-labelledby="platform-system-title">
      <section className="platform-system-hero">
        <div>
          <p className="platform-system-eyebrow">
            {capability ? `${capability.pack} · Tier ${capability.tier}` : 'CareDroid platform'}
          </p>
          <h1 id="platform-system-title">{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="platform-system-hero__actions">
          <button type="button" onClick={() => profileNavigate('/tools')}>
            View tool library
          </button>
          {capability ? (
            <button type="button" onClick={runDemoContract}>
              Run demo contract
            </button>
          ) : null}
        </div>
      </section>

      <ApiStateBanner error={error} />

      <section className="platform-system-grid" aria-label="Platform status cards">
        <article className="platform-card platform-card--safety">
          <h2>Safety State</h2>
          <p>
            Drafts, recommendations, imports, exports, and policy changes require human review and explicit
            confirmation. No autonomous clinical, operational, documentation, or EHR-writeback action is
            performed.
          </p>
          <ul>
            <li>Demo/mock state is labeled until real integrations are configured.</li>
            <li>Source provenance, timestamps, and missing data must stay visible.</li>
            <li>AI output remains decision support or draft-only until reviewed.</li>
          </ul>
        </article>

        <article className="platform-card">
          <h2>Backend Contract</h2>
          <dl>
            <div>
              <dt>Endpoint</dt>
              <dd>{capability?.endpoint || '/api/platform-systems/packs/:pack'}</dd>
            </div>
            <div>
              <dt>Executor</dt>
              <dd>Platform API only, not `/api/tools/:id/execute`</dd>
            </div>
            <div>
              <dt>DTO</dt>
              <dd>{capability ? `${capability.requestDto} -> ${capability.responseDto}` : 'Pack summary DTO'}</dd>
            </div>
          </dl>
        </article>

        <article className="platform-card">
          <h2>Live/Demo State</h2>
          {loading ? (
            <p aria-busy="true">Loading backend capability state...</p>
          ) : remoteState ? (
            <pre>{JSON.stringify(remoteState, null, 2)}</pre>
          ) : (
            <p>
              Backend state is unavailable in this environment. The route remains launchable with a documented
              unsupported/demo state.
            </p>
          )}
        </article>

        {contractResult ? (
          <article className="platform-card">
            <h2>Demo Contract Result</h2>
            <pre>{JSON.stringify(contractResult, null, 2)}</pre>
          </article>
        ) : null}
      </section>

      <section className="platform-system-section" aria-labelledby="platform-capabilities-title">
        <div className="platform-system-section__header">
          <h2 id="platform-capabilities-title">
            {hubPack ? `${hubPack} Capabilities` : 'Platform Capabilities'}
          </h2>
          <p>Every capability has a canonical ID, route, permission policy, API contract, and safety state.</p>
        </div>
        <div className="platform-capability-list">
          {packCapabilities.map((item) => (
            <Link
              key={item.id}
              className="platform-capability-card"
              to={capabilityPath(item, patientId)}
            >
              <span className="platform-capability-card__meta">
                {item.pack} · Tier {item.tier}
              </span>
              <strong>{item.name}</strong>
              <span>{item.summary}</span>
              <span className="platform-capability-card__route">{capabilityPath(item, patientId)}</span>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}


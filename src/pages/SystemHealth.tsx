import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { buildInfo, buildInfoRows, shortCommit } from '../config/buildInfo';
import {
  compareDeploymentCommits,
  fetchDeploymentTruth,
  normalizeHealthPayload,
} from '../services/systemHealthService';
import {
  DashboardGrid,
  DashboardSection,
  PageShell,
  Surface,
} from '../components/ui/CareDroidPrimitives';
import './SystemHealth.css';

const INITIAL_BACKEND_HEALTH = normalizeHealthPayload();

function statusClass(status = 'unknown') {
  const normalized = String(status).toLowerCase();
  if (['ok', 'healthy', 'live', 'match', 'detected'].some((value) => normalized.includes(value))) {
    return 'system-health-status--ok';
  }
  if (['mismatch', 'offline', 'failed', 'error'].some((value) => normalized.includes(value))) {
    return 'system-health-status--danger';
  }
  return 'system-health-status--warn';
}

function MetadataGrid({ rows }) {
  return (
    <DashboardGrid as="dl" variant="summary" className="system-health-grid">
      {rows.map((row) => (
        <Surface as="div" tone="nested" className="system-health-card" key={row.label}>
          <dt>{row.label}</dt>
          <dd title={row.value}>{row.shortValue || row.value}</dd>
        </Surface>
      ))}
    </DashboardGrid>
  );
}

export default function SystemHealth() {
  const [state, setState] = useState<any>({
    loading: true,
    backendHealth: INITIAL_BACKEND_HEALTH,
    backendProbe: null,
    systemHealth: null,
    sourceStatus: 'loading',
    message: '',
  });

  useEffect(() => {
    let cancelled = false;

    fetchDeploymentTruth().then((result) => {
      if (!cancelled) {
        setState({ loading: false, ...result });
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const comparison = useMemo(
    () => compareDeploymentCommits(buildInfo.commit, state.backendHealth.gitCommit),
    [state.backendHealth.gitCommit]
  );

  const frontendRows = useMemo(
    () =>
      buildInfoRows.filter((row) =>
        ['App version', 'Commit', 'Environment', 'Build time', 'Vercel env status'].includes(
          row.label
        )
      ),
    []
  );

  const backendRows = useMemo(
    () => [
      { label: 'Backend health', value: state.loading ? 'checking' : state.backendHealth.status },
      { label: 'Backend version', value: state.backendHealth.backendVersion },
      {
        label: 'Backend commit',
        value: state.backendHealth.gitCommit,
        shortValue: shortCommit(state.backendHealth.gitCommit),
      },
      { label: 'Backend build time', value: state.backendHealth.buildTimestamp },
      { label: 'Backend environment', value: state.backendHealth.vercelEnvironment },
      { label: 'Backend health source', value: state.sourceStatus },
    ],
    [state.backendHealth, state.loading, state.sourceStatus]
  );

  const vercelRows = useMemo(
    () => [
      { label: 'Vercel env status', value: buildInfo.vercelEnvStatus },
      { label: 'Vercel env', value: buildInfo.vercelEnv || 'not provided' },
      {
        label: 'Vercel commit',
        value: buildInfo.vercelGitCommitSha || 'not provided',
        shortValue: buildInfo.vercelGitCommitSha
          ? shortCommit(buildInfo.vercelGitCommitSha)
          : 'not provided',
      },
      { label: 'Deployment URL', value: buildInfo.deploymentUrl || 'not provided' },
      { label: 'Deployment ID', value: buildInfo.deploymentId || 'not provided' },
      { label: 'Repository', value: buildInfo.repository || 'not provided' },
    ],
    []
  );

  return (
    <PageShell
      className="system-health-page"
      contentClassName="cd-page-stack cd-page-stack--compact system-health-page__content"
      eyebrow="Deployment truth panel"
      title="Deployment Observability"
      titleId="system-health-title"
      description={
        <>
          Confirm that Vercel, the frontend bundle, and the backend are reporting the same source
          revision as GitHub/local. Compare the frontend commit below with <code>git rev-parse HEAD</code>{' '}
          locally or the target GitHub commit.
        </>
      }
      actions={
        <Link className="system-health-link" to="/version">
          Public version page
        </Link>
      }
    >

      <Surface
        as="section"
        className={`system-health-verdict ${statusClass(comparison.status)}`}
        aria-live="polite"
      >
        <div>
          <span className="system-health-status-pill">{comparison.status}</span>
          <h2>{comparison.label}</h2>
          <p>{comparison.detail}</p>
          {state.message ? <p className="system-health-message">{state.message}</p> : null}
        </div>
      </Surface>

      <DashboardSection className="system-health-section" title="Frontend Version Metadata" titleId="frontend-version-title">
        <MetadataGrid rows={frontendRows} />
      </DashboardSection>

      <DashboardSection className="system-health-section" title="Backend Health" titleId="backend-health-title">
        <MetadataGrid rows={backendRows} />
      </DashboardSection>

      <DashboardSection className="system-health-section" title="Vercel Environment Status" titleId="vercel-env-title">
        <MetadataGrid rows={vercelRows} />
      </DashboardSection>

      <DashboardSection className="system-health-section" title="Health Endpoints" titleId="health-endpoints-title">
        <DashboardGrid className="system-health-endpoint-grid">
          <article>
            <h3>/health</h3>
            <p>{state.backendProbe?.ok ? 'Reachable backend probe.' : 'Probe unavailable.'}</p>
            <pre>
              {JSON.stringify(
                state.backendProbe?.data || { status: state.backendProbe?.message || 'checking' },
                null,
                2
              )}
            </pre>
          </article>
          <article>
            <h3>/api/system-health</h3>
            <p>
              {state.systemHealth?.ok
                ? 'Authenticated deployment metadata.'
                : 'Authenticated metadata unavailable.'}
            </p>
            <pre>
              {JSON.stringify(
                state.systemHealth?.data || { status: state.systemHealth?.message || 'checking' },
                null,
                2
              )}
            </pre>
          </article>
        </DashboardGrid>
      </DashboardSection>
    </PageShell>
  );
}

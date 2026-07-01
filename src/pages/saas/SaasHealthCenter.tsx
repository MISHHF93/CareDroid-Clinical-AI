import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  healthCheckStatusToSemanticRole,
  healthCheckStatusToWidgetTone,
} from '../../config/semanticColorSystem';
import {
  ActionRow,
  DashboardGrid,
  DashboardSection,
  InfoNotice,
  LoadingState,
  MetricCard,
  PageShell,
  StatusBadge,
  Surface,
} from '../../components/ui/CareDroidPrimitives';
import Button from '../../components/ui/button';
import { BottleneckCommandPanel } from '../../components/bottlenecks/BottleneckPanels';
import {
  fetchUnifiedPlatformHealth,
  type PlatformHealthCheck,
  type UnifiedPlatformHealthBundle,
} from '../../services/unifiedServiceRegistry';
import './SaasHealthCenter.css';

function verdictClass(status: string | undefined) {
  const role = healthCheckStatusToSemanticRole(status);
  if (role === 'healthy') return 'saas-health-verdict--healthy';
  if (role === 'critical') return 'saas-health-verdict--critical';
  if (role === 'attention') return 'saas-health-verdict--attention';
  return 'saas-health-verdict--inactive';
}

function HealthCheckRow({ check }: { check: PlatformHealthCheck }) {
  const tone = healthCheckStatusToWidgetTone(check.status);
  return (
    <Surface as="article" tone="nested" className="saas-health-check-row">
      <div className="saas-health-check-row__main">
        <span className={`saas-health-check-row__dot saas-health-check-row__dot--${tone}`} aria-hidden />
        <div>
          <strong>{check.label}</strong>
          {check.summary ? <p>{check.summary}</p> : null}
        </div>
      </div>
      <StatusBadge status={tone}>{check.displayStatus || check.status}</StatusBadge>
    </Surface>
  );
}

function ServiceRegistryRow({
  service,
}: {
  service: { serviceName: string; purpose: string; consumers: string[] };
}) {
  return (
    <Surface as="li" tone="nested" className="saas-health-service-row">
      <strong>{service.serviceName}</strong>
      <p>{service.purpose}</p>
      <span className="saas-health-service-row__consumers">
        Consumers: {service.consumers.slice(0, 3).join(', ')}
        {service.consumers.length > 3 ? ` +${service.consumers.length - 3}` : ''}
      </span>
    </Surface>
  );
}

export default function SaasHealthCenter() {
  const [bundle, setBundle] = useState<UnifiedPlatformHealthBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const next = await fetchUnifiedPlatformHealth({
        sync: {
          status: 'saas-health-center',
          source: 'SaasHealthCenter',
          stale: false,
          message: 'SaaS health center refresh.',
        },
      });
      setBundle(next);
      if (!next.saas.ok && next.saas.message) {
        setError(next.saas.message);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load platform health.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const health = bundle?.saas.data;
  const summary = health?.summary;
  const checks = health?.checks || [];
  const bottlenecks = bundle?.registry.bottlenecks;
  const registryServices = useMemo(
    () =>
      (bundle?.registry.services || [])
        .filter((service) =>
          ['SaaS Health API', 'System Health Service', 'AI Chief Orchestrator', 'Alert Lifecycle Orchestrator'].includes(
            service.serviceName,
          ),
        )
        .slice(0, 6),
    [bundle?.registry.services],
  );

  return (
    <PageShell
      className="saas-health-page"
      contentClassName="cd-page-stack cd-page-stack--compact saas-health-page__content"
      eyebrow="Platform operations"
      title="SaaS Health Center"
      titleId="saas-health-title"
      description="What is happening across CareDroid platform services, who owns each check, and what needs attention before clinical workflows degrade."
      actions={
        <ActionRow align="end">
          <Link className="saas-health-link" to="/system-health">
            Deployment observability
          </Link>
          <Button variant="primary" size="sm" loading={loading} onClick={load}>
            Refresh
          </Button>
        </ActionRow>
      }
    >
      {loading && !bundle ? (
        <LoadingState title="Loading platform health" description="Probing SaaS health and service registry." />
      ) : null}

      {health ? (
        <Surface
          as="section"
          className={`saas-health-verdict ${verdictClass(health.status)}`}
          aria-live="polite"
        >
          <div>
            <StatusBadge status={healthCheckStatusToWidgetTone(health.status)}>
              {health.label || health.status}
            </StatusBadge>
            <h2>Platform status: {health.label || health.status}</h2>
            <p>
              {summary
                ? `${summary.healthy ?? 0} healthy, ${summary.warning ?? 0} attention, ${summary.critical ?? 0} critical of ${summary.total ?? checks.length} checks.`
                : 'Health summary unavailable.'}
            </p>
            {health.generatedAt ? (
              <time className="saas-health-verdict__time" dateTime={health.generatedAt}>
                Generated {new Date(health.generatedAt).toLocaleString()}
              </time>
            ) : null}
            {error ? (
              <InfoNotice tone="warning" label="Probe warning" detail={error} />
            ) : null}
          </div>
        </Surface>
      ) : null}

      {summary ? (
        <DashboardGrid variant="summary" className="saas-health-metrics">
          <MetricCard
            label="Healthy"
            value={summary.healthy ?? 0}
            tone="healthy"
            helper="Checks passing"
          />
          <MetricCard
            label="Attention"
            value={summary.warning ?? 0}
            tone="attention"
            helper="Guarded or degraded"
          />
          <MetricCard
            label="Critical"
            value={summary.critical ?? 0}
            tone="critical"
            helper="Requires IT action"
          />
          <MetricCard
            label="Active bottlenecks"
            value={bottlenecks?.analytics.activeCount ?? 0}
            tone={(bottlenecks?.analytics.criticalCount ?? 0) > 0 ? 'critical' : 'information'}
            helper="Operational constraints"
          />
        </DashboardGrid>
      ) : null}

      <DashboardSection
        className="saas-health-section"
        title="Platform health checks"
        titleId="saas-health-checks-title"
        description="Each check reports owner evidence, recommended action, and current severity."
      >
        <div className="saas-health-check-list">
          {checks.map((check) => (
            <HealthCheckRow key={check.id} check={check} />
          ))}
        </div>
      </DashboardSection>

      {bottlenecks ? (
        <DashboardSection
          className="saas-health-section"
          title="Operational bottlenecks"
          titleId="saas-health-bottlenecks-title"
          description="Live constraints from the unified service registry affecting ED throughput."
        >
          <BottleneckCommandPanel registry={bottlenecks} />
        </DashboardSection>
      ) : null}

      {registryServices.length > 0 ? (
        <DashboardSection
          className="saas-health-section"
          title="Canonical service registry"
          titleId="saas-health-registry-title"
          description="Integrated services consumed by this health surface — no parallel health APIs."
        >
          <ul className="saas-health-service-list">
            {registryServices.map((service) => (
              <ServiceRegistryRow key={service.serviceName} service={service} />
            ))}
          </ul>
        </DashboardSection>
      ) : null}

      {bundle ? (
        <DashboardSection
          className="saas-health-section"
          title="Health endpoints"
          titleId="saas-health-endpoints-title"
        >
          <DashboardGrid className="saas-health-endpoint-grid">
            {Object.entries(bundle.registry.endpoints).map(([key, path]) => (
              <Surface as="article" tone="nested" key={key} className="saas-health-endpoint-card">
                <h3>{path}</h3>
                <p>{key}</p>
              </Surface>
            ))}
          </DashboardGrid>
        </DashboardSection>
      ) : null}
    </PageShell>
  );
}
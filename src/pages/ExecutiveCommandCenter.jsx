import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CategoryBarChart,
  DistributionDonutChart,
  MetricCard,
  StatusCard,
  TrendChart,
  VisualizationPanel,
} from '../components/dashboard/DashboardVisualizations';
import { useNotifications } from '../contexts/NotificationContext';
import { useOrganizationContext } from '../contexts/OrganizationContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { buildOrganizationIntelligenceProfile } from '../data/organizationIntelligenceProfile';
import { PlatformAssetsApi } from '../services/platformAssetsApi';
import { fetchFleetCommandSnapshot } from '../services/fleetTelemetryService';
import { fetchMedicalIotSnapshot } from '../services/medicalIotService';
import { fetchPlatformGovernanceSurface } from '../services/platformGovernanceApi';
import './ExecutiveCommandCenter.css';

const EMPTY_MEDICAL_IOT_SNAPSHOT = Object.freeze({
  source: 'empty',
  sourceLabel: 'No Medical IoT telemetry loaded',
  devices: [],
  alerts: [],
  trends: [],
  connectivityTimeline: [],
});

const EMPTY_FLEET_SNAPSHOT = Object.freeze({
  summary: {
    activeVehicles: 0,
    availableVehicles: 0,
    occupiedVehicles: 0,
    maintenanceCount: 0,
    totalVehicles: 0,
    averageUtilizationPercent: 0,
    lowEnergyCount: 0,
    source: 'empty',
  },
  vehicles: [],
  visualizations: {
    statusDistribution: [],
    maintenanceRisk: [],
    dispatchLoadTrend: [],
  },
});

function number(value) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function percent(value) {
  return `${Math.max(0, Math.min(100, Math.round(number(value))))}%`;
}

function ratioPercent(part, total) {
  if (!total) return 0;
  return Math.round((number(part) / number(total)) * 100);
}

function toneForPercent(value) {
  const score = number(value);
  if (score >= 80) return 'good';
  if (score >= 55) return 'warning';
  return 'critical';
}

function titleize(value) {
  return String(value || 'Unknown')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCount(value) {
  return new Intl.NumberFormat('en-US').format(number(value));
}

function formatSource(value) {
  return titleize(value || 'fallback');
}

function getResultValue(result, fallback = null) {
  return result?.status === 'fulfilled' ? result.value : fallback;
}

function isAlertNotification(notification) {
  const text = `${notification.type || ''} ${notification.severity || ''} ${notification.priority || ''} ${notification.title || ''}`.toLowerCase();
  return /alert|critical|high|urgent|warning|incident|offline|blocked/.test(text);
}

function summarizeReadiness(response) {
  if (!response) return 'Unavailable';
  const data = response?.data || {};
  if (data.readiness?.blocked) return 'Blocked';
  if (response?.sourceStatus === 'fallback') return 'Needs review';
  return titleize(data.status || response?.sourceStatus || 'ready');
}

function readinessTone(response) {
  if (!response) return 'critical';
  if (response?.data?.readiness?.blocked || response?.sourceStatus === 'fallback') return 'critical';
  if (response?.sourceStatus === 'demo') return 'warning';
  return 'good';
}

function countGovernanceRecords(response) {
  const counts = response?.data?.counts || {};
  return Object.values(counts).reduce((total, value) => total + number(value), 0);
}

function ExecutivePanel({ title, description, children, action }) {
  return (
    <section className="executive-panel" aria-labelledby={`${title.replace(/\W+/g, '-').toLowerCase()}-title`}>
      <div className="executive-panel__header">
        <div>
          <h2 id={`${title.replace(/\W+/g, '-').toLowerCase()}-title`}>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {action ? <span className="executive-panel__action">{action}</span> : null}
      </div>
      {children}
    </section>
  );
}

function InsightRow({ label, value, detail, tone = 'neutral' }) {
  return (
    <div className={`executive-insight-row executive-insight-row--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

function SourceBadge({ label, value }) {
  return (
    <span className="executive-source-badge">
      <span>{label}</span>
      <strong>{formatSource(value)}</strong>
    </span>
  );
}

function buildWorkspaceChart(profile) {
  if (profile.usage.workspaceUsage.length) {
    return profile.usage.workspaceUsage.map((row) => ({
      name: row.label,
      value: row.count,
    }));
  }
  return profile.workspaces.slice(0, 8).map((workspace) => ({
    name: workspace.name,
    value: workspace.enabledToolIds?.length || workspace.toolIds?.length || 1,
  }));
}

function buildPackChart(profile) {
  if (profile.usage.packUsage.length) {
    return profile.usage.packUsage.map((row) => ({
      name: row.label,
      value: row.count,
    }));
  }
  const enabled = profile.packs.filter((pack) => pack.enabled).length;
  const notEnabled = Math.max(0, profile.packs.length - enabled);
  if (!enabled && !notEnabled) return [];
  return [
    { name: 'Enabled', value: enabled },
    { name: 'Available', value: notEnabled },
  ].filter((row) => row.value > 0);
}

function buildAiUsageChart(profile) {
  if (profile.usage.aiUsage.length) {
    return profile.usage.aiUsage.map((row) => ({
      name: row.label,
      value: row.count,
    }));
  }
  const aiUsage = profile.usage.totals.aiUsage;
  return aiUsage ? [{ name: 'AI sessions', value: aiUsage }] : [];
}

function buildTrainingTrend(simulationsCompleted, activeUsers) {
  const target = Math.max(number(activeUsers), number(simulationsCompleted), 1);
  return [
    { label: 'Completed', value: number(simulationsCompleted) },
    { label: 'Target', value: target },
  ];
}

function deriveDeviceSummary(snapshot) {
  const devices = snapshot.devices || [];
  const available = devices.filter(
    (device) => device.status !== 'offline' && device.freshness !== 'offline'
  ).length;
  const offline = devices.filter(
    (device) => device.status === 'offline' || device.freshness === 'offline'
  ).length;
  const warning = devices.filter((device) => /warning|stale/i.test(`${device.status} ${device.freshness}`)).length;
  const availability = ratioPercent(available, devices.length);
  return {
    total: devices.length,
    available,
    offline,
    warning,
    availability,
  };
}

function deriveFleetSummary(snapshot) {
  const summary = snapshot.summary || EMPTY_FLEET_SNAPSHOT.summary;
  const total = number(summary.totalVehicles);
  const available = number(summary.availableVehicles);
  return {
    ...summary,
    availability: ratioPercent(available, total),
  };
}

function deriveAutomationUtilization(profile) {
  const workflows = profile.usage.totals.workflowsCompleted;
  const engagement = profile.usage.totals.dashboardEngagement;
  const activeUsers = profile.usage.totals.activeUsers;
  const denominator = Math.max(number(activeUsers) * 2, profile.departments.length * 6, 1);
  return Math.min(100, Math.round(((number(workflows) * 2 + number(engagement)) / denominator) * 100));
}

function deriveTrainingCompletion(profile) {
  const simulations = profile.usage.totals.simulationsCompleted;
  const activeUsers = profile.usage.totals.activeUsers;
  const denominator = Math.max(number(activeUsers), profile.departments.length * 4, number(simulations), 1);
  return Math.min(100, Math.round((number(simulations) / denominator) * 100));
}

function buildOperationalAlerts({ notifications, fleetSummary, medicalIotSnapshot, compliance, security }) {
  const notificationAlerts = notifications
    .filter(isAlertNotification)
    .slice(0, 4)
    .map((notification) => ({
      id: `notification-${notification.id}`,
      title: notification.title || notification.message || 'Application alert',
      detail: notification.message || notification.body || 'Review notification center.',
      source: 'Notification',
      severity: notification.severity || notification.type || 'medium',
    }));

  const iotAlerts = (medicalIotSnapshot.alerts || []).slice(0, 4).map((alert) => ({
    id: `iot-${alert.id || alert.title}`,
    title: alert.title || 'Medical IoT alert',
    detail: alert.detail || alert.source || 'Device telemetry requires review.',
    source: alert.source || 'Medical IoT',
    severity: alert.severity || 'medium',
  }));

  const fleetAlerts = [
    fleetSummary.maintenanceCount
      ? {
          id: 'fleet-maintenance',
          title: 'Fleet maintenance pressure',
          detail: `${fleetSummary.maintenanceCount} fleet asset${fleetSummary.maintenanceCount === 1 ? '' : 's'} need maintenance review.`,
          source: 'Fleet',
          severity: 'medium',
        }
      : null,
    fleetSummary.lowEnergyCount
      ? {
          id: 'fleet-low-energy',
          title: 'Low energy fleet assets',
          detail: `${fleetSummary.lowEnergyCount} fleet asset${fleetSummary.lowEnergyCount === 1 ? '' : 's'} below energy threshold.`,
          source: 'Fleet',
          severity: 'medium',
        }
      : null,
  ].filter(Boolean);

  const governanceAlerts = [
    compliance?.data?.readiness?.blocked
      ? {
          id: 'compliance-blocked',
          title: 'Compliance readiness blocked',
          detail: 'Regulatory or audit controls need leadership review.',
          source: 'Compliance',
          severity: 'high',
        }
      : null,
    security?.data?.readiness?.blocked
      ? {
          id: 'security-blocked',
          title: 'Security readiness blocked',
          detail: 'AI security posture needs leadership review.',
          source: 'Security',
          severity: 'high',
        }
      : null,
  ].filter(Boolean);

  return [...governanceAlerts, ...fleetAlerts, ...iotAlerts, ...notificationAlerts].slice(0, 8);
}

export default function ExecutiveCommandCenter() {
  const userIdentity = useUserIdentity();
  const organizationContext = useOrganizationContext();
  const workspaceContext = useWorkspace();
  const { notifications } = useNotifications();
  const organization = organizationContext.organization || userIdentity.organization;
  const [orgState, setOrgState] = useState({
    loading: true,
    analytics: null,
    customerSuccess: null,
    tenantAdministration: null,
    error: '',
  });
  const [opsState, setOpsState] = useState({
    loading: true,
    fleet: EMPTY_FLEET_SNAPSHOT,
    medicalIot: { snapshot: EMPTY_MEDICAL_IOT_SNAPSHOT, message: '' },
    regulatory: null,
    audit: null,
    security: null,
    error: '',
  });

  useEffect(() => {
    if (!organization?.id) {
      setOrgState({
        loading: false,
        analytics: null,
        customerSuccess: null,
        tenantAdministration: null,
        error: '',
      });
      return;
    }

    let active = true;
    setOrgState((current) => ({ ...current, loading: true, error: '' }));
    Promise.allSettled([
      PlatformAssetsApi.getOrganizationAnalytics(organization.id),
      PlatformAssetsApi.getCustomerSuccessDashboard(organization.id, 'month'),
      PlatformAssetsApi.getTenantAdministration(organization.id),
    ]).then(([analytics, customerSuccess, tenantAdministration]) => {
      if (!active) return;
      const rejected = [analytics, customerSuccess, tenantAdministration].find(
        (result) => result.status === 'rejected'
      );
      setOrgState({
        loading: false,
        analytics: getResultValue(analytics),
        customerSuccess: getResultValue(customerSuccess),
        tenantAdministration: getResultValue(tenantAdministration),
        error: rejected?.reason?.message || '',
      });
    });

    return () => {
      active = false;
    };
  }, [organization?.id]);

  const loadOperations = useCallback(async () => {
    setOpsState((current) => ({ ...current, loading: true, error: '' }));
    const [fleet, medicalIot, regulatory, audit, security] = await Promise.allSettled([
      fetchFleetCommandSnapshot({ delayMs: 0 }),
      fetchMedicalIotSnapshot(),
      fetchPlatformGovernanceSurface('regulatory', '/regulatory'),
      fetchPlatformGovernanceSurface('audit', '/audit'),
      fetchPlatformGovernanceSurface('ai-security', '/security'),
    ]);
    const rejected = [fleet, medicalIot, regulatory, audit, security].find(
      (result) => result.status === 'rejected'
    );
    setOpsState({
      loading: false,
      fleet: getResultValue(fleet, EMPTY_FLEET_SNAPSHOT) || EMPTY_FLEET_SNAPSHOT,
      medicalIot: getResultValue(medicalIot, { snapshot: EMPTY_MEDICAL_IOT_SNAPSHOT, message: '' }) || {
        snapshot: EMPTY_MEDICAL_IOT_SNAPSHOT,
        message: '',
      },
      regulatory: getResultValue(regulatory),
      audit: getResultValue(audit),
      security: getResultValue(security),
      error: rejected?.reason?.message || '',
    });
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      await loadOperations();
    }
    if (active) load();
    return () => {
      active = false;
    };
  }, [loadOperations]);

  const profile = useMemo(
    () =>
      buildOrganizationIntelligenceProfile({
        organizationContext,
        userIdentity,
        workspaceContext,
        analytics: orgState.analytics,
        customerSuccess: orgState.customerSuccess,
        tenantAdministration: orgState.tenantAdministration,
      }),
    [organizationContext, orgState.analytics, orgState.customerSuccess, orgState.tenantAdministration, userIdentity, workspaceContext]
  );

  const fleetSummary = deriveFleetSummary(opsState.fleet);
  const medicalIotSnapshot = opsState.medicalIot?.snapshot || EMPTY_MEDICAL_IOT_SNAPSHOT;
  const deviceSummary = deriveDeviceSummary(medicalIotSnapshot);
  const compliance = opsState.regulatory || opsState.audit;
  const security = opsState.security;
  const automationUtilization = deriveAutomationUtilization(profile);
  const trainingCompletion = deriveTrainingCompletion(profile);
  const operationalAlerts = buildOperationalAlerts({
    notifications,
    fleetSummary,
    medicalIotSnapshot,
    compliance,
    security,
  });
  const loading = orgState.loading || opsState.loading;
  const error = orgState.error || opsState.error;
  const activeUsers = profile.usage.totals.activeUsers;
  const activeDepartments = profile.departments.length;
  const sourceState = {
    organization: orgState.error ? 'fallback' : orgState.analytics ? 'live' : 'context only',
    fleet: fleetSummary.source || 'demo',
    medicalIot: medicalIotSnapshot.source || 'demo',
    compliance: compliance?.sourceStatus || 'fallback',
    security: security?.sourceStatus || 'fallback',
  };

  return (
    <main className="executive-command-center" id="executive-command-center-main">
      <section className="executive-hero" aria-labelledby="executive-command-center-title">
        <div>
          <p className="executive-eyebrow">Hospital leadership dashboard</p>
          <h1 id="executive-command-center-title">Executive Command Center</h1>
          <p>
            A 60-second C-suite view of platform value, adoption, automation, training,
            device readiness, fleet readiness, compliance, security, and operational alerts.
          </p>
        </div>
        <div className="executive-hero__summary" aria-label="Executive snapshot status">
          <strong>{loading ? 'Syncing executive snapshot' : `${profile.organization.name} snapshot ready`}</strong>
          <span>Decision support for leadership review only.</span>
          <button
            type="button"
            onClick={loadOperations}
            disabled={opsState.loading}
            aria-busy={opsState.loading ? 'true' : 'false'}
          >
            Refresh operations
          </button>
        </div>
      </section>

      {loading ? (
        <div className="executive-status" role="status" aria-live="polite">
          Syncing executive dashboard sources...
        </div>
      ) : null}

      {error ? (
        <div className="executive-status executive-status--warning" role="alert">
          Some executive sources are degraded: {error}
        </div>
      ) : null}

      <section className="executive-source-strip" aria-label="Executive source states">
        <SourceBadge label="Organization" value={sourceState.organization} />
        <SourceBadge label="Fleet" value={sourceState.fleet} />
        <SourceBadge label="Medical IoT" value={sourceState.medicalIot} />
        <SourceBadge label="Compliance" value={sourceState.compliance} />
        <SourceBadge label="Security" value={sourceState.security} />
      </section>

      <section className="executive-kpi-grid" aria-label="Executive KPIs">
        <MetricCard label="Active Users" value={formatCount(activeUsers)} hint="Customer success usage signal" />
        <MetricCard label="Active Departments" value={formatCount(activeDepartments)} hint="Tenant administration coverage" />
        <MetricCard
          label="Adoption Score"
          value={percent(profile.adoption.score)}
          hint={`${profile.adoption.enabledPackCount} packs enabled`}
          tone={toneForPercent(profile.adoption.score)}
        />
        <MetricCard
          label="Automation Utilization"
          value={percent(automationUtilization)}
          hint={`${formatCount(profile.usage.totals.workflowsCompleted)} workflows completed`}
          tone={toneForPercent(automationUtilization)}
        />
        <MetricCard
          label="Training Completion"
          value={percent(trainingCompletion)}
          hint={`${formatCount(profile.usage.totals.simulationsCompleted)} simulations completed`}
          tone={toneForPercent(trainingCompletion)}
        />
        <MetricCard
          label="Device Availability"
          value={percent(deviceSummary.availability)}
          hint={`${formatCount(deviceSummary.available)} of ${formatCount(deviceSummary.total)} devices available`}
          tone={toneForPercent(deviceSummary.availability)}
        />
        <MetricCard
          label="Fleet Availability"
          value={percent(fleetSummary.availability)}
          hint={`${formatCount(fleetSummary.availableVehicles)} of ${formatCount(fleetSummary.totalVehicles)} fleet assets available`}
          tone={toneForPercent(fleetSummary.availability)}
        />
      </section>

      <section className="executive-widget-grid" aria-label="Executive dashboard widgets">
        <ExecutivePanel
          title="Organization Health"
          description="Leadership posture across adoption, customer health, and retention risk."
          action={formatSource(profile.organization.healthStatus)}
        >
          <div className="executive-insight-grid">
            <StatusCard
              label="Health Score"
              value={percent(profile.adoption.healthScore)}
              detail={`Retention risk: ${formatSource(profile.organization.retentionRisk)}`}
              tone={toneForPercent(profile.adoption.healthScore)}
            />
            <StatusCard
              label="Adoption Posture"
              value={percent(profile.adoption.score)}
              detail={`${formatCount(profile.allRecommendations.length)} recommended executive actions`}
              tone={toneForPercent(profile.adoption.score)}
            />
          </div>
        </ExecutivePanel>

        <ExecutivePanel
          title="Workspace Adoption"
          description="Shows where hospital workspaces are active and where leadership can drive rollout."
          action={`${formatCount(profile.workspaces.length)} workspaces`}
        >
          <VisualizationPanel title="Workspace adoption" description="Workspace usage or configured workspace breadth.">
            <CategoryBarChart
              data={buildWorkspaceChart(profile)}
              title="Workspace adoption"
              emptyMessage="No workspace adoption data available."
            />
          </VisualizationPanel>
        </ExecutivePanel>

        <ExecutivePanel
          title="Asset Pack Adoption"
          description="Measures solution pack reach and enabled asset coverage."
          action={`${formatCount(profile.adoption.enabledPackCount)} enabled packs`}
        >
          <VisualizationPanel title="Asset pack adoption" description="Pack usage or enabled pack distribution.">
            <DistributionDonutChart
              data={buildPackChart(profile)}
              title="Asset pack adoption"
              emptyMessage="No asset pack adoption data available."
            />
          </VisualizationPanel>
        </ExecutivePanel>

        <ExecutivePanel
          title="AI Usage"
          description="Summarizes AI engagement as a value realization signal."
          action={`${formatCount(profile.usage.totals.aiUsage)} AI events`}
        >
          <div className="executive-insight-grid">
            <StatusCard
              label="AI Sessions"
              value={formatCount(profile.usage.totals.aiUsage)}
              detail="Organization analytics and customer success signal"
              tone={profile.usage.totals.aiUsage ? 'good' : 'warning'}
            />
            <StatusCard
              label="Default Agent"
              value={userIdentity.platformContext?.defaultAiAgentId || 'agent-clinical'}
              detail="Current organization AI entry point"
            />
          </div>
          <CategoryBarChart data={buildAiUsageChart(profile)} title="AI usage distribution" emptyMessage="No AI usage distribution available." />
        </ExecutivePanel>

        <ExecutivePanel
          title="Simulation Completion"
          description="Training completion signal for readiness, education, and adoption."
          action={`${formatCount(profile.usage.totals.simulationsCompleted)} completed`}
        >
          <TrendChart
            data={buildTrainingTrend(profile.usage.totals.simulationsCompleted, activeUsers)}
            title="Simulation completion"
          />
        </ExecutivePanel>

        <ExecutivePanel
          title="Fleet Health"
          description="Dispatch readiness, utilization, energy, and maintenance pressure."
          action={percent(fleetSummary.availability)}
        >
          <div className="executive-insight-grid">
            <InsightRow label="Available fleet" value={formatCount(fleetSummary.availableVehicles)} detail={`${formatCount(fleetSummary.totalVehicles)} total assets`} tone={toneForPercent(fleetSummary.availability)} />
            <InsightRow label="Average utilization" value={percent(fleetSummary.averageUtilizationPercent)} detail="Fleet telemetry summary" />
            <InsightRow label="Maintenance" value={formatCount(fleetSummary.maintenanceCount)} detail="Assets needing service review" tone={fleetSummary.maintenanceCount ? 'warning' : 'success'} />
            <InsightRow label="Low energy" value={formatCount(fleetSummary.lowEnergyCount)} detail="Assets below energy threshold" tone={fleetSummary.lowEnergyCount ? 'warning' : 'success'} />
          </div>
          <DistributionDonutChart
            data={opsState.fleet.visualizations?.statusDistribution || []}
            title="Fleet status distribution"
            emptyMessage="No fleet status data available."
          />
        </ExecutivePanel>

        <ExecutivePanel
          title="Medical IoT Health"
          description="Connected device readiness and telemetry alert pressure."
          action={percent(deviceSummary.availability)}
        >
          <div className="executive-insight-grid">
            <InsightRow label="Available devices" value={formatCount(deviceSummary.available)} detail={`${formatCount(deviceSummary.total)} total devices`} tone={toneForPercent(deviceSummary.availability)} />
            <InsightRow label="Offline devices" value={formatCount(deviceSummary.offline)} detail="Telemetry unavailable" tone={deviceSummary.offline ? 'danger' : 'success'} />
            <InsightRow label="Warning devices" value={formatCount(deviceSummary.warning)} detail="Needs operations review" tone={deviceSummary.warning ? 'warning' : 'success'} />
            <InsightRow label="Active device alerts" value={formatCount(medicalIotSnapshot.alerts?.length || 0)} detail={opsState.medicalIot?.message || medicalIotSnapshot.sourceLabel} tone={medicalIotSnapshot.alerts?.length ? 'warning' : 'success'} />
          </div>
        </ExecutivePanel>

        <ExecutivePanel
          title="Compliance Status"
          description="Regulatory and audit readiness for leadership oversight."
          action={summarizeReadiness(compliance)}
        >
          <div className="executive-insight-grid">
            <StatusCard
              label="Regulatory"
              value={summarizeReadiness(opsState.regulatory)}
              detail={`${formatCount(countGovernanceRecords(opsState.regulatory))} evidence records`}
              tone={readinessTone(opsState.regulatory)}
            />
            <StatusCard
              label="Audit"
              value={summarizeReadiness(opsState.audit)}
              detail={`${formatCount(countGovernanceRecords(opsState.audit))} audit records`}
              tone={readinessTone(opsState.audit)}
            />
          </div>
        </ExecutivePanel>

        <ExecutivePanel
          title="Security Status"
          description="AI security and security readiness for executive risk review."
          action={summarizeReadiness(security)}
        >
          <div className="executive-insight-grid">
            <StatusCard
              label="AI Security"
              value={summarizeReadiness(security)}
              detail={`${formatCount(countGovernanceRecords(security))} security records`}
              tone={readinessTone(security)}
            />
            <StatusCard
              label="Source State"
              value={formatSource(security?.sourceStatus)}
              detail={security?.message || 'Governance security summary'}
              tone={readinessTone(security)}
            />
          </div>
        </ExecutivePanel>

        <ExecutivePanel
          title="Operational Alerts"
          description="Executive-level issues collected from operations, security, compliance, IoT, fleet, and notifications."
          action={`${formatCount(operationalAlerts.length)} active`}
        >
          {operationalAlerts.length ? (
            <div className="executive-alert-list">
              {operationalAlerts.map((alert) => (
                <article key={alert.id} className={`executive-alert executive-alert--${alert.severity || 'medium'}`}>
                  <div>
                    <strong>{alert.title}</strong>
                    <p>{alert.detail}</p>
                  </div>
                  <span>{alert.source}</span>
                </article>
              ))}
            </div>
          ) : (
            <div className="executive-empty-state">No executive operational alerts are active.</div>
          )}
        </ExecutivePanel>
      </section>
    </main>
  );
}

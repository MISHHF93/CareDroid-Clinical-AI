import { useCallback, useEffect, useState } from 'react';
import { healthCheckStatusToWidgetTone } from '../../config/semanticColorSystem';
import {
  ActionRow,
  DashboardGrid,
  DashboardSection,
  LoadingState,
  MetricCard,
  CareDroidPage,
  StatusBadge,
  Surface,
} from '../../components/ui/CareDroidPrimitives';
import Button from '../../components/ui/button';
import {
  buildLocalEmergencyAnalytics,
  fetchEmergencyOperationalAnalytics,
} from '../../services/emergencyAnalyticsApi';
import { fetchUnifiedPlatformHealth } from '../../services/unifiedServiceRegistry';
import { fetchEmergencySurgeStatus } from '../../services/surgeApi';
import './ExecutiveCommandCenter.css';

// v === 0 is a real, reachable value (emergencyAnalyticsApi's average() returns 0, not NaN,
// when there are no rows yet) -- only null/undefined mean "no data," matching the nullish-only
// guard the sibling "Patients seen" card already uses a few lines below.
const min = (v: number | undefined | null) => (v == null ? '—' : `${v} min`);

const directionLabel: Record<string, string> = { up: '↑', down: '↓', flat: '—' };

function HealthCheckRow({
  check,
}: {
  check: { id: string; label: string; status?: string; displayStatus?: string };
}) {
  const tone = healthCheckStatusToWidgetTone(check.status);
  return (
    <Surface as="div" tone="nested" className="executive-health-row">
      <span
        className={`executive-health-row__dot executive-health-row__dot--${tone}`}
        aria-hidden
      />
      <span className="executive-health-row__label">{check.label}</span>
      <StatusBadge status={tone}>{check.displayStatus || check.status}</StatusBadge>
    </Surface>
  );
}

export default function ExecutiveCommandCenter() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [platformChecks, setPlatformChecks] = useState<any[]>([]);
  const [platformSummary, setPlatformSummary] = useState<any>(null);
  const [surgeStatus, setSurge] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLast] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsResult, healthBundle, surgeResult] = await Promise.all([
        fetchEmergencyOperationalAnalytics(),
        fetchUnifiedPlatformHealth({
          sync: {
            status: 'executive-command',
            source: 'ExecutiveCommandCenter',
            stale: false,
            message: 'Executive command center refresh.',
          },
        }),
        fetchEmergencySurgeStatus(),
      ]);

      const analyticsData =
        (analyticsResult as any).ok && (analyticsResult as any).data
          ? (analyticsResult as any).data
          : buildLocalEmergencyAnalytics({
              patients: [],
              queues: [],
              capacity: {},
              activeShift: {},
            });
      setAnalytics(analyticsData);
      setPlatformChecks(healthBundle.saas.data?.checks || []);
      setPlatformSummary(healthBundle.saas.data?.summary || null);
      setSurge((surgeResult as any).ok ? (surgeResult as any).data : null);
      setLast(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const shift = analytics?.shift;
  const compare = shift?.comparison;

  return (
    <CareDroidPage
      className="executive-command-page"
      contentClassName="cd-page-stack cd-page-stack--compact executive-command-page__content"
      eyebrow="Administrator / executive"
      title="Executive Command Center"
      titleId="executive-command-title"
      description="What is happening across the ED shift, platform health, and surge posture — who owns escalation and what happens next."
      actions={
        <ActionRow align="end">
          {surgeStatus?.active ? <StatusBadge status="critical">Surge active</StatusBadge> : null}
          <Button variant="primary" size="sm" loading={loading} onClick={load}>
            Refresh
          </Button>
        </ActionRow>
      }
      zones={{
        operationalSummary:
          loading && !analytics ? (
            <LoadingState
              title="Loading executive dashboard"
              description="Fetching shift KPIs, platform health, and surge status."
            />
          ) : null,
        analytics: (
          <DashboardGrid variant="summary" className="executive-kpi-grid">
            <MetricCard
              label="Patients seen"
              value={shift?.patientsSeen ?? '—'}
              helper={
                compare?.patientsSeen?.direction
                  ? `${directionLabel[compare.patientsSeen.direction]} vs prior shift`
                  : 'this shift'
              }
            />
            <MetricCard
              label="Avg wait"
              value={min(shift?.avgWaitMinutes)}
              tone={shift?.avgWaitMinutes > 30 ? 'critical' : 'neutral'}
              helper="door to triage"
            />
            <MetricCard label="Avg LOS" value={min(shift?.avgLosMinutes)} helper="length of stay" />
            <MetricCard
              label="Discharge rate"
              value={shift ? `${shift.dischargeRate}%` : '—'}
              tone={shift?.dischargeRate >= 60 ? 'healthy' : 'neutral'}
              helper={shift ? `${shift.dischargeCount} patients` : undefined}
            />
            <MetricCard
              label="Admissions"
              value={shift?.admissionCount ?? '—'}
              helper={shift ? `${shift.admissionRate}% admission rate` : undefined}
            />
            <MetricCard
              label="LWBS"
              value={shift?.lwbsCount ?? '—'}
              tone={shift?.lwbsCount > 0 ? 'attention' : 'healthy'}
              helper="left without being seen"
            />
          </DashboardGrid>
        ),
        activeWork: (
          <DashboardGrid variant="cards" className="executive-panel-grid">
            {platformChecks.length > 0 ? (
              <DashboardSection
                className="executive-panel"
                title={`Platform health (${platformSummary?.healthy ?? 0}/${platformSummary?.total ?? platformChecks.length} healthy)`}
                titleId="executive-platform-health"
              >
                <div className="executive-health-list">
                  {platformChecks.map((check: any) => (
                    <HealthCheckRow key={check.id} check={check} />
                  ))}
                </div>
              </DashboardSection>
            ) : null}

            {analytics?.capacityHistory?.length > 0 ? (
              <DashboardSection
                className="executive-panel"
                title="Capacity trend — last 8 hrs"
                titleId="executive-capacity"
              >
                <div className="executive-capacity-list">
                  {(analytics.capacityHistory as any[]).map((point: any) => {
                    const tone =
                      point.score < 60 ? 'critical' : point.score < 75 ? 'attention' : 'healthy';
                    return (
                      <div key={point.timestamp} className="executive-capacity-row">
                        <span className="executive-capacity-row__label">{point.label}</span>
                        <div
                          className="executive-capacity-row__bar"
                          role="presentation"
                          aria-hidden
                        >
                          <span
                            className={`executive-capacity-row__fill executive-capacity-row__fill--${tone}`}
                            style={{ width: `${point.score}%` }}
                          />
                        </div>
                        <strong
                          className={`executive-capacity-row__score executive-capacity-row__score--${tone}`}
                        >
                          {point.score}
                        </strong>
                      </div>
                    );
                  })}
                </div>
              </DashboardSection>
            ) : null}

            {analytics?.queuePerformance?.length > 0 ? (
              <DashboardSection
                className="executive-panel"
                title="Queue performance"
                titleId="executive-queues"
              >
                <div className="executive-queue-list">
                  {(analytics.queuePerformance as any[]).map((queue: any) => (
                    <div key={queue.id} className="executive-queue-row">
                      <span>{queue.name}</span>
                      <span className="executive-queue-row__wait-label">wait</span>
                      <strong
                        className={
                          queue.avgWaitMinutes > 30 ? 'executive-queue-row__wait--critical' : ''
                        }
                      >
                        {queue.avgWaitMinutes}m
                      </strong>
                      {queue.waitTrend?.direction !== 'flat' ? (
                        <span
                          className={
                            queue.waitTrend?.direction === 'up'
                              ? 'executive-queue-row__trend--up'
                              : 'executive-queue-row__trend--down'
                          }
                        >
                          {directionLabel[queue.waitTrend?.direction]}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </DashboardSection>
            ) : null}

            {analytics?.operationalCommand?.topComplaints?.length > 0 ? (
              <DashboardSection
                className="executive-panel"
                title="Top chief complaints"
                titleId="executive-complaints"
              >
                <div className="executive-complaint-list">
                  {(analytics.operationalCommand.topComplaints as any[])
                    .slice(0, 8)
                    .map((item: any) => (
                      <div key={item.name} className="executive-complaint-row">
                        <span>{item.name}</span>
                        <strong>{item.count}</strong>
                      </div>
                    ))}
                </div>
              </DashboardSection>
            ) : null}

            {surgeStatus ? (
              <DashboardSection
                className="executive-panel"
                title="Surge status"
                titleId="executive-surge"
              >
                <dl className="executive-surge-dl">
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <StatusBadge status={surgeStatus.active ? 'critical' : 'success'}>
                        {surgeStatus.active ? 'Active' : 'Normal'}
                      </StatusBadge>
                    </dd>
                  </div>
                  {surgeStatus.eventId ? (
                    <div>
                      <dt>Event</dt>
                      <dd className="executive-surge-dl__mono">{surgeStatus.eventId}</dd>
                    </div>
                  ) : null}
                  {surgeStatus.activatedAt ? (
                    <div>
                      <dt>Activated</dt>
                      <dd>{new Date(surgeStatus.activatedAt).toLocaleTimeString()}</dd>
                    </div>
                  ) : null}
                </dl>
              </DashboardSection>
            ) : null}
          </DashboardGrid>
        ),
        history: lastRefreshed ? (
          <p className="executive-refreshed cdl-surface cdl-surface--inactive">
            Last refreshed {lastRefreshed.toLocaleTimeString()}
          </p>
        ) : null,
      }}
    />
  );
}

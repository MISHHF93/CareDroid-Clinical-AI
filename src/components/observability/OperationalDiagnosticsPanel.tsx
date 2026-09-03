import { useState } from 'react';
import type { ObservabilityDiagnosticsSnapshot } from '../../config/observabilityModel';
import { fetchObservabilityTrace } from '../../services/observabilityDiagnosticsApi';
import { DashboardGrid, MetricCard, Surface } from '../ui/CareDroidPrimitives';
import Button from '../ui/button';
import './operational-diagnostics-panel.css';

type ServiceHealthRow = Readonly<{
  serviceName: string;
  status: string;
  latencyMs?: number;
  errorRate?: number;
}>;

type DiagnosticsRow = Readonly<{
  id: string;
  label: string;
  value: string;
  tone?: 'healthy' | 'attention' | 'critical' | 'information';
}>;

function formatTimestamp(value?: string) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function TelemetryTable({
  title,
  emptyLabel,
  headers,
  rows,
}: {
  title: string;
  emptyLabel: string;
  headers: readonly string[];
  rows: readonly (readonly string[])[];
}) {
  return (
    <Surface as="article" tone="nested" className="operational-diagnostics-panel__table-card">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="operational-diagnostics-panel__empty">{emptyLabel}</p>
      ) : (
        <div className="operational-diagnostics-panel__table-wrap">
          <table className="operational-diagnostics-panel__table">
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${title}-${index}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${title}-${index}-${cellIndex}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Surface>
  );
}

export function OperationalDiagnosticsPanel({
  client,
  server,
  observabilityHealth,
  serviceHealth = [],
  title = 'Operational diagnostics',
}: {
  client: ObservabilityDiagnosticsSnapshot;
  server?: Record<string, unknown> | null;
  observabilityHealth?: { status?: string; regressionSignals?: number } | null;
  serviceHealth?: readonly ServiceHealthRow[];
  title?: string;
}) {
  const [traceLookupId, setTraceLookupId] = useState(client.correlationId);
  const [traceTimeline, setTraceTimeline] = useState<Record<string, unknown> | null>(null);
  const [traceMessage, setTraceMessage] = useState('');
  const [traceLoading, setTraceLoading] = useState(false);

  const loadTrace = async () => {
    setTraceLoading(true);
    setTraceMessage('');
    const result = await fetchObservabilityTrace(traceLookupId);
    setTraceLoading(false);
    if (!result.ok) {
      setTraceTimeline(null);
      setTraceMessage(result.message);
      return;
    }
    setTraceTimeline(result.data);
  };
  const eventCountTotal = Object.values(client.eventCounts).reduce(
    (sum, count) => sum + (count || 0),
    0,
  );
  const serverTotals = (server?.totals || {}) as Record<string, number>;
  const serverPerformance = (server?.performance || null) as Record<string, unknown> | null;
  const regressionSignals = Array.isArray(serverPerformance?.regressionSignals)
    ? serverPerformance.regressionSignals
    : [];

  const summaryMetrics: DiagnosticsRow[] = [
    {
      id: 'correlation',
      label: 'Correlation ID',
      value: client.correlationId,
      tone: 'information',
    },
    {
      id: 'backend',
      label: 'Backend reachable',
      value: client.backendReachable ? 'yes' : 'no',
      tone: client.backendReachable ? 'healthy' : 'critical',
    },
    {
      id: 'telemetry-health',
      label: 'Telemetry health',
      value: observabilityHealth?.status || 'unknown',
      tone:
        observabilityHealth?.status === 'degraded'
          ? 'critical'
          : observabilityHealth?.status === 'warning'
            ? 'attention'
            : 'healthy',
    },
    {
      id: 'events',
      label: 'Client events',
      value: String(eventCountTotal),
      tone: 'information',
    },
  ];

  const workflowRows = client.recentWorkflowSpans
    .slice(0, 8)
    .map((span) => [
      span.workflowType,
      span.summary,
      span.patientId || '—',
      formatTimestamp(span.timestamp),
    ]);

  const slowApiRows = client.slowApiCalls
    .slice(0, 8)
    .map((sample) => [
      `${sample.method} ${sample.path}`,
      `${sample.durationMs}ms`,
      String(sample.status),
      formatTimestamp(sample.timestamp),
    ]);

  const errorRows = client.recentErrors
    .slice(0, 8)
    .map((event) => [
      event.name,
      event.message || '—',
      event.source || '—',
      formatTimestamp(event.timestamp),
    ]);

  const performanceRows = Object.entries(client.performanceMarks)
    .sort(([, a], [, b]) => b.p95Ms - a.p95Ms)
    .slice(0, 8)
    .map(([name, mark]) => [
      name,
      String(mark.count),
      `${mark.p95Ms}ms p95`,
      `${mark.avgMs}ms avg`,
    ]);

  const serverWorkflow = Array.isArray(server?.recentWorkflow)
    ? (server.recentWorkflow as Array<Record<string, unknown>>).slice(0, 6)
    : [];
  const serverWorkflowRows = serverWorkflow.map((event) => [
    String(event.workflowType || event.name || 'workflow'),
    String(event.message || '—'),
    String(event.patientId || '—'),
    formatTimestamp(String(event.timestamp || '')),
  ]);

  const serviceHealthRows = serviceHealth
    .slice(0, 8)
    .map((service) => [
      service.serviceName,
      service.status,
      service.latencyMs != null ? `${service.latencyMs}ms` : '—',
      service.errorRate != null ? `${Math.round(service.errorRate * 100)}%` : '—',
    ]);

  const regressionRows = regressionSignals
    .slice(0, 6)
    .map((signal: Record<string, unknown>) => [
      String(signal.endpoint || '—'),
      String(signal.p95Ms != null ? `${signal.p95Ms}ms` : '—'),
      String(signal.sampleCount ?? '—'),
      String(signal.signal || 'sustained_slow_endpoint'),
    ]);

  return (
    <section className="operational-diagnostics-panel" aria-label={title}>
      <header className="operational-diagnostics-panel__header">
        <h2>{title}</h2>
        <p>
          End-to-end workflow traces, API performance, and error telemetry for administrator triage.
          Correlation ID links client requests with backend ingest.
        </p>
      </header>

      <DashboardGrid variant="summary" className="operational-diagnostics-panel__metrics">
        {summaryMetrics.map((metric) => (
          <MetricCard
            key={metric.id}
            label={metric.label}
            value={metric.value}
            tone={metric.tone || 'information'}
          />
        ))}
        <MetricCard
          label="Server buffered events"
          value={serverTotals.bufferedEvents ?? 0}
          tone="information"
          helper="Ingested client + backend telemetry"
        />
        <MetricCard
          label="Server errors"
          value={serverTotals.errorCount ?? 0}
          tone={(serverTotals.errorCount ?? 0) > 0 ? 'attention' : 'healthy'}
          helper="Buffered error severity events"
        />
        <MetricCard
          label="Regression signals"
          value={regressionSignals.length}
          tone={regressionSignals.length > 0 ? 'critical' : 'healthy'}
          helper="Sustained slow endpoints"
        />
      </DashboardGrid>

      <Surface as="div" tone="nested" className="operational-diagnostics-panel__trace-lookup">
        <h3>End-to-end trace lookup</h3>
        <div className="operational-diagnostics-panel__trace-form">
          <input
            type="text"
            value={traceLookupId}
            onChange={(event) => setTraceLookupId(event.target.value)}
            aria-label="Correlation ID"
            placeholder="Correlation ID"
          />
          <Button variant="secondary" size="sm" loading={traceLoading} onClick={loadTrace}>
            Load trace
          </Button>
        </div>
        {traceMessage ? (
          <p className="operational-diagnostics-panel__empty">{traceMessage}</p>
        ) : null}
        {traceTimeline ? (
          <pre className="operational-diagnostics-panel__trace-output">
            {JSON.stringify(traceTimeline, null, 2)}
          </pre>
        ) : null}
      </Surface>

      <DashboardGrid className="operational-diagnostics-panel__grid">
        <TelemetryTable
          title="Client workflow spans"
          emptyLabel="No workflow spans recorded yet."
          headers={['Workflow', 'Summary', 'Patient', 'Time']}
          rows={workflowRows}
        />
        <TelemetryTable
          title="Slow API calls"
          emptyLabel="No slow API calls detected."
          headers={['Endpoint', 'Duration', 'Status', 'Time']}
          rows={slowApiRows}
        />
        <TelemetryTable
          title="Recent errors"
          emptyLabel="No recent client errors."
          headers={['Name', 'Message', 'Source', 'Time']}
          rows={errorRows}
        />
        <TelemetryTable
          title="Performance marks (p95)"
          emptyLabel="No performance samples yet."
          headers={['Mark', 'Samples', 'P95', 'Average']}
          rows={performanceRows}
        />
        {server ? (
          <TelemetryTable
            title="Server workflow telemetry"
            emptyLabel="No server workflow events buffered."
            headers={['Workflow', 'Message', 'Patient', 'Time']}
            rows={serverWorkflowRows}
          />
        ) : null}
        <TelemetryTable
          title="Performance regressions"
          emptyLabel="No sustained slow endpoints detected."
          headers={['Endpoint', 'P95', 'Samples', 'Signal']}
          rows={regressionRows}
        />
        {serviceHealth.length > 0 ? (
          <TelemetryTable
            title="Service registry health"
            emptyLabel="No service health data."
            headers={['Service', 'Status', 'Latency', 'Error rate']}
            rows={serviceHealthRows}
          />
        ) : null}
      </DashboardGrid>
    </section>
  );
}

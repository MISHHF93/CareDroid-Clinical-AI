import { useCallback, useEffect, useMemo, useState } from 'react';

type OverallStatus = 'healthy' | 'degraded' | 'unhealthy';
type ComponentStatus = OverallStatus | 'not-configured';

interface ComponentHealth {
  status: ComponentStatus;
  responseTimeMs: number;
  checkedAt: string;
  configured: boolean;
  critical: boolean;
  details?: Record<string, unknown>;
  error?: string;
}

interface SystemHealthResponse {
  status: OverallStatus;
  timestamp: string;
  responseTimeMs: number;
  components: Record<string, ComponentHealth>;
}

const REFRESH_INTERVAL_MS = 30000;

const statusColors: Record<ComponentStatus, string> = {
  healthy: '#10B981',
  degraded: '#F59E0B',
  unhealthy: '#EF4444',
  'not-configured': '#6B7280',
};

const statusLabels: Record<ComponentStatus, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  unhealthy: 'Unhealthy',
  'not-configured': 'Not configured',
};

function formatComponentName(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/Api$/, ' API')
    .replace(/^./, (value) => value.toUpperCase());
}

function formatTime(value: string): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return value;
  return timestamp.toLocaleString();
}

function summarizeDetails(details: Record<string, unknown> | undefined): string {
  if (!details) return 'No additional details';

  const totals = details.totals;
  if (totals && typeof totals === 'object') {
    const totalsRecord = totals as Record<string, unknown>;
    return Object.entries(totalsRecord)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(', ');
  }

  const message = details.message;
  if (typeof message === 'string') return message;

  const statusCode = details.statusCode;
  const endpoint = details.endpoint;
  if (typeof statusCode === 'number' && typeof endpoint === 'string') {
    return `HTTP ${statusCode} from ${endpoint}`;
  }

  return Object.entries(details)
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(', ');
}

function StatusBadge({ status }: { status: ComponentStatus }) {
  return (
    <span
      style={{
        background: `${statusColors[status]}1F`,
        border: `1px solid ${statusColors[status]}`,
        borderRadius: 999,
        color: statusColors[status],
        display: 'inline-flex',
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1,
        padding: '6px 10px',
        textTransform: 'uppercase',
      }}
    >
      {statusLabels[status]}
    </span>
  );
}

export function SystemHealth() {
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(
    async (manual = false) => {
      if (manual) setRefreshing(true);
      else setLoading((current) => current && !health);

      try {
        const response = await fetch('/health', {
          headers: { accept: 'application/json' },
        });
        const payload = (await response.json()) as SystemHealthResponse;

        if (!response.ok && payload.status !== 'unhealthy') {
          throw new Error(`Health check failed with HTTP ${response.status}`);
        }

        setHealth(payload);
        setError(null);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [health],
  );

  useEffect(() => {
    void fetchHealth();
    const interval = window.setInterval(() => {
      void fetchHealth();
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [fetchHealth]);

  const components = useMemo(
    () => Object.entries(health?.components || {}).sort(([left], [right]) => left.localeCompare(right)),
    [health],
  );

  return (
    <section
      aria-label="System health"
      style={{
        background: '#0D1117',
        border: '1px solid #1F2937',
        borderRadius: 16,
        color: '#F9FAFB',
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: 20, margin: '0 0 8px' }}>System Health</h2>
          <p style={{ color: '#9CA3AF', fontSize: 13, margin: 0 }}>
            Refreshes every 30 seconds. Last checked{' '}
            {health?.timestamp ? formatTime(health.timestamp) : 'not yet available'}.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {health ? <StatusBadge status={health.status} /> : null}
          <button
            type="button"
            onClick={() => void fetchHealth(true)}
            disabled={refreshing}
            style={{
              background: '#111827',
              border: '1px solid #374151',
              borderRadius: 10,
              color: '#F9FAFB',
              cursor: refreshing ? 'wait' : 'pointer',
              fontSize: 13,
              fontWeight: 700,
              padding: '8px 12px',
            }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#9CA3AF', margin: '20px 0 0' }}>Loading system health...</p>
      ) : null}

      {error ? (
        <div
          role="alert"
          style={{
            background: '#7F1D1D33',
            border: '1px solid #EF4444',
            borderRadius: 12,
            color: '#FCA5A5',
            marginTop: 16,
            padding: 12,
          }}
        >
          {error}
        </div>
      ) : null}

      {health ? (
        <>
          <div
            style={{
              color: '#9CA3AF',
              display: 'flex',
              flexWrap: 'wrap',
              fontSize: 13,
              gap: 16,
              marginTop: 16,
            }}
          >
            <span>Total response: {health.responseTimeMs}ms</span>
            <span>Components: {components.length}</span>
          </div>

          <div
            style={{
              display: 'grid',
              gap: 12,
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              marginTop: 16,
            }}
          >
            {components.map(([name, component]) => (
              <article
                key={name}
                style={{
                  background: '#111827',
                  border: '1px solid #1F2937',
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    alignItems: 'center',
                    display: 'flex',
                    gap: 10,
                    justifyContent: 'space-between',
                  }}
                >
                  <h3 style={{ fontSize: 15, margin: 0 }}>{formatComponentName(name)}</h3>
                  <StatusBadge status={component.status} />
                </div>
                <dl
                  style={{
                    color: '#D1D5DB',
                    display: 'grid',
                    gap: 6,
                    gridTemplateColumns: 'auto 1fr',
                    fontSize: 13,
                    margin: '12px 0 0',
                  }}
                >
                  <dt style={{ color: '#9CA3AF' }}>Response</dt>
                  <dd style={{ margin: 0 }}>{component.responseTimeMs}ms</dd>
                  <dt style={{ color: '#9CA3AF' }}>Checked</dt>
                  <dd style={{ margin: 0 }}>{formatTime(component.checkedAt)}</dd>
                  <dt style={{ color: '#9CA3AF' }}>Role</dt>
                  <dd style={{ margin: 0 }}>{component.critical ? 'Critical' : 'Optional'}</dd>
                  <dt style={{ color: '#9CA3AF' }}>Details</dt>
                  <dd style={{ margin: 0 }}>{summarizeDetails(component.details)}</dd>
                </dl>
                {component.error ? (
                  <p style={{ color: '#FCA5A5', fontSize: 13, margin: '10px 0 0' }}>{component.error}</p>
                ) : null}
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

export default SystemHealth;

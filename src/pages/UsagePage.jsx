import { useEffect, useState } from 'react';
import Card from '../components/ui/card';
import { useTenantContext } from '../contexts/TenantContext';
import { fetchUsageSummary } from '../services/subscriptionApi';
import './commercial/CommercialPages.css';

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function UsageBreakdown({ title, rows }) {
  return (
    <Card className="commercial-card">
      <h2>{title}</h2>
      {rows?.length ? (
        <ul className="commercial-compact-list">
          {rows.slice(0, 12).map((row) => (
            <li key={row.key}>
              {row.key}: {formatNumber(row.quantity)} usage units across {row.events} events
            </li>
          ))}
        </ul>
      ) : (
        <p className="commercial-subtitle">No usage recorded for this period.</p>
      )}
    </Card>
  );
}

export default function UsagePage() {
  const { tenantContext } = useTenantContext();
  const [period, setPeriod] = useState('month');
  const [usage, setUsage] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchUsageSummary({ period }).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.message);
        setUsage(null);
      } else {
        setError('');
        setUsage(result.data);
      }
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [period]);

  return (
    <div className="commercial-page">
      <header className="commercial-header">
        <h1>Usage</h1>
        <p className="commercial-subtitle">
          Usage by organization, workspace, asset, user role, and time period for{' '}
          {tenantContext?.organizationName || 'this tenant'}.
        </p>
        <select value={period} onChange={(event) => setPeriod(event.target.value)}>
          <option value="day">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
        </select>
      </header>

      {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}
      {isLoading ? (
        <p>Loading usage...</p>
      ) : (
        <>
          <section className="commercial-grid">
            {(usage?.totals || []).map((meter) => (
              <Card key={meter.eventType} className="commercial-card">
                <h2>{meter.label}</h2>
                <strong>{formatNumber(meter.used)}</strong>
                <p className="commercial-subtitle">
                  {meter.limit === null
                    ? `Unlimited ${meter.unit}`
                    : `${formatNumber(meter.remaining)} ${meter.unit} remaining of ${formatNumber(
                        meter.limit
                      )}`}
                </p>
              </Card>
            ))}
          </section>

          <section className="commercial-grid">
            <UsageBreakdown title="By workspace" rows={usage?.breakdowns?.byWorkspace} />
            <UsageBreakdown title="By asset" rows={usage?.breakdowns?.byAsset} />
            <UsageBreakdown title="By user role" rows={usage?.breakdowns?.byRole} />
            <UsageBreakdown title="By meter" rows={usage?.breakdowns?.byEventType} />
          </section>
        </>
      )}
    </div>
  );
}

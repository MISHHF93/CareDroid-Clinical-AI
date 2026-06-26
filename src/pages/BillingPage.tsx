import { useEffect, useState } from 'react';
import Card from '../components/ui/card';
import Button from '../components/ui/button';
import { useTenantContext } from '../contexts/TenantContext';
import PageShellBase from './commercial/CommercialPageShell';
const PageShell = PageShellBase as any;
import {
  createCheckoutSession,
  createCustomerPortalSession,
  fetchBillingOverview,
} from '../services/subscriptionApi';
import './commercial/CommercialPages.css';

function formatLimit(limit) {
  if (limit === null || limit === undefined) return 'Unlimited';
  return Number(limit).toLocaleString();
}

export default function BillingPage() {
  const { tenantContext } = useTenantContext();
  const [billing, setBilling] = useState<any>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchBillingOverview().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.message);
        setBilling(null);
      } else {
        setError('');
        setBilling(result.data);
      }
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const openPortal = async () => {
    const result = await createCustomerPortalSession({ returnUrl: window.location.href });
    if (result.ok && result.data?.url) window.location.assign(result.data.url);
    else setError(result.message);
  };

  const startCheckout = async (tier) => {
    const result = await createCheckoutSession({
      tier,
      successUrl: window.location.href,
      cancelUrl: window.location.href,
    });
    if (result.ok && result.data?.url) window.location.assign(result.data.url);
    else setError(result.message);
  };

  if (isLoading) {
    return <PageShell title="Billing" subtitle="Loading billing overview..." />;
  }

  return (
    <PageShell
      title="Billing"
      subtitle={`Manage subscription plan, billing status, and monthly usage limits for ${
        tenantContext?.organizationName || 'this organization'
      }.`}
    >
      {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}

      <div className="commercial-grid">
        <Card className="commercial-card">
          <h2>Current plan</h2>
          <p className="commercial-subtitle">{billing?.currentPlan?.description}</p>
          <div className="commercial-metric-grid">
            <div>
              <strong>{billing?.currentPlan?.name || 'Starter'}</strong>
              <span>Status: {billing?.status || 'active'}</span>
            </div>
            <div>
              <strong>
                {billing?.currentPlan?.priceMonthly === null
                  ? 'Custom'
                  : `$${billing?.currentPlan?.priceMonthly || 0}/mo`}
              </strong>
              <span>Plan pricing</span>
            </div>
          </div>
          <div className="commercial-actions">
            <Button variant="secondary" onClick={openPortal}>
              Open billing portal
            </Button>
          </div>
        </Card>

        <Card className="commercial-card">
          <h2>Included meters</h2>
          <ul className="commercial-compact-list">
            {(billing?.currentPlan?.limits || []).map((limit) => (
              <li key={limit.eventType}>
                {limit.label}: {formatLimit(limit.limit)} {limit.unit}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <section className="commercial-section">
        <h2>Available plans</h2>
        <div className="commercial-grid">
          {(billing?.plans || []).map((plan) => (
            <Card key={plan.id} className="commercial-card">
              <h2>{plan.name}</h2>
              <p className="commercial-subtitle">{plan.description}</p>
              <strong>{plan.priceMonthly === null ? 'Custom pricing' : `$${plan.priceMonthly}/mo`}</strong>
              <ul className="commercial-compact-list">
                {(plan.features || []).map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <Button variant="primary" onClick={() => startCheckout(plan.id)}>
                Select {plan.name}
              </Button>
            </Card>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

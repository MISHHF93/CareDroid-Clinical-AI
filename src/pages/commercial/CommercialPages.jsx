import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Card from '../../components/ui/card';
import Button from '../../components/ui/button';
import { useUserIdentity } from '../../contexts/UserIdentityContext';
import { ProductCatalogApi } from '../../services/productCatalogApi';
import { PlatformAssetsApi } from '../../services/platformAssetsApi';
import { PROFILE_ROLES } from '../../data/profileToolSegmentation';
import { applyRegistryToolLaunch, getRegistryToolNavigation } from '../../navigation/registryToolLaunch';
import './CommercialPages.css';

const ORG_TYPES = [
  'hospital',
  'academic_medical_center',
  'clinic',
  'ems',
  'research_institute',
  'health_system',
  'long_term_care',
  'home_care',
  'telehealth',
  'university',
];

const SPECIALTY_OPTIONS = [
  'emergency',
  'icu',
  'cardiology',
  'neurology',
  'pediatrics',
  'oncology',
  'surgery',
  'laboratory',
  'operations',
  'research',
];

const DEPARTMENT_OPTIONS = [
  'Emergency',
  'ICU',
  'Cardiology',
  'Laboratory',
  'Operations',
  'Pharmacy',
  'Administration',
];

const INTEGRATION_OPTIONS = [
  'fhir-patient',
  'hl7-adt',
  'laboratory-interface',
  'identity-sso',
  'scheduling',
  'telehealth',
];

function PageShell({ title, subtitle, children, actions }) {
  return (
    <div className="commercial-page">
      <header className="commercial-header">
        <h1>{title}</h1>
        {subtitle && <p className="commercial-subtitle">{subtitle}</p>}
        {actions && <div className="commercial-actions">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

function ChipList({ items = [] }) {
  if (!items?.length) return null;
  return (
    <div className="commercial-chip-list">
      {items.map((item) => (
        <span key={item} className="commercial-chip">
          {item}
        </span>
      ))}
    </div>
  );
}

function assetAccessCopy(asset) {
  const state = asset?.access?.state || asset?.entitlementStatus;
  if (state === 'locked') return 'Not included in current packs';
  if (state === 'subscription-required') return 'Subscription upgrade required';
  if (state === 'admin-only') return 'Admin only';
  if (state === 'disabled') return 'Disabled for rollout';
  if (state === 'beta') return 'Beta';
  if (state === 'experimental') return 'Experimental';
  return '';
}

function assetActionLabel(asset) {
  const state = asset?.access?.state || asset?.entitlementStatus;
  if (state === 'subscription-required') return 'Upgrade plan';
  if (state === 'admin-only') return 'Admin only';
  if (state === 'disabled') return 'Unavailable';
  if (asset?.isLaunchable === false) return 'Request access';
  return 'Open';
}

function compactList(items = [], limit = 4) {
  const visible = items.filter(Boolean).slice(0, limit);
  const remaining = Math.max(0, items.filter(Boolean).length - visible.length);
  return remaining ? `${visible.join(', ')} +${remaining} more` : visible.join(', ');
}

function BuilderMetric({ label, value }) {
  return (
    <Card className="commercial-card">
      <span className="commercial-muted">{label}</span>
      <div className="commercial-metric-value">{value}</div>
    </Card>
  );
}

function ProductizationList({ title, items = [] }) {
  if (!items?.length) return null;
  return (
    <Card className="commercial-card">
      <h2>{title}</h2>
      <ul className="commercial-compact-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Card>
  );
}

export function ProductsIndexPage() {
  const { organization } = useUserIdentity();
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    ProductCatalogApi.listProductBuilder(organization?.id)
      .then(setProducts)
      .catch((e) => setError(e.message));
  }, [organization?.id]);

  return (
    <PageShell
      title="CareDroid Products"
      subtitle="Sellable hospital solutions packaged as Product → Asset Packs → Assets → Routes → Backend Services."
      actions={
        <>
          <Link to="/asset-packs">
            <Button variant="secondary">View asset packs</Button>
          </Link>
          <Link to="/plans">
            <Button variant="secondary">Compare plans</Button>
          </Link>
        </>
      }
    >
      {error && <p className="commercial-subtitle">{error}</p>}
      <div className="commercial-metric">
        <BuilderMetric label="Products" value={products.length} />
        <BuilderMetric
          label="Asset packs"
          value={new Set(products.flatMap((row) => row.product?.packIds || [])).size}
        />
        <BuilderMetric
          label="Assets"
          value={new Set(products.flatMap((row) => row.assets?.map((asset) => asset.id) || [])).size}
        />
      </div>
      <div className="commercial-grid">
        {products.map((row) => (
          <Card key={row.product.id} className="commercial-card">
            <h2>{row.product.name}</h2>
            <p>{row.product.description}</p>
            {row.product.pricingTierPlaceholder && (
              <p>
                <strong>{row.product.pricingTierPlaceholder}</strong> pricing placeholder
              </p>
            )}
            <ChipList items={row.product.targetBuyers || []} />
            <p>
              <strong>{row.packs?.length || 0}</strong> packs ·{' '}
              <strong>{row.assets?.length || 0}</strong> assets ·{' '}
              <strong>{row.routes?.length || 0}</strong> routes
            </p>
            <p>
              <strong>Packs:</strong> {compactList(row.packs?.map((pack) => pack.name) || [])}
            </p>
            <p>
              <strong>Backend:</strong> {compactList(row.backendServices || [])}
            </p>
            <Link to={`/products/${row.product.slug}`}>
              <Button variant="primary">View product</Button>
            </Link>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

export function ProductDetailPage() {
  const { slug } = useParams();
  const { organization } = useUserIdentity();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    ProductCatalogApi.getProductBuilder(slug, organization?.id)
      .then(setDetail)
      .catch((e) => setError(e.message));
  }, [slug, organization?.id]);

  if (error) {
    return (
      <PageShell title="Product" subtitle={error}>
        <Link to="/products">← Back to products</Link>
      </PageShell>
    );
  }

  if (!detail) {
    return <PageShell title="Loading…" />;
  }

  const { product, packs, assets, routes, backendServices } = detail;
  const launchAsset = (asset) => {
    applyRegistryToolLaunch(asset.id, {
      navigate,
      replace: false,
      state: { source: 'product-detail', productSlug: product.slug },
    });
  };

  return (
    <PageShell
      title={product.name}
      subtitle={product.description}
      actions={
        <Link to="/onboarding">
          <Button variant="primary">Deploy for my hospital</Button>
        </Link>
      }
    >
      <Card className="commercial-card" style={{ marginBottom: 16 }}>
        <h2>Solution packs</h2>
        <ul>
          {packs.map((p) => (
            <li key={p.id}>
              {p.name}
              {p.requiredDependencies?.length > 0 && (
                <span className="commercial-muted">
                  {' '}
                  depends on {p.requiredDependencies.join(', ')}
                </span>
              )}
            </li>
          ))}
        </ul>
        {product.pricingTierPlaceholder && (
          <p>
            <strong>Pricing tier placeholder:</strong> {product.pricingTierPlaceholder}
          </p>
        )}
        <ChipList items={product.readinessLabels || []} />
        {product.targetBuyers?.length > 0 && (
          <>
            <h2 style={{ marginTop: 16 }}>Target buyers</h2>
            <ChipList items={product.targetBuyers} />
          </>
        )}
        {product.targetUsers?.length > 0 && (
          <>
            <h2 style={{ marginTop: 16 }}>Target users</h2>
            <ChipList items={product.targetUsers} />
          </>
        )}
        {product.outcomes?.length > 0 && (
          <>
            <h2 style={{ marginTop: 16 }}>Outcomes</h2>
            <ul>
              {product.outcomes.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </>
        )}
      </Card>
      <div className="commercial-grid" style={{ marginBottom: 16 }}>
        <ProductizationList
          title="Required backend capabilities"
          items={product.requiredBackendCapabilities}
        />
        <ProductizationList title="Required integrations" items={product.requiredIntegrations} />
        <ProductizationList title="AI workflows" items={product.aiWorkflows} />
        <ProductizationList title="Dashboards" items={product.dashboards} />
      </div>
      <div className="commercial-grid" style={{ marginBottom: 16 }}>
        <ProductizationList title="Routes" items={(routes || []).map((r) => `${r.route} (${r.assetId})`)} />
        <ProductizationList title="Backend services" items={backendServices || []} />
      </div>
      {(packs || []).map((pack) => (
        <Card key={pack.id} className="commercial-card" style={{ marginBottom: 12 }}>
          <h2>{pack.name}</h2>
          <p>{pack.description}</p>
          <p>
            {pack.assetIds?.length || 0} assets · {pack.pricingTier} tier
          </p>
          <ul>
            {(pack.assets || []).map((a) => (
              <li key={a.id}>
                {a.title || a.id}
                {assetAccessCopy(a) && (
                  <span className="commercial-muted"> · {assetAccessCopy(a)}</span>
                )}
                {(a.route || a.isLaunchable === false) && (
                  <Button
                    variant={a.isLaunchable === false ? 'secondary' : 'ghost'}
                    style={{ marginLeft: 8 }}
                    disabled={a.isLaunchable === false}
                    onClick={() => launchAsset(a)}
                  >
                    {assetActionLabel(a)}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ))}
      <Card className="commercial-card" style={{ marginBottom: 12 }}>
        <h2>All product assets</h2>
        <p>{assets?.length || 0} assets included through product packs and highlights.</p>
        <ChipList items={(assets || []).map((asset) => asset.id)} />
      </Card>
      <Link to="/products">← All products</Link>
    </PageShell>
  );
}

export function AssetPacksBuilderPage() {
  const { organization } = useUserIdentity();
  const [packs, setPacks] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    ProductCatalogApi.listAssetPackBuilder(organization?.id)
      .then(setPacks)
      .catch((e) => setError(e.message));
  }, [organization?.id]);

  return (
    <PageShell
      title="Asset Pack Builder"
      subtitle="Package assets into reusable sellable packs and see the products each pack powers."
      actions={
        <Link to="/configuration-studio">
          <Button variant="secondary">Open configuration studio</Button>
        </Link>
      }
    >
      {error && <p className="commercial-subtitle">{error}</p>}
      <div className="commercial-metric">
        <BuilderMetric label="Packs" value={packs.length} />
        <BuilderMetric
          label="Assets"
          value={new Set(packs.flatMap((pack) => pack.assetIds || [])).size}
        />
        <BuilderMetric
          label="Products"
          value={new Set(packs.flatMap((pack) => pack.products?.map((p) => p.id) || [])).size}
        />
      </div>
      <div className="commercial-grid">
        {packs.map((pack) => (
          <Card key={pack.id} className="commercial-card">
            <h2>{pack.name}</h2>
            <p>{pack.description}</p>
            <p>
              {pack.assetIds?.length || 0} assets · {pack.pricingTier} tier
            </p>
            {pack.requiredDependencies?.length > 0 && (
              <p>
                <strong>Depends on:</strong> {pack.requiredDependencies.join(', ')}
              </p>
            )}
            <p>
              <strong>Products:</strong>{' '}
              {compactList(pack.products?.map((product) => product.name) || []) || 'Not mapped yet'}
            </p>
            <p>
              <strong>Routes:</strong>{' '}
              {compactList((pack.assets || []).map((asset) => asset.route).filter(Boolean))}
            </p>
            <p>
              <strong>Backend:</strong>{' '}
              {compactList([...new Set((pack.assets || []).flatMap((asset) => asset.backendServices || []))])}
            </p>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

export function CommercialPlansPage() {
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    ProductCatalogApi.listCommercialPlans().then(setPlans).catch(() => setPlans([]));
  }, []);

  return (
    <PageShell
      title="Commercial plans"
      subtitle="Starter, Professional, Enterprise, Academic, and Government packaging."
    >
      <div className="commercial-grid">
        {plans.map((plan) => (
          <Card key={plan.id} className="commercial-card">
            <h2>{plan.name}</h2>
            <p>{plan.description}</p>
            <p>
              {plan.includedPackIds?.length || 0} packs · {plan.includedProductIds?.length || 0}{' '}
              products
            </p>
            <Link to="/onboarding">
              <Button variant="primary">Start with {plan.name}</Button>
            </Link>
          </Card>
        ))}
      </div>
      <div style={{ marginTop: 20 }}>
        <Link to="/products">View product catalog →</Link>
      </div>
    </PageShell>
  );
}

export function SpecialtiesIndexPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    ProductCatalogApi.listSpecialties().then(setItems).catch(() => setItems([]));
  }, []);

  return (
    <PageShell title="Specialty marketplace" subtitle="Discover CareDroid by clinical specialty.">
      <div className="commercial-grid">
        {items.map((s) => (
          <Card key={s.id} className="commercial-card">
            <h2>{s.name}</h2>
            <p>{s.description}</p>
            <Link to={`/specialties/${s.slug}`}>
              <Button variant="primary">Explore</Button>
            </Link>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

export function SpecialtyDetailPage() {
  const { slug } = useParams();
  const [specialty, setSpecialty] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!slug) return;
    ProductCatalogApi.getSpecialty(slug).then(setSpecialty).catch(() => setSpecialty(null));
  }, [slug]);

  if (!specialty) return <PageShell title="Loading…" />;

  const launchAsset = (asset) => {
    if (asset?.route) {
      navigate(asset.route);
      return;
    }
    const plan = getRegistryToolNavigation(asset.id);
    if (plan?.pathname) navigate(`${plan.pathname}${plan.search || ''}`);
  };

  return (
    <PageShell title={specialty.name} subtitle={specialty.description}>
      <div className="commercial-grid">
        {(specialty.assets || []).map((asset) => (
          <Card key={asset.id} className="commercial-card">
            <h2>{asset.title || asset.id}</h2>
            <p>{asset.assetType}</p>
            <Button variant="primary" onClick={() => launchAsset(asset)}>
              Launch
            </Button>
          </Card>
        ))}
      </div>
      {specialty.defaultAiAgentId && (
        <div className="commercial-actions">
          <Link to={`/assistant?agent=${specialty.defaultAiAgentId}`}>
            <Button variant="secondary">Open specialty AI</Button>
          </Link>
        </div>
      )}
      <Link to="/specialties">← Specialties</Link>
    </PageShell>
  );
}

export function CarePathwaysIndexPage() {
  const [pathways, setPathways] = useState([]);

  useEffect(() => {
    ProductCatalogApi.listCarePathways().then(setPathways).catch(() => setPathways([]));
  }, []);

  return (
    <PageShell title="Care pathways" subtitle="Outcome-oriented clinical pathways.">
      <div className="commercial-grid">
        {pathways.map((p) => (
          <Card key={p.id} className="commercial-card">
            <h2>{p.name}</h2>
            <p>{p.description}</p>
            <Link to={`/care-pathways/${p.slug}`}>
              <Button variant="primary">Start pathway</Button>
            </Link>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

export function CarePathwayDetailPage() {
  const { slug } = useParams();
  const [pathway, setPathway] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!slug) return;
    ProductCatalogApi.getCarePathway(slug).then(setPathway).catch(() => setPathway(null));
  }, [slug]);

  if (!pathway) return <PageShell title="Loading…" />;

  return (
    <PageShell title={pathway.name} subtitle={pathway.description}>
      {(pathway.steps || []).map((step, idx) => (
        <div key={`${step.type}-${step.assetId}-${idx}`} className="commercial-pathway-step">
          <strong>
            Step {idx + 1}: {step.type}
          </strong>
          <p>{step.asset?.title || step.assetId}</p>
          <Button
            variant="primary"
            onClick={() => {
              const route = step.asset?.route;
              if (route) navigate(route);
              else {
                const plan = getRegistryToolNavigation(step.assetId);
                if (plan?.pathname) navigate(`${plan.pathname}${plan.search || ''}`);
              }
            }}
          >
            Open step
          </Button>
        </div>
      ))}
      {pathway.aiAgentId && (
        <Link to={`/assistant?agent=${pathway.aiAgentId}`}>
          <Button variant="secondary">AI guidance</Button>
        </Link>
      )}
      <div style={{ marginTop: 16 }}>
        <Link to="/care-pathways">← Pathways</Link>
      </div>
    </PageShell>
  );
}

export function AgentsRegistryPage() {
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    ProductCatalogApi.listAgents().then(setAgents).catch(() => setAgents([]));
  }, []);

  return (
    <PageShell
      title="AI agent registry"
      subtitle="Domain experts via the common assistant gateway."
    >
      <div className="commercial-grid">
        {agents.map((agent) => (
          <Card key={agent.id} className="commercial-card">
            <h2>{agent.title}</h2>
            <p>{agent.gatewayNote}</p>
            <Link to={`/assistant?agent=${agent.id}`}>
              <Button variant="primary">Open agent</Button>
            </Link>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

export function MaturityAssessmentPage() {
  const { organization } = useUserIdentity();
  const [questionnaire, setQuestionnaire] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  useEffect(() => {
    ProductCatalogApi.getMaturityQuestionnaire()
      .then((data) => setQuestionnaire(data))
      .catch(() => setQuestionnaire(null));
  }, []);

  const submit = async () => {
    const payload = Object.entries(answers).map(([questionId, value]) => ({
      questionId,
      value: Number(value),
    }));
    const res = await ProductCatalogApi.submitMaturityAssessment(
      payload,
      organization?.id
    );
    setResult(res);
  };

  if (result) {
    return (
      <PageShell title="Maturity results" subtitle={`Overall score: ${result.overallScore}/100`}>
        <div className="commercial-metric">
          {(result.dimensions || []).map((d) => (
            <Card key={d.dimension} className="commercial-card">
              <div className="commercial-metric-value">{d.score}</div>
              <p>{d.dimension.replace(/_/g, ' ')}</p>
            </Card>
          ))}
        </div>
        <h2>Recommended products</h2>
        <div className="commercial-grid">
          {(result.recommendedProducts || []).map((p) => (
            <Card key={p.id} className="commercial-card">
              <h2>{p.name}</h2>
              <Link to={`/products/${p.slug}`}>
                <Button variant="primary">View</Button>
              </Link>
            </Card>
          ))}
        </div>
        <Link to="/onboarding">
          <Button variant="secondary">Configure deployment</Button>
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell title="Hospital maturity assessment" subtitle="Consultative product recommendations.">
      {(questionnaire?.questions || []).map((q) => (
        <Card key={q.id} className="commercial-card" style={{ marginBottom: 12 }}>
          <h2>{q.question}</h2>
          <div className="commercial-chip-list">
            {(q.options || []).map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`commercial-chip ${answers[q.id] === opt.value ? 'selected' : ''}`}
                onClick={() => setAnswers({ ...answers, [q.id]: opt.value })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Card>
      ))}
      <Button variant="primary" onClick={submit}>
        Get recommendations
      </Button>
    </PageShell>
  );
}

export function OutcomesDashboardPage() {
  const { organization } = useUserIdentity();
  const [outcomes, setOutcomes] = useState(null);

  useEffect(() => {
    if (!organization?.id) return;
    ProductCatalogApi.getOrganizationOutcomes(organization.id)
      .then(setOutcomes)
      .catch(() => setOutcomes(null));
  }, [organization?.id]);

  if (!organization?.id) {
    return (
      <PageShell title="Outcomes" subtitle="Link an organization to view leadership metrics.">
        <Link to="/onboarding">
          <Button variant="primary">Set up organization</Button>
        </Link>
      </PageShell>
    );
  }

  if (!outcomes) return <PageShell title="Loading outcomes…" />;

  return (
    <PageShell title="Outcome tracking" subtitle="Value metrics for hospital leadership.">
      <div className="commercial-metric">
        <Card className="commercial-card">
          <div className="commercial-metric-value">{outcomes.adoption?.enabledPackCount}</div>
          <p>Enabled packs</p>
        </Card>
        <Card className="commercial-card">
          <div className="commercial-metric-value">{outcomes.aiUsage?.sessionCount}</div>
          <p>AI sessions</p>
        </Card>
        <Card className="commercial-card">
          <div className="commercial-metric-value">
            {outcomes.simulation?.completionCount}
          </div>
          <p>Simulations completed</p>
        </Card>
        <Card className="commercial-card">
          <div className="commercial-metric-value">{outcomes.workflows?.completionCount}</div>
          <p>Workflows completed</p>
        </Card>
        <Card className="commercial-card">
          <div className="commercial-metric-value">{outcomes.operational?.toolLaunchCount}</div>
          <p>Tool launches</p>
        </Card>
        <Card className="commercial-card">
          <div className="commercial-metric-value">
            {outcomes.protocolCompliance?.protocolViews ?? '—'}
          </div>
          <p>Protocol views</p>
        </Card>
      </div>
      <Card className="commercial-card">
        <h2>Top tools</h2>
        <ul>
          {(outcomes.operational?.topTools || []).map((t) => (
            <li key={t.resource}>
              {t.resource}: {t.count}
            </li>
          ))}
        </ul>
      </Card>
    </PageShell>
  );
}

export function IntegrationsMarketplacePage() {
  const { organization } = useUserIdentity();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    ProductCatalogApi.listIntegrations().then(setItems).catch(() => setItems([]));
  }, []);

  const request = async (slug) => {
    if (!organization?.id) {
      setStatus('Create an organization first.');
      return;
    }
    try {
      await ProductCatalogApi.requestIntegration(organization.id, slug);
      setStatus(`Requested: ${slug}`);
    } catch (e) {
      setStatus(e.message);
    }
  };

  return (
    <PageShell
      title="Integration marketplace"
      subtitle="Browse connectors and request enablement for your tenant."
    >
      {status && <p className="commercial-subtitle">{status}</p>}
      <div className="commercial-grid">
        {items.map((item) => (
          <Card key={item.id} className="commercial-card">
            <h2>{item.name}</h2>
            <p>
              {item.category} · {item.status}
            </p>
            <p>{item.description}</p>
            <Button variant="primary" onClick={() => request(item.slug)}>
              Request enablement
            </Button>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

export function ConfigurationStudioPage() {
  const { organization, refreshPlatformContext } = useUserIdentity();
  const [hiddenNavIds, setHiddenNavIds] = useState('');
  const [primaryLanding, setPrimaryLanding] = useState('/dashboard');
  const [accentColor, setAccentColor] = useState('');
  const [enabledAgents, setEnabledAgents] = useState('');
  const [enabledProductIds, setEnabledProductIds] = useState([]);
  const [productGraphs, setProductGraphs] = useState([]);
  const [packGraphs, setPackGraphs] = useState([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const settings = organization?.settings || {};
    const nav = settings.navigation || settings.configuration?.navigation || {};
    if (nav.hiddenNavIds?.length) {
      setHiddenNavIds(nav.hiddenNavIds.join(', '));
    }
    if (nav.primaryLanding) setPrimaryLanding(nav.primaryLanding);
    if (settings.enabledAgentIds?.length) {
      setEnabledAgents(settings.enabledAgentIds.join(', '));
    }
    const productIds = settings.enabledProductIds || settings.configuration?.enabledProductIds || [];
    setEnabledProductIds(productIds);
    if (organization?.branding?.accentColor) {
      setAccentColor(organization.branding.accentColor);
    }
  }, [organization?.id, organization?.settings, organization?.branding]);

  useEffect(() => {
    ProductCatalogApi.listProductBuilder(organization?.id)
      .then(setProductGraphs)
      .catch(() => setProductGraphs([]));
    ProductCatalogApi.listAssetPackBuilder(organization?.id)
      .then(setPackGraphs)
      .catch(() => setPackGraphs([]));
  }, [organization?.id]);

  const selectedProducts = productGraphs.filter((row) => enabledProductIds.includes(row.product.id));
  const selectedPackIds = new Set(selectedProducts.flatMap((row) => row.product.packIds || []));
  const selectedPacks = packGraphs.filter((pack) => selectedPackIds.has(pack.id));
  const selectedAssets = new Set(selectedPacks.flatMap((pack) => pack.assetIds || []));

  const toggleProduct = (productId) => {
    setEnabledProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const save = async () => {
    if (!organization?.id) return;
    try {
      await ProductCatalogApi.updateOrganizationConfiguration(organization.id, {
        navigation: {
          hiddenNavIds: hiddenNavIds
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          primaryLanding,
        },
        branding: accentColor ? { accentColor } : undefined,
        enabledAgentIds: enabledAgents
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        enabledProductIds,
      });
      setStatus('Configuration saved.');
      refreshPlatformContext?.();
    } catch (e) {
      setStatus(e.message);
    }
  };

  if (!organization?.id) {
    return (
      <PageShell title="Configuration studio" subtitle="Admin-only tenant configuration.">
        <Link to="/onboarding">
          <Button variant="primary">Create organization</Button>
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell title="Platform configuration studio" subtitle={organization.name}>
      {status && <p className="commercial-subtitle">{status}</p>}
      <Card className="commercial-card">
        <div className="commercial-form-row">
          <label>Hidden nav IDs (comma-separated)</label>
          <input value={hiddenNavIds} onChange={(e) => setHiddenNavIds(e.target.value)} />
        </div>
        <div className="commercial-form-row">
          <label>Primary landing route</label>
          <input value={primaryLanding} onChange={(e) => setPrimaryLanding(e.target.value)} />
        </div>
        <div className="commercial-form-row">
          <label>Accent color</label>
          <input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
        </div>
        <div className="commercial-form-row">
          <label>Enabled agent IDs</label>
          <input value={enabledAgents} onChange={(e) => setEnabledAgents(e.target.value)} />
        </div>
        <div className="commercial-form-row">
          <label>Enabled products</label>
          <div className="commercial-chip-list">
            {productGraphs.map((row) => (
              <button
                key={row.product.id}
                type="button"
                className={`commercial-chip ${
                  enabledProductIds.includes(row.product.id) ? 'selected' : ''
                }`}
                onClick={() => toggleProduct(row.product.id)}
              >
                {row.product.name}
              </button>
            ))}
          </div>
        </div>
        <Button variant="primary" onClick={save}>
          Save configuration
        </Button>
      </Card>
      <div className="commercial-grid" style={{ marginTop: 16 }}>
        <BuilderMetric label="Selected products" value={selectedProducts.length} />
        <BuilderMetric label="Selected packs" value={selectedPacks.length} />
        <BuilderMetric label="Selected assets" value={selectedAssets.size} />
      </div>
      <Card className="commercial-card" style={{ marginTop: 16 }}>
        <h2>Packaging preview</h2>
        {selectedProducts.length === 0 ? (
          <p>Select products to preview their packs, assets, routes, and services.</p>
        ) : (
          selectedProducts.map((row) => (
            <div key={row.product.id} className="commercial-pathway-step">
              <h3>{row.product.name}</h3>
              <p>
                <strong>Packs:</strong> {compactList(row.packs?.map((pack) => pack.name) || [], 8)}
              </p>
              <p>
                <strong>Routes:</strong> {compactList(row.routes?.map((route) => route.route) || [], 8)}
              </p>
              <p>
                <strong>Backend:</strong> {compactList(row.backendServices || [], 8)}
              </p>
            </div>
          ))
        )}
      </Card>
      <div className="commercial-actions">
        <Link to="/asset-packs">
          <Button variant="secondary">Manage packs</Button>
        </Link>
        <Link to="/settings/organization/assets">
          <Button variant="secondary">Asset lifecycle</Button>
        </Link>
      </div>
    </PageShell>
  );
}

const ONBOARDING_STEPS = [
  'Organization type',
  'Departments',
  'Workspaces',
  'User roles',
  'Asset packs',
  'Integrations',
  'Branding',
  'Compliance mode',
  'Review and activate',
];

const COMPLIANCE_MODES = [
  { id: 'standard', label: 'Standard healthcare' },
  { id: 'hipaa', label: 'HIPAA-ready' },
  { id: 'research', label: 'Research governance' },
  { id: 'ems', label: 'EMS operations' },
  { id: 'enterprise', label: 'Enterprise governance' },
];

const TENANT_PRESETS = {
  hospital: {
    departments: ['Emergency', 'ICU', 'Laboratory', 'Operations', 'Administration'],
    packIds: ['core-platform', 'emergency-medicine', 'laboratory-intelligence', 'hospital-operations'],
    integrationSlugs: ['fhir-patient', 'hl7-adt', 'laboratory-interface', 'identity-sso'],
    complianceMode: 'hipaa',
    defaultRoleProfileId: 'emergency-physician',
    workspaceSetups: [
      {
        name: 'Clinical Operations',
        type: 'hospital',
        enabledToolIds: ['calculators', 'drug-check', 'lab-interp', 'protocols', 'hospital-map'],
        enabledModules: ['dashboard', 'tools', 'maps', 'medical-iot'],
      },
      {
        name: 'Emergency Command',
        type: 'emergency',
        enabledToolIds: ['emergency-protocols', 'trauma-score', 'sofa-score', 'hospital-map'],
        enabledModules: ['dashboard', 'alerts', 'maps', 'audit'],
        emergencyModeEnabled: true,
      },
    ],
  },
  clinic: {
    departments: ['Operations', 'Pharmacy', 'Administration'],
    packIds: ['core-platform', 'laboratory-intelligence', 'cardiology-pack'],
    integrationSlugs: ['fhir-patient', 'identity-sso', 'scheduling'],
    complianceMode: 'hipaa',
    defaultRoleProfileId: 'nurse',
    workspaceSetups: [
      {
        name: 'Clinic Workspace',
        type: 'hospital',
        enabledToolIds: ['calculators', 'drug-check', 'lab-interp', 'protocols'],
        enabledModules: ['dashboard', 'tools', 'calculators'],
      },
    ],
  },
  ems: {
    departments: ['Emergency', 'Operations', 'Administration'],
    packIds: ['core-platform', 'emergency-medicine', 'fleet-logistics'],
    integrationSlugs: ['identity-sso', 'scheduling'],
    complianceMode: 'ems',
    defaultRoleProfileId: 'fleet-operator',
    workspaceSetups: [
      {
        name: 'EMS Command',
        type: 'emergency',
        enabledToolIds: ['emergency-protocols', 'trauma-score', 'fleet-live-map'],
        enabledModules: ['dashboard', 'alerts', 'fleet', 'maps'],
        emergencyModeEnabled: true,
      },
      {
        name: 'Fleet Operations',
        type: 'fleet',
        enabledToolIds: ['fleet-dashboard', 'fleet-live-map', 'route-optimizer', 'predictive-maintenance'],
        enabledModules: ['fleet', 'live-tracking', 'operations'],
      },
    ],
  },
};

export function OrganizationOnboardingPage() {
  const navigate = useNavigate();
  const { refreshPlatformContext } = useUserIdentity();
  const [step, setStep] = useState(0);
  const [packs, setPacks] = useState([]);
  const [productGraphs, setProductGraphs] = useState([]);
  const [roleProfiles, setRoleProfiles] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    slug: '',
    organizationType: 'hospital',
    country: '',
    departments: TENANT_PRESETS.hospital.departments,
    packIds: TENANT_PRESETS.hospital.packIds,
    productIds: [],
    commercialPlanId: '',
    integrationSlugs: TENANT_PRESETS.hospital.integrationSlugs,
    defaultRoleProfileId: TENANT_PRESETS.hospital.defaultRoleProfileId,
    roleAssignments: [],
    workspaceSetups: TENANT_PRESETS.hospital.workspaceSetups,
    branding: {
      displayName: '',
      accentColor: '',
      logoUrl: '',
    },
    complianceMode: TENANT_PRESETS.hospital.complianceMode,
  });

  useEffect(() => {
    PlatformAssetsApi.listPacks().then(setPacks).catch(() => setPacks([]));
    PlatformAssetsApi.listRoleProfiles().then(setRoleProfiles).catch(() => setRoleProfiles([]));
    ProductCatalogApi.listProductBuilder().then(setProductGraphs).catch(() => setProductGraphs([]));
  }, []);

  const toggle = (key, value) => {
    setForm((prev) => {
      const set = new Set(prev[key]);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      return { ...prev, [key]: [...set] };
    });
  };

  const applyTenantPreset = (organizationType) => {
    const preset = TENANT_PRESETS[organizationType] || TENANT_PRESETS.hospital;
    setForm((prev) => ({
      ...prev,
      organizationType,
      departments: preset.departments,
      packIds: preset.packIds,
      integrationSlugs: preset.integrationSlugs,
      defaultRoleProfileId: preset.defaultRoleProfileId,
      workspaceSetups: preset.workspaceSetups,
      complianceMode: preset.complianceMode,
    }));
  };

  const updateWorkspace = (index, patch) => {
    setForm((prev) => ({
      ...prev,
      workspaceSetups: prev.workspaceSetups.map((workspace, idx) =>
        idx === index ? { ...workspace, ...patch } : workspace
      ),
    }));
  };

  const addWorkspace = () => {
    setForm((prev) => ({
      ...prev,
      workspaceSetups: [
        ...prev.workspaceSetups,
        {
          name: 'New Workspace',
          type: 'hospital',
          enabledToolIds: ['calculators', 'drug-check'],
          enabledModules: ['dashboard', 'tools'],
        },
      ],
    }));
  };

  const removeWorkspace = (index) => {
    setForm((prev) => ({
      ...prev,
      workspaceSetups: prev.workspaceSetups.filter((_, idx) => idx !== index),
    }));
  };

  const updateBranding = (patch) => {
    setForm((prev) => ({
      ...prev,
      branding: { ...prev.branding, ...patch },
    }));
  };

  const selectedProductGraphs = productGraphs.filter((row) => form.productIds.includes(row.product.id));
  const selectedPackIds = new Set([
    ...form.packIds,
    ...selectedProductGraphs.flatMap((row) => row.product.packIds || []),
  ]);
  const selectedPacks = packs.filter((pack) => selectedPackIds.has(pack.id));

  const finish = async () => {
    setError('');
    try {
      const slug = form.slug || form.name.toLowerCase().replace(/\s+/g, '-');
      const branding = {
        ...form.branding,
        displayName: form.branding.displayName || form.name,
      };
      await ProductCatalogApi.completeOnboarding({
        name: form.name,
        slug,
        organizationType: form.organizationType,
        country: form.country,
        departments: form.departments,
        packIds: form.packIds,
        productIds: form.productIds,
        enabledProductIds: form.productIds,
        commercialPlanId: form.commercialPlanId || undefined,
        integrationSlugs: form.integrationSlugs,
        defaultRoleProfileId: form.defaultRoleProfileId,
        roleAssignments: form.roleAssignments,
        workspaceSetups: form.workspaceSetups,
        branding,
        complianceMode: form.complianceMode,
      });
      await refreshPlatformContext?.();
      navigate('/organization');
    } catch (e) {
      setError(e.message);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <>
            <div className="commercial-form-row">
              <label>Organization name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="commercial-form-row">
              <label>Slug</label>
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="my-hospital"
              />
            </div>
            <div className="commercial-form-row">
              <label>Type</label>
              <select
                value={form.organizationType}
                onChange={(e) => applyTenantPreset(e.target.value)}
              >
                {['hospital', 'clinic', 'ems'].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <p className="commercial-subtitle">
              Selecting hospital, clinic, or EMS applies editable defaults for departments,
              workspaces, packs, integrations, and compliance.
            </p>
          </>
        );
      case 1:
        return (
          <div className="commercial-chip-list">
            {DEPARTMENT_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                className={`commercial-chip ${form.departments.includes(d) ? 'selected' : ''}`}
                onClick={() => toggle('departments', d)}
              >
                {d}
              </button>
            ))}
          </div>
        );
      case 2:
        return (
          <>
            {form.workspaceSetups.map((workspace, index) => (
              <div key={`${workspace.name}-${index}`} className="commercial-pathway-step">
                <div className="commercial-form-row">
                  <label>Workspace name</label>
                  <input
                    value={workspace.name}
                    onChange={(e) => updateWorkspace(index, { name: e.target.value })}
                  />
                </div>
                <div className="commercial-form-row">
                  <label>Workspace type</label>
                  <select
                    value={workspace.type}
                    onChange={(e) => updateWorkspace(index, { type: e.target.value })}
                  >
                    {['hospital', 'emergency', 'fleet', 'research', 'admin', 'personal'].map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="commercial-form-row">
                  <label>Enabled tools (comma-separated)</label>
                  <input
                    value={(workspace.enabledToolIds || []).join(', ')}
                    onChange={(e) =>
                      updateWorkspace(index, {
                        enabledToolIds: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </div>
                <div className="commercial-form-row">
                  <label>Enabled modules (comma-separated)</label>
                  <input
                    value={(workspace.enabledModules || []).join(', ')}
                    onChange={(e) =>
                      updateWorkspace(index, {
                        enabledModules: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </div>
                <label className="commercial-muted">
                  <input
                    type="checkbox"
                    checked={Boolean(workspace.emergencyModeEnabled)}
                    onChange={(e) => updateWorkspace(index, { emergencyModeEnabled: e.target.checked })}
                  />{' '}
                  Emergency mode
                </label>
                {form.workspaceSetups.length > 1 && (
                  <div className="commercial-actions">
                    <Button variant="secondary" onClick={() => removeWorkspace(index)}>
                      Remove workspace
                    </Button>
                  </div>
                )}
              </div>
            ))}
            <Button variant="secondary" onClick={addWorkspace}>
              Add workspace
            </Button>
          </>
        );
      case 3:
        return (
          <>
            <div className="commercial-form-row">
              <label>Default role profile</label>
              <select
                value={form.defaultRoleProfileId}
                onChange={(e) => setForm({ ...form, defaultRoleProfileId: e.target.value })}
              >
                {roleProfiles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
                {roleProfiles.length === 0 &&
                  PROFILE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
              </select>
            </div>
            <p className="commercial-subtitle">
              Additional user invitations can be added after activation. The selected profile becomes
              the initial owner profile for this tenant.
            </p>
          </>
        );
      case 4:
        return (
          <>
            {productGraphs.length > 0 && (
              <div className="commercial-form-row">
                <label>Products</label>
                <div className="commercial-chip-list">
                  {productGraphs.map((row) => (
                    <button
                      key={row.product.id}
                      type="button"
                      className={`commercial-chip ${form.productIds.includes(row.product.id) ? 'selected' : ''}`}
                      onClick={() => toggle('productIds', row.product.id)}
                    >
                      {row.product.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="commercial-form-row">
              <label>Asset packs</label>
              <div className="commercial-chip-list">
                {packs.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`commercial-chip ${form.packIds.includes(p.id) ? 'selected' : ''}`}
                    onClick={() => toggle('packIds', p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            <p className="commercial-subtitle">
              Selected products add their packs automatically. Explicit pack selections can refine
              the tenant launch package.
            </p>
          </>
        );
      case 5:
        return (
          <div className="commercial-chip-list">
            {INTEGRATION_OPTIONS.map((i) => (
              <button
                key={i}
                type="button"
                className={`commercial-chip ${form.integrationSlugs.includes(i) ? 'selected' : ''}`}
                onClick={() => toggle('integrationSlugs', i)}
              >
                {i}
              </button>
            ))}
          </div>
        );
      case 6:
        return (
          <>
            <div className="commercial-form-row">
              <label>Display name</label>
              <input
                value={form.branding.displayName}
                placeholder={form.name || 'CareDroid tenant'}
                onChange={(e) => updateBranding({ displayName: e.target.value })}
              />
            </div>
            <div className="commercial-form-row">
              <label>Accent color</label>
              <input
                value={form.branding.accentColor}
                placeholder="#00ff88"
                onChange={(e) => updateBranding({ accentColor: e.target.value })}
              />
            </div>
            <div className="commercial-form-row">
              <label>Logo URL</label>
              <input
                value={form.branding.logoUrl}
                placeholder="https://example.org/logo.svg"
                onChange={(e) => updateBranding({ logoUrl: e.target.value })}
              />
            </div>
          </>
        );
      case 7:
        return (
          <div className="commercial-chip-list">
            {COMPLIANCE_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={`commercial-chip ${form.complianceMode === mode.id ? 'selected' : ''}`}
                onClick={() => setForm({ ...form, complianceMode: mode.id })}
              >
                {mode.label}
              </button>
            ))}
          </div>
        );
      case 8:
        return (
          <div className="commercial-grid">
            <ProductizationList
              title="Tenant"
              items={[
                `${form.name || 'Unnamed tenant'} (${form.organizationType})`,
                `Slug: ${form.slug || form.name.toLowerCase().replace(/\s+/g, '-') || 'pending'}`,
                `Compliance: ${form.complianceMode}`,
              ]}
            />
            <ProductizationList title="Departments" items={form.departments} />
            <ProductizationList
              title="Workspaces"
              items={form.workspaceSetups.map(
                (workspace) =>
                  `${workspace.name} (${workspace.type}) - ${(workspace.enabledModules || []).join(', ')}`
              )}
            />
            <ProductizationList
              title="Products and packs"
              items={[
                ...selectedProductGraphs.map((row) => row.product.name),
                ...selectedPacks.map((pack) => pack.name),
              ]}
            />
            <ProductizationList title="Integrations" items={form.integrationSlugs} />
            <ProductizationList
              title="Branding"
              items={[
                `Display: ${form.branding.displayName || form.name || 'Default'}`,
                `Accent: ${form.branding.accentColor || 'Default'}`,
              ]}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="commercial-page">
      <header className="commercial-header">
        <h1>Organization onboarding</h1>
        <p className="commercial-subtitle">Configure your CareDroid deployment in minutes.</p>
      </header>
      <div className="commercial-steps">
        {ONBOARDING_STEPS.map((label, idx) => (
          <span
            key={label}
            className={`commercial-step-pill ${idx === step ? 'active' : ''}`}
          >
            {idx + 1}. {label}
          </span>
        ))}
      </div>
      <Card className="commercial-card">
        <h2>{ONBOARDING_STEPS[step]}</h2>
        {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}
        {renderStep()}
        <div className="commercial-actions">
          <Button variant="secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>
            Back
          </Button>
          {step < ONBOARDING_STEPS.length - 1 ? (
            <Button variant="primary" onClick={() => setStep(step + 1)}>
              Next
            </Button>
          ) : (
            <Button variant="primary" onClick={finish}>
              Complete setup
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

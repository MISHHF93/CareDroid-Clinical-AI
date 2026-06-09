import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Card from '../../components/ui/card';
import Button from '../../components/ui/button';
import {
  BadgeList,
  InsightCard,
  MetricCard,
  PageShell as CanonicalPageShell,
} from '../../components/ui/CareDroidPrimitives';
import { useUserIdentity } from '../../contexts/UserIdentityContext';
import { ProductCatalogApi } from '../../services/productCatalogApi';
import { PlatformAssetsApi } from '../../services/platformAssetsApi';
import {
  buildClientWorkspaceProfile,
  buildWorkspaceSetupFromRegistry,
  getCanonicalWorkspaceRegistry,
  getWorkspacePresetForOrganizationType,
  saveLocalClientProfile,
} from '../../config/workspace.config';
import { PROFILE_ROLES } from '../../data/profileToolSegmentation';
import {
  buildRoleIntelligenceProfile,
  getRoleIntelligenceAgentRecommendations,
} from '../../data/roleIntelligenceLayer';
import { buildCustomerExpansionOpportunities } from '../../data/customerExpansionEngine';
import {
  DEFAULT_HOSPITAL_READINESS_QUESTIONNAIRE,
  buildHospitalReadinessAssessment,
} from '../../data/hospitalReadinessAssessment';
import { buildProductIntelligenceLayer } from '../../data/productIntelligenceLayer';
import { applyRegistryToolLaunch, getRegistryToolNavigation } from '../../navigation/registryToolLaunch';
import { trackRoleAiRequest } from '../../services/roleIntelligenceTelemetry';
import './CommercialPages.css';

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

const INTEGRATION_OPTIONS = [
  'fhir-patient',
  'hl7-adt',
  'laboratory-interface',
  'identity-sso',
  'scheduling',
  'telehealth',
];

const SOLUTION_HOSPITAL_TYPES = [
  { id: 'hospital', label: 'Hospital' },
  { id: 'academic_medical_center', label: 'Academic medical center' },
  { id: 'health_system', label: 'Health system' },
  { id: 'government', label: 'Government hospital' },
  { id: 'ems', label: 'EMS / transport' },
  { id: 'research_institute', label: 'Research institute' },
];

const SOLUTION_DEPARTMENTS = [
  { id: 'emergency', label: 'Emergency' },
  { id: 'icu', label: 'ICU' },
  { id: 'cardiology', label: 'Cardiology' },
  { id: 'laboratory', label: 'Laboratory' },
  { id: 'operations', label: 'Operations' },
  { id: 'medical_iot', label: 'Medical IoT' },
  { id: 'fleet', label: 'Fleet / EMS' },
  { id: 'simulation', label: 'Simulation' },
  { id: 'research', label: 'Research' },
  { id: 'governance', label: 'Governance' },
];

const SOLUTION_PACK_OPTIONS = [
  'core-platform',
  'emergency-department-pack',
  'icu-pack',
  'cardiology-pack',
  'laboratory-intelligence',
  'hospital-operations',
  'medical-iot-pack',
  'fleet-logistics',
  'digital-twin-pack',
  'simulation-training-pack',
  'research-education',
  'governance-compliance-pack',
];

const SOLUTION_AGENT_OPTIONS = [
  'agent-clinical',
  'agent-emergency',
  'agent-lab',
  'agent-operations',
  'agent-fleet',
  'agent-education',
  'agent-research',
  'agent-governance',
];

function PageShell({ title, subtitle, children, actions }) {
  return (
    <CanonicalPageShell
      as="div"
      className="commercial-page"
      headerClassName="commercial-header"
      contentClassName="cd-page-stack cd-page-stack--compact commercial-page__content"
      title={title}
      description={subtitle}
      actions={actions}
    >
      {children}
    </CanonicalPageShell>
  );
}

function ChipList({ items = [] }) {
  return <BadgeList items={items} className="commercial-chip-list" itemClassName="commercial-chip" />;
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

function csvToList(value = '') {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function configJson(value, fallback) {
  return JSON.stringify(value ?? fallback, null, 2);
}

function parseConfigJson(value, label, fallback) {
  if (!value?.trim()) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
}

function BuilderMetric({ label, value }) {
  return <MetricCard label={label} value={value} className="commercial-card" />;
}

function InlineMetric({ label, value }) {
  return (
    <div className="commercial-inline-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProductizationList({ title, items = [] }) {
  if (!items?.length) return null;
  return (
    <InsightCard title={title} className="commercial-card">
      <ul className="commercial-compact-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </InsightCard>
  );
}

function InlineProductizationList({ title, items = [] }) {
  if (!items?.length) return null;
  return (
    <div className="commercial-inline-section">
      <h3>{title}</h3>
      <ul className="commercial-compact-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function CustomerExpansionOpportunitiesPage() {
  const model = useMemo(() => buildCustomerExpansionOpportunities(), []);

  return (
    <PageShell
      title="Expansion Opportunities"
      subtitle="Commercial growth recommendations based on customer segment, current pack usage, readiness evidence, and adjacent workflows."
    >
      <div className="commercial-metrics-grid">
        <BuilderMetric label="Customer segments" value={model.summary.customerSegmentCount} />
        <BuilderMetric label="Opportunities" value={model.summary.opportunityCount} />
        <BuilderMetric label="High confidence" value={model.summary.highConfidenceCount} />
        <BuilderMetric label="Recommended packs" value={model.summary.recommendedPackCount} />
      </div>

      <div className="commercial-grid">
        {model.segments.map((segment) => (
          <Card key={segment.id} className="commercial-card commercial-wide-card">
            <div className="commercial-card-header">
              <div>
                <span className="commercial-muted">{segment.segment}</span>
                <h2>{segment.segment} expansion</h2>
              </div>
              <strong>{segment.topScore}</strong>
            </div>
            <p>{segment.summary}</p>
            <p className="commercial-muted">Currently uses</p>
            <ChipList items={segment.currentPacks} />

            <div className="commercial-opportunity-list">
              {segment.opportunities.map((opportunity) => (
                <article key={opportunity.id} className="commercial-opportunity-row">
                  <div>
                    <span className="commercial-muted">{opportunity.band.label}</span>
                    <h3>{opportunity.recommendedPack}</h3>
                    <p>{opportunity.expectedOutcome}</p>
                  </div>
                  <dl className="commercial-opportunity-meta">
                    <div>
                      <dt>Motion</dt>
                      <dd>{opportunity.motion}</dd>
                    </div>
                    <div>
                      <dt>Score</dt>
                      <dd>{opportunity.score}</dd>
                    </div>
                  </dl>
                  <ul className="commercial-compact-list">
                    {opportunity.evidence.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

export function ProductIntelligenceLayerPage() {
  const layer = useMemo(() => buildProductIntelligenceLayer(), []);

  return (
    <PageShell
      title="Product Intelligence"
      subtitle="Measure SaaS product success from Product -> Pack -> Asset -> Usage -> Outcome."
    >
      <div className="commercial-metrics-grid">
        <BuilderMetric label="Products measured" value={layer.summary.productCount} />
        <BuilderMetric label="Avg adoption" value={layer.summary.averageAdoption} />
        <BuilderMetric label="Avg ROI" value={layer.summary.averageRoi} />
        <BuilderMetric label="Avg health" value={layer.summary.averageHealth} />
        <BuilderMetric label="Avg engagement" value={layer.summary.averageEngagement} />
      </div>

      <section className="commercial-section">
        <h2>Product value scorecards</h2>
        <div className="commercial-grid">
          {layer.products.map((product) => (
            <Card key={product.id} className="commercial-card">
              <span className="commercial-muted">{product.health.band.label}</span>
              <h2>{product.name}</h2>
              <div className="commercial-inline-metrics" aria-label={`${product.name} metrics`}>
                <InlineMetric label="Adoption" value={product.adoption.score} />
                <InlineMetric label="ROI" value={product.roi.score} />
                <InlineMetric label="Health" value={product.health.score} />
                <InlineMetric label="Engagement" value={product.engagement.score} />
              </div>
              <p>
                ROI ratio: {product.roi.roiRatio} · Estimated value: $
                {product.roi.estimatedValue.toLocaleString()} · Cost: $
                {product.roi.implementationCost.toLocaleString()}
              </p>
              <p>
                Usage: {product.engagement.launches} launches · {product.engagement.workflowCompletions}{' '}
                workflow completions · {product.engagement.aiAssistedActions} AI-assisted actions
              </p>
              <InlineProductizationList title="Packs" items={product.valueChain.packs} />
              <InlineProductizationList
                title="Assets"
                items={product.valueChain.assets.map((asset) => `${asset.name} (${asset.type})`)}
              />
              <InlineProductizationList
                title="Outcomes"
                items={product.valueChain.outcomes.map(
                  (outcome) => `${outcome.label}: ${outcome.valueScore}`,
                )}
              />
            </Card>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

function BuyerStakeholderSummary({ item }) {
  const rows = [
    ['Buyer persona', item?.buyerPersona],
    ['Decision maker', item?.decisionMaker],
    ['Stakeholders', item?.stakeholders],
    ['Expected outcomes', item?.expectedOutcomes],
  ].filter(([, values]) => values?.length);

  if (!rows.length) return null;

  return (
    <div className="commercial-buyer-summary">
      {rows.map(([label, values]) => (
        <p key={label}>
          <strong>{label}:</strong> {compactList(values, 6)}
        </p>
      ))}
    </div>
  );
}

function outcomeMappingsForProduct(row) {
  if (row?.outcomeMappings?.length) return row.outcomeMappings;
  const outcomes = [...new Set([...(row?.product?.expectedOutcomes || []), ...(row?.product?.outcomes || [])])];
  return outcomes.map((outcome) => ({
    outcome,
    product: row.product,
    packs: row.packs || [],
    assets: row.assets || [],
  }));
}

function pathwayLinkCount(pathway) {
  return [
    ...(pathway.calculatorAssetIds || []),
    ...(pathway.protocolAssetIds || []),
    ...(pathway.workflowAssetIds || []),
    ...(pathway.simulationAssetIds || []),
    ...(pathway.aiAgentId ? [pathway.aiAgentId] : []),
  ].length;
}

function PathwayAssetSection({ title, items = [], onOpen }) {
  return (
    <Card className="commercial-card commercial-pathway-section">
      <h2>{title}</h2>
      {items.length ? (
        <div className="commercial-pathway-asset-list">
          {items.map((asset) => (
            <div key={asset.id} className="commercial-pathway-asset-row">
              <span>
                <strong>{asset.title || asset.id}</strong>
                <small>
                  {asset.assetType || asset.category || 'asset'}
                  {asset.route ? ` · ${asset.route}` : ''}
                </small>
              </span>
              <Button variant="secondary" onClick={() => onOpen(asset)}>
                Open
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p>No linked assets yet.</p>
      )}
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

  const outcomeRows = useMemo(
    () => products.flatMap((row) => outcomeMappingsForProduct(row)),
    [products]
  );

  return (
    <PageShell
      title="Outcome Product Catalog"
      subtitle="Start with the outcome, then trace the product, asset packs, and assets that deliver it."
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
        <BuilderMetric label="Outcomes" value={outcomeRows.length} />
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
        {outcomeRows.map((row) => (
          <Card key={`${row.product?.id}-${row.outcome}`} className="commercial-card">
            <h2>{row.outcome}</h2>
            <p>
              <strong>Product:</strong>{' '}
              <Link to={`/products/${row.product?.slug}`}>{row.product?.name}</Link>
            </p>
            {row.product?.description && <p>{row.product.description}</p>}
            {row.product?.pricingTierPlaceholder && (
              <p>
                <strong>{row.product.pricingTierPlaceholder}</strong> pricing placeholder
              </p>
            )}
            <ChipList items={row.product?.targetBuyers || []} />
            <BuyerStakeholderSummary item={row.product} />
            <p>
              <strong>{row.packs?.length || 0}</strong> packs ·{' '}
              <strong>{row.assets?.length || 0}</strong> assets
            </p>
            <p>
              <strong>Packs:</strong> {compactList(row.packs?.map((pack) => pack.name) || [])}
            </p>
            <p>
              <strong>Assets:</strong> {compactList(row.assets?.map((asset) => asset.title || asset.id) || [])}
            </p>
            <Link to={`/products/${row.product?.slug}`}>
              <Button variant="primary">View product path</Button>
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
        <BuyerStakeholderSummary item={product} />
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
        {product.roles?.length > 0 && (
          <>
            <h2 style={{ marginTop: 16 }}>Roles</h2>
            <ChipList items={product.roles} />
          </>
        )}
        {product.workspaces?.length > 0 && (
          <>
            <h2 style={{ marginTop: 16 }}>Workspaces</h2>
            <ChipList items={product.workspaces} />
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
          <BuyerStakeholderSummary item={pack} />
          {!!pack.roles?.length && (
            <p>
              <strong>Roles:</strong> {compactList(pack.roles, 6)}
            </p>
          )}
          {!!pack.workspaces?.length && (
            <p>
              <strong>Workspaces:</strong> {compactList(pack.workspaces, 6)}
            </p>
          )}
          <ul>
            {(pack.assets || []).map((a) => (
              <li key={a.id}>
                {a.title || a.id}
                {!!a.roles?.length && (
                  <span className="commercial-muted"> · roles: {compactList(a.roles, 3)}</span>
                )}
                {!!a.workspaces?.length && (
                  <span className="commercial-muted"> · workspaces: {compactList(a.workspaces, 3)}</span>
                )}
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
            <BuyerStakeholderSummary item={pack} />
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
            <p>
              {pathwayLinkCount(p)} linked assets · {(p.outcomes || []).length} outcomes
            </p>
            <ChipList items={(p.outcomes || []).slice(0, 3)} />
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

  const openAsset = (asset) => {
    if (asset?.route) {
      navigate(asset.route);
      return;
    }
    const plan = getRegistryToolNavigation(asset?.id);
    if (plan?.pathname) navigate(`${plan.pathname}${plan.search || ''}`);
  };

  return (
    <PageShell title={pathway.name} subtitle={pathway.description}>
      <div className="commercial-metric">
        <BuilderMetric label="Calculators" value={pathway.linkedAssetCounts?.calculators || pathway.calculators?.length || 0} />
        <BuilderMetric label="Protocols" value={pathway.linkedAssetCounts?.protocols || pathway.protocols?.length || 0} />
        <BuilderMetric label="Workflows" value={pathway.linkedAssetCounts?.workflows || pathway.workflows?.length || 0} />
        <BuilderMetric label="Simulations" value={pathway.linkedAssetCounts?.simulations || pathway.simulations?.length || 0} />
      </div>

      {!!pathway.outcomes?.length && (
        <Card className="commercial-card" style={{ marginBottom: 16 }}>
          <h2>Target outcomes</h2>
          <ChipList items={pathway.outcomes} />
        </Card>
      )}

      <div className="commercial-grid commercial-pathway-grid">
        <PathwayAssetSection title="Calculators" items={pathway.calculators || []} onOpen={openAsset} />
        <PathwayAssetSection title="Protocols" items={pathway.protocols || []} onOpen={openAsset} />
        <PathwayAssetSection title="Workflows" items={pathway.workflows || []} onOpen={openAsset} />
        <PathwayAssetSection title="Simulations" items={pathway.simulations || []} onOpen={openAsset} />
      </div>

      {pathway.aiAgent && (
        <Card className="commercial-card commercial-pathway-ai">
          <h2>AI guidance</h2>
          <p>{pathway.aiAgent.title || pathway.aiAgent.id}</p>
          <Link to={`/assistant?agent=${pathway.aiAgent.id || pathway.aiAgentId}`}>
            <Button variant="secondary">Open AI guidance</Button>
          </Link>
        </Card>
      )}
      <div style={{ marginTop: 16 }}>
        <Link to="/care-pathways">← Pathways</Link>
      </div>
    </PageShell>
  );
}

export function AgentsRegistryPage() {
  const userIdentity = useUserIdentity();
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    ProductCatalogApi.listAgents().then(setAgents).catch(() => setAgents([]));
  }, []);

  const roleIntelligenceProfile = useMemo(
    () =>
      buildRoleIntelligenceProfile({
        account: userIdentity.account,
        preferences: userIdentity.preferences,
        activeWorkspace: userIdentity.activeWorkspace,
        workspaceState: userIdentity.workspaceState,
        platformContext: userIdentity.platformContext,
        roleProfile: userIdentity.roleProfile,
      }),
    [
      userIdentity.account,
      userIdentity.activeWorkspace,
      userIdentity.platformContext,
      userIdentity.preferences,
      userIdentity.roleProfile,
      userIdentity.workspaceState,
    ]
  );
  const recommendedAgents = useMemo(
    () =>
      getRoleIntelligenceAgentRecommendations({
        agents,
        profile: roleIntelligenceProfile,
        limit: agents.length || 4,
      }),
    [agents, roleIntelligenceProfile]
  );
  const recommendedAgentIds = useMemo(
    () => new Set(recommendedAgents.map((agent) => agent.id)),
    [recommendedAgents]
  );
  const orderedAgents = useMemo(() => {
    const recById = new Map(recommendedAgents.map((agent) => [agent.id, agent]));
    return [...agents]
      .map((agent) => recById.get(agent.id) || agent)
      .sort((a, b) => {
        const aRecommended = recommendedAgentIds.has(a.id);
        const bRecommended = recommendedAgentIds.has(b.id);
        return Number(bRecommended) - Number(aRecommended) || (a.title || a.id).localeCompare(b.title || b.id);
      });
  }, [agents, recommendedAgentIds, recommendedAgents]);

  return (
    <PageShell
      title="AI Agent Registry"
      subtitle={`Domain-aware agents mapped to capabilities, assets, workspaces, roles, and tool-calling permissions. Current role view: ${roleIntelligenceProfile.roleLabel}.`}
    >
      <div className="commercial-grid commercial-agent-grid">
        {orderedAgents.map((agent) => (
          <Card key={agent.id} className="commercial-card commercial-agent-card">
            <div className="commercial-agent-card-header">
              <div>
                <h2>{agent.title}</h2>
                <p>{agent.description || agent.gatewayNote}</p>
              </div>
              <span className="commercial-agent-status">{agent.canCallTools ? 'tool-calling' : 'read-only'}</span>
            </div>
            {recommendedAgentIds.has(agent.id) && (
              <section className="commercial-agent-section">
                <strong>Recommended AI Agent</strong>
                <p>{agent.roleIntelligence?.reason || `${roleIntelligenceProfile.roleLabel} role match`}</p>
              </section>
            )}
            <section className="commercial-agent-section">
              <strong>Capabilities</strong>
              <ChipList items={agent.capabilities || []} />
            </section>
            <section className="commercial-agent-section">
              <strong>Asset access</strong>
              <ul className="commercial-compact-list">
                {(agent.assetAccess || []).slice(0, 5).map((asset) => (
                  <li key={asset.id}>
                    {asset.title || asset.id}
                    <span className="commercial-muted">
                      {asset.assetType ? ` · ${asset.assetType}` : ''}
                      {asset.route ? ` · ${asset.route}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
              {!agent.assetAccess?.length && <p className="commercial-muted">No mapped assets.</p>}
            </section>
            <section className="commercial-agent-section">
              <strong>Workspace awareness</strong>
              <ChipList items={agent.workspaceAwareness || []} />
            </section>
            <section className="commercial-agent-section">
              <strong>Role awareness</strong>
              <p>{compactList(agent.roleAwareness || [], 5) || 'General clinical users'}</p>
            </section>
            <section className="commercial-agent-section">
              <strong>Tool calling permissions</strong>
              <ChipList items={agent.toolCallingPermissions || []} />
            </section>
            <Link
              to={`/assistant?agent=${agent.id}`}
              onClick={() =>
                trackRoleAiRequest({
                  profile: roleIntelligenceProfile,
                  agentId: agent.id,
                  source: 'agent-registry-open',
                })
              }
            >
              <Button variant="primary">Open agent</Button>
            </Link>
          </Card>
        ))}
        {!agents.length && (
          <Card className="commercial-card">
            <h2>No agents registered</h2>
            <p>The AI Agent Registry will populate when platform AI-agent assets are seeded.</p>
          </Card>
        )}
      </div>
    </PageShell>
  );
}

export function MaturityAssessmentPage() {
  const { organization } = useUserIdentity();
  const [questionnaire, setQuestionnaire] = useState(DEFAULT_HOSPITAL_READINESS_QUESTIONNAIRE);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  useEffect(() => {
    ProductCatalogApi.getMaturityQuestionnaire()
      .then((data) => setQuestionnaire(data))
      .catch(() => setQuestionnaire(DEFAULT_HOSPITAL_READINESS_QUESTIONNAIRE));
  }, []);

  const submit = async () => {
    const payload = Object.entries(answers).map(([questionId, value]) => ({
      questionId,
      value: Number(value),
    }));
    try {
      const res = await ProductCatalogApi.submitMaturityAssessment(
        payload,
        organization?.id
      );
      setResult({
        ...res,
        readinessAssessment: buildHospitalReadinessAssessment({ answers }),
      });
    } catch {
      setResult({
        readinessAssessment: buildHospitalReadinessAssessment({ answers }),
      });
    }
  };

  if (result) {
    const readiness = result.readinessAssessment || buildHospitalReadinessAssessment({ answers });
    const recommendationSections = [
      ['Products', readiness.recommendations.products],
      ['Packs', readiness.recommendations.packs],
      ['Integrations', readiness.recommendations.integrations],
      ['Training', readiness.recommendations.training],
    ];

    return (
      <PageShell
        title="Hospital Readiness Score"
        subtitle={`Consultative readiness: ${readiness.hospitalReadinessScore}/100 · ${readiness.readinessBand.label}`}
      >
        <div className="commercial-metrics-grid">
          <BuilderMetric label="Hospital Readiness Score" value={readiness.hospitalReadinessScore} />
          <BuilderMetric label="Readiness band" value={readiness.readinessBand.label} />
          <BuilderMetric label="Measured dimensions" value={readiness.summary.measuredDimensionCount} />
          <BuilderMetric label="Recommendations" value={readiness.summary.recommendationCount} />
        </div>

        <section className="commercial-section">
          <h2>Maturity dimensions</h2>
          <div className="commercial-grid">
            {readiness.dimensions.map((dimension) => (
              <Card key={dimension.id} className="commercial-card">
                <span className="commercial-muted">{dimension.level.label}</span>
                <div className="commercial-metric-value">{dimension.score}</div>
                <h3>{dimension.label}</h3>
                <p><strong>Signals:</strong> {dimension.signals.join(', ')}</p>
                <p><strong>Gaps:</strong> {dimension.gaps.join(', ')}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="commercial-section">
          <h2>Consultative recommendations</h2>
          <div className="commercial-grid">
            {recommendationSections.map(([title, items]) => (
              <ProductizationList key={title} title={title} items={items} />
            ))}
          </div>
        </section>

        {result.recommendedProducts?.length ? (
          <>
            <h2>Recommended products from assessment API</h2>
            <div className="commercial-grid">
              {result.recommendedProducts.map((p) => (
                <Card key={p.id} className="commercial-card">
                  <h2>{p.name}</h2>
                  <Link to={`/products/${p.slug}`}>
                    <Button variant="primary">View</Button>
                  </Link>
                </Card>
              ))}
            </div>
          </>
        ) : null}

        <Link to="/onboarding">
          <Button variant="secondary">Configure deployment</Button>
        </Link>
      </PageShell>
    );
  }

  const readinessPreview = buildHospitalReadinessAssessment({ answers });

  return (
    <PageShell title="Hospital maturity assessment" subtitle="Consultative readiness scoring and product recommendations.">
      <div className="commercial-metrics-grid">
        <BuilderMetric label="Hospital Readiness Score" value={readinessPreview.hospitalReadinessScore} />
        <BuilderMetric label="Readiness band" value={readinessPreview.readinessBand.label} />
        <BuilderMetric label="Dimensions" value={readinessPreview.summary.measuredDimensionCount} />
        <BuilderMetric label="Recommendation types" value={4} />
      </div>

      {(questionnaire?.questions || DEFAULT_HOSPITAL_READINESS_QUESTIONNAIRE.questions).map((q) => (
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

      <section className="commercial-section">
        <h2>Assessment dimensions</h2>
        <div className="commercial-grid">
          {readinessPreview.dimensions.map((dimension) => (
            <Card key={dimension.id} className="commercial-card">
              <span className="commercial-muted">{dimension.level.label}</span>
              <h3>{dimension.label}</h3>
              <p>{dimension.gaps[0]}</p>
            </Card>
          ))}
        </div>
      </section>

      <Button variant="primary" onClick={submit}>
        Get readiness recommendations
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

function ValueMetricCard({ metric }) {
  const value = metric.value === null || metric.value === undefined ? 'No data' : metric.value;
  const suffix =
    metric.value === null || metric.value === undefined
      ? ''
      : metric.unit === 'percent'
        ? '%'
        : metric.unit === 'milliseconds'
          ? ' ms'
          : '';

  return (
    <Card className="commercial-card">
      <span className="commercial-muted">{metric.status}</span>
      <div className="commercial-metric-value">
        {value}
        {suffix}
      </div>
      <h2>{metric.label}</h2>
      <p>{metric.description}</p>
      {metric.denominator ? (
        <p>
          {metric.numerator ?? 0} / {metric.denominator} tracked events
        </p>
      ) : null}
    </Card>
  );
}

export function ValueTrackingPage() {
  const { organization } = useUserIdentity();
  const [period, setPeriod] = useState('month');
  const [valueTracking, setValueTracking] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!organization?.id) return;
    setStatus('');
    ProductCatalogApi.getOrganizationValueTracking(organization.id, period)
      .then(setValueTracking)
      .catch((error) => {
        setValueTracking(null);
        setStatus(error.message);
      });
  }, [organization?.id, period]);

  if (!organization?.id) {
    return (
      <PageShell title="Value tracking" subtitle="Link an organization to view value metrics.">
        <Link to="/onboarding">
          <Button variant="primary">Set up organization</Button>
        </Link>
      </PageShell>
    );
  }

  if (!valueTracking) {
    return (
      <PageShell title="Loading value tracking…" subtitle={status || 'Collecting metric signals.'} />
    );
  }

  const categories = [
    ['Clinical', valueTracking.categories?.clinical || []],
    ['Operational', valueTracking.categories?.operational || []],
    ['Executive', valueTracking.categories?.executive || []],
  ];

  return (
    <PageShell
      title="Value Tracking"
      subtitle="Clinical, operational, and executive value metrics for the active organization."
      actions={
        <div className="commercial-form-row">
          <label htmlFor="value-tracking-period">Period</label>
          <select
            id="value-tracking-period"
            aria-label="Value tracking period"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>
      }
    >
      <div className="commercial-grid">
        <BuilderMetric label="Enabled packs" value={valueTracking.executiveSummary?.enabledPackCount || 0} />
        <BuilderMetric label="Active users" value={valueTracking.executiveSummary?.activeUsers || 0} />
        <BuilderMetric
          label="Engagement events"
          value={valueTracking.executiveSummary?.totalEngagementEvents || 0}
        />
        <BuilderMetric label="Outcome signals" value={valueTracking.executiveSummary?.outcomeSignalCount || 0} />
      </div>

      {categories.map(([category, metrics]) => (
        <section key={category} className="commercial-section">
          <h2>{category}</h2>
          <div className="commercial-grid">
            {metrics.map((metric) => (
              <ValueMetricCard key={metric.id} metric={metric} />
            ))}
          </div>
        </section>
      ))}

      <Card className="commercial-card">
        <h2>Data sources</h2>
        <p>
          Audit events: {valueTracking.sources?.auditEvents || 0} · Usage events:{' '}
          {valueTracking.sources?.usageEvents || 0} · Enabled entitlements:{' '}
          {valueTracking.sources?.enabledEntitlements || 0}
        </p>
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

export function IntegrationReadinessPage() {
  const { organization } = useUserIdentity();
  const [readiness, setReadiness] = useState({ integrations: [], summary: {} });
  const [status, setStatus] = useState('');

  useEffect(() => {
    ProductCatalogApi.getIntegrationReadiness()
      .then(setReadiness)
      .catch((e) => setStatus(e.message));
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

  const summary = readiness.summary || {};

  return (
    <PageShell
      title="Integration Readiness Center"
      subtitle="Track interoperability readiness across clinical, identity, government, and scheduling systems."
      actions={
        <Link to="/integrations-marketplace">
          <Button variant="secondary">Open marketplace</Button>
        </Link>
      }
    >
      {status && <p className="commercial-subtitle">{status}</p>}
      <div className="commercial-metric">
        <BuilderMetric label="Supported" value={summary.supported || 0} />
        <BuilderMetric label="Planned" value={summary.planned || 0} />
        <BuilderMetric label="Demo" value={summary.demo || 0} />
        <BuilderMetric label="Unavailable" value={summary.unavailable || 0} />
      </div>
      <div className="commercial-grid">
        {(readiness.integrations || []).map((item) => (
          <Card key={item.id} className="commercial-card">
            <h2>{item.name}</h2>
            <p>
              {item.category} · <strong>{item.status}</strong>
            </p>
            {item.sourceStatus && (
              <p className="commercial-muted">Marketplace status: {item.sourceStatus}</p>
            )}
            {item.description && <p>{item.description}</p>}
            {item.linkedAssetId && (
              <p>
                <strong>Linked asset:</strong> {item.linkedAssetId}
              </p>
            )}
            {item.docsUrl && (
              <p>
                <Link to={item.docsUrl}>Read integration docs</Link>
              </p>
            )}
            {item.slug && (
              <Button variant="primary" onClick={() => request(item.slug)}>
                Request enablement
              </Button>
            )}
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

export function HospitalSolutionBuilderPage() {
  const { organization, refreshPlatformContext } = useUserIdentity();
  const [hospitalType, setHospitalType] = useState('hospital');
  const [departmentIds, setDepartmentIds] = useState(['emergency', 'icu', 'operations']);
  const [assetPackIds, setAssetPackIds] = useState(['core-platform']);
  const [workspaceIds, setWorkspaceIds] = useState(['emergency', 'icu', 'operations']);
  const [aiAgentIds, setAiAgentIds] = useState(['agent-clinical']);
  const [integrationSlugs, setIntegrationSlugs] = useState(['fhir-patient', 'hl7-adt']);
  const [goals, setGoals] = useState('Reduce triage time, improve asset visibility');
  const [recommendation, setRecommendation] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  const toggleValue = (value, setter) => {
    setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const buildPayload = () => ({
    organizationId: organization?.id,
    hospitalType,
    departmentIds,
    assetPackIds,
    workspaceIds,
    aiAgentIds,
    integrationSlugs,
    goals: csvToList(goals),
  });

  const generateRecommendation = async () => {
    setLoading(true);
    setStatus('');
    try {
      const nextRecommendation = await ProductCatalogApi.getHospitalSolutionRecommendation(buildPayload());
      setRecommendation(nextRecommendation);
      setStatus('Recommended CareDroid deployment generated.');
    } catch (e) {
      setStatus(e.message);
    } finally {
      setLoading(false);
    }
  };

  const applyRecommendation = async () => {
    if (!organization?.id || !recommendation) return;
    setApplying(true);
    setStatus('');
    try {
      await ProductCatalogApi.applyHospitalSolution({
        organizationId: organization.id,
        commercialPlanId: recommendation.recommendedCommercialPlanId,
        configurationPatch: recommendation.configurationPatch,
      });
      setStatus('Hospital solution applied to this organization.');
      refreshPlatformContext?.();
    } catch (e) {
      setStatus(e.message);
    } finally {
      setApplying(false);
    }
  };

  const patchPreview = recommendation
    ? JSON.stringify(recommendation.configurationPatch, null, 2)
    : 'Generate a recommendation to preview the configuration patch.';

  return (
    <PageShell
      title="Hospital Solution Builder"
      subtitle="Compose a hospital-specific CareDroid deployment from profile inputs without code changes."
      actions={
        <Link to="/configuration-studio">
          <Button variant="secondary">Configuration studio</Button>
        </Link>
      }
    >
      {status && <p className="commercial-subtitle">{status}</p>}
      <div className="commercial-config-grid">
        <Card className="commercial-card commercial-config-card">
          <h2>Profile</h2>
          <p>Choose the organization type and deployment goals that guide the recommendation.</p>
          <div className="commercial-form-row">
            <label>Hospital type</label>
            <select
              aria-label="Hospital type"
              value={hospitalType}
              onChange={(event) => setHospitalType(event.target.value)}
            >
              {SOLUTION_HOSPITAL_TYPES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="commercial-form-row">
            <label>Target goals (comma-separated)</label>
            <input aria-label="Target goals" value={goals} onChange={(event) => setGoals(event.target.value)} />
          </div>
        </Card>

        <Card className="commercial-card commercial-config-card">
          <h2>Departments</h2>
          <p>Select the departments and service areas the deployment must support.</p>
          <div className="commercial-chip-list" aria-label="Departments">
            {SOLUTION_DEPARTMENTS.map((department) => (
              <button
                key={department.id}
                type="button"
                className={`commercial-chip ${departmentIds.includes(department.id) ? 'selected' : ''}`}
                onClick={() => toggleValue(department.id, setDepartmentIds)}
              >
                {department.label}
              </button>
            ))}
          </div>
        </Card>

        <Card className="commercial-card commercial-config-card">
          <h2>Asset packs</h2>
          <p>Optionally pin packs that must be included alongside the recommendation.</p>
          <div className="commercial-chip-list" aria-label="Asset packs">
            {SOLUTION_PACK_OPTIONS.map((packId) => (
              <button
                key={packId}
                type="button"
                className={`commercial-chip ${assetPackIds.includes(packId) ? 'selected' : ''}`}
                onClick={() => toggleValue(packId, setAssetPackIds)}
              >
                {packId}
              </button>
            ))}
          </div>
        </Card>

        <Card className="commercial-card commercial-config-card">
          <h2>Workspaces</h2>
          <p>Choose the default workspaces that should be created for the tenant.</p>
          <div className="commercial-chip-list" aria-label="Workspaces">
            {SOLUTION_DEPARTMENTS.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                className={`commercial-chip ${workspaceIds.includes(workspace.id) ? 'selected' : ''}`}
                onClick={() => toggleValue(workspace.id, setWorkspaceIds)}
              >
                {workspace.label}
              </button>
            ))}
          </div>
        </Card>

        <Card className="commercial-card commercial-config-card">
          <h2>AI agents</h2>
          <p>Select agents to force into the recommendation; department agents are added automatically.</p>
          <div className="commercial-chip-list" aria-label="AI agents">
            {SOLUTION_AGENT_OPTIONS.map((agentId) => (
              <button
                key={agentId}
                type="button"
                className={`commercial-chip ${aiAgentIds.includes(agentId) ? 'selected' : ''}`}
                onClick={() => toggleValue(agentId, setAiAgentIds)}
              >
                {agentId}
              </button>
            ))}
          </div>
        </Card>

        <Card className="commercial-card commercial-config-card">
          <h2>Integrations</h2>
          <p>Choose integration requests to include in the deployment patch.</p>
          <div className="commercial-chip-list" aria-label="Integrations">
            {INTEGRATION_OPTIONS.map((slug) => (
              <button
                key={slug}
                type="button"
                className={`commercial-chip ${integrationSlugs.includes(slug) ? 'selected' : ''}`}
                onClick={() => toggleValue(slug, setIntegrationSlugs)}
              >
                {slug}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="commercial-config-save">
        <Button variant="primary" onClick={generateRecommendation} disabled={loading}>
          {loading ? 'Generating...' : 'Generate recommendation'}
        </Button>
      </div>

      {recommendation && (
        <>
          <div className="commercial-grid">
            <BuilderMetric label="Recommended plan" value={recommendation.recommendedCommercialPlanId} />
            <BuilderMetric label="Products" value={recommendation.products?.length || 0} />
            <BuilderMetric label="Packs" value={recommendation.packs?.length || 0} />
            <BuilderMetric label="Workspaces" value={recommendation.workspaces?.length || 0} />
          </div>
          <div className="commercial-config-grid">
            <Card className="commercial-card commercial-config-card">
              <h2>Recommended deployment</h2>
              <p>
                Products: {compactList((recommendation.products || []).map((product) => product.name), 5)}
              </p>
              <p>Packs: {compactList((recommendation.packs || []).map((pack) => pack.name), 5)}</p>
              <p>AI agents: {compactList((recommendation.aiAgents || []).map((agent) => agent.title), 5)}</p>
              <p>
                Integrations:{' '}
                {compactList((recommendation.integrations || []).map((integration) => integration.name), 5)}
              </p>
            </Card>
            <Card className="commercial-card commercial-config-card">
              <h2>Rationale</h2>
              <ul className="commercial-compact-list">
                {(recommendation.rationale || []).map((item) => (
                  <li key={`${item.type}-${item.message}`}>{item.message}</li>
                ))}
              </ul>
            </Card>
            <Card className="commercial-card commercial-config-card">
              <h2>Configuration patch preview</h2>
              <textarea aria-label="Configuration patch preview" readOnly rows={12} value={patchPreview} />
              <Button variant="primary" onClick={applyRecommendation} disabled={!organization?.id || applying}>
                {applying ? 'Applying...' : 'Apply to organization'}
              </Button>
              {!organization?.id && <p>Join or create an organization before applying a recommendation.</p>}
            </Card>
          </div>
        </>
      )}
    </PageShell>
  );
}

export function ConfigurationStudioPage() {
  const { organization, refreshPlatformContext } = useUserIdentity();
  const [hiddenNavIds, setHiddenNavIds] = useState('');
  const [primaryLanding, setPrimaryLanding] = useState('/dashboard');
  const [displayName, setDisplayName] = useState('');
  const [accentColor, setAccentColor] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [enabledAgents, setEnabledAgents] = useState('');
  const [enabledProductIds, setEnabledProductIds] = useState([]);
  const [enabledPackIds, setEnabledPackIds] = useState([]);
  const [workspaceDefaultsJson, setWorkspaceDefaultsJson] = useState('[]');
  const [permissionsJson, setPermissionsJson] = useState('{}');
  const [dashboardLayoutJson, setDashboardLayoutJson] = useState('{}');
  const [agentRows, setAgentRows] = useState([]);
  const [productGraphs, setProductGraphs] = useState([]);
  const [packGraphs, setPackGraphs] = useState([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const settings = organization?.settings || {};
    const configuration = settings.configuration || {};
    const nav = settings.navigation || configuration.navigation || {};
    const branding = { ...(configuration.branding || {}), ...(organization?.branding || {}) };

    setHiddenNavIds((nav.hiddenNavIds || []).join(', '));
    setPrimaryLanding(nav.primaryLanding || '/dashboard');
    setDisplayName(branding.displayName || organization?.name || '');
    setAccentColor(branding.accentColor || '');
    setLogoUrl(branding.logoUrl || '');
    setEnabledAgents((settings.enabledAgentIds || configuration.enabledAgentIds || []).join(', '));
    const productIds = settings.enabledProductIds || settings.configuration?.enabledProductIds || [];
    setEnabledProductIds(productIds);
    setEnabledPackIds(settings.enabledPackIds || configuration.enabledPackIds || []);
    setWorkspaceDefaultsJson(configJson(settings.workspaceDefaults ?? configuration.workspaceDefaults, []));
    setPermissionsJson(configJson(settings.permissionsOverrides ?? configuration.permissionsOverrides, {}));
    setDashboardLayoutJson(configJson(settings.dashboardLayout ?? configuration.dashboardLayout, {}));
  }, [organization?.id, organization?.settings, organization?.branding]);

  useEffect(() => {
    ProductCatalogApi.listProductBuilder(organization?.id)
      .then(setProductGraphs)
      .catch(() => setProductGraphs([]));
    ProductCatalogApi.listAssetPackBuilder(organization?.id)
      .then(setPackGraphs)
      .catch(() => setPackGraphs([]));
    ProductCatalogApi.listAgents()
      .then(setAgentRows)
      .catch(() => setAgentRows([]));
  }, [organization?.id]);

  const selectedProducts = productGraphs.filter((row) => enabledProductIds.includes(row.product.id));
  const selectedPackIds = new Set(selectedProducts.flatMap((row) => row.product.packIds || []));
  const configuredPackIds = new Set([...selectedPackIds, ...enabledPackIds]);
  const selectedPacks = packGraphs.filter((pack) => configuredPackIds.has(pack.id));
  const selectedAssets = new Set(selectedPacks.flatMap((pack) => pack.assetIds || []));

  const toggleProduct = (productId) => {
    setEnabledProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const togglePack = (packId) => {
    setEnabledPackIds((prev) =>
      prev.includes(packId) ? prev.filter((id) => id !== packId) : [...prev, packId]
    );
  };

  const toggleAgent = (agentId) => {
    const ids = new Set(csvToList(enabledAgents));
    if (ids.has(agentId)) ids.delete(agentId);
    else ids.add(agentId);
    setEnabledAgents([...ids].join(', '));
  };

  const save = async () => {
    if (!organization?.id) return;
    try {
      const workspaceDefaults = parseConfigJson(workspaceDefaultsJson, 'Workspace defaults', []);
      if (!Array.isArray(workspaceDefaults)) {
        throw new Error('Workspace defaults must be a JSON array.');
      }
      const permissionsOverrides = parseConfigJson(permissionsJson, 'Permissions overrides', {});
      if (
        permissionsOverrides &&
        (Array.isArray(permissionsOverrides) || typeof permissionsOverrides !== 'object')
      ) {
        throw new Error('Permissions overrides must be a JSON object.');
      }
      const dashboardLayout = parseConfigJson(dashboardLayoutJson, 'Dashboard layout', {});
      if (dashboardLayout && (Array.isArray(dashboardLayout) || typeof dashboardLayout !== 'object')) {
        throw new Error('Dashboard layout must be a JSON object.');
      }

      await ProductCatalogApi.updateOrganizationConfiguration(organization.id, {
        navigation: {
          hiddenNavIds: csvToList(hiddenNavIds),
          primaryLanding,
        },
        branding: {
          displayName,
          accentColor,
          logoUrl,
        },
        workspaceDefaults,
        enabledAgentIds: csvToList(enabledAgents),
        enabledProductIds,
        enabledPackIds,
        permissionsOverrides,
        dashboardLayout,
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
      <div className="commercial-config-grid">
        <Card className="commercial-card commercial-config-card">
          <h2>Navigation</h2>
          <p>Control tenant-level menu visibility and the default post-login landing route.</p>
          <div className="commercial-form-row">
            <label>Hidden nav IDs (comma-separated)</label>
            <input
              aria-label="Hidden nav IDs"
              value={hiddenNavIds}
              onChange={(e) => setHiddenNavIds(e.target.value)}
            />
          </div>
          <div className="commercial-form-row">
            <label>Primary landing route</label>
            <input
              aria-label="Primary landing route"
              value={primaryLanding}
              onChange={(e) => setPrimaryLanding(e.target.value)}
            />
          </div>
        </Card>

        <Card className="commercial-card commercial-config-card">
          <h2>Branding</h2>
          <p>Set the organization display identity used by tenant-aware surfaces.</p>
          <div className="commercial-form-row">
            <label>Display name</label>
            <input
              aria-label="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="commercial-form-row">
            <label>Accent color</label>
            <input
              aria-label="Accent color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
            />
          </div>
          <div className="commercial-form-row">
            <label>Logo URL</label>
            <input aria-label="Logo URL" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
          </div>
        </Card>

        <Card className="commercial-card commercial-config-card">
          <h2>Workspaces</h2>
          <p>Configure default workspace setup as JSON so onboarding and context services share one shape.</p>
          <div className="commercial-form-row">
            <label>Workspace defaults JSON</label>
            <textarea
              aria-label="Workspace defaults JSON"
              rows={8}
              value={workspaceDefaultsJson}
              onChange={(e) => setWorkspaceDefaultsJson(e.target.value)}
            />
          </div>
        </Card>

        <Card className="commercial-card commercial-config-card">
          <h2>Packs</h2>
          <p>Select product bundles and direct asset packs for this tenant.</p>
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
          <div className="commercial-form-row">
            <label>Enabled packs</label>
            <div className="commercial-chip-list">
              {packGraphs.map((pack) => {
                const selected = configuredPackIds.has(pack.id);
                const productManaged = selectedPackIds.has(pack.id);
                return (
                  <button
                    key={pack.id}
                    type="button"
                    className={`commercial-chip ${selected ? 'selected' : ''}`}
                    onClick={() => togglePack(pack.id)}
                  >
                    {pack.name}
                    {productManaged ? ' (via product)' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        <Card className="commercial-card commercial-config-card">
          <h2>Permissions</h2>
          <p>Capture organization-specific permission overrides for role-aware experiences.</p>
          <div className="commercial-form-row">
            <label>Permissions overrides JSON</label>
            <textarea
              aria-label="Permissions overrides JSON"
              rows={8}
              value={permissionsJson}
              onChange={(e) => setPermissionsJson(e.target.value)}
            />
          </div>
        </Card>

        <Card className="commercial-card commercial-config-card">
          <h2>AI agents</h2>
          <p>Enable AI agent IDs for the tenant and optionally select from registered agents.</p>
          <div className="commercial-form-row">
            <label>Enabled agent IDs</label>
            <input
              aria-label="Enabled agent IDs"
              value={enabledAgents}
              onChange={(e) => setEnabledAgents(e.target.value)}
            />
          </div>
          <div className="commercial-chip-list">
            {agentRows.map((agent) => (
              <button
                key={agent.id}
                type="button"
                className={`commercial-chip ${csvToList(enabledAgents).includes(agent.id) ? 'selected' : ''}`}
                onClick={() => toggleAgent(agent.id)}
              >
                {agent.title || agent.id}
              </button>
            ))}
          </div>
        </Card>

        <Card className="commercial-card commercial-config-card">
          <h2>Dashboards</h2>
          <p>Store dashboard layout preferences for command, workspace, and analytics surfaces.</p>
          <div className="commercial-form-row">
            <label>Dashboard layout JSON</label>
            <textarea
              aria-label="Dashboard layout JSON"
              rows={8}
              value={dashboardLayoutJson}
              onChange={(e) => setDashboardLayoutJson(e.target.value)}
            />
          </div>
        </Card>
      </div>

      <Card className="commercial-card commercial-config-save">
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
  'Subscription plan',
  'Products and asset packs',
  'Workspace profile',
  'User roles',
  'Default workspace',
  'Finish setup',
];

function workspaceSetupsForOrganizationType(organizationType) {
  return getWorkspacePresetForOrganizationType(organizationType).map((workspaceId) => {
    const setup = buildWorkspaceSetupFromRegistry(workspaceId);
    if (organizationType === 'ems' && workspaceId === 'emergency') {
      return { ...setup, name: 'EMS Command', displayName: 'EMS Command', emergencyModeEnabled: true };
    }
    if (organizationType === 'ems' && workspaceId === 'fleet') {
      return { ...setup, name: 'Fleet Operations', displayName: 'Fleet Operations' };
    }
    return {
      ...setup,
      emergencyModeEnabled: workspaceId === 'emergency',
    };
  });
}

function buildPresetFromRegistry(organizationType, overrides = {}) {
  const workspaceSetups = workspaceSetupsForOrganizationType(organizationType);
  const profile = buildClientWorkspaceProfile({
    organizationType,
    subscriptionPlan: overrides.subscriptionPlan || 'professional',
    enabledWorkspaces: workspaceSetups.map((workspace) => workspace.id),
    enabledAssetPacks: overrides.packIds || [],
    roles: overrides.roles || [overrides.defaultRoleProfileId || 'hospital-administrator'],
    departments: overrides.departments || [],
  });
  return {
    specialties: overrides.specialties || workspaceSetups.map((workspace) => workspace.id),
    departments: overrides.departments || workspaceSetups.map((workspace) => workspace.name),
    packIds: profile.enabledAssetPacks,
    integrationSlugs: overrides.integrationSlugs || ['identity-sso'],
    complianceMode: overrides.complianceMode || 'hipaa',
    defaultRoleProfileId: overrides.defaultRoleProfileId || 'hospital-administrator',
    subscriptionPlan: overrides.subscriptionPlan || 'professional',
    defaultWorkspace: profile.defaultWorkspace,
    workspaceSetups,
  };
}

const TENANT_PRESETS = {
  hospital: buildPresetFromRegistry('hospital', {
    specialties: ['emergency', 'icu', 'cardiology', 'laboratory', 'operations'],
    departments: ['Emergency', 'ICU', 'Cardiology', 'Laboratory', 'Operations', 'Administration'],
    packIds: ['core-platform', 'emergency-medicine', 'laboratory-intelligence', 'hospital-operations'],
    integrationSlugs: ['fhir-patient', 'hl7-adt', 'laboratory-interface', 'identity-sso'],
    complianceMode: 'hipaa',
    defaultRoleProfileId: 'emergency-physician',
  }),
  clinic: buildPresetFromRegistry('clinic', {
    specialties: ['cardiology', 'laboratory', 'operations'],
    departments: ['Operations', 'Pharmacy', 'Administration'],
    packIds: ['core-platform', 'laboratory-intelligence', 'cardiology-pack'],
    integrationSlugs: ['fhir-patient', 'identity-sso', 'scheduling'],
    complianceMode: 'hipaa',
    defaultRoleProfileId: 'nurse',
  }),
  ems: buildPresetFromRegistry('ems', {
    specialties: ['emergency', 'operations'],
    departments: ['Emergency', 'Operations', 'Administration'],
    packIds: ['core-platform', 'emergency-medicine', 'fleet-logistics'],
    integrationSlugs: ['identity-sso', 'scheduling'],
    complianceMode: 'ems',
    defaultRoleProfileId: 'fleet-operator',
  }),
  university: buildPresetFromRegistry('university', {
    specialties: ['education', 'research', 'simulation'],
    departments: ['Education', 'Research', 'Simulation', 'Governance'],
    integrationSlugs: ['identity-sso', 'lms'],
    complianceMode: 'academic',
    defaultRoleProfileId: 'educator',
    subscriptionPlan: 'academic',
  }),
  research_center: buildPresetFromRegistry('research-center', {
    specialties: ['research', 'governance'],
    departments: ['Research', 'AI Evaluation', 'Governance'],
    integrationSlugs: ['identity-sso', 'fhir-patient'],
    complianceMode: 'research',
    defaultRoleProfileId: 'researcher',
    subscriptionPlan: 'academic',
  }),
  long_term_care: buildPresetFromRegistry('long-term-care', {
    specialties: ['operations', 'laboratory', 'medical-iot'],
    departments: ['Operations', 'Laboratory', 'Device Management', 'Governance'],
    integrationSlugs: ['identity-sso', 'fhir-patient'],
    complianceMode: 'hipaa',
    defaultRoleProfileId: 'nurse',
  }),
};

export function OrganizationOnboardingPage() {
  const navigate = useNavigate();
  const { refreshPlatformContext } = useUserIdentity();
  const [step, setStep] = useState(0);
  const [packs, setPacks] = useState([]);
  const [productGraphs, setProductGraphs] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [roleProfiles, setRoleProfiles] = useState([]);
  const [error, setError] = useState('');
  const [configuredTenantProfile, setConfiguredTenantProfile] = useState(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    organizationType: 'hospital',
    country: '',
    specialties: TENANT_PRESETS.hospital.specialties,
    departments: TENANT_PRESETS.hospital.departments,
    packIds: TENANT_PRESETS.hospital.packIds,
    productIds: [],
    commercialPlanId: '',
    subscriptionPlan: TENANT_PRESETS.hospital.subscriptionPlan,
    integrationSlugs: TENANT_PRESETS.hospital.integrationSlugs,
    defaultRoleProfileId: TENANT_PRESETS.hospital.defaultRoleProfileId,
    roleAssignments: [],
    workspaceSetups: TENANT_PRESETS.hospital.workspaceSetups,
    defaultWorkspace: TENANT_PRESETS.hospital.defaultWorkspace,
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
    ProductCatalogApi.listSpecialties().then(setSpecialties).catch(() => setSpecialties([]));
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
      specialties: preset.specialties,
      departments: preset.departments,
      packIds: preset.packIds,
      integrationSlugs: preset.integrationSlugs,
      defaultRoleProfileId: preset.defaultRoleProfileId,
      subscriptionPlan: preset.subscriptionPlan,
      workspaceSetups: preset.workspaceSetups,
      defaultWorkspace: preset.defaultWorkspace,
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
  const selectedWorkspaceIds = form.workspaceSetups.map((workspace) => workspace.id || workspace.type);
  const clientProfile = buildClientWorkspaceProfile({
    organizationId: form.slug || form.name || 'local-demo-tenant',
    organizationName: form.branding.displayName || form.name || 'Local Demo Organization',
    organizationType: form.organizationType,
    subscriptionPlan: form.subscriptionPlan || form.commercialPlanId || 'professional',
    selectedProducts: form.productIds,
    enabledAssetPacks: [...selectedPackIds],
    enabledWorkspaces: selectedWorkspaceIds,
    defaultWorkspace: form.defaultWorkspace,
    users: [],
    roles: [form.defaultRoleProfileId, ...form.roleAssignments.map((assignment) => assignment.roleProfileId)].filter(Boolean),
    departments: form.departments,
    integrations: form.integrationSlugs,
    branding: form.branding,
  });
  const specialtyOptions = specialties.length
    ? specialties.map((specialty) => ({
        id: specialty.slug || specialty.id,
        label: specialty.name || specialty.slug || specialty.id,
      }))
    : SPECIALTY_OPTIONS.map((specialty) => ({ id: specialty, label: specialty }));

  const finish = async () => {
    setError('');
    const slug = form.slug || form.name.toLowerCase().replace(/\s+/g, '-');
    const branding = {
      ...form.branding,
      displayName: form.branding.displayName || form.name,
    };
    try {
      const result = await ProductCatalogApi.completeOnboarding({
        name: form.name,
        slug,
        organizationType: form.organizationType,
        country: form.country,
        specialties: form.specialties,
        departments: form.departments,
        packIds: form.packIds,
        productIds: form.productIds,
        enabledProductIds: form.productIds,
        commercialPlanId: form.commercialPlanId || undefined,
        subscriptionPlan: form.subscriptionPlan || form.commercialPlanId || undefined,
        integrationSlugs: form.integrationSlugs,
        defaultRoleProfileId: form.defaultRoleProfileId,
        roleAssignments: form.roleAssignments,
        workspaceSetups: form.workspaceSetups,
        clientProfile,
        enabledWorkspaces: clientProfile.enabledWorkspaces,
        enabledAssetPacks: clientProfile.enabledAssetPacks,
        enabledAssets: clientProfile.enabledAssets,
        defaultWorkspace: clientProfile.defaultWorkspace,
        branding,
        complianceMode: form.complianceMode,
      });
      saveLocalClientProfile({
        ...clientProfile,
        source: 'backend',
        organizationId: result.tenantProfile?.organization?.id || result.organization?.id || clientProfile.organizationId,
      });
      await refreshPlatformContext?.();
      setConfiguredTenantProfile(result.tenantProfile || result);
    } catch (e) {
      const localProfile = saveLocalClientProfile(clientProfile);
      setConfiguredTenantProfile({
        source: 'local-demo',
        localMode: true,
        organization: {
          id: localProfile.organizationId,
          name: localProfile.organizationName,
          organizationType: localProfile.organizationType,
          slug,
        },
        workspaceDefaults: form.workspaceSetups,
        workspaces: form.workspaceSetups,
        installedPackIds: localProfile.enabledAssetPacks,
        enabledAssets: localProfile.enabledAssets,
        roleProfileId: form.defaultRoleProfileId,
        defaultDashboard: localProfile.defaultDashboard,
        branding,
        complianceMode: form.complianceMode,
        error: e.message,
      });
      setError(`Backend persistence unavailable. Saved a local/demo tenant profile. ${e.message}`);
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
                {['hospital', 'clinic', 'ems', 'university', 'research_center', 'long_term_care'].map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, ' ')}
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
          <>
            <div className="commercial-form-row">
              <label>Subscription plan</label>
              <select
                value={form.subscriptionPlan}
                onChange={(e) => setForm({ ...form, subscriptionPlan: e.target.value })}
              >
                {['starter', 'professional', 'enterprise', 'academic', 'government'].map((plan) => (
                  <option key={plan} value={plan}>
                    {plan}
                  </option>
                ))}
              </select>
            </div>
            <div className="commercial-chip-list">
              {specialtyOptions.map((specialty) => (
                <button
                  key={specialty.id}
                  type="button"
                  className={`commercial-chip ${form.specialties.includes(specialty.id) ? 'selected' : ''}`}
                  onClick={() => toggle('specialties', specialty.id)}
                >
                  {specialty.label}
                </button>
              ))}
            </div>
            <p className="commercial-subtitle">
              Subscription and specialties shape the configured tenant profile and help seed the right
              workspaces, packs, recommendations, and AI contexts.
            </p>
          </>
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
                    onChange={(e) => {
                      const next = buildWorkspaceSetupFromRegistry(e.target.value);
                      updateWorkspace(index, {
                        ...next,
                        name: next.name,
                        emergencyModeEnabled: e.target.value === 'emergency',
                      });
                    }}
                  >
                    {getCanonicalWorkspaceRegistry().map((workspaceOption) => (
                      <option key={workspaceOption.workspaceId} value={workspaceOption.workspaceId}>
                        {workspaceOption.label}
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
            <ProductizationList
              title="Configured pack preview"
              items={selectedPacks.map((pack) => pack.name)}
            />
          </>
        );
      case 4:
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
      case 5:
        return (
          <>
            <div className="commercial-form-row">
              <label>Default workspace</label>
              <select
                value={form.defaultWorkspace}
                onChange={(e) => setForm({ ...form, defaultWorkspace: e.target.value })}
              >
                {form.workspaceSetups.map((workspace) => (
                  <option key={workspace.id || workspace.type} value={workspace.id || workspace.type}>
                    {workspace.name || workspace.displayName || workspace.type}
                  </option>
                ))}
              </select>
            </div>
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
      case 6:
        return (
          <div className="commercial-form-row">
            <label>Integration requests</label>
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
            <p className="commercial-subtitle">
              Completing setup will create the organization, install packs, create workspaces,
              request integrations, and output the configured tenant profile.
            </p>
            <ProductizationList
              title="Onboarding output preview"
              items={[
                `Organization: ${form.name || 'pending'} (${form.organizationType})`,
                `Enabled workspaces: ${clientProfile.enabledWorkspaces.join(', ')}`,
                `Enabled asset packs: ${clientProfile.enabledAssetPacks.join(', ')}`,
                `Enabled assets: ${clientProfile.enabledAssets.length}`,
                `User role: ${form.defaultRoleProfileId}`,
                `Default dashboard: /dashboard (${clientProfile.defaultWorkspace})`,
              ]}
            />
          </div>
        );
      default:
        return null;
    }
  };

  if (configuredTenantProfile) {
    return (
      <PageShell
        title="Configured tenant profile"
        subtitle={
          configuredTenantProfile.localMode
            ? 'Demo/local mode: backend persistence was unavailable, so this tenant profile was saved in this browser.'
            : 'Your CareDroid tenant profile is configured and ready to use.'
        }
        actions={
          <>
            <Button variant="primary" onClick={() => navigate('/dashboard')}>
              Open dashboard
            </Button>
            <Button variant="secondary" onClick={() => navigate('/organization')}>
              Open organization
            </Button>
          </>
        }
      >
        <div className="commercial-grid">
          <ProductizationList
            title="Organization"
            items={[
              `${configuredTenantProfile.organization?.name || form.name} (${
                configuredTenantProfile.organization?.organizationType || form.organizationType
              })`,
              `Slug: ${configuredTenantProfile.organization?.slug || form.slug}`,
              `Compliance: ${configuredTenantProfile.complianceMode || form.complianceMode}`,
            ]}
          />
          <ProductizationList
            title="Specialties"
            items={configuredTenantProfile.specialties || form.specialties}
          />
          <ProductizationList
            title="Enabled Workspaces"
            items={(configuredTenantProfile.workspaces || configuredTenantProfile.workspaceDefaults || []).map(
              (workspace) =>
                `${workspace.name || workspace.displayName} (${workspace.type})`
            )}
          />
          <ProductizationList
            title="Enabled Asset Packs"
            items={configuredTenantProfile.installedPackIds || form.packIds}
          />
          <ProductizationList
            title="Enabled Assets"
            items={[
              `${configuredTenantProfile.enabledAssets?.length || clientProfile.enabledAssets.length} assets enabled`,
              ...(configuredTenantProfile.enabledAssets || clientProfile.enabledAssets).slice(0, 8),
            ]}
          />
          <ProductizationList
            title="User roles"
            items={[
              configuredTenantProfile.roleProfileId
                ? `Default role: ${configuredTenantProfile.roleProfileId}`
                : 'Default role pending',
              ...((configuredTenantProfile.roleAssignments || []).map(
                (assignment) => `${assignment.email || 'invited user'}: ${assignment.roleProfileId}`
              )),
            ]}
          />
          <ProductizationList
            title="Default Dashboard"
            items={[
              `/dashboard`,
              `Default workspace: ${configuredTenantProfile.defaultDashboard?.workspaceId || clientProfile.defaultWorkspace}`,
            ]}
          />
          <ProductizationList
            title="Branding"
            items={[
              `Display: ${configuredTenantProfile.branding?.displayName || form.name}`,
              `Accent: ${configuredTenantProfile.branding?.accentColor || 'Default'}`,
            ]}
          />
          <ProductizationList
            title="Integrations"
            items={configuredTenantProfile.integrationsRequested || form.integrationSlugs}
          />
        </div>
      </PageShell>
    );
  }

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

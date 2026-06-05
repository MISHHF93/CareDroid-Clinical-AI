import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Card from '../../components/ui/card';
import Button from '../../components/ui/button';
import { useUserIdentity } from '../../contexts/UserIdentityContext';
import { ProductCatalogApi } from '../../services/productCatalogApi';
import { PlatformAssetsApi } from '../../services/platformAssetsApi';
import { PROFILE_ROLES } from '../../data/profileToolSegmentation';
import { getRegistryToolNavigation } from '../../navigation/registryToolLaunch';
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

export function ProductsIndexPage() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    ProductCatalogApi.listProducts()
      .then(setProducts)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <PageShell
      title="CareDroid Products"
      subtitle="Sellable hospital solutions packaged from asset packs — no duplicate tools."
      actions={
        <Link to="/plans">
          <Button variant="secondary">Compare plans</Button>
        </Link>
      }
    >
      {error && <p className="commercial-subtitle">{error}</p>}
      <div className="commercial-grid">
        {products.map((product) => (
          <Card key={product.id} className="commercial-card">
            <h2>{product.name}</h2>
            <p>{product.description}</p>
            <p>
              <strong>{product.packIds?.length || 0}</strong> solution packs
            </p>
            <Link to={`/products/${product.slug}`}>
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
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    ProductCatalogApi.getProductAssets(slug, organization?.id)
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

  const { product, packs, assetsByType } = detail;

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
            <li key={p.id}>{p.name}</li>
          ))}
        </ul>
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
      {Object.entries(assetsByType || {}).map(([type, assets]) => (
        <Card key={type} className="commercial-card" style={{ marginBottom: 12 }}>
          <h2>{type.replace(/_/g, ' ')}</h2>
          <ul>
            {(assets || []).map((a) => (
              <li key={a.id}>
                {a.title || a.id}
                {a.route && (
                  <Button
                    variant="ghost"
                    style={{ marginLeft: 8 }}
                    onClick={() => window.location.assign(a.route)}
                  >
                    Open
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ))}
      <Link to="/products">← All products</Link>
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
    if (organization?.branding?.accentColor) {
      setAccentColor(organization.branding.accentColor);
    }
  }, [organization?.id, organization?.settings, organization?.branding]);

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
        <Button variant="primary" onClick={save}>
          Save configuration
        </Button>
      </Card>
      <div className="commercial-actions">
        <Link to="/settings/organization/packs">
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
  'Specialties',
  'Departments',
  'Asset packs',
  'Integrations',
  'User roles',
  'Workspace setup',
];

export function OrganizationOnboardingPage() {
  const navigate = useNavigate();
  const { refreshPlatformContext } = useUserIdentity();
  const [step, setStep] = useState(0);
  const [packs, setPacks] = useState([]);
  const [roleProfiles, setRoleProfiles] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    slug: '',
    organizationType: 'hospital',
    country: '',
    specialties: [],
    departments: [],
    packIds: [],
    productIds: [],
    commercialPlanId: '',
    integrationSlugs: [],
    defaultRoleProfileId: 'emergency-physician',
    workspaceSetups: [
      {
        name: 'Clinical Operations',
        type: 'hospital',
        enabledToolIds: ['calculators', 'drug-check', 'lab-interp', 'protocols'],
        enabledModules: ['dashboard', 'tools'],
      },
    ],
  });

  useEffect(() => {
    PlatformAssetsApi.listPacks().then(setPacks).catch(() => setPacks([]));
    PlatformAssetsApi.listRoleProfiles().then(setRoleProfiles).catch(() => setRoleProfiles([]));
  }, []);

  const toggle = (key, value) => {
    setForm((prev) => {
      const set = new Set(prev[key]);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      return { ...prev, [key]: [...set] };
    });
  };

  const finish = async () => {
    setError('');
    try {
      await ProductCatalogApi.completeOnboarding({
        name: form.name,
        slug: form.slug || form.name.toLowerCase().replace(/\s+/g, '-'),
        organizationType: form.organizationType,
        country: form.country,
        specialties: form.specialties,
        departments: form.departments,
        packIds: form.packIds,
        productIds: form.productIds,
        commercialPlanId: form.commercialPlanId || undefined,
        integrationSlugs: form.integrationSlugs,
        defaultRoleProfileId: form.defaultRoleProfileId,
        workspaceSetups: form.workspaceSetups,
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
                onChange={(e) => setForm({ ...form, organizationType: e.target.value })}
              >
                {ORG_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </>
        );
      case 1:
        return (
          <div className="commercial-chip-list">
            {SPECIALTY_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className={`commercial-chip ${form.specialties.includes(s) ? 'selected' : ''}`}
                onClick={() => toggle('specialties', s)}
              >
                {s}
              </button>
            ))}
          </div>
        );
      case 2:
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
      case 3:
        return (
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
        );
      case 4:
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
      case 5:
        return (
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
        );
      case 6:
        return (
          <p className="commercial-subtitle">
            A default clinical workspace will be created. You can add more workspaces after setup.
          </p>
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

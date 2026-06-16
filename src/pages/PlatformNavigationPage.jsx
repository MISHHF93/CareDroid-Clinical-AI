import { Link } from 'react-router-dom';
import {
  ACCOUNT_UTILITY_NAV_ITEMS,
  ADVANCED_SIDEBAR_NAV_ITEMS,
  OPERATIONS_SIDEBAR_NAV_ITEMS,
  SOLUTIONS_SIDEBAR_NAV_ITEMS,
} from '../config/navigation.config';
import { CANONICAL_ROUTES } from '../config/routes.config';

const DIRECT_PLATFORM_ROUTE_PATHS = new Set([
  CANONICAL_ROUTES.workspace,
  CANONICAL_ROUTES.discover,
  CANONICAL_ROUTES.workspaces,
  CANONICAL_ROUTES.search,
  CANONICAL_ROUTES.knowledgeHub,
  CANONICAL_ROUTES.knowledgeBase,
  CANONICAL_ROUTES.notifications,
  CANONICAL_ROUTES.timeline,
  CANONICAL_ROUTES.customerPortal,
  CANONICAL_ROUTES.marketplace,
  CANONICAL_ROUTES.enterpriseReadiness,
  CANONICAL_ROUTES.platformAdmin,
  CANONICAL_ROUTES.tenantAdmin,
  CANONICAL_ROUTES.billing,
  CANONICAL_ROUTES.usage,
  CANONICAL_ROUTES.profile,
  CANONICAL_ROUTES.profileSettings,
  CANONICAL_ROUTES.profileToolPreferences,
  CANONICAL_ROUTES.executive,
  CANONICAL_ROUTES.products,
  CANONICAL_ROUTES.plans,
  CANONICAL_ROUTES.assetPacks,
  CANONICAL_ROUTES.departments,
  CANONICAL_ROUTES.serviceLines,
  CANONICAL_ROUTES.departmentIntelligence,
  CANONICAL_ROUTES.productIntelligence,
  CANONICAL_ROUTES.expansionOpportunities,
  CANONICAL_ROUTES.integrationsMarketplace,
  CANONICAL_ROUTES.integrationReadiness,
  CANONICAL_ROUTES.solutionBuilder,
  CANONICAL_ROUTES.valueTracking,
  CANONICAL_ROUTES.outcomes,
  CANONICAL_ROUTES.maturityAssessment,
  CANONICAL_ROUTES.successCenter,
  CANONICAL_ROUTES.customerSuccess,
  CANONICAL_ROUTES.specialties,
  CANONICAL_ROUTES.carePathways,
  CANONICAL_ROUTES.agents,
  CANONICAL_ROUTES.organization,
  CANONICAL_ROUTES.organizationSettings,
  CANONICAL_ROUTES.organizationPacks,
  CANONICAL_ROUTES.organizationAssets,
  CANONICAL_ROUTES.organizationIntelligence,
  CANONICAL_ROUTES.workflowMining,
  CANONICAL_ROUTES.workspaceDependencyGraph,
  CANONICAL_ROUTES.digitalTwin,
  CANONICAL_ROUTES.digitalTwinIntelligence,
  CANONICAL_ROUTES.workflows,
  CANONICAL_ROUTES.automation,
  CANONICAL_ROUTES.automationAnalytics,
  CANONICAL_ROUTES.platformAnalytics,
  CANONICAL_ROUTES.configurationStudio,
  CANONICAL_ROUTES.onboarding,
  CANONICAL_ROUTES.protocols,
  CANONICAL_ROUTES.clinicalDecisionSupport,
  CANONICAL_ROUTES.documentation,
  CANONICAL_ROUTES.knowledgeGraph,
  CANONICAL_ROUTES.predictiveAnalytics,
  CANONICAL_ROUTES.research,
  CANONICAL_ROUTES.laboratory,
  CANONICAL_ROUTES.medical3dViewer,
  CANONICAL_ROUTES.developerCatalog,
  CANONICAL_ROUTES.simulation,
  CANONICAL_ROUTES.simulationOutcomes,
  CANONICAL_ROUTES.competencies,
  CANONICAL_ROUTES.credentials,
  CANONICAL_ROUTES.systemHealth,
  CANONICAL_ROUTES.saasHealth,
  CANONICAL_ROUTES.featureFlags,
  CANONICAL_ROUTES.plugins,
  CANONICAL_ROUTES.dependencyMap,
  CANONICAL_ROUTES.dependencyGraph,
  CANONICAL_ROUTES.governanceRegistry,
  CANONICAL_ROUTES.audit,
  CANONICAL_ROUTES.dataLineage,
  CANONICAL_ROUTES.selfDiagnostics,
  CANONICAL_ROUTES.platformLearningEngine,
  CANONICAL_ROUTES.brain,
  CANONICAL_ROUTES.businessBrain,
  CANONICAL_ROUTES.aiModels,
  CANONICAL_ROUTES.aiEvaluation,
  CANONICAL_ROUTES.aiGovernance,
  CANONICAL_ROUTES.assets,
  CANONICAL_ROUTES.artifacts,
]);

const PLATFORM_ROUTE_DESTINATION_OVERRIDES = Object.freeze({
  [CANONICAL_ROUTES.recommendations]: `${CANONICAL_ROUTES.emergencyTools}?source=recommendations&filter=recommended`,
  [CANONICAL_ROUTES.hospitalMap]: `${CANONICAL_ROUTES.emergencyTools}?source=operations&filter=operations&q=hospital-map`,
  [CANONICAL_ROUTES.medicalIot]: `${CANONICAL_ROUTES.emergencyTools}?source=operations&filter=operations&q=medical-iot-dashboard&open=medical-iot-dashboard`,
  [CANONICAL_ROUTES.devices]: `${CANONICAL_ROUTES.emergencyTools}?source=operations&filter=operations&q=device-fleet-management&open=device-fleet-management`,
  [CANONICAL_ROUTES.fleetMap]: `${CANONICAL_ROUTES.emergencyTools}?source=operations&filter=operations&q=fleet-live-map&open=fleet-live-map`,
  [CANONICAL_ROUTES.liveMap]: `${CANONICAL_ROUTES.emergencyTools}?source=operations&filter=operations&q=live-tracking-map&open=live-tracking-map`,
  [CANONICAL_ROUTES.fleetCommand]: `${CANONICAL_ROUTES.emergencyTools}?source=operations&filter=operations&q=fleet-command&open=fleet-command`,
  [CANONICAL_ROUTES.emergencyAiGovernance]: CANONICAL_ROUTES.aiGovernance,
  [CANONICAL_ROUTES.security]: `${CANONICAL_ROUTES.emergencyTools}?source=governance&filter=all&q=security`,
  [CANONICAL_ROUTES.regulatory]: `${CANONICAL_ROUTES.emergencyTools}?source=governance&filter=all&q=regulatory`,
});

const SECTIONS = Object.freeze([
  Object.freeze({
    id: 'account',
    title: 'Account And Workspace',
    description: 'Search, knowledge, notifications, marketplace, billing, and tenant entry points.',
    items: ACCOUNT_UTILITY_NAV_ITEMS,
  }),
  Object.freeze({
    id: 'solutions',
    title: 'Solutions',
    description: 'Product, pack, department, integration, success, and value-tracking surfaces.',
    items: SOLUTIONS_SIDEBAR_NAV_ITEMS,
  }),
  Object.freeze({
    id: 'operations',
    title: 'Operations',
    description: 'Workflow mining, dependency graphs, digital twin, device, fleet, and usage routes.',
    items: OPERATIONS_SIDEBAR_NAV_ITEMS,
  }),
  Object.freeze({
    id: 'advanced',
    title: 'Advanced And Admin',
    description: 'Organization, configuration, observability, governance, assets, and intelligence pages.',
    items: ADVANCED_SIDEBAR_NAV_ITEMS,
  }),
]);

function uniqueItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.path || seen.has(item.path)) return false;
    seen.add(item.path);
    return true;
  });
}

function fallbackPlatformDestination(item) {
  const query = encodeURIComponent(item.id || item.label || item.path);
  return `${CANONICAL_ROUTES.emergencyTools}?source=platform&filter=all&q=${query}`;
}

export function resolvePlatformNavigationDestination(item) {
  if (!item?.path) {
    return {
      to: CANONICAL_ROUTES.workspace,
      direct: false,
      note: 'Missing path, returning to the platform hub.',
    };
  }

  if (DIRECT_PLATFORM_ROUTE_PATHS.has(item.path)) {
    return { to: item.path, direct: true, note: 'Mounted route' };
  }

  const mappedPath = PLATFORM_ROUTE_DESTINATION_OVERRIDES[item.path] || fallbackPlatformDestination(item);
  return {
    to: mappedPath,
    direct: mappedPath === item.path,
    note: mappedPath === item.path ? 'Mounted route' : `Mapped from ${item.path}`,
  };
}

function PlatformSection({ section }) {
  const items = uniqueItems(section.items);
  if (!items.length) return null;

  return (
    <section className="platform-navigation-section" aria-labelledby={`platform-nav-${section.id}`}>
      <div className="platform-navigation-section__header">
        <h2 id={`platform-nav-${section.id}`}>{section.title}</h2>
        <p>{section.description}</p>
      </div>
      <div className="platform-navigation-grid">
        {items.map((item) => {
          const destination = resolvePlatformNavigationDestination(item);
          return (
            <Link
              key={`${section.id}-${item.id}`}
              to={destination.to}
              className="platform-navigation-card"
              aria-label={`${item.label} (${destination.direct ? item.path : destination.to})`}
            >
              <span>{item.label}</span>
              <small>{item.path}</small>
              {!destination.direct ? <em>{destination.note}</em> : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function PlatformNavigationPage() {
  const totalRoutes = SECTIONS.reduce((count, section) => count + uniqueItems(section.items).length, 0);

  return (
    <section className="platform-navigation-page" aria-labelledby="platform-navigation-title">
      <style>
        {`
          .platform-navigation-page {
            min-height: 100%;
            display: grid;
            gap: 20px;
            align-content: start;
            padding: 20px;
            background: var(--color-background, #0A0E1A);
            color: var(--color-text-primary, #F9FAFB);
          }
          .platform-navigation-hero,
          .platform-navigation-section {
            border: 1px solid var(--color-border-subtle, #1F2937);
            border-radius: var(--radius-xl, 16px);
            background: var(--color-card, #172033);
            padding: 18px;
          }
          .platform-navigation-hero {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            align-items: flex-start;
          }
          .platform-navigation-eyebrow,
          .platform-navigation-route-count {
            color: var(--status-info, #60A5FA);
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .platform-navigation-hero h1,
          .platform-navigation-section h2 {
            margin: 4px 0;
          }
          .platform-navigation-hero p,
          .platform-navigation-section p {
            max-width: 860px;
            margin: 0;
            color: var(--color-text-secondary, #9CA3AF);
            line-height: 1.5;
          }
          .platform-navigation-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 10px;
            margin-top: 14px;
          }
          .platform-navigation-card {
            display: grid;
            gap: 6px;
            border: 1px solid var(--color-border-subtle, #1F2937);
            border-radius: var(--radius-lg, 12px);
            background: var(--color-surface, #111827);
            color: inherit;
            padding: 12px;
            text-decoration: none;
          }
          .platform-navigation-card:hover,
          .platform-navigation-card:focus-visible {
            border-color: var(--status-info, #60A5FA);
            outline: none;
          }
          .platform-navigation-card span {
            font-weight: 700;
          }
          .platform-navigation-card small {
            color: var(--color-text-muted, #6B7280);
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          }
          .platform-navigation-card em {
            color: var(--status-warning, #F59E0B);
            font-size: 12px;
            font-style: normal;
          }
        `}
      </style>

      <header className="platform-navigation-hero">
        <div>
          <span className="platform-navigation-eyebrow">Platform Navigation</span>
          <h1 id="platform-navigation-title">CareDroid App Map</h1>
          <p>
            Use this hub to move between the Emergency OS and the broader platform surfaces that
            are registered in the app route inventory.
          </p>
        </div>
        <strong className="platform-navigation-route-count">{totalRoutes} routes</strong>
      </header>

      {SECTIONS.map((section) => (
        <PlatformSection key={section.id} section={section} />
      ))}
    </section>
  );
}

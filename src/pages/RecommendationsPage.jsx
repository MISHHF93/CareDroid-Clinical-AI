import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import {
  RECOMMENDATION_GROUPS,
  buildRecommendationEngine,
} from '../data/recommendationEngine';
import { ProductCatalogApi } from '../services/productCatalogApi';
import {
  trackRoleAiRequest,
  trackRoleSearchBehavior,
  trackRoleWorkflowLaunch,
} from '../services/roleIntelligenceTelemetry';
import {
  applyRegistryToolLaunch,
  getRegistryToolNavigation,
} from '../navigation/registryToolLaunch';
import './RecommendationsPage.css';

const GROUP_FILTERS = [{ id: 'all', label: 'All' }, ...RECOMMENDATION_GROUPS];

function normalizeProducts(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function recommendationMatchesQuery(item, query) {
  if (!query.trim()) return true;
  const haystack = [
    item.title,
    item.summary,
    item.reason,
    item.type,
    ...(item.reasons || []),
    ...(item.sourceSignals || []),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function RecommendationCard({ recommendation, onOpen }) {
  const isTool = recommendation.type === 'tools';
  const toolPlan = isTool ? getRegistryToolNavigation(recommendation.item?.id || recommendation.id) : null;
  const href = isTool
    ? `${toolPlan?.pathname || recommendation.route}${toolPlan?.search || ''}`
    : recommendation.route || '/marketplace';

  return (
    <article className="recommendation-card">
      <div className="recommendation-card__header">
        <span>{recommendation.type}</span>
        <strong>{recommendation.score}</strong>
      </div>
      <h3>{recommendation.title}</h3>
      <p>{recommendation.summary || recommendation.reason}</p>
      <p className="recommendation-card__reason">{recommendation.reason}</p>
      <div className="recommendation-card__signals" aria-label={`${recommendation.title} source signals`}>
        {(recommendation.sourceSignals || []).slice(0, 4).map((signal) => (
          <span key={signal}>{signal}</span>
        ))}
      </div>
      {isTool ? (
        <button type="button" onClick={() => onOpen(recommendation)}>
          Open tool
        </button>
      ) : (
        <Link to={href} onClick={() => onOpen(recommendation)}>
          Open recommendation
        </Link>
      )}
    </article>
  );
}

export default function RecommendationsPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const toolPreferences = useToolPreferences();
  const workspaceContext = useWorkspace();
  const {
    account,
    preferences,
    activeWorkspace,
    workspaceState,
    organization,
    platformContext,
    roleProfile,
    activity,
    memoryFabricContext,
    recordActivity,
  } = useUserIdentity();
  const [productRows, setProductRows] = useState([]);
  const [productError, setProductError] = useState('');
  const [query, setQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    ProductCatalogApi.listProductBuilder(organization?.id)
      .then((payload) => {
        if (!cancelled) setProductRows(normalizeProducts(payload));
      })
      .catch((error) => {
        if (!cancelled) {
          setProductRows([]);
          setProductError(error?.message || 'Product recommendations are temporarily unavailable.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [organization?.id]);

  const recommendationModel = useMemo(
    () =>
      buildRecommendationEngine({
        user,
        account,
        preferences,
        activeWorkspace,
        workspaceState,
        workspaceContext,
        organization,
        platformContext,
        roleProfile,
        toolPreferences,
        activity,
        memoryFabricContext,
        productRows,
        searchSignals: query
          ? [{ filter: groupFilter, searchLength: query.trim().length, title: `${groupFilter} search` }]
          : [],
      }),
    [
      account,
      activeWorkspace,
      activity,
      groupFilter,
      memoryFabricContext,
      organization,
      platformContext,
      preferences,
      productRows,
      query,
      roleProfile,
      toolPreferences,
      user,
      workspaceContext,
      workspaceState,
    ],
  );

  const filteredGroups = useMemo(() => {
    return Object.fromEntries(
      RECOMMENDATION_GROUPS.map((group) => {
        const items = recommendationModel.groups[group.id] || [];
        const visible =
          groupFilter === 'all' || groupFilter === group.id
            ? items.filter((item) => recommendationMatchesQuery(item, query))
            : [];
        return [group.id, visible];
      }),
    );
  }, [groupFilter, query, recommendationModel.groups]);

  const filteredCount = Object.values(filteredGroups).flat().length;
  const profile = recommendationModel.profile || {};

  useEffect(() => {
    trackRoleSearchBehavior({
      search: query,
      resultCount: filteredCount,
      filter: groupFilter,
      profile,
      source: 'recommendations',
    });
  }, [filteredCount, groupFilter, profile, query]);

  const handleOpen = (recommendation) => {
    recordActivity?.({
      type: 'recommendation_opened',
      title: recommendation.title,
      route: recommendation.route,
      metadata: {
        recommendationId: recommendation.id,
        recommendationType: recommendation.type,
        score: recommendation.score,
        source: 'recommendations',
      },
    });

    if (recommendation.type === 'tools') {
      applyRegistryToolLaunch(recommendation.item?.id, {
        navigate,
        recordToolAccess: toolPreferences.recordToolAccess,
        roleIntelligenceProfile: profile,
        replace: false,
        state: { source: 'recommendations', recommendationId: recommendation.id },
      });
      return;
    }

    if (recommendation.type === 'aiAgents') {
      trackRoleAiRequest({
        profile,
        agentId: recommendation.item?.id,
        source: 'recommendations',
        route: recommendation.route,
      });
    }
    if (recommendation.type === 'packs' && /workflow/i.test(recommendation.item?.category || recommendation.id)) {
      trackRoleWorkflowLaunch({
        profile,
        workflowId: recommendation.item?.id,
        route: recommendation.route,
        source: 'recommendations',
      });
    }
  };

  return (
    <main className="recommendations-page">
      <header className="recommendations-hero">
        <div>
          <p className="recommendations-eyebrow">Recommendation engine</p>
          <h1>Recommended Capabilities</h1>
          <p>
            Discover relevant tools, packs, products, AI agents, simulations, and protocols from your
            role, workspace, organization, usage, search, simulation, and workflow signals.
          </p>
        </div>
        <div className="recommendations-profile" aria-label="Recommendation profile">
          <span>{profile.roleLabel || 'CareDroid profile'}</span>
          <strong>{profile.workspaceLabel || activeWorkspace?.name || 'Current workspace'}</strong>
        </div>
      </header>

      <section className="recommendations-stats" aria-label="Recommendation summary">
        <div>
          <span>Total</span>
          <strong>{recommendationModel.summary.total}</strong>
        </div>
        {RECOMMENDATION_GROUPS.map((group) => (
          <div key={group.id}>
            <span>{group.label}</span>
            <strong>{recommendationModel.summary.groups[group.id] || 0}</strong>
          </div>
        ))}
      </section>

      <section className="recommendations-controls" aria-label="Recommendation filters">
        <label>
          Search recommendations
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tools, packs, agents, simulations, protocols..."
          />
        </label>
        <label>
          Type
          <select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
            {GROUP_FILTERS.map((group) => (
              <option key={group.id} value={group.id}>
                {group.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      {productError ? <p className="recommendations-notice">{productError}</p> : null}

      <div className="recommendations-sections">
        {RECOMMENDATION_GROUPS.map((group) => {
          const items = filteredGroups[group.id] || [];
          return (
            <section key={group.id} className="recommendations-section">
              <header>
                <div>
                  <h2>{group.label}</h2>
                  <p>{items.length} ranked recommendations</p>
                </div>
              </header>
              {items.length ? (
                <div className="recommendations-grid">
                  {items.map((recommendation) => (
                    <RecommendationCard
                      key={recommendation.id}
                      recommendation={recommendation}
                      onOpen={handleOpen}
                    />
                  ))}
                </div>
              ) : (
                <p className="recommendations-empty">
                  No {group.label.toLowerCase()} match the current filters yet.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}

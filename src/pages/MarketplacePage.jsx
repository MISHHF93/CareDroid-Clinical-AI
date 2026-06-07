import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_ITEMS,
  filterMarketplaceItems,
  getMarketplaceCategoryLabel,
} from '../data/marketplaceCatalog';
import { useTenantContext } from '../contexts/TenantContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import './MarketplacePage.css';

const STORAGE_PREFIX = 'caredroid.marketplace.installations';

function storageKey(organizationId) {
  return `${STORAGE_PREFIX}.${organizationId || 'tenant'}`;
}

function readInstallations(organizationId) {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(storageKey(organizationId)) || '{}');
  } catch {
    return {};
  }
}

function writeInstallations(organizationId, installations) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(organizationId), JSON.stringify(installations));
}

function categoryCounts(items, installations) {
  return MARKETPLACE_CATEGORIES.map((category) => {
    const categoryItems = items.filter((item) => item.category === category);
    const enabled = categoryItems.filter((item) => installations[item.id]?.enabled).length;
    return {
      category,
      total: categoryItems.length,
      enabled,
    };
  });
}

export default function MarketplacePage() {
  const { tenantContext } = useTenantContext();
  const { platformContext } = useUserIdentity();
  const organizationId = tenantContext?.organizationId || platformContext?.organization?.id || 'current';
  const organizationName =
    tenantContext?.organizationName || platformContext?.organization?.name || 'Current organization';
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [installations, setInstallations] = useState(() => readInstallations(organizationId));

  useEffect(() => {
    setInstallations(readInstallations(organizationId));
  }, [organizationId]);

  const results = useMemo(
    () => filterMarketplaceItems({ query, category }),
    [category, query],
  );
  const counts = useMemo(
    () => categoryCounts(MARKETPLACE_ITEMS, installations),
    [installations],
  );
  const installedCount = Object.values(installations).filter((item) => item?.installed).length;
  const enabledCount = Object.values(installations).filter((item) => item?.enabled).length;

  const updateInstallation = (itemId, patch) => {
    setInstallations((current) => {
      const now = new Date().toISOString();
      const next = {
        ...current,
        [itemId]: {
          installed: true,
          enabled: true,
          installedAt: current[itemId]?.installedAt || now,
          ...current[itemId],
          ...patch,
          updatedAt: now,
        },
      };
      writeInstallations(organizationId, next);
      return next;
    });
  };

  return (
    <div className="marketplace-page">
      <header className="marketplace-hero">
        <div>
          <p className="marketplace-eyebrow">Extensibility foundation</p>
          <h1>Marketplace</h1>
          <p>
            Discover modular CareDroid capabilities, install them for {organizationName}, and enable
            or disable installed items without redeploying the platform.
          </p>
        </div>
        <div className="marketplace-hero-stats" aria-label="Marketplace installation summary">
          <div>
            <span>Installed</span>
            <strong>{installedCount}</strong>
          </div>
          <div>
            <span>Enabled</span>
            <strong>{enabledCount}</strong>
          </div>
        </div>
      </header>

      <section className="marketplace-controls" aria-label="Marketplace filters">
        <label>
          Search marketplace
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search asset packs, workflows, AI agents, integrations..."
          />
        </label>
        <label>
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {MARKETPLACE_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {getMarketplaceCategoryLabel(item)}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="marketplace-categories" aria-label="Marketplace categories">
        {counts.map((item) => (
          <button
            key={item.category}
            type="button"
            className={category === item.category ? 'marketplace-category is-active' : 'marketplace-category'}
            onClick={() => setCategory(category === item.category ? 'all' : item.category)}
          >
            <span>{getMarketplaceCategoryLabel(item.category)}</span>
            <strong>{item.enabled}/{item.total}</strong>
            <small>enabled</small>
          </button>
        ))}
      </section>

      <section className="marketplace-results" aria-label="Marketplace items">
        <header>
          <h2>{category === 'all' ? 'All Marketplace Items' : getMarketplaceCategoryLabel(category)}</h2>
          <span>{results.length} items</span>
        </header>

        <div className="marketplace-grid">
          {results.map((item) => {
            const state = installations[item.id];
            const installed = Boolean(state?.installed);
            const enabled = Boolean(state?.enabled);
            return (
              <article key={item.id} className="marketplace-card">
                <div className="marketplace-card-header">
                  <span className="marketplace-card-category">
                    {getMarketplaceCategoryLabel(item.category)}
                  </span>
                  <span className={enabled ? 'marketplace-state is-enabled' : installed ? 'marketplace-state is-disabled' : 'marketplace-state'}>
                    {enabled ? 'Enabled' : installed ? 'Disabled' : 'Available'}
                  </span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <dl>
                  <div>
                    <dt>Owner</dt>
                    <dd>{item.owner}</dd>
                  </div>
                  <div>
                    <dt>Entitlement</dt>
                    <dd>{item.entitlement}</dd>
                  </div>
                </dl>
                <div className="marketplace-tags">
                  {(item.tags || []).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <div className="marketplace-actions">
                  {!installed ? (
                    <button type="button" onClick={() => updateInstallation(item.id, { enabled: true })}>
                      Install
                    </button>
                  ) : enabled ? (
                    <button
                      type="button"
                      className="marketplace-secondary-action"
                      onClick={() => updateInstallation(item.id, { enabled: false })}
                    >
                      Disable
                    </button>
                  ) : (
                    <button type="button" onClick={() => updateInstallation(item.id, { enabled: true })}>
                      Enable
                    </button>
                  )}
                  <Link to={item.route}>Open</Link>
                </div>
              </article>
            );
          })}
          {!results.length && (
            <div className="marketplace-empty" role="status">
              No marketplace items matched your filters. Try another category or a broader search.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

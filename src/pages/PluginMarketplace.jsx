import React, { useMemo, useState } from 'react';
import {
  PLUGIN_MARKETPLACE_ACTIONS,
  buildPluginMarketplace,
  applyPluginMarketplaceAction,
  loadPluginMarketplaceState,
  savePluginMarketplaceState,
} from '../data/pluginMarketplace';
import './PluginMarketplace.css';

const TYPE_FILTERS = ['all', 'calculator', 'protocol', 'simulation', 'workflow', 'dashboard', 'ai-extension'];

function PluginActionButton({ item, onAction }) {
  if (!item.installed) {
    return (
      <button type="button" className="plugin-marketplace-action primary" onClick={() => onAction(item.id, PLUGIN_MARKETPLACE_ACTIONS.INSTALL)}>
        Install
      </button>
    );
  }

  return (
    <div className="plugin-marketplace-actions">
      <button
        type="button"
        className="plugin-marketplace-action"
        onClick={() =>
          onAction(
            item.id,
            item.enabled ? PLUGIN_MARKETPLACE_ACTIONS.DISABLE : PLUGIN_MARKETPLACE_ACTIONS.ENABLE
          )
        }
      >
        {item.enabled ? 'Disable' : 'Enable'}
      </button>
      <button
        type="button"
        className="plugin-marketplace-action danger"
        onClick={() => onAction(item.id, PLUGIN_MARKETPLACE_ACTIONS.UNINSTALL)}
      >
        Uninstall
      </button>
    </div>
  );
}

function PluginCard({ item, onAction }) {
  return (
    <article className="plugin-marketplace-card">
      <div className="plugin-marketplace-card__header">
        <div>
          <span className="plugin-marketplace-type">{item.typeLabel}</span>
          <h2>{item.name}</h2>
        </div>
        <span className={`plugin-marketplace-state ${item.enabled ? 'enabled' : item.installed ? 'disabled' : 'available'}`}>
          {item.enabled ? 'Enabled' : item.installed ? 'Disabled' : 'Available'}
        </span>
      </div>

      <p>{item.description}</p>

      <dl className="plugin-marketplace-meta">
        <div>
          <dt>Owner</dt>
          <dd>{item.owner}</dd>
        </div>
        <div>
          <dt>Version</dt>
          <dd>{item.version}</dd>
        </div>
        <div>
          <dt>Lifecycle</dt>
          <dd>{item.lifecycleStatus}</dd>
        </div>
        <div>
          <dt>Unified inventory</dt>
          <dd>{item.inventoryLinked ? `Linked (${item.inventoryStatus})` : 'Missing'}</dd>
        </div>
      </dl>

      <div className="plugin-marketplace-tags" aria-label={`${item.name} metadata`}>
        <span>{item.riskLevel} risk</span>
        <span>{item.permissionLogic} permissions</span>
        {item.permissions.map((permission) => (
          <span key={permission}>{permission}</span>
        ))}
      </div>

      {!item.validation.valid && (
        <div className="plugin-marketplace-validation" role="alert">
          <strong>Validation failed</strong>
          {item.validation.errors.map((error) => (
            <span key={error}>{error}</span>
          ))}
        </div>
      )}

      <div className="plugin-marketplace-card__footer">
        <a href={item.route}>Open destination</a>
        <PluginActionButton item={item} onAction={onAction} />
      </div>
    </article>
  );
}

export default function PluginMarketplace() {
  const [marketplaceState, setMarketplaceState] = useState(() => loadPluginMarketplaceState());
  const [typeFilter, setTypeFilter] = useState('all');
  const marketplace = useMemo(
    () => buildPluginMarketplace({ state: marketplaceState }),
    [marketplaceState]
  );

  const visibleItems = useMemo(() => {
    if (typeFilter === 'all') return marketplace.items;
    return marketplace.items.filter((item) => item.type === typeFilter);
  }, [marketplace.items, typeFilter]);

  const handleAction = (pluginId, action) => {
    setMarketplaceState((current) => {
      const next = applyPluginMarketplaceAction(current, pluginId, action);
      savePluginMarketplaceState(next);
      return next;
    });
  };

  return (
    <div className="plugin-marketplace-page">
      <section className="plugin-marketplace-hero">
        <span>Plugin Framework</span>
        <h1>Plugin Marketplace</h1>
        <p>
          Install, enable, disable, and validate CareDroid plugin extensions while keeping each
          marketplace entry tied to the unified platform inventory.
        </p>
      </section>

      <section className="plugin-marketplace-summary" aria-label="Plugin marketplace summary">
        <div>
          <strong>{marketplace.summary.total}</strong>
          <span>Total plugins</span>
        </div>
        <div>
          <strong>{marketplace.summary.installed}</strong>
          <span>Installed</span>
        </div>
        <div>
          <strong>{marketplace.summary.enabled}</strong>
          <span>Enabled</span>
        </div>
        <div>
          <strong>{marketplace.summary.invalid}</strong>
          <span>Validation issues</span>
        </div>
      </section>

      <section className="plugin-marketplace-validation-panel" aria-label="Marketplace validation">
        <h2>Validation</h2>
        {marketplace.validation.valid ? (
          <p>All plugin registrations are valid and linked into the unified inventory.</p>
        ) : (
          <ul>
            {marketplace.validation.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="plugin-marketplace-toolbar" aria-label="Plugin filters">
        {TYPE_FILTERS.map((type) => (
          <button
            type="button"
            key={type}
            className={typeFilter === type ? 'active' : ''}
            onClick={() => setTypeFilter(type)}
          >
            {type === 'all'
              ? 'All'
              : marketplace.summary.types.find((entry) => entry.type === type)?.label || type}
          </button>
        ))}
      </section>

      <section className="plugin-marketplace-grid" aria-label="Plugin marketplace catalog">
        {visibleItems.map((item) => (
          <PluginCard key={item.id} item={item} onAction={handleAction} />
        ))}
      </section>
    </div>
  );
}

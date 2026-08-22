import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard, VisualizationPanel } from '../../components/dashboard/DashboardVisualizations';
import { CategoryBarChart } from '../../components/dashboard/DashboardCharts';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import {
  applyPluginMarketplaceAction,
  buildPluginMarketplace,
  loadPluginMarketplaceState,
  PLUGIN_MARKETPLACE_ACTIONS,
  savePluginMarketplaceState,
} from '../../data/pluginMarketplace';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import { buildPluginTypeChart } from '../../utils/platformSaasChartModel';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import './PluginMarketplace.css';

export default function PluginMarketplace() {
  useRouteChromeRegistration({ title: 'Plugin Marketplace' });
  const [marketplaceState, setMarketplaceState] = useState(() => loadPluginMarketplaceState());
  const marketplace = useMemo(
    () => buildPluginMarketplace({ state: marketplaceState }),
    [marketplaceState],
  );
  const typeChart = useMemo(() => buildPluginTypeChart(marketplace), [marketplace]);

  const applyAction = (pluginId: string, action: string) => {
    const next = applyPluginMarketplaceAction(marketplaceState, pluginId, action);
    savePluginMarketplaceState(next);
    setMarketplaceState(next);
  };

  return (
    <main className="plugin-marketplace-page" aria-label="Plugin marketplace">
      <header className="plugin-marketplace-page__header">
        <div className="plugin-marketplace-page__title-row">
          <GraphicIconBadge iconKey="route" accent="brand" size="md" />
          <div>
            <p className="plugin-marketplace-page-title-text" data-testid="cd-page-title-text">Plugin Marketplace</p>
            <p>Install, enable, and validate CareDroid plugins linked to the unified tool inventory.</p>
          </div>
        </div>
        <div className="plugin-marketplace-page__actions">
          <Link to={CANONICAL_ROUTES.discover}>Discover capabilities</Link>
          <Link to={CANONICAL_ROUTES.governanceRegistry}>Governance registry</Link>
          <Link to={CANONICAL_ROUTES.platformAnalytics}>Platform analytics</Link>
          <Link to={CANONICAL_ROUTES.dashboard}>Command dashboard</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Plugin marketplace source state"
        states={[DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.LOCAL_ONLY]}
        details="Browser-local install state with unified inventory validation. Plugin registry metadata is demo-sourced."
      />

      <div className="plugin-marketplace-page__metrics" role="group" aria-label="Plugin marketplace summary metrics">
        <MetricCard label="Total plugins" value={String(marketplace.summary.total)} hint="Registered extensions" tone="neutral" />
        <MetricCard label="Installed" value={String(marketplace.summary.installed)} hint={`${marketplace.summary.available} available`} tone="good" />
        <MetricCard label="Enabled" value={String(marketplace.summary.enabled)} hint={`${marketplace.summary.disabled} disabled`} tone="neutral" />
        <MetricCard
          label="Validation"
          value={marketplace.validation.valid ? 'Valid' : 'Issues'}
          hint={`${marketplace.summary.invalid} invalid`}
          tone={marketplace.validation.valid ? 'good' : 'warning'}
        />
      </div>

      <div className="plugin-marketplace-page__charts">
        <VisualizationPanel
          title="Plugin types"
          description="Calculator, protocol, simulation, workflow, dashboard, and AI extension distribution."
          badge="Types"
        >
          <CategoryBarChart
            data={typeChart}
            title="Plugin types"
            color="var(--app-chart-1)"
            emptyMessage="Type chart appears when plugins are registered."
          />
        </VisualizationPanel>
        <VisualizationPanel
          title="Inventory linkage"
          description="Plugins projected into the unified CareDroid tool inventory."
          badge="Inventory"
        >
          <p className="plugin-marketplace-page__stat">
            {marketplace.items.filter((item) => item.inventoryLinked).length} of {marketplace.items.length} plugins
            linked to inventory records.
          </p>
        </VisualizationPanel>
      </div>

      <section className="plugin-marketplace-page__panel" aria-label="Plugin catalog">
        <h2>Plugin catalog</h2>
        <p>Install or toggle plugins for your workspace. Changes persist in local browser storage.</p>
        <div className="plugin-marketplace-page__table" role="table" aria-label="Plugin catalog table">
          <div className="plugin-marketplace-page__table-head" role="row">
            <span role="columnheader">Plugin</span>
            <span role="columnheader">Type</span>
            <span role="columnheader">Risk</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Actions</span>
          </div>
          {marketplace.items.map((item) => (
            <div key={item.id} className="plugin-marketplace-page__table-row" role="row">
              <span role="cell">
                <strong>{item.name}</strong>
                <span className="plugin-marketplace-page__sub">v{item.version}</span>
              </span>
              <span role="cell">{item.typeLabel}</span>
              <span role="cell">{item.riskLevel}</span>
              <span role="cell">
                {item.installed ? (item.enabled ? 'Enabled' : 'Disabled') : 'Not installed'}
              </span>
              <span role="cell" className="plugin-marketplace-page__actions-cell">
                {!item.installed ? (
                  <button type="button" onClick={() => applyAction(item.id, PLUGIN_MARKETPLACE_ACTIONS.INSTALL)}>
                    Install
                  </button>
                ) : null}
                {item.installed && !item.enabled ? (
                  <button type="button" onClick={() => applyAction(item.id, PLUGIN_MARKETPLACE_ACTIONS.ENABLE)}>
                    Enable
                  </button>
                ) : null}
                {item.installed && item.enabled ? (
                  <button type="button" onClick={() => applyAction(item.id, PLUGIN_MARKETPLACE_ACTIONS.DISABLE)}>
                    Disable
                  </button>
                ) : null}
                {item.installed ? (
                  <button
                    type="button"
                    className="plugin-marketplace-page__danger"
                    onClick={() => applyAction(item.id, PLUGIN_MARKETPLACE_ACTIONS.UNINSTALL)}
                  >
                    Uninstall
                  </button>
                ) : null}
                <Link to={item.route}>Open</Link>
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
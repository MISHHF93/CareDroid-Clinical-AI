import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard, VisualizationPanel } from '../../components/dashboard/DashboardVisualizations';
import { CategoryBarChart } from '../../components/dashboard/DashboardCharts';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { buildProductIntelligenceLayer } from '../../data/productIntelligenceLayer';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import {
  buildProductAdoptionChart,
  buildProductHealthChart,
  productHealthTone,
} from '../../utils/platformSaasChartModel';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import './CommercialIntelligence.css';

export function ProductIntelligenceLayerPage() {
  useRouteChromeRegistration({ title: 'Product Intelligence' });
  const layer = useMemo(() => buildProductIntelligenceLayer(), []);
  const healthChart = useMemo(() => buildProductHealthChart(layer.products), [layer.products]);
  const adoptionChart = useMemo(() => buildProductAdoptionChart(layer.products), [layer.products]);

  return (
    <main className="commercial-page" aria-label="Product intelligence">
      <header className="commercial-page__header">
        <div className="commercial-page__title-row">
          <GraphicIconBadge iconKey="chart-bar" accent="brand" size="md" />
          <div>
            <p className="commercial-page-title-text" data-testid="cd-page-title-text">Product Intelligence</p>
            <p>Product → pack → asset value chains with adoption, engagement, outcomes, and ROI.</p>
          </div>
        </div>
        <div className="commercial-page__actions">
          <Link to={CANONICAL_ROUTES.expansionOpportunities}>Expansion opportunities</Link>
          <Link to={CANONICAL_ROUTES.maturityAssessment}>Maturity assessment</Link>
          <Link to={CANONICAL_ROUTES.organizationIntelligence}>Organization intelligence</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Product intelligence source state"
        states={[DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.SIMULATED]}
        details="Demo product layer with adoption, engagement, outcome, and ROI scoring across emergency, operations, and governance suites."
      />

      <div className="commercial-page__metrics" role="group" aria-label="Product intelligence summary metrics">
        <MetricCard label="Products" value={String(layer.summary.productCount)} hint="Tracked solutions" tone="neutral" />
        <MetricCard label="Avg health" value={String(layer.summary.averageHealth)} hint="Composite score" tone="good" />
        <MetricCard label="Avg ROI" value={String(layer.summary.averageRoi)} hint="Value score" tone="good" />
        <MetricCard
          label="Est. value"
          value={`$${(layer.summary.totalEstimatedValue / 1000).toFixed(0)}k`}
          hint="Demo portfolio value"
          tone="neutral"
        />
      </div>

      <div className="commercial-page__charts">
        <VisualizationPanel title="Product health" description="Adoption, engagement, outcomes, and ROI composite." badge="Health">
          <CategoryBarChart data={healthChart} title="Product health" color="var(--app-chart-1)" emptyMessage="Health chart appears when products are registered." />
        </VisualizationPanel>
        <VisualizationPanel title="Adoption scores" description="Pack activation, asset coverage, and department spread." badge="Adoption">
          <CategoryBarChart data={adoptionChart} title="Adoption scores" color="var(--app-chart-4)" emptyMessage="Adoption chart appears when products are registered." />
        </VisualizationPanel>
      </div>

      {layer.products.map((product) => (
        <section key={product.id} className="commercial-page__panel" aria-label={product.name}>
          <div className="commercial-page__panel-head">
            <div>
              <h2>{product.name}</h2>
              <p>{product.packs.join(' · ')}</p>
            </div>
            <span className={`commercial-page__pill commercial-page__pill--${productHealthTone(product.health.band.id)}`}>
              {product.health.band.label} · {product.health.score}
            </span>
          </div>
          <div className="commercial-page__table" role="table">
            <div className="commercial-page__table-head" role="row">
              <span role="columnheader">Asset</span>
              <span role="columnheader">Type</span>
              <span role="columnheader">Outcome</span>
              <span role="columnheader">Score</span>
            </div>
            {product.assets.map((asset) => {
              const outcome = product.outcomes[0];
              return (
                <div key={asset.id} className="commercial-page__table-row" role="row">
                  <span role="cell">{asset.name}</span>
                  <span role="cell">{asset.type}</span>
                  <span role="cell">{outcome?.label || '—'}</span>
                  <span role="cell">{outcome?.valueScore || product.engagement.score}</span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}

export default ProductIntelligenceLayerPage;
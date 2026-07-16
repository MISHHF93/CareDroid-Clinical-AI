import { FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ClinicalDecisionSupportDisclaimer from '../../components/clinical/ClinicalDecisionSupportDisclaimer';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import { MetricCard, VisualizationPanel } from '../../components/dashboard/DashboardVisualizations';
import { CategoryBarChart } from '../../components/dashboard/DashboardCharts';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { FLEET_ROUTE_PRIORITY_INPUT } from '../../data/testHelpers/fleetToolsTestFixtures';
import {
  hasMinimumRouteInput,
  normalizeRouteOptimizationInput,
  optimizeRoute,
} from '../../services/routeOptimizationService';
import './RouteOptimizer.css';

const ROUTE_SAFETY_COPY =
  'Decision support only. This tool does not dispatch vehicles or override human fleet command authority.';

type StopDraft = {
  id: string;
  label: string;
  priority: string;
  distanceKm: string;
  windowStart: string;
};

const DEFAULT_STOPS: StopDraft[] = FLEET_ROUTE_PRIORITY_INPUT.destinations.map((stop) => ({
  id: stop.id,
  label: stop.label,
  priority: stop.priority,
  distanceKm: String((stop as { distanceKm?: number }).distanceKm ?? ''),
  windowStart: stop.windowStart,
}));

function formatClock(minutes: number) {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export default function RouteOptimizer() {
  const [depotLabel, setDepotLabel] = useState<string>(FLEET_ROUTE_PRIORITY_INPUT.depotLabel);
  const [routeStart, setRouteStart] = useState('08:00');
  const [trafficLevel, setTrafficLevel] = useState(
    FLEET_ROUTE_PRIORITY_INPUT.trafficConstraints.level,
  );
  const [stops, setStops] = useState<StopDraft[]>(DEFAULT_STOPS);
  const [result, setResult] = useState<ReturnType<typeof optimizeRoute> | null>(null);

  const normalized = useMemo(
    () =>
      normalizeRouteOptimizationInput({
        depotLabel,
        routeStart,
        destinations: stops.map((stop) => ({
          id: stop.id,
          label: stop.label,
          priority: stop.priority,
          distanceKm: stop.distanceKm === '' ? null : Number(stop.distanceKm),
          windowStart: stop.windowStart,
        })),
        trafficConstraints: { level: trafficLevel },
      }),
    [depotLabel, routeStart, stops, trafficLevel],
  );

  const canOptimize = hasMinimumRouteInput(normalized);

  const savingsChart = useMemo(() => {
    if (!result) return [];
    return [
      { name: 'Baseline', value: result.travelEstimates.baselineMinutes },
      { name: 'Optimized', value: result.travelEstimates.optimizedMinutes },
    ];
  }, [result]);

  function updateStop(id: string, patch: Partial<StopDraft>) {
    setStops((current) => current.map((stop) => (stop.id === id ? { ...stop, ...patch } : stop)));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canOptimize) return;
    setResult(
      optimizeRoute({
        depotLabel,
        routeStart,
        destinations: stops,
        trafficConstraints: { level: trafficLevel },
      }),
    );
  }

  return (
    <section className="route-optimizer-page" aria-label="Route optimization assistant">
      <header className="route-optimizer-page__header">
        <GraphicIconBadge iconKey="route" accent="brand" size="md" />
        <div>
          <h1>Route Optimization</h1>
          <p>Deterministic stop sequencing support for human-reviewed fleet routing.</p>
        </div>
      </header>

      <ClinicalDecisionSupportDisclaimer variant="fleet" />
      <p className="fleet-safety-notice">{ROUTE_SAFETY_COPY}</p>

      <div className="route-optimizer-page__grid">
        <form className="route-optimizer-page__panel" onSubmit={handleSubmit}>
          <h2>Route inputs</h2>
          <div className="route-optimizer-page__field">
            <label htmlFor="route-depot">Depot</label>
            <input
              id="route-depot"
              value={depotLabel}
              onChange={(event) => setDepotLabel(event.target.value)}
            />
          </div>
          <div className="route-optimizer-page__field">
            <label htmlFor="route-start">Route start</label>
            <input
              id="route-start"
              value={routeStart}
              onChange={(event) => setRouteStart(event.target.value)}
              placeholder="08:00"
            />
          </div>
          <div className="route-optimizer-page__field">
            <label htmlFor="route-traffic">Traffic</label>
            <select
              id="route-traffic"
              value={trafficLevel}
              onChange={(event) => setTrafficLevel(event.target.value)}
            >
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="heavy">Heavy</option>
            </select>
          </div>

          <div className="route-optimizer-page__stops">
            {stops.map((stop) => (
              <div key={stop.id} className="route-optimizer-page__stop">
                <strong>{stop.label || stop.id}</strong>
                <div className="route-optimizer-page__stop-grid">
                  <div className="route-optimizer-page__field">
                    <label htmlFor={`${stop.id}-label`}>Stop label</label>
                    <input
                      id={`${stop.id}-label`}
                      value={stop.label}
                      onChange={(event) => updateStop(stop.id, { label: event.target.value })}
                    />
                  </div>
                  <div className="route-optimizer-page__field">
                    <label htmlFor={`${stop.id}-priority`}>Priority</label>
                    <select
                      id={`${stop.id}-priority`}
                      value={stop.priority}
                      onChange={(event) => updateStop(stop.id, { priority: event.target.value })}
                    >
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div className="route-optimizer-page__field">
                    <label htmlFor={`${stop.id}-distance`}>Distance (km)</label>
                    <input
                      id={`${stop.id}-distance`}
                      value={stop.distanceKm}
                      onChange={(event) => updateStop(stop.id, { distanceKm: event.target.value })}
                    />
                  </div>
                  <div className="route-optimizer-page__field">
                    <label htmlFor={`${stop.id}-window`}>Window start</label>
                    <input
                      id={`${stop.id}-window`}
                      value={stop.windowStart}
                      onChange={(event) => updateStop(stop.id, { windowStart: event.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="route-optimizer-page__actions">
            <button type="submit" disabled={!canOptimize}>
              Optimize route
            </button>
            <Link to={CANONICAL_ROUTES.fleetCommand}>Fleet command</Link>
          </div>
        </form>

        <div className="route-optimizer-page__panel">
          <h2>Optimization output</h2>
          {result ? (
            <>
              <div className="dashboard-visual-grid">
                <MetricCard
                  label="Minutes saved"
                  value={String(result.routeSavings.minutesSaved)}
                  hint={`${result.routeSavings.percentImprovement}% improvement`}
                  tone={result.routeSavings.minutesSaved > 0 ? 'good' : 'neutral'}
                />
                <MetricCard
                  label="Distance saved"
                  value={`${result.routeSavings.distanceKmSaved} km`}
                  hint={`Traffic: ${result.travelEstimates.trafficLevel}`}
                />
              </div>

              <VisualizationPanel
                title="Travel time comparison"
                description="Baseline versus optimized route minutes."
                badge="Savings"
              >
                <CategoryBarChart
                  data={savingsChart}
                  title="Travel time comparison"
                  color="var(--app-chart-1)"
                />
              </VisualizationPanel>

              <div className="route-optimizer-page__sequence" aria-label="Optimized stop sequence">
                {result.optimizedSequence.map((leg) => (
                  <article key={leg.stopNumber} className="route-optimizer-page__sequence-item">
                    <strong>
                      {leg.stopNumber}. {leg.destination.label}
                    </strong>
                    <span>
                      Arrival {formatClock(leg.arrivalClockMinutes)} Â· {leg.travelMinutes}m travel Â·{' '}
                      {leg.windowStatus}
                    </span>
                  </article>
                ))}
              </div>

              {result.warnings.length ? (
                <ul className="route-optimizer-page__warnings">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <p className="fleet-safety-notice">Add at least one labeled stop, then run optimization.</p>
          )}
        </div>
      </div>
    </section>
  );
}
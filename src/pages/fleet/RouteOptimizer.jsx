import { useCallback, useEffect, useId, useState } from 'react';
import { useToolPreferences } from '../../contexts/ToolPreferencesContext';
import {
  hasMinimumRouteInput,
  normalizeRouteOptimizationInput,
  optimizeRoute,
} from '../../services/routeOptimizationService';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS } from '../../navigation/iconRegistry';
import FleetPageChrome from './FleetPageChrome';
import './RouteOptimizer.css';
import './fleetUxShared.css';

const TOOL_ID = 'route-optimizer';

function createStop(index = 0) {
  return {
    id: `stop-${Date.now()}-${index}`,
    label: '',
    priority: 'medium',
    distanceKm: '',
    serviceMinutes: '15',
    windowStart: '',
    windowEnd: '',
  };
}

const INITIAL_CONSTRAINTS = {
  depotLabel: 'Main depot',
  trafficLevel: 'moderate',
  maxStops: '12',
  maxDistanceKm: '500',
};

function priorityBadgeClass(priority) {
  if (priority === 'urgent') return 'route-optimizer-badge--urgent';
  if (priority === 'high') return 'route-optimizer-badge--high';
  return 'route-optimizer-badge--medium';
}

function formToInput(stops, constraints) {
  return {
    depotLabel: constraints.depotLabel,
    destinations: stops.map((stop) => ({
      id: stop.id,
      label: stop.label,
      priority: stop.priority,
      distanceKm: stop.distanceKm,
      serviceMinutes: stop.serviceMinutes,
      windowStart: stop.windowStart,
      windowEnd: stop.windowEnd,
    })),
    trafficConstraints: { level: constraints.trafficLevel },
    vehicleLimitations: {
      maxStops: constraints.maxStops,
      maxDistanceKm: constraints.maxDistanceKm,
    },
  };
}

export default function RouteOptimizer() {
  const { recordToolAccess } = useToolPreferences();
  const formId = useId();
  const [stops, setStops] = useState([createStop(1), createStop(2)]);
  const [constraints, setConstraints] = useState(INITIAL_CONSTRAINTS);
  const [validationError, setValidationError] = useState(null);
  const [result, setResult] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    recordToolAccess(TOOL_ID);
  }, [recordToolAccess]);

  const updateConstraint = useCallback((name, value) => {
    setConstraints((prev) => ({ ...prev, [name]: value }));
    setValidationError(null);
  }, []);

  const updateStop = useCallback((id, name, value) => {
    setStops((prev) => prev.map((stop) => (stop.id === id ? { ...stop, [name]: value } : stop)));
    setValidationError(null);
  }, []);

  const addStop = useCallback(() => {
    setStops((prev) => [...prev, createStop(prev.length + 1)]);
  }, []);

  const removeStop = useCallback((id) => {
    setStops((prev) => (prev.length <= 1 ? prev : prev.filter((stop) => stop.id !== id)));
  }, []);

  const handleReset = useCallback(() => {
    setStops([createStop(1), createStop(2)]);
    setConstraints(INITIAL_CONSTRAINTS);
    setResult(null);
    setHasSubmitted(false);
    setValidationError(null);
  }, []);

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const normalized = normalizeRouteOptimizationInput(formToInput(stops, constraints));

      if (!hasMinimumRouteInput(normalized)) {
        setValidationError('Add at least one destination with a label.');
        setResult(null);
        setHasSubmitted(true);
        return;
      }

      setValidationError(null);
      setResult(optimizeRoute(formToInput(stops, constraints)));
      setHasSubmitted(true);
    },
    [constraints, stops]
  );

  const hasWindowRisk =
    result?.optimizedSequence?.some((leg) => leg.windowStatus === 'late') ||
    (result?.warnings?.length ?? 0) > 0;

  return (
    <div className="route-optimizer">
      <FleetPageChrome
        toolId={TOOL_ID}
        title="Route Optimization Assistant"
        lead="Plan multi-stop routes using priorities, traffic constraints, vehicle limits, and delivery time windows."
        safetyNote={
          <>
            <strong>Decision support only.</strong> Suggested stop order does not dispatch drivers,
            push routes to telematics, or modify live operations. Verify against dispatch system of
            record before execution. Deterministic sort-based ordering in this build.
          </>
        }
        mainId="route-optimizer-main"
      >
      <div className="route-optimizer-layout">
        <section className="route-optimizer-panel" aria-labelledby="route-planner-heading">
          <h2 id="route-planner-heading">Route planner</h2>
          <form id={formId} className="route-optimizer-form" onSubmit={handleSubmit} noValidate>
            <div className="route-optimizer-field">
              <label htmlFor="ro-depot">Start depot</label>
              <input
                id="ro-depot"
                value={constraints.depotLabel}
                onChange={(e) => updateConstraint('depotLabel', e.target.value)}
              />
            </div>

            <div className="route-optimizer-field">
              <label htmlFor="ro-traffic">Traffic constraints</label>
              <select
                id="ro-traffic"
                value={constraints.trafficLevel}
                onChange={(e) => updateConstraint('trafficLevel', e.target.value)}
              >
                <option value="low">Low congestion</option>
                <option value="moderate">Moderate congestion</option>
                <option value="heavy">Heavy congestion</option>
              </select>
            </div>

            <fieldset className="route-optimizer-field">
              <legend>Vehicle limitations</legend>
              <div className="route-optimizer-stop-grid">
                <div className="route-optimizer-field">
                  <label htmlFor="ro-max-stops">Max stops</label>
                  <input
                    id="ro-max-stops"
                    type="number"
                    min="1"
                    value={constraints.maxStops}
                    onChange={(e) => updateConstraint('maxStops', e.target.value)}
                  />
                </div>
                <div className="route-optimizer-field">
                  <label htmlFor="ro-max-distance">Max range (km)</label>
                  <input
                    id="ro-max-distance"
                    type="number"
                    min="1"
                    value={constraints.maxDistanceKm}
                    onChange={(e) => updateConstraint('maxDistanceKm', e.target.value)}
                  />
                </div>
              </div>
            </fieldset>

            <h3 style={{ fontSize: '0.95rem', margin: '8px 0' }}>Destinations</h3>
            <ul className="route-optimizer-stop-list">
              {stops.map((stop, index) => (
                <li key={stop.id}>
                  <article className="route-optimizer-stop-card" aria-label={`Stop ${index + 1}`}>
                    <div className="route-optimizer-stop-card-header">
                      <strong>Stop {index + 1}</strong>
                      {stops.length > 1 ? (
                        <button
                          type="button"
                          className="route-optimizer-btn--danger"
                          onClick={() => removeStop(stop.id)}
                          aria-label={`Remove stop ${index + 1}`}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <div className="route-optimizer-stop-grid">
                      <div className="route-optimizer-field">
                        <label htmlFor={`${stop.id}-label`}>Destination</label>
                        <input
                          id={`${stop.id}-label`}
                          value={stop.label}
                          onChange={(e) => updateStop(stop.id, 'label', e.target.value)}
                          placeholder="Clinic / site name"
                        />
                      </div>
                      <div className="route-optimizer-field">
                        <label htmlFor={`${stop.id}-priority`}>Priority</label>
                        <select
                          id={`${stop.id}-priority`}
                          value={stop.priority}
                          onChange={(e) => updateStop(stop.id, 'priority', e.target.value)}
                        >
                          <option value="urgent">Urgent</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                      <div className="route-optimizer-field">
                        <label htmlFor={`${stop.id}-distance`}>Leg distance (km)</label>
                        <input
                          id={`${stop.id}-distance`}
                          type="number"
                          min="0"
                          step="0.1"
                          value={stop.distanceKm}
                          onChange={(e) => updateStop(stop.id, 'distanceKm', e.target.value)}
                          placeholder="Optional"
                        />
                      </div>
                      <div className="route-optimizer-field">
                        <label htmlFor={`${stop.id}-service`}>Service time (min)</label>
                        <input
                          id={`${stop.id}-service`}
                          type="number"
                          min="0"
                          value={stop.serviceMinutes}
                          onChange={(e) => updateStop(stop.id, 'serviceMinutes', e.target.value)}
                        />
                      </div>
                      <div className="route-optimizer-field">
                        <label htmlFor={`${stop.id}-start`}>Window start (HH:MM)</label>
                        <input
                          id={`${stop.id}-start`}
                          value={stop.windowStart}
                          onChange={(e) => updateStop(stop.id, 'windowStart', e.target.value)}
                          placeholder="09:00"
                        />
                      </div>
                      <div className="route-optimizer-field">
                        <label htmlFor={`${stop.id}-end`}>Window end (HH:MM)</label>
                        <input
                          id={`${stop.id}-end`}
                          value={stop.windowEnd}
                          onChange={(e) => updateStop(stop.id, 'windowEnd', e.target.value)}
                          placeholder="12:00"
                        />
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>

            <div className="route-optimizer-actions">
              <button
                type="button"
                className="route-optimizer-btn route-optimizer-btn--secondary fleet-btn fleet-btn--secondary"
                aria-label="Add another destination stop"
                onClick={addStop}
              >
                Add stop
              </button>
            </div>

            {validationError ? (
              <p className="route-optimizer-validation" role="alert">
                {validationError}
              </p>
            ) : null}

            <div className="route-optimizer-actions">
              <button
                type="submit"
                className="route-optimizer-btn route-optimizer-btn--primary fleet-btn fleet-btn--primary"
                aria-label="Optimize route stop sequence"
              >
                Optimize route
              </button>
              <button
                type="button"
                className="route-optimizer-btn route-optimizer-btn--secondary fleet-btn fleet-btn--secondary"
                aria-label="Reset route planner form"
                onClick={handleReset}
              >
                Reset
              </button>
            </div>
          </form>
        </section>

        <section
          className="route-optimizer-panel"
          aria-labelledby="route-results-heading"
          aria-live="polite"
        >
          <h2 id="route-results-heading">Optimized route</h2>

          {!hasSubmitted ? (
            <div className="route-optimizer-empty" role="status">
              <NavIcon icon={CHROME_ICONS.tools} size={32} aria-hidden />
              <p>Add destinations and run Optimize route to see the planned sequence.</p>
            </div>
          ) : null}

          {hasSubmitted && validationError ? (
            <div className="route-optimizer-empty" role="status">
              <p>Complete destination labels to generate a route.</p>
            </div>
          ) : null}

          {hasWindowRisk ? (
            <div
              className="fleet-operational-warning"
              role="alert"
              aria-labelledby="ro-ops-alert-heading"
            >
              <p id="ro-ops-alert-heading">
                <strong>Operational attention:</strong> one or more stops may miss delivery windows
                — confirm timing before dispatch.
              </p>
            </div>
          ) : null}

          {result ? (
            <>
              <div className="route-optimizer-savings" role="group" aria-label="Route savings summary">
                <article className="route-optimizer-savings-card">
                  <p>Time saved</p>
                  <strong>{result.routeSavings.minutesSaved} min</strong>
                </article>
                <article className="route-optimizer-savings-card">
                  <p>Distance saved</p>
                  <strong>{result.routeSavings.distanceKmSaved} km</strong>
                </article>
                <article className="route-optimizer-savings-card">
                  <p>Improvement</p>
                  <strong>{result.routeSavings.percentImprovement}%</strong>
                </article>
              </div>

              <p className="route-optimizer-field-hint">
                From {result.depotLabel} · {result.travelEstimates.optimizedMinutes} min total ·{' '}
                {result.travelEstimates.optimizedDistanceKm} km · Traffic:{' '}
                {result.travelEstimates.trafficLevel}
              </p>

              <ol className="route-optimizer-route-list" aria-label="Optimized stop sequence">
                {result.optimizedSequence.map((leg) => (
                  <li key={leg.destination.id}>
                    <article className="route-optimizer-route-item">
                      <h3>
                        {leg.stopNumber}. {leg.destination.label}
                      </h3>
                      <p className="route-optimizer-route-meta">
                        Travel {leg.travelMinutes} min ({leg.legDistanceKm} km) · Service{' '}
                        {leg.serviceMinutes} min · Cumulative {leg.cumulativeMinutes} min
                      </p>
                      <span
                        className={`route-optimizer-badge ${priorityBadgeClass(leg.destination.priority)}`}
                      >
                        <span className="fleet-sr-only">Priority: </span>
                        {leg.destination.priority}
                      </span>
                      {leg.windowStatus === 'late' ? (
                        <span className="route-optimizer-badge route-optimizer-badge--late">
                          <span className="fleet-sr-only">Alert: </span>
                          Window risk
                        </span>
                      ) : null}
                    </article>
                  </li>
                ))}
              </ol>

              {result.warnings?.length ? (
                <ul className="route-optimizer-warnings" role="status">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}
        </section>
      </div>

      <p className="fleet-no-automation-note" role="note">
        Route plans are suggestions only. Drivers and dispatchers must approve the final sequence
        before departure; this tool does not update live navigation or telematics.
      </p>
      </FleetPageChrome>
    </div>
  );
}
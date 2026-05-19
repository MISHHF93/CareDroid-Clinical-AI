/**
 * Route Optimization — results widgets (Tier A sort engine; Tier graph via service).
 */

function priorityBadgeClass(priority) {
  if (priority === 'urgent') return 'route-optimizer-badge--urgent';
  if (priority === 'high') return 'route-optimizer-badge--high';
  return 'route-optimizer-badge--medium';
}

export function RouteSavingsWidget({ routeSavings }) {
  if (!routeSavings) return null;

  return (
    <div className="route-optimizer-savings" role="group" aria-label="Route savings summary">
      <article className="route-optimizer-savings-card">
        <p>Time saved</p>
        <strong>{routeSavings.minutesSaved} min</strong>
      </article>
      <article className="route-optimizer-savings-card">
        <p>Distance saved</p>
        <strong>{routeSavings.distanceKmSaved} km</strong>
      </article>
      <article className="route-optimizer-savings-card">
        <p>Improvement</p>
        <strong>{routeSavings.percentImprovement}%</strong>
      </article>
    </div>
  );
}

export function RouteTravelSummary({ result }) {
  if (!result?.travelEstimates) return null;

  const { travelEstimates, depotLabel } = result;

  return (
    <p className="route-optimizer-field-hint">
      From {depotLabel} · {travelEstimates.optimizedMinutes} min total ·{' '}
      {travelEstimates.optimizedDistanceKm} km · Traffic: {travelEstimates.trafficLevel}
      {result.engine ? ` · Engine: ${result.engine}` : ''}
      {result.graphPending ? ' (graph pending — sort estimate shown)' : ''}
    </p>
  );
}

export function RouteSequenceList({ optimizedSequence }) {
  if (!optimizedSequence?.length) {
    return (
      <p className="route-optimizer-field-hint" role="status">
        No stops in optimized sequence.
      </p>
    );
  }

  return (
    <ol className="route-optimizer-route-list" aria-label="Optimized stop sequence">
      {optimizedSequence.map((leg) => (
        <li key={leg.destination.id}>
          <article className="route-optimizer-route-item">
            <h3 className="route-optimizer-route-title">
              {leg.stopNumber}. {leg.destination.label}
            </h3>
            <p className="route-optimizer-route-meta">
              Travel {leg.travelMinutes} min ({leg.legDistanceKm} km) · Service {leg.serviceMinutes}{' '}
              min · Cumulative {leg.cumulativeMinutes} min
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
            {leg.windowStatus === 'early' ? (
              <span className="route-optimizer-badge route-optimizer-badge--early">
                <span className="fleet-sr-only">Note: </span>
                Early arrival
              </span>
            ) : null}
          </article>
        </li>
      ))}
    </ol>
  );
}

export function RouteWarningsList({ warnings, urgent = false }) {
  if (!warnings?.length) return null;

  return (
    <ul
      className="route-optimizer-warnings"
      role={urgent ? 'alert' : 'status'}
      aria-label="Route planning warnings"
    >
      {warnings.map((warning) => (
        <li key={warning}>{warning}</li>
      ))}
    </ul>
  );
}

export function RouteOptimizerResults({ result }) {
  if (!result) return null;

  return (
    <>
      <RouteSavingsWidget routeSavings={result.routeSavings} />
      <RouteTravelSummary result={result} />
      <RouteSequenceList optimizedSequence={result.optimizedSequence} />
      <RouteWarningsList
        warnings={result.warnings}
        urgent={result.optimizedSequence?.some((leg) => leg.windowStatus === 'late')}
      />
    </>
  );
}

/** @param {object | null} result */
export function shouldShowRouteOpsWarning(result) {
  if (!result) return false;
  return getRouteOpsWarningItems(result).length > 0;
}

/** @param {object | null} result */
export function getRouteOpsWarningItems(result) {
  if (!result) return [];
  const items = [];
  const lateStops = result.optimizedSequence?.filter((leg) => leg.windowStatus === 'late') ?? [];
  for (const leg of lateStops) {
    items.push(`Stop ${leg.stopNumber} (${leg.destination.label}) may miss its delivery window`);
  }
  for (const warning of result.warnings ?? []) {
    if (!items.includes(warning)) items.push(warning);
  }
  return items;
}

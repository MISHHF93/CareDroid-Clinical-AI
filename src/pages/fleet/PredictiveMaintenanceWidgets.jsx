/**
 * Predictive Maintenance — assessment result widgets (Tier A rules; Tier C via scoring service).
 */

function priorityBadgeClass(priority) {
  if (priority === 'urgent') return 'predictive-maintenance-badge--urgent';
  if (priority === 'high') return 'predictive-maintenance-badge--high';
  return 'predictive-maintenance-badge--medium';
}

function anomalyClass(severity) {
  if (severity === 'critical') return 'predictive-maintenance-anomaly--critical';
  if (severity === 'high') return 'predictive-maintenance-anomaly--high';
  return 'predictive-maintenance-anomaly--medium';
}

export function PredictiveMaintenanceRiskCard({ result }) {
  return (
    <article
      className={`predictive-maintenance-risk-card predictive-maintenance-risk-card--${result.riskBand}`}
      aria-labelledby="pm-risk-score-label"
      role="status"
    >
      <p id="pm-risk-score-label" className="predictive-maintenance-risk-label">
        Maintenance risk score
      </p>
      <p className="predictive-maintenance-risk-score" aria-describedby="pm-risk-band">
        {result.maintenanceRiskScore}
        <span className="fleet-sr-only"> out of 100</span>
      </p>
      <p id="pm-risk-band" className="predictive-maintenance-risk-label">
        {result.riskBandLabel}
      </p>
      {result.engine ? (
        <p className="predictive-maintenance-engine-tag" role="note">
          Engine: {result.engine}
          {result.aiPending ? ' (AI pending — showing rules estimate)' : ''}
        </p>
      ) : null}
    </article>
  );
}

export function PredictiveMaintenanceInspectionList({ windows }) {
  if (!windows?.length) {
    return (
      <p className="predictive-maintenance-field-hint" role="status">
        No inspection windows suggested.
      </p>
    );
  }

  return (
    <>
      <h3 className="predictive-maintenance-subheading">Suggested inspection windows</h3>
      <ul className="predictive-maintenance-list">
        {windows.map((window) => (
          <li key={window.id}>
            <article className="predictive-maintenance-list-item">
              <h4 className="predictive-maintenance-list-title">{window.label}</h4>
              <p>{window.reason}</p>
              <span
                className={`predictive-maintenance-badge ${priorityBadgeClass(window.priority)}`}
              >
                <span className="fleet-sr-only">Priority: </span>
                {window.priority}
              </span>
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}

export function PredictiveMaintenanceAnomalyList({ anomalies }) {
  return (
    <>
      <h3 className="predictive-maintenance-subheading">Anomaly indicators</h3>
      {!anomalies?.length ? (
        <p className="predictive-maintenance-field-hint" role="status">
          No telemetry or diagnostic anomalies flagged.
        </p>
      ) : (
        <ul className="predictive-maintenance-list">
          {anomalies.map((anomaly) => (
            <li key={anomaly.id}>
              <article
                className={`predictive-maintenance-list-item ${anomalyClass(anomaly.severity)}`}
              >
                <h4 className="predictive-maintenance-list-title">{anomaly.label}</h4>
                <p>{anomaly.detail}</p>
                <span className="predictive-maintenance-badge">
                  <span className="fleet-sr-only">Severity: </span>
                  {anomaly.severity}
                </span>
              </article>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function PredictiveMaintenanceResults({ result }) {
  if (!result) return null;

  return (
    <>
      <PredictiveMaintenanceRiskCard result={result} />
      <PredictiveMaintenanceInspectionList windows={result.suggestedInspectionWindows} />
      <PredictiveMaintenanceAnomalyList anomalies={result.anomalyIndicators} />
      {result.contributingFactors?.length ? (
        <>
          <h3 className="predictive-maintenance-subheading">Contributing factors</h3>
          <ul className="predictive-maintenance-factors">
            {result.contributingFactors.map((factor) => (
              <li key={factor}>{factor}</li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}

/**
 * Whether to show elevated operational warning before dispatch.
 * @param {object | null} result
 */
export function shouldShowMaintenanceOpsWarning(result) {
  if (!result) return false;
  return getMaintenanceOpsWarningItems(result).length > 0;
}

/** @param {object | null} result */
export function getMaintenanceOpsWarningItems(result) {
  if (!result) return [];
  const items = [];
  if (result.riskBand === 'critical' || result.riskBand === 'high') {
    items.push(`Maintenance risk band: ${result.riskBandLabel || result.riskBand}`);
  }
  const urgentWindows = result.suggestedInspectionWindows?.filter((w) => w.priority === 'urgent');
  if (urgentWindows?.length) {
    items.push(`${urgentWindows.length} urgent inspection window(s) suggested`);
  }
  const criticalAnomalies = result.anomalyIndicators?.filter((a) => a.severity === 'critical');
  if (criticalAnomalies?.length) {
    items.push(
      `${criticalAnomalies.length} critical anomaly indicator(s): ${criticalAnomalies.map((a) => a.label).join(', ')}`
    );
  }
  return items;
}

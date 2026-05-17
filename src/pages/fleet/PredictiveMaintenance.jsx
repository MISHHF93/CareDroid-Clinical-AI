import { useCallback, useEffect, useId, useState } from 'react';
import { useToolPreferences } from '../../contexts/ToolPreferencesContext';
import {
  hasMinimumScoringInput,
  normalizePredictiveMaintenanceInput,
  scorePredictiveMaintenance,
} from '../../services/predictiveMaintenanceScoring';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS } from '../../navigation/iconRegistry';
import FleetPageChrome from './FleetPageChrome';
import './PredictiveMaintenance.css';
import './fleetUxShared.css';

const TOOL_ID = 'predictive-maintenance';

const INITIAL_FORM = {
  vehicleAgeYears: '',
  mileage: '',
  monthsSinceLastService: '',
  servicesLast12Months: '2',
  diagnosticCodes: '',
  batteryHealthPercent: '',
  engineTempSpikes: '0',
  harshBrakingEvents: '0',
  idleHoursPerWeek: '0',
  faultCodesLast30Days: '0',
};

function formToInput(form) {
  return {
    vehicleAgeYears: form.vehicleAgeYears,
    mileage: form.mileage,
    monthsSinceLastService: form.monthsSinceLastService,
    servicesLast12Months: form.servicesLast12Months,
    diagnosticCodes: form.diagnosticCodes,
    batteryHealthPercent: form.batteryHealthPercent,
    telemetry: {
      engineTempSpikes: form.engineTempSpikes,
      harshBrakingEvents: form.harshBrakingEvents,
      idleHoursPerWeek: form.idleHoursPerWeek,
      faultCodesLast30Days: form.faultCodesLast30Days,
    },
  };
}

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

export default function PredictiveMaintenance() {
  const { recordToolAccess } = useToolPreferences();
  const formId = useId();
  const [form, setForm] = useState(INITIAL_FORM);
  const [validationError, setValidationError] = useState(null);
  const [result, setResult] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    recordToolAccess(TOOL_ID);
  }, [recordToolAccess]);

  const updateField = useCallback((name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setValidationError(null);
  }, []);

  const handleReset = useCallback(() => {
    setForm(INITIAL_FORM);
    setResult(null);
    setHasSubmitted(false);
    setValidationError(null);
  }, []);

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const normalized = normalizePredictiveMaintenanceInput(formToInput(form));

      if (!hasMinimumScoringInput(normalized)) {
        setValidationError(
          'Enter at least vehicle age, mileage, battery health, months since last service, or diagnostic codes.'
        );
        setResult(null);
        setHasSubmitted(true);
        return;
      }

      setValidationError(null);
      setResult(scorePredictiveMaintenance(formToInput(form)));
      setHasSubmitted(true);
    },
    [form]
  );

  const showUrgentOpsWarning =
    result &&
    (result.riskBand === 'urgent' ||
      result.riskBand === 'high' ||
      result.anomalyIndicators?.some((a) => a.severity === 'critical'));

  return (
    <div className="predictive-maintenance">
      <FleetPageChrome
        toolId={TOOL_ID}
        title="Predictive Maintenance Assistant"
        lead="Rule-based maintenance risk scoring from vehicle age, mileage, service history, diagnostic codes, battery health, and telematics."
        safetyNote={
          <>
            <strong>Decision support only.</strong> Scores suggest inspection windows — they do not
            schedule service, order parts, or take vehicles out of service. Confirm with your fleet
            maintenance program and CMMS. Deterministic rules engine (no ML) in this build.
          </>
        }
        mainId="predictive-maintenance-main"
      >
      <div className="predictive-maintenance-layout">
        <section className="predictive-maintenance-panel" aria-labelledby="pm-input-heading">
          <h2 id="pm-input-heading">Vehicle inputs</h2>
          <form
            id={formId}
            className="predictive-maintenance-form"
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="predictive-maintenance-field">
              <label htmlFor="pm-vehicle-age">Vehicle age (years)</label>
              <input
                id="pm-vehicle-age"
                name="vehicleAgeYears"
                type="number"
                min="0"
                step="0.1"
                inputMode="decimal"
                value={form.vehicleAgeYears}
                onChange={(e) => updateField('vehicleAgeYears', e.target.value)}
              />
            </div>

            <div className="predictive-maintenance-field">
              <label htmlFor="pm-mileage">Mileage</label>
              <input
                id="pm-mileage"
                name="mileage"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={form.mileage}
                onChange={(e) => updateField('mileage', e.target.value)}
              />
            </div>

            <div className="predictive-maintenance-field">
              <label htmlFor="pm-months-since">Months since last service</label>
              <input
                id="pm-months-since"
                name="monthsSinceLastService"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={form.monthsSinceLastService}
                onChange={(e) => updateField('monthsSinceLastService', e.target.value)}
              />
            </div>

            <div className="predictive-maintenance-field">
              <label htmlFor="pm-services">Services in last 12 months</label>
              <input
                id="pm-services"
                name="servicesLast12Months"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={form.servicesLast12Months}
                onChange={(e) => updateField('servicesLast12Months', e.target.value)}
              />
            </div>

            <div className="predictive-maintenance-field">
              <label htmlFor="pm-dtc">Diagnostic codes</label>
              <textarea
                id="pm-dtc"
                name="diagnosticCodes"
                value={form.diagnosticCodes}
                onChange={(e) => updateField('diagnosticCodes', e.target.value)}
                placeholder="P0301, BMS_WARNING (comma or newline separated)"
                aria-describedby="pm-dtc-hint"
              />
              <p id="pm-dtc-hint" className="predictive-maintenance-field-hint">
                P0xxx / B0xxx / C0xxx and CRITICAL keywords increase risk.
              </p>
            </div>

            <div className="predictive-maintenance-field">
              <label htmlFor="pm-battery">Battery health (%)</label>
              <input
                id="pm-battery"
                name="batteryHealthPercent"
                type="number"
                min="0"
                max="100"
                step="1"
                inputMode="numeric"
                value={form.batteryHealthPercent}
                onChange={(e) => updateField('batteryHealthPercent', e.target.value)}
              />
            </div>

            <fieldset className="predictive-maintenance-field">
              <legend>Telemetry (last 30 days)</legend>
              <div className="predictive-maintenance-telemetry">
                <div className="predictive-maintenance-field">
                  <label htmlFor="pm-temp-spikes">Engine temp spikes</label>
                  <input
                    id="pm-temp-spikes"
                    type="number"
                    min="0"
                    value={form.engineTempSpikes}
                    onChange={(e) => updateField('engineTempSpikes', e.target.value)}
                  />
                </div>
                <div className="predictive-maintenance-field">
                  <label htmlFor="pm-braking">Harsh braking events</label>
                  <input
                    id="pm-braking"
                    type="number"
                    min="0"
                    value={form.harshBrakingEvents}
                    onChange={(e) => updateField('harshBrakingEvents', e.target.value)}
                  />
                </div>
                <div className="predictive-maintenance-field">
                  <label htmlFor="pm-idle">Idle hours / week</label>
                  <input
                    id="pm-idle"
                    type="number"
                    min="0"
                    value={form.idleHoursPerWeek}
                    onChange={(e) => updateField('idleHoursPerWeek', e.target.value)}
                  />
                </div>
                <div className="predictive-maintenance-field">
                  <label htmlFor="pm-faults">Fault codes (30d)</label>
                  <input
                    id="pm-faults"
                    type="number"
                    min="0"
                    value={form.faultCodesLast30Days}
                    onChange={(e) => updateField('faultCodesLast30Days', e.target.value)}
                  />
                </div>
              </div>
            </fieldset>

            {validationError ? (
              <p className="predictive-maintenance-validation" role="alert">
                {validationError}
              </p>
            ) : null}

            <div className="predictive-maintenance-actions">
              <button
                type="submit"
                className="predictive-maintenance-btn predictive-maintenance-btn--primary fleet-btn fleet-btn--primary"
                aria-label="Calculate maintenance risk score"
              >
                Calculate risk
              </button>
              <button
                type="button"
                className="predictive-maintenance-btn predictive-maintenance-btn--secondary fleet-btn fleet-btn--secondary"
                aria-label="Reset maintenance assessment form"
                onClick={handleReset}
              >
                Reset
              </button>
            </div>
          </form>
        </section>

        <section
          className="predictive-maintenance-panel"
          aria-labelledby="pm-results-heading"
          aria-live="polite"
        >
          <h2 id="pm-results-heading">Assessment</h2>

          {!hasSubmitted ? (
            <div className="predictive-maintenance-empty" role="status">
              <NavIcon icon={CHROME_ICONS.tools} size={32} aria-hidden />
              <p>Enter vehicle data and run Calculate risk to see maintenance scoring.</p>
            </div>
          ) : null}

          {hasSubmitted && validationError ? (
            <div className="predictive-maintenance-empty" role="status">
              <p>Complete required inputs to generate a score.</p>
            </div>
          ) : null}

          {showUrgentOpsWarning ? (
            <div
              className="fleet-operational-warning"
              role="alert"
              aria-labelledby="pm-ops-alert-heading"
            >
              <p id="pm-ops-alert-heading">
                <strong>Operational attention:</strong> elevated maintenance risk — verify vehicle
                fitness before dispatch assignment.
              </p>
            </div>
          ) : null}

          {result ? (
            <>
              <article
                className={`predictive-maintenance-risk-card predictive-maintenance-risk-card--${result.riskBand}`}
                aria-labelledby="pm-risk-score-label"
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
              </article>

              <h3 style={{ fontSize: '1rem', margin: '0 0 10px' }}>Suggested inspection windows</h3>
              <ul className="predictive-maintenance-list">
                {result.suggestedInspectionWindows.map((window) => (
                  <li key={window.id}>
                    <article className="predictive-maintenance-list-item">
                      <h4 style={{ margin: '0 0 4px', fontSize: 14 }}>{window.label}</h4>
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

              <h3 style={{ fontSize: '1rem', margin: '20px 0 10px' }}>Anomaly indicators</h3>
              {result.anomalyIndicators.length === 0 ? (
                <p className="predictive-maintenance-field-hint" role="status">
                  No telemetry or diagnostic anomalies flagged.
                </p>
              ) : (
                <ul className="predictive-maintenance-list">
                  {result.anomalyIndicators.map((anomaly) => (
                    <li key={anomaly.id}>
                      <article
                        className={`predictive-maintenance-list-item ${anomalyClass(anomaly.severity)}`}
                      >
                        <h4 style={{ margin: '0 0 4px', fontSize: 14 }}>{anomaly.label}</h4>
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

              {result.contributingFactors?.length ? (
                <>
                  <h3 style={{ fontSize: '1rem', margin: '20px 0 8px' }}>Contributing factors</h3>
                  <ul className="predictive-maintenance-factors">
                    {result.contributingFactors.map((factor) => (
                      <li key={factor}>{factor}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </>
          ) : null}
        </section>
      </div>

      <p className="fleet-no-automation-note" role="note">
        Maintenance scores do not create work orders or remove vehicles from service automatically.
        Fleet managers must approve all maintenance actions.
      </p>
      </FleetPageChrome>
    </div>
  );
}
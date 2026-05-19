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
import {
  getMaintenanceOpsWarningItems,
  PredictiveMaintenanceResults,
  shouldShowMaintenanceOpsWarning,
} from './PredictiveMaintenanceWidgets';
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

  const showUrgentOpsWarning = shouldShowMaintenanceOpsWarning(result);
  const opsWarningItems = getMaintenanceOpsWarningItems(result);
  const validationErrorId = 'pm-validation-error';

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
              aria-invalid={validationError ? 'true' : undefined}
              aria-describedby={validationError ? validationErrorId : undefined}
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
                <p
                  id={validationErrorId}
                  className="predictive-maintenance-validation"
                  role="alert"
                >
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
            aria-atomic="true"
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
                <ul>
                  {opsWarningItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {result ? <PredictiveMaintenanceResults result={result} /> : null}
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

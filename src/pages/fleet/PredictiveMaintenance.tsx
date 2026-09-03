import { FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ClinicalDecisionSupportDisclaimer from '../../components/clinical/ClinicalDecisionSupportDisclaimer';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import { MetricCard, VisualizationPanel } from '../../components/dashboard/DashboardVisualizations';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import { FLEET_PM_MODERATE_INPUT } from '../../data/testHelpers/fleetToolsTestFixtures';
import {
  hasMinimumScoringInput,
  normalizePredictiveMaintenanceInput,
  scorePredictiveMaintenance,
} from '../../services/predictiveMaintenanceScoring';
import './PredictiveMaintenance.css';

const MAINTENANCE_SAFETY_COPY =
  'Decision support only. Maintenance recommendations require human review before work orders or downtime actions.';

export default function PredictiveMaintenance() {
  useRouteChromeRegistration({ title: 'Predictive Maintenance' });
  const [vehicleAgeYears, setVehicleAgeYears] = useState(
    String(FLEET_PM_MODERATE_INPUT.vehicleAgeYears),
  );
  const [mileage, setMileage] = useState(String(FLEET_PM_MODERATE_INPUT.mileage));
  const [monthsSinceLastService, setMonthsSinceLastService] = useState(
    String(FLEET_PM_MODERATE_INPUT.monthsSinceLastService),
  );
  const [servicesLast12Months, setServicesLast12Months] = useState(
    String(FLEET_PM_MODERATE_INPUT.servicesLast12Months),
  );
  const [batteryHealthPercent, setBatteryHealthPercent] = useState(
    String(FLEET_PM_MODERATE_INPUT.batteryHealthPercent),
  );
  const [diagnosticCodes, setDiagnosticCodes] = useState('');
  const [engineTempSpikes, setEngineTempSpikes] = useState('0');
  const [harshBrakingEvents, setHarshBrakingEvents] = useState('0');
  const [idleHoursPerWeek, setIdleHoursPerWeek] = useState('0');
  const [faultCodesLast30Days, setFaultCodesLast30Days] = useState('0');
  const [result, setResult] = useState<ReturnType<typeof scorePredictiveMaintenance> | null>(null);

  const input = useMemo(
    () => ({
      vehicleAgeYears,
      mileage,
      monthsSinceLastService,
      servicesLast12Months,
      batteryHealthPercent,
      diagnosticCodes,
      telemetry: {
        engineTempSpikes,
        harshBrakingEvents,
        idleHoursPerWeek,
        faultCodesLast30Days,
      },
    }),
    [
      batteryHealthPercent,
      diagnosticCodes,
      engineTempSpikes,
      faultCodesLast30Days,
      harshBrakingEvents,
      idleHoursPerWeek,
      mileage,
      monthsSinceLastService,
      servicesLast12Months,
      vehicleAgeYears,
    ],
  );

  const normalized = useMemo(() => normalizePredictiveMaintenanceInput(input), [input]);
  const canScore = hasMinimumScoringInput(normalized);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canScore) return;
    setResult(scorePredictiveMaintenance(input));
  }

  return (
    <section className="predictive-maintenance-page" aria-label="Predictive maintenance assistant">
      <header className="predictive-maintenance-page__header">
        <GraphicIconBadge iconKey="refresh" accent="warning" size="md" />
        <div>
          <p className="predictive-maintenance-page__title-text" data-testid="cd-page-title-text">
            Predictive Maintenance
          </p>
          <p>Rule-based maintenance risk scoring for fleet operations review.</p>
        </div>
      </header>

      <ClinicalDecisionSupportDisclaimer variant="fleet" />
      <p className="fleet-safety-notice">{MAINTENANCE_SAFETY_COPY}</p>

      <div className="predictive-maintenance-page__grid">
        <form className="predictive-maintenance-page__panel" onSubmit={handleSubmit}>
          <h2>Vehicle profile</h2>
          <div className="predictive-maintenance-page__field">
            <label htmlFor="pm-age">Vehicle age (years)</label>
            <input
              id="pm-age"
              value={vehicleAgeYears}
              onChange={(event) => setVehicleAgeYears(event.target.value)}
            />
          </div>
          <div className="predictive-maintenance-page__field">
            <label htmlFor="pm-mileage">Mileage</label>
            <input
              id="pm-mileage"
              value={mileage}
              onChange={(event) => setMileage(event.target.value)}
            />
          </div>
          <div className="predictive-maintenance-page__field">
            <label htmlFor="pm-months">Months since last service</label>
            <input
              id="pm-months"
              value={monthsSinceLastService}
              onChange={(event) => setMonthsSinceLastService(event.target.value)}
            />
          </div>
          <div className="predictive-maintenance-page__field">
            <label htmlFor="pm-services">Services in last 12 months</label>
            <input
              id="pm-services"
              value={servicesLast12Months}
              onChange={(event) => setServicesLast12Months(event.target.value)}
            />
          </div>
          <div className="predictive-maintenance-page__field">
            <label htmlFor="pm-battery">Battery health (%)</label>
            <input
              id="pm-battery"
              value={batteryHealthPercent}
              onChange={(event) => setBatteryHealthPercent(event.target.value)}
            />
          </div>
          <div className="predictive-maintenance-page__field">
            <label htmlFor="pm-codes">Diagnostic codes</label>
            <textarea
              id="pm-codes"
              value={diagnosticCodes}
              onChange={(event) => setDiagnosticCodes(event.target.value)}
              rows={3}
            />
          </div>

          <h3>Telemetry signals</h3>
          <div className="predictive-maintenance-page__telemetry">
            <div className="predictive-maintenance-page__field">
              <label htmlFor="pm-temp">Engine temp spikes</label>
              <input
                id="pm-temp"
                value={engineTempSpikes}
                onChange={(event) => setEngineTempSpikes(event.target.value)}
              />
            </div>
            <div className="predictive-maintenance-page__field">
              <label htmlFor="pm-brake">Harsh braking events</label>
              <input
                id="pm-brake"
                value={harshBrakingEvents}
                onChange={(event) => setHarshBrakingEvents(event.target.value)}
              />
            </div>
            <div className="predictive-maintenance-page__field">
              <label htmlFor="pm-idle">Idle hours / week</label>
              <input
                id="pm-idle"
                value={idleHoursPerWeek}
                onChange={(event) => setIdleHoursPerWeek(event.target.value)}
              />
            </div>
            <div className="predictive-maintenance-page__field">
              <label htmlFor="pm-faults">Fault codes (30 days)</label>
              <input
                id="pm-faults"
                value={faultCodesLast30Days}
                onChange={(event) => setFaultCodesLast30Days(event.target.value)}
              />
            </div>
          </div>

          <div className="route-optimizer-page__actions">
            <button type="submit" disabled={!canScore}>
              Score maintenance risk
            </button>
            <Link to={CANONICAL_ROUTES.fleetCommand}>Fleet command</Link>
          </div>
        </form>

        <div className="predictive-maintenance-page__panel">
          <h2>Risk assessment</h2>
          {result ? (
            <>
              <div className="predictive-maintenance-page__score">
                <span
                  className={`predictive-maintenance-page__band predictive-maintenance-page__band--${result.riskBand}`}
                >
                  {result.riskBandLabel}
                </span>
                <strong>{result.maintenanceRiskScore}</strong>
                <span>Maintenance risk score (0-100)</span>
              </div>

              <div className="dashboard-visual-grid">
                <MetricCard
                  label="Anomalies"
                  value={String(result.anomalyIndicators.length)}
                  hint="Telemetry and diagnostic flags"
                  tone={result.anomalyIndicators.length > 0 ? 'warning' : 'good'}
                />
                <MetricCard
                  label="Inspection windows"
                  value={String(result.suggestedInspectionWindows.length)}
                  hint="Human-reviewed scheduling suggestions"
                />
              </div>

              <VisualizationPanel
                title="Contributing factors"
                description="Deterministic rule contributions for the current profile."
                badge="Rules"
              >
                <ul className="predictive-maintenance-page__list">
                  {result.contributingFactors.map((factor) => (
                    <li key={factor}>{factor}</li>
                  ))}
                </ul>
              </VisualizationPanel>

              {result.anomalyIndicators.length ? (
                <VisualizationPanel
                  title="Anomaly indicators"
                  description="Signals that may require maintenance review."
                  badge="Signals"
                >
                  <ul className="predictive-maintenance-page__list">
                    {result.anomalyIndicators.map((indicator) => (
                      <li key={indicator.id}>
                        <strong>{indicator.label}</strong> — {indicator.detail}
                      </li>
                    ))}
                  </ul>
                </VisualizationPanel>
              ) : null}

              {result.suggestedInspectionWindows.length ? (
                <VisualizationPanel
                  title="Suggested inspection windows"
                  description="Advisory windows only — confirm with maintenance operations."
                  badge="Schedule"
                >
                  <ul className="predictive-maintenance-page__list">
                    {result.suggestedInspectionWindows.map((window) => (
                      <li key={`${window.daysFromNow}-${window.priority}`}>
                        Day {window.daysFromNow} · {window.priority} — {window.reason}
                      </li>
                    ))}
                  </ul>
                </VisualizationPanel>
              ) : null}
            </>
          ) : (
            <p className="fleet-safety-notice">
              Enter at least one vehicle age, mileage, diagnostic code, or telemetry field to score
              risk.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

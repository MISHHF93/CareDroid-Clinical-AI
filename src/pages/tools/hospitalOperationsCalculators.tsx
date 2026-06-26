import { useEffect, useRef, useState } from 'react';
import { NavIcon } from '../../navigation/NavIcon';
import { getCalculatorSubIcon, CHROME_ICONS } from '../../navigation/iconRegistry';
import {
  HOSPITAL_OPERATIONS_CALCULATOR_DISCLAIMER,
  calculateBedOccupancy,
  calculateResourceUtilizationIndex,
  calculateStaffingRatio,
  calculateTurnaroundTime,
} from '../../utils/hospitalOperationsCalculators';

function CalcPanelTitle({ icon, children }) {
  return (
    <div className="calculator-panel-title">
      <NavIcon icon={icon} size={22} aria-hidden />
      <span className="calculator-panel-title-text">{children}</span>
    </div>
  );
}

function ResultsPanelTitle() {
  return (
    <div className="calculator-panel-title">
      <NavIcon icon={CHROME_ICONS.barChart} size={22} aria-hidden />
      <span className="calculator-panel-title-text">Results</span>
    </div>
  );
}

function CalculatorShell({ slug, title, result, emptyText, children, onResultChange, resultPayload }) {
  const icon = getCalculatorSubIcon(slug);
  const resultsRef = useRef<any>(null);

  useEffect(() => {
    onResultChange?.(result ? resultPayload(result) : null);
  }, [onResultChange, result, resultPayload]);

  useEffect(() => {
    if (!result || !resultsRef.current) return;
    resultsRef.current.focus({ preventScroll: true });
    resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [result]);

  return (
    <div className={`calculator-interface calculator-interface--${slug}`}>
      <div className="calculator-inputs">
        <CalcPanelTitle icon={icon}>{title}</CalcPanelTitle>
        <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
          <p className="calc-ds-lead">
            <strong>Operations support only.</strong> Human approval is required for resource moves, staffing changes,
            dispatch actions, admissions, transfers, and incident command decisions.
          </p>
          <p className="calc-disclaimer-detail">{HOSPITAL_OPERATIONS_CALCULATOR_DISCLAIMER}</p>
        </div>
        {children}
      </div>
      <div
        className="calculator-results"
        ref={resultsRef}
        tabIndex={-1}
        role="region"
        aria-label={`${title} results`}
      >
        <ResultsPanelTitle />
        {result ? (
          <>
            <div className={`calc-score-display ${result.severity}`}>
              <div className="calc-score-label">{result.scoreLabel}</div>
              <div className="calc-score-value">{result.scoreDisplay}</div>
              <div className="calc-score-interpretation">{result.label}</div>
            </div>
            <section
              className={`calc-interpretation-box ${result.severity}${result.severity !== 'normal' ? ' calc-interpretation-box--risk-emphasis' : ''}`}
              role="region"
              aria-label={`${title} interpretation`}
            >
              <h3 className="calc-interpretation-title">{result.label}</h3>
              <div className="calc-interpretation-text">{result.interpretation}</div>
              {result.detailLines?.map((line) => (
                <div key={line} className="calc-interpretation-text">
                  {line}
                </div>
              ))}
            </section>
            <p className="calc-result-safety-footer" role="note">
              Demo/planning output only. Confirm all values against source systems before operational action.
            </p>
          </>
        ) : (
          <div className="calc-results-empty">
            <div className="calc-results-empty-icon" aria-hidden>
              <NavIcon icon={icon} size={56} />
            </div>
            <p>{emptyText}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function NumberField({ id, label, value, onChange, min = '0', max = undefined as any, step = '1', required = true }) {
  return (
    <div className="calc-form-group">
      <label htmlFor={id} className="calc-label">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        className="calc-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
      />
    </div>
  );
}

export function BedOccupancyCalculator({ onResultChange }) {
  const [occupiedBeds, setOccupiedBeds] = useState('82');
  const [totalBeds, setTotalBeds] = useState('100');
  const [blockedBeds, setBlockedBeds] = useState('4');
  const [result, setResult] = useState<any>(null);

  const calculate = (event) => {
    event.preventDefault();
    const next = calculateBedOccupancy({ occupiedBeds, totalBeds, blockedBeds });
    setResult(
      next
        ? {
            ...next,
            scoreLabel: 'Occupancy',
            scoreDisplay: `${next.occupancyPercent}%`,
            detailLines: [
              `${next.availableBeds} usable bed(s) available after ${next.blockedBeds} blocked bed(s).`,
              `Usable bed denominator: ${next.usableBeds} of ${next.totalBeds} total beds.`,
            ],
          }
        : null
    );
  };

  return (
    <CalculatorShell
      slug="bed-occupancy-calculator"
      title="Bed Occupancy Calculator"
      result={result}
      emptyText="Enter occupied, total, and blocked beds."
      onResultChange={onResultChange}
      resultPayload={(r) => ({ occupancyPercent: r.occupancyPercent, availableBeds: r.availableBeds, severity: r.severity })}
    >
      <form className="calc-pr1-form" onSubmit={calculate}>
        <div className="calc-form-grid">
          <NumberField id="bed-occupied" label="Occupied beds" value={occupiedBeds} onChange={setOccupiedBeds} />
          <NumberField id="bed-total" label="Total beds" value={totalBeds} onChange={setTotalBeds} min="1" />
          <NumberField id="bed-blocked" label="Blocked beds" value={blockedBeds} onChange={setBlockedBeds} />
        </div>
        <div className="calc-actions">
          <button type="submit" className="calc-calculate-btn">Calculate Occupancy</button>
          <button type="button" className="calc-reset-btn" onClick={() => setResult(null)}>Clear result</button>
        </div>
      </form>
    </CalculatorShell>
  );
}

export function StaffingRatioCalculator({ onResultChange }) {
  const [patientCount, setPatientCount] = useState('32');
  const [staffCount, setStaffCount] = useState('8');
  const [targetPatientsPerStaff, setTargetPatientsPerStaff] = useState('4');
  const [result, setResult] = useState<any>(null);

  const calculate = (event) => {
    event.preventDefault();
    const next = calculateStaffingRatio({ patientCount, staffCount, targetPatientsPerStaff });
    setResult(
      next
        ? {
            ...next,
            scoreLabel: 'Patients per staff',
            scoreDisplay: next.patientsPerStaff.toFixed(2),
            detailLines: [
              `Target staff for this ratio: ${next.targetStaff}.`,
              `${next.staffDelta >= 0 ? 'Surplus vs target' : 'Gap vs target'}: ${Math.abs(next.staffDelta)} staff member(s).`,
            ],
          }
        : null
    );
  };

  return (
    <CalculatorShell
      slug="staffing-ratio-calculator"
      title="Staffing Ratio Calculator"
      result={result}
      emptyText="Enter census, available staff, and target ratio."
      onResultChange={onResultChange}
      resultPayload={(r) => ({ patientsPerStaff: r.patientsPerStaff, targetStaff: r.targetStaff, staffDelta: r.staffDelta, severity: r.severity })}
    >
      <form className="calc-pr1-form" onSubmit={calculate}>
        <div className="calc-form-grid">
          <NumberField id="staff-patients" label="Patient count" value={patientCount} onChange={setPatientCount} />
          <NumberField id="staff-count" label="Available staff" value={staffCount} onChange={setStaffCount} min="1" />
          <NumberField id="staff-target" label="Target patients per staff" value={targetPatientsPerStaff} onChange={setTargetPatientsPerStaff} min="0.1" step="0.1" />
        </div>
        <div className="calc-actions">
          <button type="submit" className="calc-calculate-btn">Calculate Staffing Ratio</button>
          <button type="button" className="calc-reset-btn" onClick={() => setResult(null)}>Clear result</button>
        </div>
      </form>
    </CalculatorShell>
  );
}

export function TurnaroundTimeCalculator({ onResultChange }) {
  const [requestToAssignMinutes, setRequestToAssignMinutes] = useState('8');
  const [travelMinutes, setTravelMinutes] = useState('14');
  const [serviceMinutes, setServiceMinutes] = useState('26');
  const [cleanupMinutes, setCleanupMinutes] = useState('7');
  const [targetMinutes, setTargetMinutes] = useState('60');
  const [result, setResult] = useState<any>(null);

  const calculate = (event) => {
    event.preventDefault();
    const next = calculateTurnaroundTime({
      requestToAssignMinutes,
      travelMinutes,
      serviceMinutes,
      cleanupMinutes,
      targetMinutes,
    });
    setResult(
      next
        ? {
            ...next,
            scoreLabel: 'Total turnaround',
            scoreDisplay: `${next.totalMinutes} min`,
            detailLines: [
              `Target: ${next.targetMinutes} min.`,
              `Variance: ${next.varianceMinutes > 0 ? '+' : ''}${next.varianceMinutes} min.`,
            ],
          }
        : null
    );
  };

  return (
    <CalculatorShell
      slug="turnaround-time-calculator"
      title="Turnaround Time Calculator"
      result={result}
      emptyText="Enter workflow segments and a target time."
      onResultChange={onResultChange}
      resultPayload={(r) => ({ totalMinutes: r.totalMinutes, varianceMinutes: r.varianceMinutes, severity: r.severity })}
    >
      <form className="calc-pr1-form" onSubmit={calculate}>
        <div className="calc-form-grid">
          <NumberField id="tat-assign" label="Request to assign (min)" value={requestToAssignMinutes} onChange={setRequestToAssignMinutes} step="0.5" />
          <NumberField id="tat-travel" label="Travel / locate (min)" value={travelMinutes} onChange={setTravelMinutes} step="0.5" />
          <NumberField id="tat-service" label="Service / turnover (min)" value={serviceMinutes} onChange={setServiceMinutes} step="0.5" />
          <NumberField id="tat-cleanup" label="Cleanup / ready time (min)" value={cleanupMinutes} onChange={setCleanupMinutes} step="0.5" />
          <NumberField id="tat-target" label="Target (min)" value={targetMinutes} onChange={setTargetMinutes} min="1" step="0.5" />
        </div>
        <div className="calc-actions">
          <button type="submit" className="calc-calculate-btn">Calculate Turnaround</button>
          <button type="button" className="calc-reset-btn" onClick={() => setResult(null)}>Clear result</button>
        </div>
      </form>
    </CalculatorShell>
  );
}

export function ResourceUtilizationIndexCalculator({ onResultChange }) {
  const [bedUtilizationPercent, setBedUtilizationPercent] = useState('86');
  const [staffUtilizationPercent, setStaffUtilizationPercent] = useState('78');
  const [deviceUtilizationPercent, setDeviceUtilizationPercent] = useState('72');
  const [fleetUtilizationPercent, setFleetUtilizationPercent] = useState('64');
  const [result, setResult] = useState<any>(null);

  const calculate = (event) => {
    event.preventDefault();
    const next = calculateResourceUtilizationIndex({
      bedUtilizationPercent,
      staffUtilizationPercent,
      deviceUtilizationPercent,
      fleetUtilizationPercent,
    });
    setResult(
      next
        ? {
            ...next,
            scoreLabel: 'Utilization index',
            scoreDisplay: `${next.index}%`,
            detailLines: [
              `Highest driver: ${next.maxDriver.label} at ${next.maxDriver.value}%.`,
              `Included signals: ${next.inputs.map((row) => row.label).join(', ')}.`,
            ],
          }
        : null
    );
  };

  return (
    <CalculatorShell
      slug="resource-utilization-index"
      title="Resource Utilization Index"
      result={result}
      emptyText="Enter one or more utilization percentages."
      onResultChange={onResultChange}
      resultPayload={(r) => ({ index: r.index, maxDriver: r.maxDriver, severity: r.severity })}
    >
      <form className="calc-pr1-form" onSubmit={calculate}>
        <div className="calc-form-grid">
          <NumberField id="rui-bed" label="Bed utilization (%)" value={bedUtilizationPercent} onChange={setBedUtilizationPercent} max="150" />
          <NumberField id="rui-staff" label="Staff utilization (%)" value={staffUtilizationPercent} onChange={setStaffUtilizationPercent} max="150" />
          <NumberField id="rui-device" label="Device utilization (%)" value={deviceUtilizationPercent} onChange={setDeviceUtilizationPercent} max="150" />
          <NumberField id="rui-fleet" label="Fleet utilization (%)" value={fleetUtilizationPercent} onChange={setFleetUtilizationPercent} max="150" />
        </div>
        <div className="calc-actions">
          <button type="submit" className="calc-calculate-btn">Calculate Utilization Index</button>
          <button type="button" className="calc-reset-btn" onClick={() => setResult(null)}>Clear result</button>
        </div>
      </form>
    </CalculatorShell>
  );
}

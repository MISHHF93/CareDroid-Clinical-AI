import { useEffect, useRef, useState } from 'react';
import { NavIcon } from '../../navigation/NavIcon';
import { getCalculatorSubIcon, CHROME_ICONS } from '../../navigation/iconRegistry';
import {
  ANION_GAP_DISCLAIMER,
  RASS_DISCLAIMER,
  RASS_OPTIONS,
  SHOCK_INDEX_DISCLAIMER,
  calculateAnionGap,
  calculateShockIndex,
  interpretAnionGap,
  interpretRassScore,
  interpretShockIndex,
} from '../../utils/nextWaveCalculatorUtils';

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

function CalcDecisionSupportLead() {
  return (
    <p className="calc-ds-lead">
      <strong>Decision support only.</strong> Does not establish a diagnosis or replace clinician judgment; follow
      local protocols.
    </p>
  );
}

function CalcResultSafetyFooter() {
  return (
    <p className="calc-result-safety-footer" role="note">
      Output reflects the values entered and may omit important clinical context.
    </p>
  );
}

function CalculatorShell({ slug, title, disclaimer, children, result, emptyText, onResultChange, resultPayload }) {
  const icon = getCalculatorSubIcon(slug);
  const resultsRef = useRef(null);

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
          <CalcDecisionSupportLead />
          <p className="calc-disclaimer-detail">{disclaimer}</p>
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
              <div className="calc-interpretation-text">{result.referenceLine}</div>
            </section>
            <CalcResultSafetyFooter />
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

export function ShockIndexCalculator({ onResultChange }) {
  const [heartRate, setHeartRate] = useState('');
  const [systolicBp, setSystolicBp] = useState('');
  const [result, setResult] = useState(null);

  const calculate = (event) => {
    event.preventDefault();
    const value = calculateShockIndex({ heartRate, systolicBp });
    const interp = interpretShockIndex(value);
    setResult(
      interp
        ? {
            ...interp,
            value,
            scoreLabel: 'Shock index',
            scoreDisplay: value.toFixed(2),
          }
        : null
    );
  };

  const reset = () => {
    setHeartRate('');
    setSystolicBp('');
    setResult(null);
  };

  return (
    <CalculatorShell
      slug="shock-index"
      title="Shock Index"
      disclaimer={SHOCK_INDEX_DISCLAIMER}
      result={result}
      emptyText="Enter heart rate and systolic blood pressure"
      onResultChange={onResultChange}
      resultPayload={(r) => ({ shockIndex: r.value, severity: r.severity, riskCategory: r.riskCategory })}
    >
      <form className="calc-pr1-form" onSubmit={calculate}>
        <div className="calc-form-grid">
          <div className="calc-form-group">
            <label htmlFor="shock-index-hr" className="calc-label">
              Heart rate (bpm)
            </label>
            <input
              id="shock-index-hr"
              type="number"
              min="1"
              className="calc-input"
              value={heartRate}
              onChange={(e) => setHeartRate(e.target.value)}
              required
            />
          </div>
          <div className="calc-form-group">
            <label htmlFor="shock-index-sbp" className="calc-label">
              Systolic BP (mmHg)
            </label>
            <input
              id="shock-index-sbp"
              type="number"
              min="1"
              className="calc-input"
              value={systolicBp}
              onChange={(e) => setSystolicBp(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="calc-actions">
          <button type="submit" className="calc-calculate-btn">
            Calculate Shock Index
          </button>
          <button type="button" className="calc-reset-btn" onClick={reset}>
            Reset
          </button>
        </div>
      </form>
    </CalculatorShell>
  );
}

export function AnionGapCalculator({ onResultChange }) {
  const [sodium, setSodium] = useState('');
  const [chloride, setChloride] = useState('');
  const [bicarbonate, setBicarbonate] = useState('');
  const [albumin, setAlbumin] = useState('');
  const [result, setResult] = useState(null);

  const calculate = (event) => {
    event.preventDefault();
    const gap = calculateAnionGap({ sodium, chloride, bicarbonate, albumin });
    if (!gap) {
      setResult(null);
      return;
    }
    const interpretedValue = gap.correctedAnionGap ?? gap.anionGap;
    const interp = interpretAnionGap(interpretedValue);
    setResult(
      interp
        ? {
            ...interp,
            ...gap,
            scoreLabel: gap.correctedAnionGap !== null ? 'Albumin-corrected anion gap' : 'Anion gap',
            scoreDisplay: `${interpretedValue} mEq/L`,
          }
        : null
    );
  };

  const reset = () => {
    setSodium('');
    setChloride('');
    setBicarbonate('');
    setAlbumin('');
    setResult(null);
  };

  return (
    <CalculatorShell
      slug="anion-gap"
      title="Anion Gap"
      disclaimer={ANION_GAP_DISCLAIMER}
      result={result}
      emptyText="Enter electrolytes to calculate anion gap"
      onResultChange={onResultChange}
      resultPayload={(r) => ({
        anionGap: r.anionGap,
        correctedAnionGap: r.correctedAnionGap,
        severity: r.severity,
        riskCategory: r.riskCategory,
      })}
    >
      <form className="calc-pr1-form" onSubmit={calculate}>
        <div className="calc-form-grid">
          <div className="calc-form-group">
            <label htmlFor="anion-gap-na" className="calc-label">
              Sodium (mEq/L)
            </label>
            <input id="anion-gap-na" type="number" className="calc-input" value={sodium} onChange={(e) => setSodium(e.target.value)} required />
          </div>
          <div className="calc-form-group">
            <label htmlFor="anion-gap-cl" className="calc-label">
              Chloride (mEq/L)
            </label>
            <input id="anion-gap-cl" type="number" className="calc-input" value={chloride} onChange={(e) => setChloride(e.target.value)} required />
          </div>
          <div className="calc-form-group">
            <label htmlFor="anion-gap-hco3" className="calc-label">
              Bicarbonate / CO2 (mEq/L)
            </label>
            <input id="anion-gap-hco3" type="number" className="calc-input" value={bicarbonate} onChange={(e) => setBicarbonate(e.target.value)} required />
          </div>
          <div className="calc-form-group">
            <label htmlFor="anion-gap-albumin" className="calc-label">
              Albumin (g/dL, optional)
            </label>
            <input id="anion-gap-albumin" type="number" step="0.1" className="calc-input" value={albumin} onChange={(e) => setAlbumin(e.target.value)} />
          </div>
        </div>
        <div className="calc-actions">
          <button type="submit" className="calc-calculate-btn">
            Calculate Anion Gap
          </button>
          <button type="button" className="calc-reset-btn" onClick={reset}>
            Reset
          </button>
        </div>
      </form>
    </CalculatorShell>
  );
}

export function RassCalculator({ onResultChange }) {
  const [score, setScore] = useState('0');
  const [result, setResult] = useState(null);

  const calculate = (event) => {
    event.preventDefault();
    const interp = interpretRassScore(score);
    setResult(
      interp
        ? {
            ...interp,
            scoreLabel: 'RASS',
            scoreDisplay: String(interp.score),
          }
        : null
    );
  };

  const reset = () => {
    setScore('0');
    setResult(null);
  };

  return (
    <CalculatorShell
      slug="rass"
      title="RASS"
      disclaimer={RASS_DISCLAIMER}
      result={result}
      emptyText="Select the observed Richmond Agitation-Sedation Scale level"
      onResultChange={onResultChange}
      resultPayload={(r) => ({ rass: r.score, severity: r.severity, riskCategory: r.riskCategory })}
    >
      <form className="calc-pr1-form" onSubmit={calculate}>
        <div className="calc-form-group">
          <label htmlFor="rass-score" className="calc-label">
            Observed RASS level
          </label>
          <select id="rass-score" className="calc-select" value={score} onChange={(e) => setScore(e.target.value)}>
            {RASS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="calc-actions">
          <button type="submit" className="calc-calculate-btn">
            Calculate RASS
          </button>
          <button type="button" className="calc-reset-btn" onClick={reset}>
            Reset
          </button>
        </div>
      </form>
    </CalculatorShell>
  );
}

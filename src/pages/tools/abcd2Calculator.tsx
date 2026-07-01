/**
 * ABCD² calculator form (Tier A) — TIA short-term stroke risk stratification.
 */

import { useEffect, useRef, useState } from 'react';
import { NavIcon } from '../../navigation/NavIcon';
import { getCalculatorSubIcon, CHROME_ICONS } from '../../navigation/iconRegistry';
import {
  ABCD2_CLINICAL_FEATURE_OPTIONS,
  ABCD2_DURATION_OPTIONS,
  ABCD2_STROKE_DISCLAIMER,
  calculateAbcd2Score,
  interpretAbcd2Score,
  validateAbcd2Inputs,
} from '../../utils/abcd2Calculator';

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

function CalcResultsEmptyIcon({ icon, size = 56 }) {
  return (
    <div className="calc-results-empty-icon" aria-hidden>
      <NavIcon icon={icon} size={size} />
    </div>
  );
}

function CalcDecisionSupportLead() {
  return (
    <p className="calc-ds-lead">
      <strong>Decision support only.</strong> Does not establish a diagnosis or replace clinician judgment; follow
      local stroke and TIA protocols.
    </p>
  );
}

function CalcResultSafetyFooter() {
  return (
    <p className="calc-result-safety-footer" role="note">
      Output reflects the values you entered and may omit important clinical context.
    </p>
  );
}

function CalcInterpretationRegion({ headingId, title, severity, emphasizeRisk, children }) {
  return (
    <section
      className={`calc-interpretation-box ${severity}${emphasizeRisk ? ' calc-interpretation-box--risk-emphasis' : ''}`}
      role="region"
      aria-labelledby={headingId}
    >
      <h3 id={headingId} className="calc-interpretation-title">
        {title}
      </h3>
      {children}
    </section>
  );
}

function scrollResultsIntoView(el) {
  if (!el) return;
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.focus({ preventScroll: true });
  el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
}

export function Abcd2Calculator({ onResultChange }) {
  const slug = 'abcd2';
  const icon = getCalculatorSubIcon(slug);
  const resultsRef = useRef(null);
  const [inputs, setInputs] = useState({
    age60OrOlder: false,
    systolicBpMmHg: '',
    diastolicBpMmHg: '',
    clinicalFeature: 'other',
    durationBand: 'under_10',
    diabetes: false,
  });
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (onResultChange) {
      onResultChange(
        result
          ? {
              abcd2Score: result.total,
              riskCategory: result.riskCategory,
              severity: result.severity,
            }
          : null
      );
    }
  }, [onResultChange, result]);

  useEffect(() => {
    if (result) scrollResultsIntoView(resultsRef.current);
  }, [result]);

  const runCalculate = () => {
    const { valid, errors } = validateAbcd2Inputs(inputs);
    if (!valid) {
      setValidationErrors(errors);
      setResult(null);
      return;
    }
    setValidationErrors([]);
    const total = calculateAbcd2Score({
      age60OrOlder: inputs.age60OrOlder,
      systolicBpMmHg: Number(inputs.systolicBpMmHg),
      diastolicBpMmHg: Number(inputs.diastolicBpMmHg),
      clinicalFeature: inputs.clinicalFeature,
      durationBand: inputs.durationBand,
      diabetes: inputs.diabetes,
    });
    const interp = interpretAbcd2Score(total);
    if (!interp) {
      setResult(null);
      return;
    }
    setResult({ total, ...interp });
  };

  const reset = () => {
    setInputs({
      age60OrOlder: false,
      systolicBpMmHg: '',
      diastolicBpMmHg: '',
      clinicalFeature: 'other',
      durationBand: 'under_10',
      diabetes: false,
    });
    setValidationErrors([]);
    setResult(null);
  };

  const headingId = `${slug}-interpretation-heading`;

  return (
    <div className={`calculator-interface calculator-interface--${slug}`}>
      <div className="calculator-inputs">
        <CalcPanelTitle icon={icon}>
          <span id={`${slug}-form-title`}>ABCD² score</span>
        </CalcPanelTitle>
        <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
          <CalcDecisionSupportLead />
          <p className="calc-disclaimer-detail">{ABCD2_STROKE_DISCLAIMER}</p>
        </div>
        <form
          className="calc-pr1-form"
          noValidate
          aria-labelledby={`${slug}-form-title`}
          onSubmit={(e) => {
            e.preventDefault();
            runCalculate();
          }}
        >
          {validationErrors.length > 0 ? (
            <div className="calc-validation-summary" role="alert">
              <ul>
                {validationErrors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <fieldset className="calc-timi-fieldset">
            <legend className="calc-timi-legend">ABCD² criteria</legend>
            <div className="calc-form-group calc-timi-row">
              <div className="calc-checkbox-group">
                <input
                  type="checkbox"
                  id={`${slug}-age`}
                  className="calc-checkbox"
                  checked={inputs.age60OrOlder}
                  onChange={(e) => setInputs((p) => ({ ...p, age60OrOlder: e.target.checked }))}
                />
                <label htmlFor={`${slug}-age`} className="calc-checkbox-label">
                  Age = 60 years (1 point)
                </label>
              </div>
            </div>
            <div className="calc-form-group calc-timi-row">
              <label htmlFor={`${slug}-sbp`} className="calc-label">
                Blood pressure at event — systolic (mmHg)
              </label>
              <input
                id={`${slug}-sbp`}
                type="number"
                min="0"
                className="calc-input"
                value={inputs.systolicBpMmHg}
                onChange={(e) => setInputs((p) => ({ ...p, systolicBpMmHg: e.target.value }))}
              />
            </div>
            <div className="calc-form-group calc-timi-row">
              <label htmlFor={`${slug}-dbp`} className="calc-label">
                Blood pressure at event — diastolic (mmHg)
              </label>
              <span className="calc-input-help" id={`${slug}-bp-help`}>
                1 point if systolic =140 or diastolic =90 mmHg
              </span>
              <input
                id={`${slug}-dbp`}
                type="number"
                min="0"
                className="calc-input"
                aria-describedby={`${slug}-bp-help`}
                value={inputs.diastolicBpMmHg}
                onChange={(e) => setInputs((p) => ({ ...p, diastolicBpMmHg: e.target.value }))}
              />
            </div>
            <div className="calc-form-group calc-timi-row">
              <label htmlFor={`${slug}-clinical`} className="calc-label">
                Clinical features (C)
              </label>
              <select
                id={`${slug}-clinical`}
                className="calc-select"
                value={inputs.clinicalFeature}
                onChange={(e) => setInputs((p) => ({ ...p, clinicalFeature: e.target.value }))}
              >
                {ABCD2_CLINICAL_FEATURE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} ({opt.points} pt{opt.points === 1 ? '' : 's'})
                  </option>
                ))}
              </select>
            </div>
            <div className="calc-form-group calc-timi-row">
              <label htmlFor={`${slug}-duration`} className="calc-label">
                Symptom duration (D)
              </label>
              <select
                id={`${slug}-duration`}
                className="calc-select"
                value={inputs.durationBand}
                onChange={(e) => setInputs((p) => ({ ...p, durationBand: e.target.value }))}
              >
                {ABCD2_DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} ({opt.points} pt{opt.points === 1 ? '' : 's'})
                  </option>
                ))}
              </select>
            </div>
            <div className="calc-form-group calc-timi-row">
              <div className="calc-checkbox-group">
                <input
                  type="checkbox"
                  id={`${slug}-diabetes`}
                  className="calc-checkbox"
                  checked={inputs.diabetes}
                  onChange={(e) => setInputs((p) => ({ ...p, diabetes: e.target.checked }))}
                />
                <label htmlFor={`${slug}-diabetes`} className="calc-checkbox-label">
                  Diabetes (1 point)
                </label>
              </div>
            </div>
          </fieldset>
          <div className="calc-actions">
            <button type="submit" className="calc-calculate-btn">
              <NavIcon icon={CHROME_ICONS.calculator} size={20} aria-hidden />
              Calculate
            </button>
            <button type="button" className="calc-reset-btn" onClick={reset}>
              Reset
            </button>
          </div>
        </form>
      </div>
      <div className="calculator-results" id={`calc-results-${slug}`} ref={resultsRef} tabIndex={-1}>
        <ResultsPanelTitle />
        {result ? (
          <>
            <div className={`calc-score-display ${result.severity}`}>
              <div className="calc-score-label">ABCD² score</div>
              <div className="calc-score-value">{result.total}</div>
              <div className="calc-score-interpretation">of 7 points</div>
            </div>
            <CalcInterpretationRegion
              headingId={headingId}
              title={result.label}
              severity={result.severity}
              emphasizeRisk={result.severity === 'critical'}
            >
              <div className="calc-interpretation-text calc-interpretation-text--emphasis">
                Risk category: {result.riskCategoryLabel}
              </div>
              <div className="calc-interpretation-text">{result.riskBand}</div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.strokeRiskContext}
              </div>
              <div className="calc-interpretation-text">{result.interpretation}</div>
              {result.disclaimer ? (
                <div className="calc-interpretation-text calc-interpretation-text--secondary">
                  {result.disclaimer}
                </div>
              ) : null}
            </CalcInterpretationRegion>
            <div className="calc-references">
              <div className="calc-references-title">Reference</div>
              <ul className="calc-references-list">
                <li>{result.referenceLine}</li>
              </ul>
            </div>
            <CalcResultSafetyFooter />
          </>
        ) : (
          <div className="calc-results-empty">
            <CalcResultsEmptyIcon icon={icon} />
            <p>Enter criteria at the time of the TIA, then calculate</p>
          </div>
        )}
      </div>
    </div>
  );
}

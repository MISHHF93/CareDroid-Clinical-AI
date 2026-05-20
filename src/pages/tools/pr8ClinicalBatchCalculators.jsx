/**
 * PR8 batch — HEART, Centor/McIsaac, Bishop, Apgar, Braden, Morse, Ranson, BISAP, FIB-4, Framingham.
 */

import { useEffect, useRef, useState } from 'react';
import { NavIcon } from '../../navigation/NavIcon';
import { getCalculatorSubIcon, CHROME_ICONS } from '../../navigation/iconRegistry';
import {
  HEART_DIMENSIONS_META,
  calculateHeartScore,
  interpretHeartScore,
} from '../../utils/heartScoreCalculator';
import {
  CENTOR_CRITERIA_META,
  CENTOR_AGE_BANDS,
  calculateCentorMcisaacScore,
  interpretCentorMcisaac,
} from '../../utils/centorMcisaacCalculator';
import {
  BISHOP_DIMENSIONS_META,
  BISHOP_OBSTETRIC_DISCLAIMER,
  calculateBishopScore,
  interpretBishopScore,
} from '../../utils/bishopScoreCalculator';
import {
  APGAR_COMPONENTS_META,
  APGAR_OBSTETRIC_DISCLAIMER,
  calculateApgarScore,
  interpretApgarScore,
  validateApgarMinuteInputs,
} from '../../utils/apgarScoreCalculator';
import {
  BRADEN_DIMENSIONS_META,
  BRADEN_HOSPITAL_DISCLAIMER,
  calculateBradenScore,
  interpretBradenScore,
} from '../../utils/bradenScaleCalculator';
import {
  MORSE_DIMENSIONS_META,
  MORSE_FALL_HOSPITAL_DISCLAIMER,
  calculateMorseFallScore,
  interpretMorseFallScore,
} from '../../utils/morseFallScaleCalculator';
import {
  RANSON_ADMISSION_META,
  RANSON_AT_48H_META,
  calculateRansonScore,
  interpretRansonScore,
} from '../../utils/ransonCriteriaCalculator';
import {
  BISAP_CRITERIA_META,
  BISAP_SAFETY_DISCLAIMER,
  calculateBisapScore,
  interpretBisapScore,
} from '../../utils/bisapScoreCalculator';
import {
  FIB4_SAFETY_DISCLAIMER,
  calculateFib4,
  interpretFib4,
  validateFib4Inputs,
} from '../../utils/fib4Calculator';
import {
  computeFraminghamRisk,
  interpretFraminghamRisk,
  validateFraminghamInputs,
} from '../../utils/framinghamRiskCalculator';

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
      local protocols.
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

function CalcResultsPanel({ id, resultsRef, children, ariaLabel, ariaLive = 'off' }) {
  return (
    <div
      className="calculator-results"
      id={id}
      ref={resultsRef}
      tabIndex={-1}
      role="region"
      aria-label={ariaLabel}
      aria-live={ariaLive}
    >
      {children}
    </div>
  );
}

function scrollResultsIntoView(el) {
  if (!el) return;
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.focus({ preventScroll: true });
  el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
}

function defaultSelectInputs(dimensionsMeta) {
  return Object.fromEntries(dimensionsMeta.map((d) => [d.key, String(d.options[0].value)]));
}

function SelectDimensionCalculator({
  slug,
  title,
  dimensionsMeta,
  calculate,
  interpret,
  maxScoreLabel,
  onResultChange,
  resultPayload,
  disclaimerNote,
  fieldsetLegend = 'Criteria',
  scoreDisplayLabel = 'Score',
  calculateAriaLabel,
  resetAriaLabel,
  resultsRegionLabel,
}) {
  const icon = getCalculatorSubIcon(slug);
  const resultsRef = useRef(null);
  const [inputs, setInputs] = useState(() => defaultSelectInputs(dimensionsMeta));
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (onResultChange) {
      onResultChange(result ? resultPayload(result) : null);
    }
  }, [onResultChange, result, resultPayload]);

  useEffect(() => {
    if (result) scrollResultsIntoView(resultsRef.current);
  }, [result]);

  const runCalculate = () => {
    const numeric = Object.fromEntries(
      Object.entries(inputs).map(([k, v]) => [k, Number(v)])
    );
    const total = calculate(numeric);
    const interp = interpret(total);
    if (!interp) {
      setResult(null);
      return;
    }
    setResult({ total, ...interp });
  };

  const reset = () => {
    setInputs(defaultSelectInputs(dimensionsMeta));
    setResult(null);
  };

  const headingId = `${slug}-interpretation-heading`;
  const calcButtonLabel = calculateAriaLabel ?? `Calculate ${title}`;
  const resetButtonLabel = resetAriaLabel ?? `Reset ${title} form`;
  const resultsLabel = resultsRegionLabel ?? `${title} results`;

  return (
    <div className={`calculator-interface calculator-interface--${slug}`}>
      <div className="calculator-inputs">
        <CalcPanelTitle icon={icon}>
          <span id={`${slug}-form-title`}>{title}</span>
        </CalcPanelTitle>
        {disclaimerNote ? (
          <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
            <CalcDecisionSupportLead />
            <p className="calc-disclaimer-detail">{disclaimerNote}</p>
          </div>
        ) : (
          <CalcDecisionSupportLead />
        )}
        <form
          className="calc-pr1-form"
          noValidate
          aria-labelledby={`${slug}-form-title`}
          onSubmit={(e) => {
            e.preventDefault();
            runCalculate();
          }}
        >
          <fieldset className="calc-timi-fieldset">
            <legend className="calc-timi-legend">{fieldsetLegend}</legend>
            {dimensionsMeta.map((dim) => {
              const id = `${slug}-${dim.key}`;
              const selected = dim.options.find((o) => String(o.value) === inputs[dim.key]);
              const selectAriaLabel = selected
                ? `${dim.label}: ${selected.label}`
                : dim.label;
              return (
                <div key={dim.key} className="calc-form-group calc-timi-row">
                  <label htmlFor={id} className="calc-label">
                    {dim.label}
                  </label>
                  {dim.help ? (
                    <span className="calc-input-help" id={`${id}-help`}>
                      {dim.help}
                    </span>
                  ) : null}
                  <select
                    id={id}
                    className="calc-select"
                    value={inputs[dim.key]}
                    onChange={(e) => setInputs((p) => ({ ...p, [dim.key]: e.target.value }))}
                    aria-describedby={dim.help ? `${id}-help` : undefined}
                    aria-label={selectAriaLabel}
                  >
                    {dim.options.map((opt) => (
                      <option key={opt.value} value={String(opt.value)}>
                        {opt.label} ({opt.value} pt{opt.value === 1 ? '' : 's'})
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </fieldset>
          <div className="calc-actions">
            <button type="submit" className="calc-calculate-btn" aria-label={calcButtonLabel}>
              <NavIcon icon={CHROME_ICONS.calculator} size={20} aria-hidden />
              Calculate
            </button>
            <button type="button" className="calc-reset-btn" onClick={reset} aria-label={resetButtonLabel}>
              Reset
            </button>
          </div>
        </form>
      </div>
      <CalcResultsPanel
        id={`calc-results-${slug}`}
        resultsRef={resultsRef}
        ariaLabel={resultsLabel}
        ariaLive={result ? 'polite' : 'off'}
      >
        <ResultsPanelTitle />
        {result ? (
          <>
            <div className={`calc-score-display ${result.severity}`}>
              <div className="calc-score-label">{scoreDisplayLabel}</div>
              <div className="calc-score-value">{result.total}</div>
              <div className="calc-score-interpretation">{maxScoreLabel}</div>
            </div>
            <CalcInterpretationRegion
              headingId={headingId}
              title={result.label}
              severity={result.severity}
              emphasizeRisk={result.severity === 'critical'}
            >
              {result.riskCategoryLabel ? (
                <div className="calc-interpretation-text calc-interpretation-text--emphasis">
                  Risk category: {result.riskCategoryLabel}
                </div>
              ) : null}
              <div className="calc-interpretation-text">{result.riskBand}</div>
              {result.maceContext ? (
                <div className="calc-interpretation-text calc-interpretation-text--secondary">{result.maceContext}</div>
              ) : null}
              {result.strepProbability ? (
                <div className="calc-interpretation-text calc-interpretation-text--secondary">
                  {result.strepProbability}
                </div>
              ) : null}
              {result.mortalityContext ? (
                <div className="calc-interpretation-text calc-interpretation-text--secondary">
                  {result.mortalityContext}
                </div>
              ) : null}
              {result.favourability ? (
                <div className="calc-interpretation-text calc-interpretation-text--secondary">
                  {result.favourability}
                </div>
              ) : null}
              <div className="calc-interpretation-text">{result.interpretation}</div>
              {result.disclaimer ? (
                <div className="calc-interpretation-text calc-interpretation-text--secondary">{result.disclaimer}</div>
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
            <p>Complete criteria, then calculate</p>
          </div>
        )}
      </CalcResultsPanel>
    </div>
  );
}

function CriterionCheckboxCalculator({
  slug,
  title,
  criteriaMeta,
  calculate,
  interpret,
  maxScoreLabel,
  onResultChange,
  resultPayload,
  extraFields,
  disclaimerNote,
  fieldsetLegend = 'Criteria (check all that apply)',
  scoreDisplayLabel = 'Score',
  calculateAriaLabel,
  resetAriaLabel,
  resultsRegionLabel,
}) {
  const icon = getCalculatorSubIcon(slug);
  const resultsRef = useRef(null);
  const [inputs, setInputs] = useState(() =>
    Object.fromEntries(criteriaMeta.map((r) => [r.key, false]))
  );
  const [extra, setExtra] = useState(extraFields?.initialState ?? {});
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (onResultChange) {
      onResultChange(result ? resultPayload(result) : null);
    }
  }, [onResultChange, result, resultPayload]);

  useEffect(() => {
    if (result) scrollResultsIntoView(resultsRef.current);
  }, [result]);

  const runCalculate = () => {
    const total = calculate({ ...inputs, ...extra });
    const interp = interpret(total);
    if (!interp) {
      setResult(null);
      return;
    }
    setResult({ total, ...interp });
  };

  const reset = () => {
    setInputs(Object.fromEntries(criteriaMeta.map((r) => [r.key, false])));
    setExtra(extraFields?.initialState ?? {});
    setResult(null);
  };

  const headingId = `${slug}-interpretation-heading`;
  const calcButtonLabel = calculateAriaLabel ?? `Calculate ${title}`;
  const resetButtonLabel = resetAriaLabel ?? `Reset ${title} form`;
  const resultsLabel = resultsRegionLabel ?? `${title} results`;

  return (
    <div className={`calculator-interface calculator-interface--${slug}`}>
      <div className="calculator-inputs">
        <CalcPanelTitle icon={icon}>
          <span id={`${slug}-form-title`}>{title}</span>
        </CalcPanelTitle>
        {disclaimerNote ? (
          <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
            <CalcDecisionSupportLead />
            <p className="calc-disclaimer-detail">{disclaimerNote}</p>
          </div>
        ) : (
          <CalcDecisionSupportLead />
        )}
        <form
          className="calc-pr1-form"
          noValidate
          aria-labelledby={`${slug}-form-title`}
          onSubmit={(e) => {
            e.preventDefault();
            runCalculate();
          }}
        >
          {extraFields?.render?.({ extra, setExtra })}
          <fieldset className="calc-timi-fieldset calc-has-bled-fieldset">
            <legend className="calc-timi-legend">{fieldsetLegend}</legend>
            <div className="calc-timi-criteria calc-has-bled-criteria">
              {criteriaMeta.map((row) => {
                const id = `${slug}-${row.key}`;
                return (
                  <div key={row.key} className="calc-timi-row">
                    <div className="calc-checkbox-group">
                      <input
                        type="checkbox"
                        id={id}
                        className="calc-checkbox"
                        checked={Boolean(inputs[row.key])}
                        onChange={(e) => setInputs((p) => ({ ...p, [row.key]: e.target.checked }))}
                        aria-describedby={`${id}-help`}
                      />
                      <label htmlFor={id} className="calc-checkbox-label">
                        {row.shortLabel}
                      </label>
                    </div>
                    <span className="calc-input-help calc-timi-help" id={`${id}-help`}>
                      {row.help}
                    </span>
                  </div>
                );
              })}
            </div>
          </fieldset>
          <div className="calc-actions">
            <button type="submit" className="calc-calculate-btn" aria-label={calcButtonLabel}>
              <NavIcon icon={CHROME_ICONS.calculator} size={20} aria-hidden />
              Calculate
            </button>
            <button type="button" className="calc-reset-btn" onClick={reset} aria-label={resetButtonLabel}>
              Reset
            </button>
          </div>
        </form>
      </div>
      <CalcResultsPanel
        id={`calc-results-${slug}`}
        resultsRef={resultsRef}
        ariaLabel={resultsLabel}
        ariaLive={result ? 'polite' : 'off'}
      >
        <ResultsPanelTitle />
        {result ? (
          <>
            <div className={`calc-score-display ${result.severity}`}>
              <div className="calc-score-label">{scoreDisplayLabel}</div>
              <div className="calc-score-value">{result.total}</div>
              <div className="calc-score-interpretation">{maxScoreLabel}</div>
            </div>
            <CalcInterpretationRegion
              headingId={headingId}
              title={result.label}
              severity={result.severity}
              emphasizeRisk={result.severity === 'critical'}
            >
              {result.riskCategoryLabel ? (
                <div className="calc-interpretation-text calc-interpretation-text--emphasis">
                  Risk category: {result.riskCategoryLabel}
                </div>
              ) : null}
              <div className="calc-interpretation-text">{result.riskBand}</div>
              {result.strepProbability || result.mortalityContext ? (
                <div className="calc-interpretation-text calc-interpretation-text--secondary">
                  {result.strepProbability || result.mortalityContext}
                </div>
              ) : null}
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
            <p>Check applicable criteria, then calculate</p>
          </div>
        )}
      </CalcResultsPanel>
    </div>
  );
}

export function HeartScoreCalculator({ onResultChange }) {
  return (
    <SelectDimensionCalculator
      slug="heart-score"
      title="HEART score"
      dimensionsMeta={HEART_DIMENSIONS_META}
      calculate={calculateHeartScore}
      interpret={interpretHeartScore}
      maxScoreLabel="of 10 points"
      onResultChange={onResultChange}
      resultPayload={(r) => ({
        heartScore: r.total,
        severity: r.severity,
        riskCategory: r.riskCategory,
        riskBand: r.riskBand,
      })}
      disclaimerNote="Chest pain risk stratification only (0–10). Estimates 6-week MACE risk from validation cohorts; does not diagnose ACS or recommend treatment or disposition."
    />
  );
}

export function CentorMcisaacCalculator({ onResultChange }) {
  return (
    <CriterionCheckboxCalculator
      slug="centor-mcisaac"
      title="Centor / McIsaac score"
      criteriaMeta={CENTOR_CRITERIA_META}
      calculate={(inputs) =>
        calculateCentorMcisaacScore({
          tonsillarExudates: inputs.tonsillarExudates,
          tenderAnteriorCervicalNodes: inputs.tenderAnteriorCervicalNodes,
          feverHistory: inputs.feverHistory,
          absenceOfCough: inputs.absenceOfCough,
          ageBand: inputs.ageBand,
        })
      }
      interpret={interpretCentorMcisaac}
      maxScoreLabel="of 5 points"
      onResultChange={onResultChange}
      resultPayload={(r) => ({ centorScore: r.total, severity: r.severity })}
      extraFields={{
        initialState: { ageBand: '15_44' },
        render: ({ extra, setExtra }) => (
          <div className="calc-form-group">
            <label htmlFor="centor-age-band" className="calc-label">
              Age band (McIsaac)
            </label>
            <select
              id="centor-age-band"
              className="calc-select"
              value={extra.ageBand}
              onChange={(e) => setExtra((p) => ({ ...p, ageBand: e.target.value }))}
            >
              {CENTOR_AGE_BANDS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
        ),
      }}
    />
  );
}

export function BishopScoreCalculator({ onResultChange }) {
  return (
    <SelectDimensionCalculator
      slug="bishop-score"
      title="Bishop score"
      dimensionsMeta={BISHOP_DIMENSIONS_META}
      calculate={calculateBishopScore}
      interpret={interpretBishopScore}
      maxScoreLabel="of 13 points"
      disclaimerNote={BISHOP_OBSTETRIC_DISCLAIMER}
      fieldsetLegend="Cervical examination (labour induction favourability)"
      scoreDisplayLabel="Bishop total score"
      calculateAriaLabel="Calculate Bishop score from cervical exam"
      resetAriaLabel="Reset Bishop score form"
      resultsRegionLabel="Bishop score results"
      onResultChange={onResultChange}
      resultPayload={(r) => ({
        bishopScore: r.total,
        severity: r.severity,
        riskCategory: r.riskCategory,
      })}
    />
  );
}

export function BradenScaleCalculator({ onResultChange }) {
  return (
    <SelectDimensionCalculator
      slug="braden-scale"
      title="Braden scale"
      dimensionsMeta={BRADEN_DIMENSIONS_META}
      calculate={calculateBradenScore}
      interpret={interpretBradenScore}
      maxScoreLabel="of 23 (lower = higher risk)"
      disclaimerNote={BRADEN_HOSPITAL_DISCLAIMER}
      fieldsetLegend="Braden subscales (inpatient pressure-injury risk)"
      scoreDisplayLabel="Braden total score"
      calculateAriaLabel="Calculate Braden scale total score"
      resetAriaLabel="Reset Braden scale form"
      resultsRegionLabel="Braden scale results"
      onResultChange={onResultChange}
      resultPayload={(r) => ({
        bradenScore: r.total,
        severity: r.severity,
        riskCategory: r.riskCategory,
      })}
    />
  );
}

export function MorseFallScaleCalculator({ onResultChange }) {
  return (
    <SelectDimensionCalculator
      slug="morse-fall-scale"
      title="Morse Fall Scale"
      dimensionsMeta={MORSE_DIMENSIONS_META}
      calculate={calculateMorseFallScore}
      interpret={interpretMorseFallScore}
      maxScoreLabel="of 125 points"
      disclaimerNote={MORSE_FALL_HOSPITAL_DISCLAIMER}
      fieldsetLegend="Morse fall-risk items (inpatient nursing assessment)"
      scoreDisplayLabel="Morse total score"
      calculateAriaLabel="Calculate Morse Fall Scale total score"
      resetAriaLabel="Reset Morse Fall Scale form"
      resultsRegionLabel="Morse Fall Scale results"
      onResultChange={onResultChange}
      resultPayload={(r) => ({
        morseScore: r.total,
        severity: r.severity,
        riskCategory: r.riskCategory,
      })}
    />
  );
}

export function BisapScoreCalculator({ onResultChange }) {
  return (
    <CriterionCheckboxCalculator
      slug="bisap-score"
      title="BISAP score"
      criteriaMeta={BISAP_CRITERIA_META}
      calculate={calculateBisapScore}
      interpret={interpretBisapScore}
      maxScoreLabel="of 5 points"
      disclaimerNote={BISAP_SAFETY_DISCLAIMER}
      fieldsetLegend="BISAP criteria within 24 hours of presentation"
      scoreDisplayLabel="BISAP score"
      calculateAriaLabel="Calculate BISAP score"
      resetAriaLabel="Reset BISAP score form"
      resultsRegionLabel="BISAP score results"
      onResultChange={onResultChange}
      resultPayload={(r) => ({
        bisapScore: r.total,
        severity: r.severity,
        riskCategory: r.riskCategory,
      })}
    />
  );
}

export function ApgarScoreCalculator({ onResultChange }) {
  const slug = 'apgar-score';
  const icon = getCalculatorSubIcon(slug);
  const resultsRef = useRef(null);
  const [minute1, setMinute1] = useState(() => defaultSelectInputs(APGAR_COMPONENTS_META));
  const [minute5, setMinute5] = useState(() => defaultSelectInputs(APGAR_COMPONENTS_META));
  const [validationErrors, setValidationErrors] = useState([]);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (onResultChange) {
      onResultChange(
        result
          ? {
              apgar1: result.score1,
              apgar5: result.score5,
              severity: result.severity5,
              riskCategory: result.riskCategory,
            }
          : null
      );
    }
  }, [onResultChange, result]);

  useEffect(() => {
    if (result) scrollResultsIntoView(resultsRef.current);
  }, [result]);

  const renderMinute = (inputs, setInputs, prefix) =>
    APGAR_COMPONENTS_META.map((comp) => {
      const id = `${prefix}-${comp.key}`;
      const selected = comp.options.find((o) => String(o.value) === inputs[comp.key]);
      const selectAriaLabel = selected
        ? `${comp.label}: ${selected.label}`
        : comp.label;
      return (
        <div key={comp.key} className="calc-form-group calc-timi-row">
          <label htmlFor={id} className="calc-label">
            {comp.label}
          </label>
          <select
            id={id}
            className="calc-select"
            value={inputs[comp.key]}
            onChange={(e) => setInputs((p) => ({ ...p, [comp.key]: e.target.value }))}
            aria-label={selectAriaLabel}
          >
            {comp.options.map((opt) => (
              <option key={opt.value} value={String(opt.value)}>
                {opt.label} ({opt.value})
              </option>
            ))}
          </select>
        </div>
      );
    });

  const runCalculate = () => {
    const v1 = validateApgarMinuteInputs(minute1);
    const v5 = validateApgarMinuteInputs(minute5);
    const errors = [...v1.errors, ...v5.errors.map((e) => `5 minutes — ${e}`)];
    setValidationErrors(errors);
    if (!v1.valid || !v5.valid) {
      setResult(null);
      return;
    }

    const n1 = Object.fromEntries(Object.entries(minute1).map(([k, v]) => [k, Number(v)]));
    const n5 = Object.fromEntries(Object.entries(minute5).map(([k, v]) => [k, Number(v)]));
    const score1 = calculateApgarScore(n1);
    const score5 = calculateApgarScore(n5);
    const interp1 = interpretApgarScore(score1, { timingLabel: '1 minute' });
    const interp5 = interpretApgarScore(score5, { timingLabel: '5 minutes' });
    if (!interp5 || !interp1) {
      setResult(null);
      return;
    }
    setResult({
      score1,
      score5,
      interp1,
      ...interp5,
      severity5: interp5.severity,
      riskCategory: interp5.riskCategory,
    });
  };

  const reset = () => {
    setMinute1(defaultSelectInputs(APGAR_COMPONENTS_META));
    setMinute5(defaultSelectInputs(APGAR_COMPONENTS_META));
    setValidationErrors([]);
    setResult(null);
  };

  return (
    <div className={`calculator-interface calculator-interface--${slug}`}>
      <div className="calculator-inputs">
        <CalcPanelTitle icon={icon}>
          <span id="apgar-form-title">Apgar score</span>
        </CalcPanelTitle>
        <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
          <CalcDecisionSupportLead />
          <p className="calc-disclaimer-detail">{APGAR_OBSTETRIC_DISCLAIMER}</p>
        </div>
        <form
          className="calc-pr1-form"
          noValidate
          aria-labelledby="apgar-form-title"
          onSubmit={(e) => {
            e.preventDefault();
            runCalculate();
          }}
        >
          {validationErrors.length ? (
            <div className="calc-error-summary" role="alert" aria-live="polite">
              <ul>
                {validationErrors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <fieldset className="calc-timi-fieldset">
            <legend className="calc-timi-legend">Apgar at 1 minute (newborn assessment)</legend>
            {renderMinute(minute1, setMinute1, 'apgar-1')}
          </fieldset>
          <fieldset className="calc-timi-fieldset">
            <legend className="calc-timi-legend">Apgar at 5 minutes (newborn reassessment)</legend>
            {renderMinute(minute5, setMinute5, 'apgar-5')}
          </fieldset>
          <div className="calc-actions">
            <button
              type="submit"
              className="calc-calculate-btn"
              aria-label="Calculate Apgar scores at 1 and 5 minutes"
            >
              Calculate Apgar
            </button>
            <button
              type="button"
              className="calc-reset-btn"
              aria-label="Reset Apgar score form"
              onClick={reset}
            >
              Reset
            </button>
          </div>
        </form>
      </div>
      <CalcResultsPanel
        id="calc-results-apgar-score"
        resultsRef={resultsRef}
        ariaLabel="Apgar score results"
        ariaLive={result ? 'polite' : 'off'}
      >
        <ResultsPanelTitle />
        {result ? (
          <>
            <div className="calc-score-display-row">
              <div className={`calc-score-display ${result.interp1?.severity ?? 'normal'}`}>
                <div className="calc-score-label">1 minute</div>
                <div className="calc-score-value">{result.score1}</div>
                <div className="calc-score-interpretation">{result.interp1?.riskBand}</div>
              </div>
              <div className={`calc-score-display ${result.severity}`}>
                <div className="calc-score-label">5 minutes</div>
                <div className="calc-score-value">{result.score5}</div>
                <div className="calc-score-interpretation">{result.riskBand}</div>
              </div>
            </div>
            <CalcInterpretationRegion
              headingId="apgar-interpretation"
              title={result.label}
              severity={result.severity}
              emphasizeRisk={result.severity === 'critical'}
            >
              {result.riskCategoryLabel ? (
                <div className="calc-interpretation-text calc-interpretation-text--emphasis">
                  Risk category (5 min): {result.riskCategoryLabel}
                </div>
              ) : null}
              <div className="calc-interpretation-text">
                1 minute: {result.score1} - {result.interp1?.interpretation}
              </div>
              <div className="calc-interpretation-text">
                5 minutes: {result.score5} - {result.interpretation}
              </div>
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
            <p>Score appearance, pulse, grimace, activity, and respiration at 1 and 5 minutes</p>
          </div>
        )}
      </CalcResultsPanel>
    </div>
  );
}

export function RansonCriteriaCalculator({ onResultChange }) {
  const slug = 'ranson-criteria';
  const icon = getCalculatorSubIcon(slug);
  const resultsRef = useRef(null);
  const [admission, setAdmission] = useState(() =>
    Object.fromEntries(RANSON_ADMISSION_META.map((r) => [r.key, false]))
  );
  const [at48h, setAt48h] = useState(() => Object.fromEntries(RANSON_AT_48H_META.map((r) => [r.key, false])));
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (onResultChange) {
      onResultChange(result ? { ransonScore: result.total, severity: result.severity } : null);
    }
  }, [onResultChange, result]);

  useEffect(() => {
    if (result) scrollResultsIntoView(resultsRef.current);
  }, [result]);

  const renderGroup = (meta, state, setState, prefix) =>
    meta.map((row) => {
      const id = `${prefix}-${row.key}`;
      return (
        <div key={row.key} className="calc-timi-row">
          <div className="calc-checkbox-group">
            <input
              type="checkbox"
              id={id}
              className="calc-checkbox"
              checked={Boolean(state[row.key])}
              onChange={(e) => setState((p) => ({ ...p, [row.key]: e.target.checked }))}
            />
            <label htmlFor={id} className="calc-checkbox-label">
              {row.shortLabel}
            </label>
          </div>
          <span className="calc-input-help calc-timi-help">{row.help}</span>
        </div>
      );
    });

  return (
    <div className={`calculator-interface calculator-interface--${slug}`}>
      <div className="calculator-inputs">
        <CalcPanelTitle icon={icon}>
          <span id="ranson-form-title">Ranson criteria</span>
        </CalcPanelTitle>
        <CalcDecisionSupportLead />
        <form
          className="calc-pr1-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const total = calculateRansonScore(admission, at48h);
            const interp = interpretRansonScore(total);
            setResult(interp ? { total, ...interp } : null);
          }}
        >
          <fieldset className="calc-timi-fieldset">
            <legend className="calc-timi-legend">At admission (0–5)</legend>
            <div className="calc-timi-criteria">{renderGroup(RANSON_ADMISSION_META, admission, setAdmission, 'ranson-adm')}</div>
          </fieldset>
          <fieldset className="calc-timi-fieldset">
            <legend className="calc-timi-legend">At 48 hours (0–6)</legend>
            <div className="calc-timi-criteria">{renderGroup(RANSON_AT_48H_META, at48h, setAt48h, 'ranson-48')}</div>
          </fieldset>
          <div className="calc-actions">
            <button type="submit" className="calc-calculate-btn">
              Calculate Ranson
            </button>
          </div>
        </form>
      </div>
      <CalcResultsPanel id="calc-results-ranson-criteria" resultsRef={resultsRef}>
        <ResultsPanelTitle />
        {result ? (
          <>
            <div className={`calc-score-display ${result.severity}`}>
              <div className="calc-score-value">{result.total}</div>
              <div className="calc-score-interpretation">of 11 criteria</div>
            </div>
            <CalcInterpretationRegion
              headingId="ranson-interpretation"
              title={result.label}
              severity={result.severity}
              emphasizeRisk={result.severity === 'critical'}
            >
              <div className="calc-interpretation-text">{result.mortalityContext}</div>
              <div className="calc-interpretation-text">{result.interpretation}</div>
            </CalcInterpretationRegion>
            <CalcResultSafetyFooter />
          </>
        ) : (
          <div className="calc-results-empty">
            <CalcResultsEmptyIcon icon={icon} />
            <p>Check admission and 48-hour criteria</p>
          </div>
        )}
      </CalcResultsPanel>
    </div>
  );
}

export function Fib4Calculator({ onResultChange }) {
  const slug = 'fib4';
  const icon = getCalculatorSubIcon(slug);
  const resultsRef = useRef(null);
  const [ageYears, setAgeYears] = useState('');
  const [astUPerL, setAstUPerL] = useState('');
  const [altUPerL, setAltUPerL] = useState('');
  const [platelets10e9PerL, setPlatelets10e9PerL] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (onResultChange) {
      onResultChange(
        result
          ? { fib4: result.index, severity: result.severity, riskCategory: result.riskCategory }
          : null
      );
    }
  }, [onResultChange, result]);

  useEffect(() => {
    if (result) scrollResultsIntoView(resultsRef.current);
  }, [result]);

  const runCalculate = () => {
    const { valid, errors } = validateFib4Inputs({ ageYears, astUPerL, altUPerL, platelets10e9PerL });
    setValidationErrors(errors);
    if (!valid) {
      setResult(null);
      return;
    }
    const index = calculateFib4({
      ageYears: Number(ageYears),
      astUPerL: Number(astUPerL),
      altUPerL: Number(altUPerL),
      platelets10e9PerL: Number(platelets10e9PerL),
    });
    const interp = interpretFib4(index, Number(ageYears));
    setResult(interp ? { index, ...interp } : null);
  };

  return (
    <div className={`calculator-interface calculator-interface--${slug}`}>
      <div className="calculator-inputs">
        <CalcPanelTitle icon={icon}>
          <span id="fib4-form-title">FIB-4 index</span>
        </CalcPanelTitle>
        <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
          <CalcDecisionSupportLead />
          <p className="calc-disclaimer-detail">{FIB4_SAFETY_DISCLAIMER}</p>
        </div>
        <form
          className="calc-pr1-form"
          noValidate
          aria-labelledby="fib4-form-title"
          onSubmit={(e) => {
            e.preventDefault();
            runCalculate();
          }}
        >
          {validationErrors.length ? (
            <div className="calc-error-summary" role="alert" aria-live="polite">
              <ul>
                {validationErrors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="calc-form-group">
            <label htmlFor="fib4-age" className="calc-label">
              Age (years)
            </label>
            <input
              id="fib4-age"
              type="number"
              min={18}
              max={120}
              className="calc-input"
              value={ageYears}
              onChange={(e) => setAgeYears(e.target.value)}
              aria-describedby="fib4-age-help"
            />
            <span className="calc-input-help" id="fib4-age-help">
              Patient age in years (18–120).
            </span>
          </div>
          <div className="calc-form-group">
            <label htmlFor="fib4-ast" className="calc-label">
              AST (U/L)
            </label>
            <input
              id="fib4-ast"
              type="number"
              min={1}
              max={10000}
              className="calc-input"
              value={astUPerL}
              onChange={(e) => setAstUPerL(e.target.value)}
              aria-describedby="fib4-ast-help"
            />
            <span className="calc-input-help" id="fib4-ast-help">
              Aspartate aminotransferase in U/L.
            </span>
          </div>
          <div className="calc-form-group">
            <label htmlFor="fib4-alt" className="calc-label">
              ALT (U/L)
            </label>
            <input
              id="fib4-alt"
              type="number"
              min={1}
              max={10000}
              className="calc-input"
              value={altUPerL}
              onChange={(e) => setAltUPerL(e.target.value)}
              aria-describedby="fib4-alt-help"
            />
            <span className="calc-input-help" id="fib4-alt-help">
              Alanine aminotransferase in U/L.
            </span>
          </div>
          <div className="calc-form-group">
            <label htmlFor="fib4-plt" className="calc-label">
              Platelets (×10⁹/L)
            </label>
            <input
              id="fib4-plt"
              type="number"
              min={1}
              max={2000}
              className="calc-input"
              value={platelets10e9PerL}
              onChange={(e) => setPlatelets10e9PerL(e.target.value)}
              aria-describedby="fib4-plt-help"
            />
            <span className="calc-input-help" id="fib4-plt-help">
              Platelet count in ×10⁹/L (same as 10³/µL).
            </span>
          </div>
          <div className="calc-actions">
            <button
              type="submit"
              className="calc-calculate-btn"
              aria-label="Calculate FIB-4 index from entered labs"
            >
              Calculate FIB-4
            </button>
            <button
              type="button"
              className="calc-reset-btn"
              aria-label="Reset FIB-4 form"
              onClick={() => {
                setAgeYears('');
                setAstUPerL('');
                setAltUPerL('');
                setPlatelets10e9PerL('');
                setValidationErrors([]);
                setResult(null);
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </div>
      <CalcResultsPanel
        id="calc-results-fib4"
        resultsRef={resultsRef}
        ariaLabel="FIB-4 index results"
        ariaLive={result ? 'polite' : 'off'}
      >
        <ResultsPanelTitle />
        {result ? (
          <>
            <div className={`calc-score-display ${result.severity}`}>
              <div className="calc-score-label">FIB-4 index</div>
              <div className="calc-score-value">{result.index}</div>
            </div>
            <CalcInterpretationRegion
              headingId="fib4-interpretation"
              title={result.label}
              severity={result.severity}
              emphasizeRisk={result.severity === 'critical'}
            >
              {result.riskCategoryLabel ? (
                <div className="calc-interpretation-text calc-interpretation-text--emphasis">
                  Risk category: {result.riskCategoryLabel}
                </div>
              ) : null}
              <div className="calc-interpretation-text">{result.riskBand}</div>
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
            <p>Enter age and labs in conventional units, then calculate</p>
          </div>
        )}
      </CalcResultsPanel>
    </div>
  );
}

export function FraminghamRiskCalculator({ onResultChange }) {
  const slug = 'framingham-risk';
  const icon = getCalculatorSubIcon(slug);
  const resultsRef = useRef(null);
  const [ageYears, setAgeYears] = useState('');
  const [sex, setSex] = useState('');
  const [totalCholesterolMgDl, setTotalCholesterolMgDl] = useState('');
  const [hdlCholesterolMgDl, setHdlCholesterolMgDl] = useState('');
  const [systolicBpMmHg, setSystolicBpMmHg] = useState('');
  const [onHypertensionTreatment, setOnHypertensionTreatment] = useState(false);
  const [smoker, setSmoker] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (onResultChange) {
      onResultChange(
        result
          ? {
              tenYearRiskPct: result.tenYearRiskPct,
              severity: result.severity,
              totalPoints: result.totalPoints,
            }
          : null
      );
    }
  }, [onResultChange, result]);

  useEffect(() => {
    if (result) scrollResultsIntoView(resultsRef.current);
  }, [result]);

  const runCalculate = () => {
    const errors = validateFraminghamInputs({
      ageYears,
      sex,
      totalCholesterolMgDl,
      hdlCholesterolMgDl,
      systolicBpMmHg,
    });
    setValidationErrors(errors);
    if (errors.length) {
      setResult(null);
      return;
    }
    const computed = computeFraminghamRisk({
      ageYears: Number(ageYears),
      sex,
      totalCholesterolMgDl: Number(totalCholesterolMgDl),
      hdlCholesterolMgDl: Number(hdlCholesterolMgDl),
      systolicBpMmHg: Number(systolicBpMmHg),
      onHypertensionTreatment,
      smoker,
    });
    if (!computed) {
      setResult(null);
      return;
    }
    const interp = interpretFraminghamRisk(computed.tenYearRiskPct);
    setResult({ ...computed, ...interp });
  };

  return (
    <div className={`calculator-interface calculator-interface--${slug}`}>
      <div className="calculator-inputs">
        <CalcPanelTitle icon={icon}>
          <span id="framingham-form-title">Framingham 10-year CHD risk</span>
        </CalcPanelTitle>
        <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
          <CalcDecisionSupportLead />
          <p className="calc-disclaimer-detail">
            ATP III Framingham hard CHD risk (Wilson et al.) — alternative to ASCVD PCE; ages 30–74 only.
          </p>
        </div>
        <form
          className="calc-pr1-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            runCalculate();
          }}
        >
          {validationErrors.length ? (
            <div className="calc-error-summary" role="alert">
              <ul>
                {validationErrors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="calc-form-group">
            <label htmlFor="framingham-age" className="calc-label">
              Age (years)
            </label>
            <input
              id="framingham-age"
              type="number"
              className="calc-input"
              value={ageYears}
              onChange={(e) => setAgeYears(e.target.value)}
            />
          </div>
          <div className="calc-form-group">
            <label htmlFor="framingham-sex" className="calc-label">
              Sex
            </label>
            <select
              id="framingham-sex"
              className="calc-select"
              value={sex}
              onChange={(e) => setSex(e.target.value)}
            >
              <option value="">Select…</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </div>
          <div className="calc-form-group">
            <label htmlFor="framingham-tc" className="calc-label">
              Total cholesterol (mg/dL)
            </label>
            <input
              id="framingham-tc"
              type="number"
              className="calc-input"
              value={totalCholesterolMgDl}
              onChange={(e) => setTotalCholesterolMgDl(e.target.value)}
            />
          </div>
          <div className="calc-form-group">
            <label htmlFor="framingham-hdl" className="calc-label">
              HDL cholesterol (mg/dL)
            </label>
            <input
              id="framingham-hdl"
              type="number"
              className="calc-input"
              value={hdlCholesterolMgDl}
              onChange={(e) => setHdlCholesterolMgDl(e.target.value)}
            />
          </div>
          <div className="calc-form-group">
            <label htmlFor="framingham-sbp" className="calc-label">
              Systolic BP (mmHg)
            </label>
            <input
              id="framingham-sbp"
              type="number"
              className="calc-input"
              value={systolicBpMmHg}
              onChange={(e) => setSystolicBpMmHg(e.target.value)}
            />
          </div>
          <div className="calc-timi-row">
            <div className="calc-checkbox-group">
              <input
                type="checkbox"
                id="framingham-htn-treated"
                className="calc-checkbox"
                checked={onHypertensionTreatment}
                onChange={(e) => setOnHypertensionTreatment(e.target.checked)}
              />
              <label htmlFor="framingham-htn-treated" className="calc-checkbox-label">
                On hypertension treatment
              </label>
            </div>
          </div>
          <div className="calc-timi-row">
            <div className="calc-checkbox-group">
              <input
                type="checkbox"
                id="framingham-smoker"
                className="calc-checkbox"
                checked={smoker}
                onChange={(e) => setSmoker(e.target.checked)}
              />
              <label htmlFor="framingham-smoker" className="calc-checkbox-label">
                Current smoker
              </label>
            </div>
          </div>
          <div className="calc-actions">
            <button type="submit" className="calc-calculate-btn">
              Calculate Framingham risk
            </button>
          </div>
        </form>
      </div>
      <CalcResultsPanel id="calc-results-framingham-risk" resultsRef={resultsRef}>
        <ResultsPanelTitle />
        {result ? (
          <>
            <div className={`calc-score-display ${result.severity}`}>
              <div className="calc-score-label">10-year hard CHD risk</div>
              <div className="calc-score-value">{result.tenYearRiskPct}%</div>
              <div className="calc-score-interpretation">{result.totalPoints} Framingham points</div>
            </div>
            <CalcInterpretationRegion
              headingId="framingham-interpretation"
              title={result.label}
              severity={result.severity}
              emphasizeRisk={result.tenYearRiskPct >= 20}
            >
              <div className="calc-interpretation-text">{result.riskBand}</div>
              <div className="calc-interpretation-text">{result.interpretation}</div>
            </CalcInterpretationRegion>
            <CalcResultSafetyFooter />
          </>
        ) : (
          <div className="calc-results-empty">
            <CalcResultsEmptyIcon icon={icon} />
            <p>Enter risk factors</p>
          </div>
        )}
      </CalcResultsPanel>
    </div>
  );
}

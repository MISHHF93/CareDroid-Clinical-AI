import { AriaInvalidInput, AriaInvalidSelect } from '../../components/a11y/AriaInvalidFields';
/**
 * PR4A calculators — ASCVD PCE, CKD staging, STOP-Bang, AUDIT-C.
 * Decision-support / screening UX with accessibility affordances.
 */

import { useEffect, useRef, useState } from 'react';
import { computeAscvdPceResult } from '../../utils/ascvdPceCalculator';
import { computeCkdStagingResult } from '../../utils/ckdStagingCalculator';
import { STOP_BANG_CRITERIA_META, computeStopBangResult } from '../../utils/stopBangCalculator';
import {
  AUDIT_C_BINGE_OPTIONS,
  AUDIT_C_DRINKS_PER_DAY_OPTIONS,
  AUDIT_C_FREQUENCY_OPTIONS,
  AUDIT_C_MEN_POSITIVE_THRESHOLD,
  AUDIT_C_WOMEN_POSITIVE_THRESHOLD,
  computeAuditCResult,
} from '../../utils/auditCCalculator';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS, getCalculatorSubIcon } from '../../navigation/iconRegistry';
import {
  CalcDecisionSupportLead as SharedCalcDecisionSupportLead,
  CalcResultSafetyFooter as SharedCalcResultSafetyFooter,
  CalcInterpretationRegion,
  CalcPanelTitle,
  CalcResultsEmptyIcon,
  ResultsPanelTitle,
  scrollResultsIntoView,
} from './calculatorPrimitives';

function CalcDecisionSupportLead() {
  return (
    <SharedCalcDecisionSupportLead>
      Does not establish a diagnosis or replace clinician judgment; follow local protocols.
    </SharedCalcDecisionSupportLead>
  );
}

function CalcResultSafetyFooter() {
  return (
    <SharedCalcResultSafetyFooter>
      Output reflects the values you entered and may omit important clinical context. Do not treat
      this screen as definitive proof of illness severity, eligibility, or treatment requirement,
      and do not use it alone to rule in or rule out a diagnosis.
    </SharedCalcResultSafetyFooter>
  );
}

function focusFirstFieldById(ids) {
  for (const id of ids) {
    const el = document.getElementById(id) as any;
    if (el && !el.disabled) {
      el.focus();
      return;
    }
  }
}

function fieldClass(baseClass, isInvalid) {
  return isInvalid ? `${baseClass} ${baseClass}--invalid` : baseClass;
}

/** Maps clinical risk keys to shared badge tone classes (aligns with CKD prognostic badge). */
const PR4A_RISK_BADGE_TONE = {
  low: 'low',
  borderline: 'moderately_increased',
  intermediate: 'high',
  high: 'very_high',
  moderately_increased: 'moderately_increased',
  very_high: 'very_high',
  negative: 'low',
  positive_women: 'moderately_increased',
  positive_men: 'very_high',
};

function CalcRiskStatusBadge({ label, toneKey }) {
  const tone = PR4A_RISK_BADGE_TONE[toneKey] ?? 'low';
  return (
    <div className={`calc-pr4a-risk-badge calc-pr4a-risk-badge--${tone}`} role="status">
      {label}
    </div>
  );
}

export function AscvdRiskCalculator({ onResultChange }) {
  const [ageYears, setAgeYears] = useState('');
  const [sex, setSex] = useState('');
  const [race, setRace] = useState('');
  const [totalCholesterol, setTotalCholesterol] = useState('');
  const [hdlCholesterol, setHdlCholesterol] = useState('');
  const [cholesterolUnit, setCholesterolUnit] = useState('mg_dl');
  const [systolicBpMmHg, setSystolicBpMmHg] = useState('');
  const [onHypertensionTreatment, setOnHypertensionTreatment] = useState(false);
  const [diabetes, setDiabetes] = useState(false);
  const [smoker, setSmoker] = useState(false);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    if (onResultChange) {
      onResultChange(
        result
          ? {
              tenYearRiskPct: result.tenYearRiskPct,
              riskCategory: result.riskCategory,
              severity: result.severity,
            }
          : null,
      );
    }
  }, [onResultChange, result]);

  useEffect(() => {
    if (result) scrollResultsIntoView(resultsRef.current);
  }, [result]);

  const runCalculate = () => {
    const out = computeAscvdPceResult({
      ageYears: ageYears === '' ? NaN : Number(ageYears),
      sex,
      race,
      totalCholesterol: totalCholesterol === '' ? NaN : Number(totalCholesterol),
      hdlCholesterol: hdlCholesterol === '' ? NaN : Number(hdlCholesterol),
      cholesterolUnit,
      systolicBpMmHg: systolicBpMmHg === '' ? NaN : Number(systolicBpMmHg),
      onHypertensionTreatment,
      diabetes,
      smoker,
    });
    setValidationErrors(out.ok ? [] : out.errors || []);
    setResult(out.ok ? out : null);
    if (!out.ok) focusFirstFieldById(['ascvd-age', 'ascvd-sex', 'ascvd-race', 'ascvd-total-chol']);
  };

  const reset = () => {
    setAgeYears('');
    setSex('');
    setRace('');
    setTotalCholesterol('');
    setHdlCholesterol('');
    setCholesterolUnit('mg_dl');
    setSystolicBpMmHg('');
    setOnHypertensionTreatment(false);
    setDiabetes(false);
    setSmoker(false);
    setValidationErrors([]);
    setResult(null);
    requestAnimationFrame(() => document.getElementById('ascvd-age')?.focus());
  };

  const icon = getCalculatorSubIcon('ascvd-risk');
  const formTitleId = 'ascvd-form-title';
  const interpretationHeadingId = 'ascvd-interpretation-heading';
  const validationSummaryId = 'ascvd-validation-summary';
  const ascvdAgeHelpId = 'ascvd-age-help';
  const ascvdScoreLabelId = 'ascvd-score-label';
  const hasValidationErrors = validationErrors.length > 0;
  const fieldInvalid = (isEmpty) => hasValidationErrors && isEmpty;

  return (
    <div className="calculator-interface calculator-interface--ascvd-risk">
      <div className="calculator-inputs">
        <CalcPanelTitle icon={icon}>
          <span id={formTitleId}>ASCVD 10-year risk (Pooled Cohort Equations)</span>
        </CalcPanelTitle>

        <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
          <CalcDecisionSupportLead />
          <p className="calc-disclaimer-detail">
            Use as decision-support for clinician-patient discussions.
          </p>
          <p className="calc-disclaimer-detail">
            <strong>Primary prevention context:</strong> PCE estimates 10-year risk of first hard
            ASCVD event in adults aged 40–79. Does not recommend statins or other therapies — use
            with ACC/AHA prevention guidance and shared decision-making.
          </p>
        </div>

        <form
          className="calc-pr1-form"
          noValidate
          aria-labelledby={formTitleId}
          aria-describedby={hasValidationErrors ? validationSummaryId : undefined}
          onSubmit={(e) => {
            e.preventDefault();
            runCalculate();
          }}
        >
          {hasValidationErrors ? (
            <div
              id={validationSummaryId}
              className="calc-validation-errors"
              role="alert"
              aria-live="assertive"
            >
              <p className="calc-validation-errors-title">
                Correct the following before calculating:
              </p>
              <ul>
                {validationErrors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <fieldset className="calc-meld-fieldset calc-has-bled-fieldset">
            <legend
              className="calc-timi-legend calc-has-bled-legend"
              id="ascvd-demographics-legend"
            >
              Demographics and risk factors
            </legend>

            <div className="calc-input-group">
              <label className="calc-input-label" htmlFor="ascvd-age">
                Age (years)
              </label>
              <AriaInvalidInput
                id="ascvd-age"
                type="number"
                min="40"
                max="79"
                step="1"
                className={fieldClass('calc-input-field', fieldInvalid(!ageYears.trim()))}
                value={ageYears}
                onChange={(e) => setAgeYears(e.target.value)}
                aria-required="true"
                invalid={fieldInvalid(!ageYears.trim())}
                aria-describedby={ascvdAgeHelpId}
                inputMode="numeric"
              />
              <span className="calc-input-help" id={ascvdAgeHelpId}>
                Valid range 40–79 years for pooled cohort equations.
              </span>
            </div>

            <div className="calc-input-group">
              <label className="calc-input-label" htmlFor="ascvd-sex">
                Sex
              </label>
              <AriaInvalidSelect
                id="ascvd-sex"
                className={fieldClass('calc-select-field', fieldInvalid(!sex))}
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                aria-required="true"
                invalid={fieldInvalid(!sex)}
              >
                <option value="">Select…</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </AriaInvalidSelect>
            </div>

            <div className="calc-input-group">
              <label className="calc-input-label" htmlFor="ascvd-race">
                Race / ethnicity (PCE cohort)
              </label>
              <AriaInvalidSelect
                id="ascvd-race"
                className={fieldClass('calc-select-field', fieldInvalid(!race))}
                value={race}
                onChange={(e) => setRace(e.target.value)}
                aria-required="true"
                invalid={fieldInvalid(!race)}
              >
                <option value="">Select…</option>
                <option value="white">White</option>
                <option value="african_american">African American</option>
                <option value="other">Other (uses White coefficients)</option>
              </AriaInvalidSelect>
            </div>

            <div className="calc-input-group">
              <label className="calc-input-label" htmlFor="ascvd-total-chol">
                Total cholesterol
              </label>
              <div className="calc-input-row calc-input-row--with-unit">
                <AriaInvalidInput
                  id="ascvd-total-chol"
                  type="number"
                  min="0"
                  step="any"
                  className={fieldClass('calc-input-field', fieldInvalid(!totalCholesterol.trim()))}
                  value={totalCholesterol}
                  onChange={(e) => setTotalCholesterol(e.target.value)}
                  aria-required="true"
                  invalid={fieldInvalid(!totalCholesterol.trim())}
                  inputMode="decimal"
                />
                <select
                  className={fieldClass('calc-select-field', false)}
                  value={cholesterolUnit}
                  onChange={(e) => setCholesterolUnit(e.target.value)}
                  aria-label="Cholesterol unit"
                >
                  <option value="mg_dl">mg/dL</option>
                  <option value="mmol_l">mmol/L</option>
                </select>
              </div>
            </div>

            <div className="calc-input-group">
              <label className="calc-input-label" htmlFor="ascvd-hdl">
                HDL cholesterol
              </label>
              <div className="calc-input-row calc-input-row--with-unit">
                <AriaInvalidInput
                  id="ascvd-hdl"
                  type="number"
                  min="0"
                  step="any"
                  className={fieldClass('calc-input-field', fieldInvalid(!hdlCholesterol.trim()))}
                  value={hdlCholesterol}
                  onChange={(e) => setHdlCholesterol(e.target.value)}
                  aria-required="true"
                  invalid={fieldInvalid(!hdlCholesterol.trim())}
                  inputMode="decimal"
                />
                <select
                  className={fieldClass('calc-select-field', false)}
                  value={cholesterolUnit}
                  onChange={(e) => setCholesterolUnit(e.target.value)}
                  aria-label="HDL cholesterol unit"
                >
                  <option value="mg_dl">mg/dL</option>
                  <option value="mmol_l">mmol/L</option>
                </select>
              </div>
            </div>

            <div className="calc-input-group">
              <label className="calc-input-label" htmlFor="ascvd-sbp">
                Systolic blood pressure (mmHg)
              </label>
              <AriaInvalidInput
                id="ascvd-sbp"
                type="number"
                min="70"
                max="260"
                step="1"
                className={fieldClass('calc-input-field', fieldInvalid(!systolicBpMmHg.trim()))}
                value={systolicBpMmHg}
                onChange={(e) => setSystolicBpMmHg(e.target.value)}
                aria-required="true"
                invalid={fieldInvalid(!systolicBpMmHg.trim())}
                inputMode="numeric"
              />
            </div>

            <div className="calc-input-group">
              <div className="calc-checkbox-group">
                <input
                  type="checkbox"
                  id="ascvd-htn-tx"
                  className="calc-checkbox"
                  checked={onHypertensionTreatment}
                  onChange={(e) => setOnHypertensionTreatment(e.target.checked)}
                />
                <label htmlFor="ascvd-htn-tx" className="calc-checkbox-label">
                  On treatment for hypertension
                </label>
              </div>
            </div>

            <div className="calc-input-group">
              <div className="calc-checkbox-group">
                <input
                  type="checkbox"
                  id="ascvd-diabetes"
                  className="calc-checkbox"
                  checked={diabetes}
                  onChange={(e) => setDiabetes(e.target.checked)}
                />
                <label htmlFor="ascvd-diabetes" className="calc-checkbox-label">
                  Diabetes mellitus
                </label>
              </div>
            </div>

            <div className="calc-input-group">
              <div className="calc-checkbox-group">
                <input
                  type="checkbox"
                  id="ascvd-smoker"
                  className="calc-checkbox"
                  checked={smoker}
                  onChange={(e) => setSmoker(e.target.checked)}
                />
                <label htmlFor="ascvd-smoker" className="calc-checkbox-label">
                  Current smoker
                </label>
              </div>
            </div>
          </fieldset>

          <div className="calc-actions">
            <button
              type="submit"
              className="calc-calculate-btn"
              aria-label="Calculate ASCVD 10-year risk"
            >
              <NavIcon icon={CHROME_ICONS.calculator} size={20} aria-hidden />
              Calculate ASCVD risk
            </button>
            <button
              type="button"
              className="calc-reset-btn"
              onClick={reset}
              aria-label="Reset ASCVD form"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      <div
        ref={resultsRef}
        tabIndex={-1}
        className="calculator-results"
        aria-live="polite"
        aria-label="ASCVD risk results"
      >
        <ResultsPanelTitle />

        {result ? (
          <>
            <CalcRiskStatusBadge label={result.label} toneKey={result.riskCategory} />

            <div
              className={`calc-score-display ${result.severity}`}
              role="group"
              aria-labelledby={ascvdScoreLabelId}
            >
              <div id={ascvdScoreLabelId} className="calc-score-label">
                10-year ASCVD risk — {result.tenYearRiskPct.toFixed(1)}% (estimated)
              </div>
              <div className="calc-score-value" aria-hidden="true">
                {result.tenYearRiskPct.toFixed(1)}%
              </div>
              <div className="calc-score-interpretation" aria-hidden="true">
                {result.label}
              </div>
            </div>

            <CalcInterpretationRegion
              headingId={interpretationHeadingId}
              title="Risk interpretation (decision support)"
              severity={result.severity}
              emphasizeRisk={result.riskCategory !== 'low'}
            >
              <div className="calc-interpretation-text">{result.interpretation}</div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.preventionDiscussion}
              </div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.clinicianPatientDisclaimer}
              </div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.safetyDisclaimer}
              </div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.pathwayDisclaimer}
              </div>
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
            <p>Enter demographics and risk factors, then calculate</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function CkdStagingCalculator({ onResultChange }) {
  const [ageYears, setAgeYears] = useState('');
  const [sex, setSex] = useState('');
  const [serumCreatinine, setSerumCreatinine] = useState('');
  const [creatinineUnit, setCreatinineUnit] = useState('mg_dl');
  const [urineAcr, setUrineAcr] = useState('');
  const [acrUnit, setAcrUnit] = useState('mg_g');
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    if (onResultChange) {
      onResultChange(
        result
          ? {
              egfrMlMin: result.egfrMlMin,
              gfrCategory: result.gfrCategory,
              albuminuriaCategory: result.albuminuriaCategory,
              prognosticRisk: result.prognosticRisk,
              severity: result.severity,
            }
          : null,
      );
    }
  }, [onResultChange, result]);

  useEffect(() => {
    if (result) scrollResultsIntoView(resultsRef.current);
  }, [result]);

  const runCalculate = () => {
    const out = computeCkdStagingResult({
      ageYears: ageYears === '' ? NaN : Number(ageYears),
      sex,
      serumCreatinine: serumCreatinine === '' ? NaN : Number(serumCreatinine),
      creatinineUnit,
      urineAcr: urineAcr === '' ? NaN : Number(urineAcr),
      acrUnit,
    });
    setValidationErrors(out.ok ? [] : out.errors || []);
    setResult(out.ok ? out : null);
    if (!out.ok) focusFirstFieldById(['ckd-age', 'ckd-sex', 'ckd-creatinine', 'ckd-acr']);
  };

  const reset = () => {
    setAgeYears('');
    setSex('');
    setSerumCreatinine('');
    setCreatinineUnit('mg_dl');
    setUrineAcr('');
    setAcrUnit('mg_g');
    setValidationErrors([]);
    setResult(null);
    requestAnimationFrame(() => document.getElementById('ckd-age')?.focus());
  };

  const icon = getCalculatorSubIcon('ckd-staging');
  const formTitleId = 'ckd-form-title';
  const interpretationHeadingId = 'ckd-interpretation-heading';
  const validationSummaryId = 'ckd-validation-summary';
  const ckdScoreLabelId = 'ckd-score-label';
  const hasValidationErrors = validationErrors.length > 0;
  const fieldInvalid = (isEmpty) => hasValidationErrors && isEmpty;

  return (
    <div className="calculator-interface calculator-interface--ckd-staging">
      <div className="calculator-inputs">
        <CalcPanelTitle icon={icon}>
          <span id={formTitleId}>CKD stage / staging (KDIGO)</span>
        </CalcPanelTitle>

        <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
          <CalcDecisionSupportLead />
          <p className="calc-disclaimer-detail">
            Use as decision-support for clinician-patient discussions.
          </p>
          <p className="calc-disclaimer-detail">
            <strong>KDIGO staging context:</strong> CKD is defined by kidney damage or GFR &lt;60
            for ≥3 months. A single eGFR and ACR do not establish chronicity. Does not recommend
            dialysis or specific drug therapy.
          </p>
        </div>

        <form
          className="calc-pr1-form"
          noValidate
          aria-labelledby={formTitleId}
          aria-describedby={hasValidationErrors ? validationSummaryId : undefined}
          onSubmit={(e) => {
            e.preventDefault();
            runCalculate();
          }}
        >
          {hasValidationErrors ? (
            <div
              id={validationSummaryId}
              className="calc-validation-errors"
              role="alert"
              aria-live="assertive"
            >
              <p className="calc-validation-errors-title">
                Correct the following before calculating:
              </p>
              <ul>
                {validationErrors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <fieldset className="calc-meld-fieldset calc-has-bled-fieldset">
            <legend className="calc-timi-legend calc-has-bled-legend" id="ckd-labs-legend">
              Demographics and kidney markers
            </legend>

            <div className="calc-input-group">
              <label className="calc-input-label" htmlFor="ckd-age">
                Age (years)
              </label>
              <AriaInvalidInput
                id="ckd-age"
                type="number"
                min="18"
                max="120"
                step="1"
                className={fieldClass('calc-input-field', fieldInvalid(!ageYears.trim()))}
                value={ageYears}
                onChange={(e) => setAgeYears(e.target.value)}
                aria-required="true"
                invalid={fieldInvalid(!ageYears.trim())}
                inputMode="numeric"
              />
            </div>

            <div className="calc-input-group">
              <label className="calc-input-label" htmlFor="ckd-sex">
                Sex
              </label>
              <AriaInvalidSelect
                id="ckd-sex"
                className={fieldClass('calc-select-field', fieldInvalid(!sex))}
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                aria-required="true"
                invalid={fieldInvalid(!sex)}
              >
                <option value="">Select…</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </AriaInvalidSelect>
            </div>

            <div className="calc-input-group">
              <label className="calc-input-label" htmlFor="ckd-creatinine">
                Serum creatinine
              </label>
              <div className="calc-input-row calc-input-row--with-unit">
                <AriaInvalidInput
                  id="ckd-creatinine"
                  type="number"
                  min="0"
                  step="any"
                  className={fieldClass('calc-input-field', fieldInvalid(!serumCreatinine.trim()))}
                  value={serumCreatinine}
                  onChange={(e) => setSerumCreatinine(e.target.value)}
                  aria-required="true"
                  invalid={fieldInvalid(!serumCreatinine.trim())}
                  inputMode="decimal"
                />
                <select
                  className="calc-select-field"
                  value={creatinineUnit}
                  onChange={(e) => setCreatinineUnit(e.target.value)}
                  aria-label="Creatinine unit"
                >
                  <option value="mg_dl">mg/dL</option>
                  <option value="umol_l">µmol/L</option>
                </select>
              </div>
            </div>

            <div className="calc-input-group">
              <label className="calc-input-label" htmlFor="ckd-acr">
                Urine albumin-creatinine ratio (ACR)
              </label>
              <div className="calc-input-row calc-input-row--with-unit">
                <AriaInvalidInput
                  id="ckd-acr"
                  type="number"
                  min="0"
                  step="any"
                  className={fieldClass('calc-input-field', fieldInvalid(!urineAcr.trim()))}
                  value={urineAcr}
                  onChange={(e) => setUrineAcr(e.target.value)}
                  aria-required="true"
                  invalid={fieldInvalid(!urineAcr.trim())}
                  inputMode="decimal"
                />
                <select
                  className="calc-select-field"
                  value={acrUnit}
                  onChange={(e) => setAcrUnit(e.target.value)}
                  aria-label="ACR unit"
                >
                  <option value="mg_g">mg/g</option>
                  <option value="mg_mmol">mg/mmol</option>
                </select>
              </div>
            </div>
          </fieldset>

          <div className="calc-actions">
            <button
              type="submit"
              className="calc-calculate-btn"
              aria-label="Calculate CKD stage and prognostic risk"
            >
              <NavIcon icon={CHROME_ICONS.calculator} size={20} aria-hidden />
              Calculate CKD staging
            </button>
            <button
              type="button"
              className="calc-reset-btn"
              onClick={reset}
              aria-label="Reset CKD staging form"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      <div
        ref={resultsRef}
        tabIndex={-1}
        className="calculator-results"
        aria-live="polite"
        aria-label="CKD staging results"
      >
        <ResultsPanelTitle />

        {result ? (
          <>
            <div
              className={`calc-ckd-prognostic-badge calc-ckd-prognostic-badge--${result.prognosticRisk}`}
              role="status"
            >
              {result.prognosticRiskLabel}
            </div>

            <div
              className={`calc-score-display ${result.severity}`}
              role="group"
              aria-labelledby={ckdScoreLabelId}
            >
              <div id={ckdScoreLabelId} className="calc-score-label">
                eGFR (CKD-EPI 2021) — {result.egfrMlMin} mL/min/1.73 m²
              </div>
              <div className="calc-score-value" aria-hidden="true">
                {result.egfrMlMin}
              </div>
              <div className="calc-score-interpretation" aria-hidden="true">
                mL/min/1.73 m² — {result.gfrCategoryLabel}
              </div>
            </div>

            <div className="calc-breakdown">
              <div className="calc-breakdown-title" id="ckd-breakdown-heading">
                KDIGO categories
              </div>
              <ul className="calc-breakdown-list" aria-labelledby="ckd-breakdown-heading">
                <li className="calc-breakdown-item">
                  <span className="calc-breakdown-label">GFR category</span>
                  <span className="calc-breakdown-score">{result.gfrCategoryLabel}</span>
                </li>
                <li className="calc-breakdown-item">
                  <span className="calc-breakdown-label">Albuminuria</span>
                  <span className="calc-breakdown-score">{result.albuminuriaCategoryLabel}</span>
                </li>
                <li className="calc-breakdown-item">
                  <span className="calc-breakdown-label">Combined G×A stage</span>
                  <span className="calc-breakdown-score">{result.combinedStage}</span>
                </li>
                <li className="calc-breakdown-item">
                  <span className="calc-breakdown-label">Prognostic risk</span>
                  <span className="calc-breakdown-score">{result.prognosticRiskLabel}</span>
                </li>
              </ul>
            </div>

            <CalcInterpretationRegion
              headingId={interpretationHeadingId}
              title="Staging interpretation (decision support)"
              severity={result.severity}
              emphasizeRisk={result.prognosticRisk !== 'low'}
            >
              <div className="calc-interpretation-text">{result.interpretation}</div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.stagingDiscussion}
              </div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.gfrCategoryDescription}
              </div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.albuminuriaCategoryDescription}
              </div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.clinicianPatientDisclaimer}
              </div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.safetyDisclaimer}
              </div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.pathwayDisclaimer}
              </div>
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
            <p>Enter age, sex, creatinine, and ACR, then calculate</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function StopBangCalculator({ onResultChange }) {
  const [inputs, setInputs] = useState(() =>
    Object.fromEntries(STOP_BANG_CRITERIA_META.map((row) => [row.key, false])),
  );
  const [result, setResult] = useState<any>(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    if (onResultChange) {
      onResultChange(
        result
          ? {
              totalScore: result.totalScore,
              osaRiskCategory: result.osaRiskCategory,
              severity: result.severity,
            }
          : null,
      );
    }
  }, [onResultChange, result]);

  useEffect(() => {
    if (result) scrollResultsIntoView(resultsRef.current);
  }, [result]);

  const runCalculate = () => {
    const out = computeStopBangResult(inputs);
    setResult(out.ok ? out : null);
  };

  const reset = () => {
    setInputs(Object.fromEntries(STOP_BANG_CRITERIA_META.map((row) => [row.key, false])));
    setResult(null);
    requestAnimationFrame(() => document.getElementById('stop-bang-snoring')?.focus());
  };

  const setCriterion = (key, checked) => {
    setInputs((prev) => ({ ...prev, [key]: checked }));
  };

  const icon = getCalculatorSubIcon('stop-bang');
  const formTitleId = 'stop-bang-form-title';
  const interpretationHeadingId = 'stop-bang-interpretation-heading';

  return (
    <div className="calculator-interface calculator-interface--stop-bang">
      <div className="calculator-inputs">
        <CalcPanelTitle icon={icon}>
          <span id={formTitleId}>STOP-Bang (OSA screening)</span>
        </CalcPanelTitle>

        <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
          <CalcDecisionSupportLead />
          <p className="calc-disclaimer-detail">
            <strong>Screening tool only.</strong> STOP-Bang estimates risk of moderate-to-severe
            obstructive sleep apnea. It does not diagnose OSA and does not recommend CPAP, surgery,
            or other therapies.
          </p>
        </div>

        <form
          className="calc-pr1-form"
          noValidate
          aria-labelledby={formTitleId}
          onSubmit={(e) => {
            e.preventDefault();
            runCalculate();
          }}
        >
          <fieldset className="calc-has-bled-fieldset">
            <legend className="calc-has-bled-legend" id="stop-bang-criteria-legend">
              STOP-Bang criteria (check all that apply)
            </legend>
            <div
              className="calc-has-bled-criteria"
              role="group"
              aria-labelledby="stop-bang-criteria-legend"
            >
              {STOP_BANG_CRITERIA_META.map((row) => {
                const id = `stop-bang-${row.key}`;
                const helpId = `${id}-help`;
                const checked = Boolean(inputs[row.key]);
                return (
                  <div key={row.key} className="calc-has-bled-row">
                    <div className="calc-checkbox-group">
                      <input
                        type="checkbox"
                        id={id}
                        className="calc-checkbox"
                        checked={checked}
                        onChange={(e) => setCriterion(row.key, e.target.checked)}
                        aria-describedby={helpId}
                      />
                      <label htmlFor={id} className="calc-checkbox-label">
                        {row.letter} — {row.shortLabel}
                      </label>
                    </div>
                    <span className="calc-input-help calc-has-bled-help" id={helpId}>
                      {row.help}
                    </span>
                  </div>
                );
              })}
            </div>
          </fieldset>

          <div className="calc-actions">
            <button
              type="submit"
              className="calc-calculate-btn"
              aria-label="Calculate STOP-Bang score"
            >
              <NavIcon icon={CHROME_ICONS.calculator} size={20} aria-hidden />
              Calculate STOP-Bang
            </button>
            <button
              type="button"
              className="calc-reset-btn"
              onClick={reset}
              aria-label="Reset STOP-Bang form"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      <div
        ref={resultsRef}
        tabIndex={-1}
        className="calculator-results"
        aria-live="polite"
        aria-label="STOP-Bang results"
      >
        <ResultsPanelTitle />

        {result ? (
          <>
            <CalcRiskStatusBadge label={result.label} toneKey={result.osaRiskCategory} />

            <div
              className={`calc-score-display ${result.severity}`}
              role="group"
              aria-label={`STOP-Bang score ${result.totalScore} of 8, ${result.label}`}
            >
              <div className="calc-score-label">STOP-Bang score</div>
              <div className="calc-score-value" aria-hidden="true">
                {result.totalScore}
              </div>
              <div className="calc-score-interpretation" aria-hidden="true">
                of 8 — {result.label}
              </div>
            </div>

            <div className="calc-breakdown">
              <div className="calc-breakdown-title" id="stop-bang-breakdown-heading">
                Criteria present
              </div>
              <ul className="calc-breakdown-list" aria-labelledby="stop-bang-breakdown-heading">
                {STOP_BANG_CRITERIA_META.map((row) => (
                  <li key={row.key} className="calc-breakdown-item">
                    <span className="calc-breakdown-label">{row.shortLabel}</span>
                    <span className="calc-breakdown-score">{result.breakdown[row.key]}</span>
                  </li>
                ))}
              </ul>
            </div>

            <CalcInterpretationRegion
              headingId={interpretationHeadingId}
              title="Screening interpretation (decision support)"
              severity={result.severity}
              emphasizeRisk={result.osaRiskCategory !== 'low'}
            >
              <div className="calc-interpretation-text">{result.interpretation}</div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.osaRiskDiscussion}
              </div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.screeningDisclaimer}
              </div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.safetyDisclaimer}
              </div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.pathwayDisclaimer}
              </div>
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
      </div>
    </div>
  );
}

const AUDIT_C_QUESTIONS = [
  {
    key: 'drinkingFrequency',
    label: 'How often do you have a drink containing alcohol?',
    options: AUDIT_C_FREQUENCY_OPTIONS,
  },
  {
    key: 'drinksPerDay',
    label: 'How many standard drinks do you have on a typical day when drinking?',
    options: AUDIT_C_DRINKS_PER_DAY_OPTIONS,
  },
  {
    key: 'bingeFrequency',
    label: 'How often do you have six or more drinks on one occasion?',
    options: AUDIT_C_BINGE_OPTIONS,
  },
];

export function AuditCCalculator({ onResultChange }) {
  const [responses, setResponses] = useState(() =>
    Object.fromEntries(AUDIT_C_QUESTIONS.map((q) => [q.key, ''])),
  );
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    if (onResultChange) {
      onResultChange(
        result
          ? {
              totalScore: result.totalScore,
              screeningResult: result.screeningResult,
              severity: result.severity,
            }
          : null,
      );
    }
  }, [onResultChange, result]);

  useEffect(() => {
    if (result) scrollResultsIntoView(resultsRef.current);
  }, [result]);

  const runCalculate = () => {
    const out = computeAuditCResult(responses);
    setValidationErrors(out.ok ? [] : out.errors || []);
    setResult(out.ok ? out : null);
    if (!out.ok) {
      const missing = AUDIT_C_QUESTIONS.find((q) => responses[q.key] === '');
      if (missing) document.getElementById(`audit-c-${missing.key}`)?.focus();
    }
  };

  const reset = () => {
    setResponses(Object.fromEntries(AUDIT_C_QUESTIONS.map((q) => [q.key, ''])));
    setValidationErrors([]);
    setResult(null);
    requestAnimationFrame(() => document.getElementById('audit-c-drinkingFrequency')?.focus());
  };

  const setItem = (key, value) => {
    setResponses((prev) => ({ ...prev, [key]: value }));
  };

  const icon = getCalculatorSubIcon('audit-c');
  const formTitleId = 'audit-c-form-title';
  const interpretationHeadingId = 'audit-c-interpretation-heading';
  const validationSummaryId = 'audit-c-validation-summary';
  const hasValidationErrors = validationErrors.length > 0;
  const fieldInvalid = (isEmpty) => hasValidationErrors && isEmpty;

  return (
    <div className="calculator-interface calculator-interface--audit-c">
      <div className="calculator-inputs">
        <CalcPanelTitle icon={icon}>
          <span id={formTitleId}>AUDIT-C (alcohol consumption screen)</span>
        </CalcPanelTitle>

        <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
          <CalcDecisionSupportLead />
          <p className="calc-disclaimer-detail">
            <strong>Screening only.</strong> AUDIT-C is a brief alcohol consumption screen (0–12).
            Apply sex-specific positive thresholds (≥{AUDIT_C_WOMEN_POSITIVE_THRESHOLD} women, ≥
            {AUDIT_C_MEN_POSITIVE_THRESHOLD} men). It does not diagnose alcohol use disorder or
            provide withdrawal-management advice.
          </p>
        </div>

        <form
          className="calc-pr1-form"
          noValidate
          aria-labelledby={formTitleId}
          aria-describedby={hasValidationErrors ? validationSummaryId : undefined}
          onSubmit={(e) => {
            e.preventDefault();
            runCalculate();
          }}
        >
          {hasValidationErrors ? (
            <div
              id={validationSummaryId}
              className="calc-validation-errors"
              role="alert"
              aria-live="assertive"
            >
              <p className="calc-validation-errors-title">
                Complete all questions before calculating ({validationErrors.length}{' '}
                {validationErrors.length === 1 ? 'item' : 'items'} remaining).
              </p>
              <ul>
                {validationErrors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <fieldset className="calc-meld-fieldset calc-has-bled-fieldset">
            <legend className="calc-timi-legend calc-has-bled-legend" id="audit-c-questions-legend">
              AUDIT-C questions
            </legend>
            {AUDIT_C_QUESTIONS.map((item) => {
              const id = `audit-c-${item.key}`;
              return (
                <div key={item.key} className="calc-input-group">
                  <label className="calc-input-label" htmlFor={id}>
                    {item.label}
                  </label>
                  <AriaInvalidSelect
                    id={id}
                    className={fieldClass(
                      'calc-select-field',
                      fieldInvalid(responses[item.key] === ''),
                    )}
                    value={responses[item.key]}
                    onChange={(e) => setItem(item.key, e.target.value)}
                    aria-required="true"
                    invalid={fieldInvalid(responses[item.key] === '')}
                    aria-describedby={hasValidationErrors ? validationSummaryId : undefined}
                  >
                    <option value="">Select…</option>
                    {item.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} ({opt.points})
                      </option>
                    ))}
                  </AriaInvalidSelect>
                </div>
              );
            })}
          </fieldset>

          <div className="calc-actions">
            <button
              type="submit"
              className="calc-calculate-btn"
              aria-label="Calculate AUDIT-C score"
            >
              <NavIcon icon={CHROME_ICONS.calculator} size={20} aria-hidden />
              Calculate AUDIT-C
            </button>
            <button
              type="button"
              className="calc-reset-btn"
              onClick={reset}
              aria-label="Reset AUDIT-C form"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      <div
        ref={resultsRef}
        tabIndex={-1}
        className="calculator-results"
        aria-live="polite"
        aria-label="AUDIT-C results"
      >
        <ResultsPanelTitle />

        {result ? (
          <>
            <CalcRiskStatusBadge label={result.label} toneKey={result.screeningResult} />

            <div
              className={`calc-score-display ${result.severity}`}
              role="group"
              aria-label={`AUDIT-C total score ${result.totalScore} of 12, ${result.label}`}
            >
              <div className="calc-score-label">AUDIT-C total score</div>
              <div className="calc-score-value" aria-hidden="true">
                {result.totalScore}
              </div>
              <div className="calc-score-interpretation" aria-hidden="true">
                of 12 — sex-specific thresholds ={AUDIT_C_WOMEN_POSITIVE_THRESHOLD} (women) / =
                {AUDIT_C_MEN_POSITIVE_THRESHOLD} (men)
              </div>
            </div>

            <div className="calc-breakdown">
              <div className="calc-breakdown-title" id="audit-c-breakdown-heading">
                Item scores
              </div>
              <ul className="calc-breakdown-list" aria-labelledby="audit-c-breakdown-heading">
                {AUDIT_C_QUESTIONS.map((item) => (
                  <li key={item.key} className="calc-breakdown-item">
                    <span className="calc-breakdown-label">{item.label}</span>
                    <span className="calc-breakdown-score">{result.breakdown[item.key]}</span>
                  </li>
                ))}
              </ul>
            </div>

            <CalcInterpretationRegion
              headingId={interpretationHeadingId}
              title="Screening interpretation (decision support)"
              severity={result.severity}
              emphasizeRisk={result.screeningResult !== 'negative'}
            >
              <div className="calc-interpretation-text">{result.interpretation}</div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.screeningDiscussion}
              </div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.screeningDisclaimer}
              </div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.safetyDisclaimer}
              </div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.pathwayDisclaimer}
              </div>
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
            <p>Answer all three questions, then calculate</p>
          </div>
        )}
      </div>
    </div>
  );
}

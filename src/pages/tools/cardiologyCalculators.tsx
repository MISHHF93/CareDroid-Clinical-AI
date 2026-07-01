import { useEffect, useRef, useState } from 'react';
import { NavIcon } from '../../navigation/NavIcon';
import { getCalculatorSubIcon, CHROME_ICONS } from '../../navigation/iconRegistry';
import {
  CHADS2_CRITERIA_META,
  HEART_FAILURE_STAGE_DISCLAIMER,
  calculateChads2Score,
  computeDukeTreadmillScore,
  computeHcmSuddenDeathRisk,
  computeReynoldsRiskHelper,
  determineHeartFailureStage,
  interpretChads2Score,
  interpretDukeTreadmillScore,
  interpretHcmSuddenDeathRisk,
  interpretReynoldsRiskHelper,
  validateDukeTreadmillInputs,
  validateHcmSuddenDeathRiskInputs,
  validateReynoldsInputs,
} from '../../utils/cardiologyRiskCalculators';

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

function CalcResultsEmptyIcon({ icon }) {
  return (
    <div className="calc-results-empty-icon" aria-hidden>
      <NavIcon icon={icon} size={56} />
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

function CalcInterpretationRegion({ headingId, title, severity, children }) {
  return (
    <section className={`calc-interpretation-box ${severity}`} role="region" aria-labelledby={headingId}>
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

function ValidationSummary({ id, errors }) {
  if (!errors.length) return null;
  return (
    <div id={id} className="calc-validation-summary" role="alert">
      <strong>Check required inputs:</strong>
      <ul>
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </div>
  );
}

function EmptyResults({ icon, text }) {
  return (
    <div className="calculator-results-empty">
      <CalcResultsEmptyIcon icon={icon} />
      <p>{text}</p>
    </div>
  );
}

function ResultCard({ slug, result, scoreLabel = 'Score' }) {
  const headingId = `${slug}-interpretation-heading`;
  if (!result) return null;
  return (
    <CalcInterpretationRegion headingId={headingId} title={result.interpretation.label} severity={result.interpretation.severity}>
      <div className="calc-score-display" aria-label={`${scoreLabel}: ${result.primaryValue}`}>
        <span className="calc-score-number">{result.primaryValue}</span>
        <span className="calc-score-unit">{scoreLabel}</span>
      </div>
      <p>{result.interpretation.riskBand}</p>
      <p>{result.interpretation.interpretation}</p>
      <p className="calc-disclaimer-detail">{result.interpretation.disclaimer}</p>
      <p className="calc-reference-line">{result.interpretation.referenceLine}</p>
      <CalcResultSafetyFooter />
    </CalcInterpretationRegion>
  );
}

function CheckboxScoreCalculator({
  slug,
  title,
  criteria,
  calculate,
  interpret,
  onResultChange,
  resultPayload,
  disclaimer,
  scoreLabel = 'Score',
}) {
  const icon = getCalculatorSubIcon(slug);
  const [inputs, setInputs] = useState(() => Object.fromEntries(criteria.map((c) => [c.key, false])));
  const [result, setResult] = useState<any>(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    onResultChange?.(result ? resultPayload(result) : null);
  }, [onResultChange, result, resultPayload]);

  useEffect(() => {
    if (result) scrollResultsIntoView(resultsRef.current);
  }, [result]);

  const runCalculate = () => {
    const score = calculate(inputs);
    const interpretation = interpret(score);
    setResult({ score, interpretation, primaryValue: score });
  };

  const reset = () => {
    setInputs(Object.fromEntries(criteria.map((c) => [c.key, false])));
    setResult(null);
  };

  return (
    <div className={`calculator-interface calculator-interface--${slug}`}>
      <div className="calculator-inputs">
        <CalcPanelTitle icon={icon}>
          <span id={`${slug}-form-title`}>{title}</span>
        </CalcPanelTitle>
        <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
          <CalcDecisionSupportLead />
          <p className="calc-disclaimer-detail">{disclaimer}</p>
        </div>
        <form
          className="calc-pr1-form"
          noValidate
          aria-labelledby={`${slug}-form-title`}
          onSubmit={(event) => {
            event.preventDefault();
            runCalculate();
          }}
        >
          <fieldset className="calc-has-bled-fieldset">
            <legend className="calc-timi-legend">Criteria</legend>
            {criteria.map((criterion) => (
              <label key={criterion.key} className="calc-checkbox-group">
                <input
                  type="checkbox"
                  checked={inputs[criterion.key]}
                  onChange={(event) =>
                    setInputs((previous) => ({ ...previous, [criterion.key]: event.target.checked }))
                  }
                />
                <span>
                  <strong>{criterion.shortLabel}</strong>
                  <span className="calc-input-help">
                    {criterion.help} ({criterion.points} pt{criterion.points === 1 ? '' : 's'})
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          <div className="calculator-actions">
            <button type="submit" className="calculate-btn">
              Calculate {title}
            </button>
            <button type="button" className="reset-btn" onClick={reset}>
              Reset
            </button>
          </div>
        </form>
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
          <ResultCard slug={slug} title={title} result={{ ...result, primaryValue: result.score }} scoreLabel={scoreLabel} {...{} as any} />
        ) : (
          <EmptyResults icon={icon} text="Select criteria and calculate to view risk context." />
        )}
      </div>
    </div>
  );
}

export function Chads2Calculator({ onResultChange }) {
  return (
    <CheckboxScoreCalculator
      slug="chads2"
      title="CHADS2"
      criteria={CHADS2_CRITERIA_META}
      calculate={calculateChads2Score}
      interpret={interpretChads2Score}
      onResultChange={onResultChange}
      resultPayload={(result) => ({
        score: result.score,
        riskBand: result.interpretation.riskBand,
        severity: result.interpretation.severity,
      })}
      disclaimer="Older atrial fibrillation stroke-risk score. Use current guideline tools and clinician judgment for decisions."
    />
  );
}

export function DukeTreadmillScoreCalculator({ onResultChange }) {
  const slug = 'duke-treadmill-score';
  const icon = getCalculatorSubIcon(slug);
  const [exerciseMinutes, setExerciseMinutes] = useState('');
  const [stDeviationMm, setStDeviationMm] = useState('');
  const [anginaIndex, setAnginaIndex] = useState('0');
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    onResultChange?.(
      result
        ? {
            score: result.score,
            riskBand: result.interpretation.riskBand,
            severity: result.interpretation.severity,
          }
        : null
    );
  }, [onResultChange, result]);

  useEffect(() => {
    if (result) scrollResultsIntoView(resultsRef.current);
  }, [result]);

  const runCalculate = () => {
    const raw = { exerciseMinutes, stDeviationMm, anginaIndex: Number(anginaIndex) };
    const errors = validateDukeTreadmillInputs(raw);
    setValidationErrors(errors);
    if (errors.length) {
      setResult(null);
      return;
    }
    const computed = computeDukeTreadmillScore({
      exerciseMinutes: Number(exerciseMinutes),
      stDeviationMm: Number(stDeviationMm),
      anginaIndex: Number(anginaIndex),
    });
    setResult({ ...(computed as any), interpretation: interpretDukeTreadmillScore((computed as any).score), primaryValue: (computed as any).score });
  };

  const reset = () => {
    setExerciseMinutes('');
    setStDeviationMm('');
    setAnginaIndex('0');
    setValidationErrors([]);
    setResult(null);
  };

  return (
    <div className={`calculator-interface calculator-interface--${slug}`}>
      <div className="calculator-inputs">
        <CalcPanelTitle icon={icon}>
          <span id={`${slug}-form-title`}>Duke Treadmill Score</span>
        </CalcPanelTitle>
        <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
          <CalcDecisionSupportLead />
          <p className="calc-disclaimer-detail">
            Exercise ECG prognostic score only. Do not use for unstable symptoms or uninterpretable ECGs.
          </p>
        </div>
        <ValidationSummary id={`${slug}-validation-summary`} errors={validationErrors} />
        <form className="calc-pr1-form" noValidate aria-labelledby={`${slug}-form-title`} onSubmit={(event) => {
          event.preventDefault();
          runCalculate();
        }}>
          <div className="calc-input-grid">
            <label className="calc-input-group" htmlFor={`${slug}-minutes`}>
              <span className="calc-label">Exercise time (minutes)</span>
              <input id={`${slug}-minutes`} className="calc-input" type="number" min="0" max="30" step="0.1" value={exerciseMinutes} onChange={(event) => setExerciseMinutes(event.target.value)} />
            </label>
            <label className="calc-input-group" htmlFor={`${slug}-st`}>
              <span className="calc-label">Max ST deviation (mm)</span>
              <input id={`${slug}-st`} className="calc-input" type="number" min="0" max="10" step="0.1" value={stDeviationMm} onChange={(event) => setStDeviationMm(event.target.value)} />
            </label>
            <label className="calc-input-group" htmlFor={`${slug}-angina`}>
              <span className="calc-label">Exercise angina</span>
              <select id={`${slug}-angina`} className="calc-select" value={anginaIndex} onChange={(event) => setAnginaIndex(event.target.value)}>
                <option value="0">No angina (0)</option>
                <option value="1">Non-limiting angina (1)</option>
                <option value="2">Exercise-limiting angina (2)</option>
              </select>
            </label>
          </div>
          <div className="calculator-actions">
            <button type="submit" className="calculate-btn">Calculate Duke Treadmill Score</button>
            <button type="button" className="reset-btn" onClick={reset}>Reset</button>
          </div>
        </form>
      </div>
      <div className="calculator-results" ref={resultsRef} tabIndex={-1} role="region" aria-label="Duke Treadmill Score results">
        <ResultsPanelTitle />
        {result ? <ResultCard slug={slug} title="Duke Treadmill Score" result={result} scoreLabel="DTS" {...{} as any} /> : <EmptyResults icon={icon} text="Enter exercise test values to view Duke treadmill risk context." />}
      </div>
    </div>
  );
}

export function ReynoldsRiskScoreCalculator({ onResultChange }) {
  const slug = 'reynolds-risk-score';
  const icon = getCalculatorSubIcon(slug);
  const [form, setForm] = useState({
    ageYears: '',
    sex: '',
    systolicBpMmHg: '',
    totalCholesterolMgDl: '',
    hdlCholesterolMgDl: '',
    hsCrpMgL: '',
    hba1cPct: '',
    smoker: false,
    parentalMiBefore60: false,
    diabetes: false,
  });
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    onResultChange?.(
      result
        ? {
            points: result.points,
            riskCategory: result.riskCategory,
            severity: result.interpretation.severity,
          }
        : null
    );
  }, [onResultChange, result]);

  useEffect(() => {
    if (result) scrollResultsIntoView(resultsRef.current);
  }, [result]);

  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const runCalculate = () => {
    const errors = validateReynoldsInputs(form);
    setValidationErrors(errors);
    if (errors.length) {
      setResult(null);
      return;
    }
    const computed = computeReynoldsRiskHelper(form);
    setResult({ ...(computed as any), interpretation: interpretReynoldsRiskHelper(computed as any), primaryValue: (computed as any).points });
  };
  const reset = () => {
    setForm({
      ageYears: '',
      sex: '',
      systolicBpMmHg: '',
      totalCholesterolMgDl: '',
      hdlCholesterolMgDl: '',
      hsCrpMgL: '',
      hba1cPct: '',
      smoker: false,
      parentalMiBefore60: false,
      diabetes: false,
    });
    setValidationErrors([]);
    setResult(null);
  };

  const textFields = [
    ['ageYears', 'Age (years)'],
    ['systolicBpMmHg', 'Systolic BP (mmHg)'],
    ['totalCholesterolMgDl', 'Total cholesterol (mg/dL)'],
    ['hdlCholesterolMgDl', 'HDL cholesterol (mg/dL)'],
    ['hsCrpMgL', 'hs-CRP (mg/L)'],
  ];

  return (
    <div className={`calculator-interface calculator-interface--${slug}`}>
      <div className="calculator-inputs">
        <CalcPanelTitle icon={icon}><span id={`${slug}-form-title`}>Reynolds Risk Score Helper</span></CalcPanelTitle>
        <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
          <CalcDecisionSupportLead />
          <p className="calc-disclaimer-detail">Input-burden helper for Reynolds Risk Score context; use a validated Reynolds calculator for exact risk percentage.</p>
        </div>
        <ValidationSummary id={`${slug}-validation-summary`} errors={validationErrors} />
        <form className="calc-pr1-form" noValidate aria-labelledby={`${slug}-form-title`} onSubmit={(event) => {
          event.preventDefault();
          runCalculate();
        }}>
          <div className="calc-input-grid">
            <label className="calc-input-group" htmlFor={`${slug}-sex`}>
              <span className="calc-label">Sex</span>
              <select id={`${slug}-sex`} className="calc-select" value={form.sex} onChange={(event) => update('sex', event.target.value)}>
                <option value="">Select</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </label>
            {textFields.map(([key, label]) => (
              <label className="calc-input-group" htmlFor={`${slug}-${key}`} key={key}>
                <span className="calc-label">{label}</span>
                <input id={`${slug}-${key}`} className="calc-input" type="number" step="0.1" value={form[key]} onChange={(event) => update(key, event.target.value)} />
              </label>
            ))}
            {form.diabetes ? (
              <label className="calc-input-group" htmlFor={`${slug}-hba1c`}>
                <span className="calc-label">HbA1c (%)</span>
                <input id={`${slug}-hba1c`} className="calc-input" type="number" step="0.1" value={form.hba1cPct} onChange={(event) => update('hba1cPct', event.target.value)} />
              </label>
            ) : null}
          </div>
          <fieldset className="calc-has-bled-fieldset">
            <legend className="calc-timi-legend">Additional Reynolds factors</legend>
            {[
              ['smoker', 'Current smoker'],
              ['parentalMiBefore60', 'Parent MI before age 60'],
              ['diabetes', 'Diabetes mellitus'],
            ].map(([key, label]) => (
              <label className="calc-checkbox-group" key={key}>
                <input type="checkbox" checked={Boolean(form[key])} onChange={(event) => update(key, event.target.checked)} />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <div className="calculator-actions">
            <button type="submit" className="calculate-btn">Calculate Reynolds Helper</button>
            <button type="button" className="reset-btn" onClick={reset}>Reset</button>
          </div>
        </form>
      </div>
      <div className="calculator-results" ref={resultsRef} tabIndex={-1} role="region" aria-label="Reynolds Risk Score results">
        <ResultsPanelTitle />
        {result ? <ResultCard slug={slug} title="Reynolds Risk Score Helper" result={result} scoreLabel="Helper points" {...{} as any} /> : <EmptyResults icon={icon} text="Enter prevention-risk values to view Reynolds context." />}
      </div>
    </div>
  );
}

export function HcmSuddenDeathRiskCalculator({ onResultChange }) {
  const slug = 'hcm-sudden-death-risk';
  const icon = getCalculatorSubIcon(slug);
  const [form, setForm] = useState({
    ageYears: '',
    maxWallThicknessMm: '',
    leftAtriumDiameterMm: '',
    maxLvotGradientMmHg: '',
    familyHistoryScd: false,
    nsvt: false,
    unexplainedSyncope: false,
  });
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    onResultChange?.(
      result
        ? {
            fiveYearRiskPct: result.fiveYearRiskPct,
            severity: result.interpretation.severity,
          }
        : null
    );
  }, [onResultChange, result]);

  useEffect(() => {
    if (result) scrollResultsIntoView(resultsRef.current);
  }, [result]);

  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const runCalculate = () => {
    const errors = validateHcmSuddenDeathRiskInputs(form);
    setValidationErrors(errors);
    if (errors.length) {
      setResult(null);
      return;
    }
    const computed = computeHcmSuddenDeathRisk(form) as any;
    setResult({
      ...computed,
      interpretation: interpretHcmSuddenDeathRisk(computed.fiveYearRiskPct),
      primaryValue: `${computed.fiveYearRiskPct}%`,
    });
  };
  const reset = () => {
    setForm({
      ageYears: '',
      maxWallThicknessMm: '',
      leftAtriumDiameterMm: '',
      maxLvotGradientMmHg: '',
      familyHistoryScd: false,
      nsvt: false,
      unexplainedSyncope: false,
    });
    setValidationErrors([]);
    setResult(null);
  };

  return (
    <div className={`calculator-interface calculator-interface--${slug}`}>
      <div className="calculator-inputs">
        <CalcPanelTitle icon={icon}><span id={`${slug}-form-title`}>HCM Sudden Death Risk</span></CalcPanelTitle>
        <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
          <CalcDecisionSupportLead />
          <p className="calc-disclaimer-detail">HCM Risk-SCD model context for specialist review only; does not decide ICD eligibility.</p>
        </div>
        <ValidationSummary id={`${slug}-validation-summary`} errors={validationErrors} />
        <form className="calc-pr1-form" noValidate aria-labelledby={`${slug}-form-title`} onSubmit={(event) => {
          event.preventDefault();
          runCalculate();
        }}>
          <div className="calc-input-grid">
            {[
              ['ageYears', 'Age (years)'],
              ['maxWallThicknessMm', 'Max wall thickness (mm)'],
              ['leftAtriumDiameterMm', 'Left atrial diameter (mm)'],
              ['maxLvotGradientMmHg', 'Max LVOT gradient (mmHg)'],
            ].map(([key, label]) => (
              <label className="calc-input-group" htmlFor={`${slug}-${key}`} key={key}>
                <span className="calc-label">{label}</span>
                <input id={`${slug}-${key}`} className="calc-input" type="number" step="0.1" value={form[key]} onChange={(event) => update(key, event.target.value)} />
              </label>
            ))}
          </div>
          <fieldset className="calc-has-bled-fieldset">
            <legend className="calc-timi-legend">Clinical risk markers</legend>
            {[
              ['familyHistoryScd', 'Family history of sudden cardiac death'],
              ['nsvt', 'Non-sustained ventricular tachycardia'],
              ['unexplainedSyncope', 'Unexplained syncope'],
            ].map(([key, label]) => (
              <label className="calc-checkbox-group" key={key}>
                <input type="checkbox" checked={Boolean(form[key])} onChange={(event) => update(key, event.target.checked)} />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <div className="calculator-actions">
            <button type="submit" className="calculate-btn">Calculate HCM SCD Risk</button>
            <button type="button" className="reset-btn" onClick={reset}>Reset</button>
          </div>
        </form>
      </div>
      <div className="calculator-results" ref={resultsRef} tabIndex={-1} role="region" aria-label="HCM sudden death risk results">
        <ResultsPanelTitle />
        {result ? <ResultCard slug={slug} title="HCM Sudden Death Risk" result={result} scoreLabel="5-year risk" {...{} as any} /> : <EmptyResults icon={icon} text="Enter HCM model inputs to view 5-year SCD risk context." />}
      </div>
    </div>
  );
}

export function HeartFailureStagingCalculator({ onResultChange }) {
  const slug = 'heart-failure-staging';
  const icon = getCalculatorSubIcon(slug);
  const [form, setForm] = useState({
    riskFactors: false,
    structuralHeartDisease: false,
    currentOrPriorSymptoms: false,
    refractorySymptoms: false,
  });
  const [result, setResult] = useState<any>(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    onResultChange?.(result ? { stage: result.stage, severity: result.severity } : null);
  }, [onResultChange, result]);

  useEffect(() => {
    if (result) scrollResultsIntoView(resultsRef.current);
  }, [result]);

  const runCalculate = () => setResult(determineHeartFailureStage(form));
  const reset = () => {
    setForm({
      riskFactors: false,
      structuralHeartDisease: false,
      currentOrPriorSymptoms: false,
      refractorySymptoms: false,
    });
    setResult(null);
  };

  return (
    <div className={`calculator-interface calculator-interface--${slug}`}>
      <div className="calculator-inputs">
        <CalcPanelTitle icon={icon}><span id={`${slug}-form-title`}>Heart Failure Staging Helper</span></CalcPanelTitle>
        <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
          <CalcDecisionSupportLead />
          <p className="calc-disclaimer-detail">{HEART_FAILURE_STAGE_DISCLAIMER}</p>
        </div>
        <form className="calc-pr1-form" noValidate aria-labelledby={`${slug}-form-title`} onSubmit={(event) => {
          event.preventDefault();
          runCalculate();
        }}>
          <fieldset className="calc-has-bled-fieldset">
            <legend className="calc-timi-legend">ACC/AHA stage features</legend>
            {[
              ['riskFactors', 'Risk factors only (hypertension, ASCVD, diabetes, cardiotoxins, genetic risk)'],
              ['structuralHeartDisease', 'Structural heart disease or abnormal cardiac function, no HF symptoms'],
              ['currentOrPriorSymptoms', 'Current or prior symptoms/signs of heart failure'],
              ['refractorySymptoms', 'Marked/refractory symptoms or advanced HF features despite therapy'],
            ].map(([key, label]) => (
              <label className="calc-checkbox-group" key={key}>
                <input type="checkbox" checked={Boolean(form[key])} onChange={(event) => setForm((previous) => ({ ...previous, [key]: event.target.checked }))} />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <div className="calculator-actions">
            <button type="submit" className="calculate-btn">Calculate Heart Failure Stage</button>
            <button type="button" className="reset-btn" onClick={reset}>Reset</button>
          </div>
        </form>
      </div>
      <div className="calculator-results" ref={resultsRef} tabIndex={-1} role="region" aria-label="Heart failure staging results">
        <ResultsPanelTitle />
        {result ? (
          <CalcInterpretationRegion headingId={`${slug}-interpretation-heading`} title={result.label} severity={result.severity}>
            <div className="calc-score-display" aria-label={`ACC/AHA stage: ${result.stage}`}>
              <span className="calc-score-number">{result.stage}</span>
              <span className="calc-score-unit">ACC/AHA stage</span>
            </div>
            <p>{result.interpretation}</p>
            <p className="calc-disclaimer-detail">{HEART_FAILURE_STAGE_DISCLAIMER}</p>
            <CalcResultSafetyFooter />
          </CalcInterpretationRegion>
        ) : (
          <EmptyResults icon={icon} text="Select stage features to view ACC/AHA heart failure staging context." />
        )}
      </div>
    </div>
  );
}

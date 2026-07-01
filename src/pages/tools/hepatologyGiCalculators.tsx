import { useEffect, useRef, useState } from 'react';
import { NavIcon } from '../../navigation/NavIcon';
import { getCalculatorSubIcon, CHROME_ICONS } from '../../navigation/iconRegistry';
import {
  HEPATOLOGY_GI_DISCLAIMER,
  calculateApri,
  calculateGlasgowBlatchfordScore,
  calculateMaddreyDiscriminantFunction,
  calculateRockallScore,
  interpretApri,
  interpretGlasgowBlatchford,
  interpretMaddreyDf,
  interpretRockall,
  validateApriInputs,
  validateGlasgowBlatchfordInputs,
  validateMaddreyInputs,
} from '../../utils/hepatologyGiCalculators';

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
      <strong>Decision support only.</strong> Does not establish a diagnosis, recommend treatment, or replace clinician
      judgment and local GI/hepatology protocols.
    </p>
  );
}

function CalcResultSafetyFooter() {
  return (
    <p className="calc-result-safety-footer" role="note">
      Output reflects only the values entered here and may omit important context such as active bleeding,
      encephalopathy, infection, hemodynamic instability, anticoagulants, and local pathway requirements.
    </p>
  );
}

function CalcResultsPanel({ id, resultsRef, children }) {
  return (
    <div className="calculator-results" id={id} ref={resultsRef} tabIndex={-1} role="region">
      {children}
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

function ErrorSummary({ errors }) {
  if (!errors.length) return null;
  return (
    <div className="calc-error-summary" role="alert" aria-live="polite">
      <strong>Please fix:</strong>
      <ul>
        {errors.map((err) => (
          <li key={err}>{err}</li>
        ))}
      </ul>
    </div>
  );
}

function SafetyNote({ children = HEPATOLOGY_GI_DISCLAIMER }) {
  return (
    <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
      <CalcDecisionSupportLead />
      <p className="calc-disclaimer-detail">{children}</p>
    </div>
  );
}

function ResultBlock({ slug, result, scoreLabel, children = null }: any) {
  return (
    <>
      <div className={`calc-score-display ${result.severity}`} aria-labelledby={`${slug}-score-label`}>
        <div id={`${slug}-score-label`} className="calc-score-label">
          {scoreLabel}
        </div>
        <div className="calc-score-value">{result.score}</div>
        <div className="calc-score-interpretation">{result.riskBand}</div>
      </div>
      {children}
      <CalcInterpretationRegion
        headingId={`${slug}-interpretation`}
        title={result.label}
        severity={result.severity}
        emphasizeRisk={result.severity !== 'normal'}
      >
        <div className="calc-interpretation-text">{result.interpretation}</div>
        <div className="calc-interpretation-text calc-interpretation-text--secondary">{result.disclaimer}</div>
      </CalcInterpretationRegion>
      <div className="calc-references">
        <div className="calc-references-title">Reference</div>
        <ul className="calc-references-list">
          <li>{result.referenceLine}</li>
        </ul>
      </div>
      <CalcResultSafetyFooter />
    </>
  );
}

export function MaddreyDiscriminantFunctionCalculator({ onResultChange }) {
  const slug = 'maddrey-discriminant-function';
  const icon = getCalculatorSubIcon(slug);
  const resultsRef = useRef(null);
  const [patientPtSeconds, setPatientPtSeconds] = useState('');
  const [controlPtSeconds, setControlPtSeconds] = useState('');
  const [bilirubin, setBilirubin] = useState('');
  const [bilirubinUnit, setBilirubinUnit] = useState('mg_dl');
  const [errors, setErrors] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    onResultChange?.(result ? { maddreyDf: result.score, severity: result.severity } : null);
  }, [onResultChange, result]);

  useEffect(() => {
    if (result) scrollResultsIntoView(resultsRef.current);
  }, [result]);

  const runCalculate = () => {
    const validation = validateMaddreyInputs({
      patientPtSeconds,
      controlPtSeconds,
      bilirubin,
      bilirubinUnit,
    });
    setErrors(validation.errors);
    if (!validation.valid) {
      setResult(null);
      return;
    }
    const score = calculateMaddreyDiscriminantFunction(validation.values);
    const interpretation = interpretMaddreyDf(score);
    setResult(interpretation ? { score, ...interpretation } : null);
  };

  const reset = () => {
    setPatientPtSeconds('');
    setControlPtSeconds('');
    setBilirubin('');
    setBilirubinUnit('mg_dl');
    setErrors([]);
    setResult(null);
  };

  return (
    <div className={`calculator-interface calculator-interface--${slug}`}>
      <div className="calculator-inputs">
        <CalcPanelTitle icon={icon}>
          <span id={`${slug}-form-title`}>Maddrey Discriminant Function</span>
        </CalcPanelTitle>
        <SafetyNote>
          Maddrey DF uses prothrombin time prolongation and bilirubin as a historical severe-range marker in
          alcoholic hepatitis cohorts. It does not diagnose alcoholic hepatitis and does not recommend steroids,
          transplant referral, admission, or discharge.
        </SafetyNote>
        <form
          className="calc-pr1-form"
          noValidate
          aria-labelledby={`${slug}-form-title`}
          onSubmit={(e) => {
            e.preventDefault();
            runCalculate();
          }}
        >
          <ErrorSummary errors={errors} />
          <div className="calc-form-group">
            <label className="calc-label" htmlFor="maddrey-patient-pt">
              Patient PT (seconds)
            </label>
            <input
              id="maddrey-patient-pt"
              className="calc-input"
              type="number"
              min="5"
              max="200"
              step="0.1"
              value={patientPtSeconds}
              onChange={(e) => setPatientPtSeconds(e.target.value)}
            />
          </div>
          <div className="calc-form-group">
            <label className="calc-label" htmlFor="maddrey-control-pt">
              Control PT (seconds)
            </label>
            <input
              id="maddrey-control-pt"
              className="calc-input"
              type="number"
              min="5"
              max="60"
              step="0.1"
              value={controlPtSeconds}
              onChange={(e) => setControlPtSeconds(e.target.value)}
            />
          </div>
          <div className="calc-form-group">
            <label className="calc-label" htmlFor="maddrey-bilirubin">
              Total bilirubin
            </label>
            <div className="calc-input-row calc-input-row--with-unit">
              <input
                id="maddrey-bilirubin"
                className="calc-input"
                type="number"
                min="0"
                step="0.1"
                value={bilirubin}
                onChange={(e) => setBilirubin(e.target.value)}
              />
              <select
                className="calc-select"
                aria-label="Bilirubin unit"
                value={bilirubinUnit}
                onChange={(e) => setBilirubinUnit(e.target.value)}
              >
                <option value="mg_dl">mg/dL</option>
                <option value="umol_l">umol/L</option>
              </select>
            </div>
          </div>
          <div className="calc-actions">
            <button type="submit" className="calc-calculate-btn">
              Calculate Maddrey DF
            </button>
            <button type="button" className="calc-reset-btn" onClick={reset} aria-label="Reset Maddrey DF form">
              Reset
            </button>
          </div>
        </form>
      </div>
      <CalcResultsPanel id="calc-results-maddrey-discriminant-function" resultsRef={resultsRef}>
        <ResultsPanelTitle />
        {result ? (
          <ResultBlock slug={slug} result={result} scoreLabel="Maddrey DF" />
        ) : (
          <div className="calc-results-empty">
            <CalcResultsEmptyIcon icon={icon} />
            <p>Enter PT values and bilirubin, then calculate</p>
          </div>
        )}
      </CalcResultsPanel>
    </div>
  );
}

export function ApriCalculator({ onResultChange }) {
  const slug = 'apri';
  const icon = getCalculatorSubIcon(slug);
  const resultsRef = useRef(null);
  const [astUPerL, setAstUPerL] = useState('');
  const [astUpperLimitUPerL, setAstUpperLimitUPerL] = useState('40');
  const [platelets10e9PerL, setPlatelets10e9PerL] = useState('');
  const [errors, setErrors] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    onResultChange?.(result ? { apri: result.score, severity: result.severity } : null);
  }, [onResultChange, result]);

  useEffect(() => {
    if (result) scrollResultsIntoView(resultsRef.current);
  }, [result]);

  const runCalculate = () => {
    const validation = validateApriInputs({ astUPerL, astUpperLimitUPerL, platelets10e9PerL });
    setErrors(validation.errors);
    if (!validation.valid) {
      setResult(null);
      return;
    }
    const score = calculateApri(validation.values);
    const interpretation = interpretApri(score);
    setResult(interpretation ? { score, ...interpretation } : null);
  };

  const reset = () => {
    setAstUPerL('');
    setAstUpperLimitUPerL('40');
    setPlatelets10e9PerL('');
    setErrors([]);
    setResult(null);
  };

  return (
    <div className={`calculator-interface calculator-interface--${slug}`}>
      <div className="calculator-inputs">
        <CalcPanelTitle icon={icon}>
          <span id={`${slug}-form-title`}>APRI</span>
        </CalcPanelTitle>
        <SafetyNote>
          APRI is a non-invasive fibrosis screening index from AST, AST upper limit of normal, and platelet count. It
          does not diagnose cirrhosis or replace elastography, imaging, biopsy, or hepatology review.
        </SafetyNote>
        <form
          className="calc-pr1-form"
          noValidate
          aria-labelledby={`${slug}-form-title`}
          onSubmit={(e) => {
            e.preventDefault();
            runCalculate();
          }}
        >
          <ErrorSummary errors={errors} />
          <div className="calc-form-group">
            <label className="calc-label" htmlFor="apri-ast">
              AST (U/L)
            </label>
            <input
              id="apri-ast"
              className="calc-input"
              type="number"
              min="1"
              max="10000"
              value={astUPerL}
              onChange={(e) => setAstUPerL(e.target.value)}
            />
          </div>
          <div className="calc-form-group">
            <label className="calc-label" htmlFor="apri-ast-uln">
              AST upper limit of normal (U/L)
            </label>
            <input
              id="apri-ast-uln"
              className="calc-input"
              type="number"
              min="1"
              max="500"
              value={astUpperLimitUPerL}
              onChange={(e) => setAstUpperLimitUPerL(e.target.value)}
            />
          </div>
          <div className="calc-form-group">
            <label className="calc-label" htmlFor="apri-platelets">
              Platelets (x10^9/L)
            </label>
            <input
              id="apri-platelets"
              className="calc-input"
              type="number"
              min="1"
              max="2000"
              value={platelets10e9PerL}
              onChange={(e) => setPlatelets10e9PerL(e.target.value)}
            />
          </div>
          <div className="calc-actions">
            <button type="submit" className="calc-calculate-btn">
              Calculate APRI
            </button>
            <button type="button" className="calc-reset-btn" onClick={reset} aria-label="Reset APRI form">
              Reset
            </button>
          </div>
        </form>
      </div>
      <CalcResultsPanel id="calc-results-apri" resultsRef={resultsRef}>
        <ResultsPanelTitle />
        {result ? (
          <ResultBlock slug={slug} result={result} scoreLabel="APRI" />
        ) : (
          <div className="calc-results-empty">
            <CalcResultsEmptyIcon icon={icon} />
            <p>Enter AST, AST ULN, and platelet count</p>
          </div>
        )}
      </CalcResultsPanel>
    </div>
  );
}

export function GlasgowBlatchfordScoreCalculator({ onResultChange }) {
  const slug = 'glasgow-blatchford-score';
  const icon = getCalculatorSubIcon(slug);
  const resultsRef = useRef(null);
  const [bun, setBun] = useState('');
  const [bunUnit, setBunUnit] = useState('mmol_l');
  const [hemoglobin, setHemoglobin] = useState('');
  const [hemoglobinUnit, setHemoglobinUnit] = useState('g_dl');
  const [sex, setSex] = useState('');
  const [systolicBpMmHg, setSystolicBpMmHg] = useState('');
  const [pulseAtLeast100, setPulseAtLeast100] = useState(false);
  const [melena, setMelena] = useState(false);
  const [syncope, setSyncope] = useState(false);
  const [hepaticDisease, setHepaticDisease] = useState(false);
  const [cardiacFailure, setCardiacFailure] = useState(false);
  const [errors, setErrors] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);

  const raw = {
    bun,
    bunUnit,
    hemoglobin,
    hemoglobinUnit,
    sex,
    systolicBpMmHg,
    pulseAtLeast100,
    melena,
    syncope,
    hepaticDisease,
    cardiacFailure,
  };

  useEffect(() => {
    onResultChange?.(result ? { glasgowBlatchfordScore: result.score, severity: result.severity } : null);
  }, [onResultChange, result]);

  useEffect(() => {
    if (result) scrollResultsIntoView(resultsRef.current);
  }, [result]);

  const runCalculate = () => {
    const validation = validateGlasgowBlatchfordInputs(raw);
    setErrors(validation.errors);
    if (!validation.valid) {
      setResult(null);
      return;
    }
    const computed = calculateGlasgowBlatchfordScore(raw);
    const interpretation = computed ? interpretGlasgowBlatchford((computed as any).total) : null;
    setResult(interpretation ? { score: (computed as any).total, breakdown: (computed as any).breakdown, ...interpretation } : null);
  };

  const reset = () => {
    setBun('');
    setBunUnit('mmol_l');
    setHemoglobin('');
    setHemoglobinUnit('g_dl');
    setSex('');
    setSystolicBpMmHg('');
    setPulseAtLeast100(false);
    setMelena(false);
    setSyncope(false);
    setHepaticDisease(false);
    setCardiacFailure(false);
    setErrors([]);
    setResult(null);
  };

  return (
    <div className={`calculator-interface calculator-interface--${slug}`}>
      <div className="calculator-inputs">
        <CalcPanelTitle icon={icon}>
          <span id={`${slug}-form-title`}>Glasgow-Blatchford Score</span>
        </CalcPanelTitle>
        <SafetyNote>
          Glasgow-Blatchford Score supports upper GI bleeding risk stratification before endoscopy. It does not rule in
          or rule out bleeding and does not recommend transfusion, endoscopy timing, medication, admission, or discharge.
        </SafetyNote>
        <form
          className="calc-pr1-form"
          noValidate
          aria-labelledby={`${slug}-form-title`}
          onSubmit={(e) => {
            e.preventDefault();
            runCalculate();
          }}
        >
          <ErrorSummary errors={errors} />
          <div className="calc-form-group">
            <label className="calc-label" htmlFor="gbs-bun">
              Blood urea nitrogen / urea
            </label>
            <div className="calc-input-row calc-input-row--with-unit">
              <input
                id="gbs-bun"
                className="calc-input"
                type="number"
                min="0"
                step="0.1"
                value={bun}
                onChange={(e) => setBun(e.target.value)}
              />
              <select
                className="calc-select"
                aria-label="BUN unit"
                value={bunUnit}
                onChange={(e) => setBunUnit(e.target.value)}
              >
                <option value="mmol_l">mmol/L</option>
                <option value="mg_dl">mg/dL</option>
              </select>
            </div>
          </div>
          <div className="calc-form-group">
            <label className="calc-label" htmlFor="gbs-hgb">
              Hemoglobin
            </label>
            <div className="calc-input-row calc-input-row--with-unit">
              <input
                id="gbs-hgb"
                className="calc-input"
                type="number"
                min="0"
                step="0.1"
                value={hemoglobin}
                onChange={(e) => setHemoglobin(e.target.value)}
              />
              <select
                className="calc-select"
                aria-label="Hemoglobin unit"
                value={hemoglobinUnit}
                onChange={(e) => setHemoglobinUnit(e.target.value)}
              >
                <option value="g_dl">g/dL</option>
                <option value="g_l">g/L</option>
              </select>
            </div>
          </div>
          <div className="calc-form-group">
            <label className="calc-label" htmlFor="gbs-sex">
              Sex for hemoglobin scoring
            </label>
            <select id="gbs-sex" className="calc-select" value={sex} onChange={(e) => setSex(e.target.value)}>
              <option value="">Select...</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </div>
          <div className="calc-form-group">
            <label className="calc-label" htmlFor="gbs-sbp">
              Systolic BP (mmHg)
            </label>
            <input
              id="gbs-sbp"
              className="calc-input"
              type="number"
              min="40"
              max="260"
              value={systolicBpMmHg}
              onChange={(e) => setSystolicBpMmHg(e.target.value)}
            />
          </div>
          <fieldset className="calc-timi-fieldset">
            <legend className="calc-timi-legend">Clinical markers</legend>
            {([
              ['pulseAtLeast100', 'Pulse >= 100/min', pulseAtLeast100, setPulseAtLeast100],
              ['melena', 'Melena', melena, setMelena],
              ['syncope', 'Syncope', syncope, setSyncope],
              ['hepaticDisease', 'Hepatic disease', hepaticDisease, setHepaticDisease],
              ['cardiacFailure', 'Cardiac failure', cardiacFailure, setCardiacFailure],
            ] as any[]).map(([key, label, checked, setter]) => (
              <div key={key} className="calc-checkbox-group">
                <input
                  id={`gbs-${key}`}
                  className="calc-checkbox"
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setter(e.target.checked)}
                />
                <label className="calc-checkbox-label" htmlFor={`gbs-${key}`}>
                  {label}
                </label>
              </div>
            ))}
          </fieldset>
          <div className="calc-actions">
            <button type="submit" className="calc-calculate-btn">
              Calculate GBS
            </button>
            <button type="button" className="calc-reset-btn" onClick={reset} aria-label="Reset GBS form">
              Reset
            </button>
          </div>
        </form>
      </div>
      <CalcResultsPanel id="calc-results-glasgow-blatchford-score" resultsRef={resultsRef}>
        <ResultsPanelTitle />
        {result ? (
          <ResultBlock slug={slug} result={result} scoreLabel="GBS">
            <div className="calc-breakdown">
              <div className="calc-breakdown-title">Point breakdown</div>
              {Object.entries(result.breakdown).map(([key, value]) => (
                <div key={key} className="calc-breakdown-item">
                  <span className="calc-breakdown-label">{key}</span>
                  <span className="calc-breakdown-score">{value as any}</span>
                </div>
              ))}
            </div>
          </ResultBlock>
        ) : (
          <div className="calc-results-empty">
            <CalcResultsEmptyIcon icon={icon} />
            <p>Enter pre-endoscopy upper GI bleed variables</p>
          </div>
        )}
      </CalcResultsPanel>
    </div>
  );
}

const ROCKALL_OPTIONS = {
  agePoints: [
    ['0', 'Age < 60 years (0)'],
    ['1', 'Age 60-79 years (1)'],
    ['2', 'Age >= 80 years (2)'],
  ],
  shockPoints: [
    ['0', 'No shock: HR <100 and SBP >=100 (0)'],
    ['1', 'Tachycardia: HR >=100 and SBP >=100 (1)'],
    ['2', 'Hypotension: SBP <100 (2)'],
  ],
  comorbidityPoints: [
    ['0', 'No major comorbidity (0)'],
    ['2', 'Cardiac failure, ischemic heart disease, or major comorbidity (2)'],
    ['3', 'Renal failure, liver failure, or disseminated malignancy (3)'],
  ],
  diagnosisPoints: [
    ['0', 'Mallory-Weiss tear, no lesion, or no stigmata (0)'],
    ['1', 'All other diagnoses (1)'],
    ['2', 'Upper GI malignancy (2)'],
  ],
  stigmataPoints: [
    ['0', 'None or dark spot only (0)'],
    ['2', 'Blood, adherent clot, visible vessel, or active bleeding (2)'],
  ],
};

export function RockallScoreCalculator({ onResultChange }) {
  const slug = 'rockall-score';
  const icon = getCalculatorSubIcon(slug);
  const resultsRef = useRef(null);
  const [inputs, setInputs] = useState({
    agePoints: '0',
    shockPoints: '0',
    comorbidityPoints: '0',
    diagnosisPoints: '0',
    stigmataPoints: '0',
  });
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    onResultChange?.(result ? { rockallScore: result.score, severity: result.severity } : null);
  }, [onResultChange, result]);

  useEffect(() => {
    if (result) scrollResultsIntoView(resultsRef.current);
  }, [result]);

  const runCalculate = () => {
    const computed = calculateRockallScore(inputs);
    const interpretation = computed ? interpretRockall((computed as any).total) : null;
    setResult(interpretation ? { score: (computed as any).total, breakdown: (computed as any).breakdown, ...interpretation } : null);
  };

  return (
    <div className={`calculator-interface calculator-interface--${slug}`}>
      <div className="calculator-inputs">
        <CalcPanelTitle icon={icon}>
          <span id={`${slug}-form-title`}>Rockall Score</span>
        </CalcPanelTitle>
        <SafetyNote>
          Rockall Score supports upper GI bleeding risk stratification using clinical and endoscopic findings. It does
          not recommend endoscopy timing, transfusion, medication, admission, discharge, or level of care.
        </SafetyNote>
        <form
          className="calc-pr1-form"
          noValidate
          aria-labelledby={`${slug}-form-title`}
          onSubmit={(e) => {
            e.preventDefault();
            runCalculate();
          }}
        >
          {Object.entries(ROCKALL_OPTIONS).map(([key, options]) => (
            <div key={key} className="calc-form-group">
              <label className="calc-label" htmlFor={`rockall-${key}`}>
                {key.replace('Points', '').replace(/([A-Z])/g, ' $1')}
              </label>
              <select
                id={`rockall-${key}`}
                className="calc-select"
                value={inputs[key]}
                onChange={(e) => setInputs((prev) => ({ ...prev, [key]: e.target.value }))}
              >
                {options.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <div className="calc-actions">
            <button type="submit" className="calc-calculate-btn">
              Calculate Rockall
            </button>
            <button
              type="button"
              className="calc-reset-btn"
              onClick={() => {
                setInputs({
                  agePoints: '0',
                  shockPoints: '0',
                  comorbidityPoints: '0',
                  diagnosisPoints: '0',
                  stigmataPoints: '0',
                });
                setResult(null);
              }}
              aria-label="Reset Rockall form"
            >
              Reset
            </button>
          </div>
        </form>
      </div>
      <CalcResultsPanel id="calc-results-rockall-score" resultsRef={resultsRef}>
        <ResultsPanelTitle />
        {result ? (
          <ResultBlock slug={slug} result={result} scoreLabel="Rockall score">
            <div className="calc-breakdown">
              <div className="calc-breakdown-title">Point breakdown</div>
              {Object.entries(result.breakdown).map(([key, value]) => (
                <div key={key} className="calc-breakdown-item">
                  <span className="calc-breakdown-label">{key}</span>
                  <span className="calc-breakdown-score">{value as any}</span>
                </div>
              ))}
            </div>
          </ResultBlock>
        ) : (
          <div className="calc-results-empty">
            <CalcResultsEmptyIcon icon={icon} />
            <p>Select clinical and endoscopic findings, then calculate</p>
          </div>
        )}
      </CalcResultsPanel>
    </div>
  );
}

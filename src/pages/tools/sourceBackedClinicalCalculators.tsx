import { useEffect, useRef, useState } from 'react';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS, getCalculatorSubIcon } from '../../navigation/iconRegistry';
import {
  WELLS_PE_CRITERIA_META,
  calculateWellsPeScore,
  interpretWellsPe,
} from '../../utils/wellsPeCalculator';
import { PERC_CRITERIA_META, evaluatePerc, interpretPerc } from '../../utils/percCalculator';
import {
  computeGraceAcsRisk,
  interpretGraceAcsRisk,
  validateGraceAcsInputs,
} from '../../utils/graceAcsCalculator';
import {
  NIHSS_ITEM_META,
  computeNihssTotal,
  interpretNihssSeverity,
  validateNihssInputs,
} from '../../utils/nihssCalculator';
import {
  CCR_HIGH_RISK_META,
  CCR_LOW_RISK_META,
  applyCanadianCSpineRule,
  ccrApplicabilityWarnings,
  evaluateCcrHighRisk,
  evaluateCcrLowRisk,
  interpretCanadianCSpine,
} from '../../utils/canadianCSpineCalculator';
import {
  applyOttawaAnkleFootRules,
  interpretOttawaAnkleFootRules,
  ottawaApplicabilityWarnings,
  ottawaRulesApplicable,
} from '../../utils/ottawaAnkleCalculator';
import { NEXUS_CRITERIA_META, evaluateNexusCSpine } from '../../utils/nexusCSpineCalculator';
import { PECARN_AGE_CATEGORIES, evaluatePecarnHead } from '../../utils/pecarnHeadCalculator';

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

function DecisionSupportNotice({ children }) {
  return (
    <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
      <p className="calc-ds-lead">
        <strong>Decision support only.</strong> Does not establish a diagnosis, rule out disease with certainty,
        recommend treatment, or replace clinician judgment.
      </p>
      <p className="calc-disclaimer-detail">{children}</p>
    </div>
  );
}

function ValidationErrors({ errors }) {
  if (!errors.length) return null;
  return (
    <div className="calc-validation-errors" role="alert" aria-live="assertive">
      <p className="calc-validation-errors-title">Correct the following before calculating:</p>
      <ul>
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </div>
  );
}

function CheckboxField({ slug, item, checked, onChange }) {
  return (
    <label className="calc-checkbox-row" htmlFor={`${slug}-${item.key}`}>
      <input
        id={`${slug}-${item.key}`}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(item.key, event.target.checked)}
      />
      <span>
        <strong>{item.shortLabel || item.label}</strong>
        {item.points ? <span className="calc-criteria-points"> {item.points} pts</span> : null}
        {item.help ? <small>{item.help}</small> : null}
      </span>
    </label>
  );
}

function NumberField({ slug, name, label, value, onChange, min, max, step = 'any' }) {
  return (
    <div className="calc-input-group">
      <label className="calc-input-label" htmlFor={`${slug}-${name}`}>
        {label}
      </label>
      <input
        id={`${slug}-${name}`}
        className="calc-input-field"
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        inputMode="decimal"
        required
      />
    </div>
  );
}

function CalculatorShell({
  slug,
  title,
  notice,
  children,
  result,
  emptyText,
  scoreLabel,
  scoreDisplay,
  onResultChange,
  resultPayload = undefined,
}: any) {
  const icon = getCalculatorSubIcon(slug);
  const resultsRef = useRef<any>(null);

  useEffect(() => {
    onResultChange?.(result ? resultPayload?.(result) || result : null);
  }, [onResultChange, result, resultPayload]);

  useEffect(() => {
    if (!result || !resultsRef.current) return;
    resultsRef.current.focus({ preventScroll: true });
    resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [result]);

  const severity = result?.severity || 'normal';
  const titleText = result?.label || result?.riskStratumLabel || result?.percStatus || 'Result';

  return (
    <div className={`calculator-interface calculator-interface--${slug}`}>
      <div className="calculator-inputs">
        <CalcPanelTitle icon={icon}>{title}</CalcPanelTitle>
        <DecisionSupportNotice>{notice}</DecisionSupportNotice>
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
            <div className={`calc-score-display ${severity}`} role="status">
              <div className="calc-score-label">{scoreLabel}</div>
              <div className="calc-score-value">{scoreDisplay}</div>
              <div className="calc-score-interpretation">{titleText}</div>
            </div>
            <section className={`calc-interpretation-box ${severity}`} role="region">
              <h3 className="calc-interpretation-title">{titleText}</h3>
              <p>{result.interpretation}</p>
              {result.safetyDisclaimer ? <p className="calc-disclaimer-detail">{result.safetyDisclaimer}</p> : null}
              {result.disclaimer ? <p className="calc-disclaimer-detail">{result.disclaimer}</p> : null}
              {result.pathwayDisclaimer ? <p className="calc-disclaimer-detail">{result.pathwayDisclaimer}</p> : null}
              {result.referenceLine ? <p className="calc-reference-line">{result.referenceLine}</p> : null}
            </section>
            <p className="calc-result-safety-footer" role="note">
              Output reflects the values entered and may omit important clinical context.
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

function resetObject(keys, value = false) {
  return Object.fromEntries(keys.map((key) => [key, value]));
}

export function WellsPeCalculator({ onResultChange }) {
  const initial = () => resetObject(WELLS_PE_CRITERIA_META.map((item) => item.key));
  const [inputs, setInputs] = useState(initial);
  const [result, setResult] = useState<any>(null);

  const calculate = (event) => {
    event.preventDefault();
    const score = calculateWellsPeScore(inputs);
    const interpretation = interpretWellsPe(score);
    setResult(interpretation ? { ...interpretation, score } : null);
  };

  return (
    <CalculatorShell
      slug="wells-pe"
      title="Wells PE Score"
      notice="Uses the existing Wells PE scoring utility already present in source code."
      result={result}
      emptyText="Select Wells PE criteria to calculate pre-test probability context."
      scoreLabel="Wells PE score"
      scoreDisplay={result ? String(result.score) : ''}
      onResultChange={onResultChange}
    >
      <form className="calc-pr1-form" onSubmit={calculate}>
        <fieldset className="calc-timi-criteria">
          <legend>Criteria</legend>
          {WELLS_PE_CRITERIA_META.map((item) => (
            <CheckboxField
              key={item.key}
              slug="wells-pe"
              item={item}
              checked={inputs[item.key]}
              onChange={(key, value) => setInputs((prev) => ({ ...prev, [key]: value }))}
            />
          ))}
        </fieldset>
        <div className="calc-actions">
          <button type="submit" className="calc-calculate-btn">
            Calculate Wells PE
          </button>
          <button type="button" className="calc-reset-btn" onClick={() => { setInputs(initial()); setResult(null); }}>
            Reset
          </button>
        </div>
      </form>
    </CalculatorShell>
  );
}

export function PercCalculator({ onResultChange }) {
  const initial = () => resetObject(PERC_CRITERIA_META.map((item) => item.key));
  const [inputs, setInputs] = useState(initial);
  const [lowPretest, setLowPretest] = useState(false);
  const [result, setResult] = useState<any>(null);

  const calculate = (event) => {
    event.preventDefault();
    const evaluation = evaluatePerc(inputs);
    const interpretation = interpretPerc(evaluation, { lowPretestProbabilityAcknowledged: lowPretest });
    setResult(interpretation ? { ...interpretation, ...evaluation } : null);
  };

  return (
    <CalculatorShell
      slug="perc"
      title="PERC Rule"
      notice="PERC is valid only after low pre-test PE probability is established."
      result={result}
      emptyText="Confirm low pre-test probability and PERC criteria."
      scoreLabel="PERC status"
      scoreDisplay={result ? (result.satisfied ? 'Satisfied' : `${result.unmetKeys.length} unmet`) : ''}
      onResultChange={onResultChange}
    >
      <form className="calc-pr1-form" onSubmit={calculate}>
        <fieldset className="calc-timi-criteria">
          <legend>Applicability</legend>
          <label className="calc-checkbox-row" htmlFor="perc-low-pretest">
            <input
              id="perc-low-pretest"
              type="checkbox"
              checked={lowPretest}
              onChange={(event) => setLowPretest(event.target.checked)}
            />
            <span>
              <strong>Low pre-test probability has already been established</strong>
            </span>
          </label>
        </fieldset>
        <fieldset className="calc-timi-criteria">
          <legend>PERC criteria</legend>
          {PERC_CRITERIA_META.map((item) => (
            <CheckboxField
              key={item.key}
              slug="perc"
              item={item}
              checked={inputs[item.key]}
              onChange={(key, value) => setInputs((prev) => ({ ...prev, [key]: value }))}
            />
          ))}
        </fieldset>
        <div className="calc-actions">
          <button type="submit" className="calc-calculate-btn">
            Calculate PERC
          </button>
          <button type="button" className="calc-reset-btn" onClick={() => { setInputs(initial()); setLowPretest(false); setResult(null); }}>
            Reset
          </button>
        </div>
      </form>
    </CalculatorShell>
  );
}

export function GraceAcsCalculator({ onResultChange }) {
  const [values, setValues] = useState({
    ageYears: '',
    heartRateBpm: '',
    systolicBpMmHg: '',
    creatinineMgDl: '',
    killipClass: 'I',
    cardiacArrestAtAdmission: false,
    stSegmentDeviation: false,
    elevatedCardiacEnzymes: false,
  });
  const [errors, setErrors] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);

  const update = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));
  const calculate = (event) => {
    event.preventDefault();
    const validation = validateGraceAcsInputs(values);
    if (!validation.valid) {
      setErrors(validation.errors);
      setResult(null);
      return;
    }
    setErrors([]);
    const risk = computeGraceAcsRisk(validation.inputs);
    const interpretation = interpretGraceAcsRisk(risk);
    setResult(interpretation ? { ...interpretation, ...risk } : null);
  };

  return (
    <CalculatorShell
      slug="grace-acs"
      title="GRACE ACS Risk"
      notice="Uses the existing GRACE ACS risk utility for prognosis context only."
      result={result}
      emptyText="Enter ACS admission variables to estimate GRACE risk."
      scoreLabel="6-month mortality estimate"
      scoreDisplay={result ? `${result.sixMonthMortalityPct.toFixed(1)}%` : ''}
      onResultChange={onResultChange}
    >
      <form className="calc-pr1-form" onSubmit={calculate}>
        <ValidationErrors errors={errors} />
        <div className="calc-input-grid">
          <NumberField slug="grace-acs" name="ageYears" label="Age (years)" value={values.ageYears} onChange={update} min="18" max="120" />
          <NumberField slug="grace-acs" name="heartRateBpm" label="Heart rate (bpm)" value={values.heartRateBpm} onChange={update} min="20" max="300" />
          <NumberField slug="grace-acs" name="systolicBpMmHg" label="Systolic BP (mmHg)" value={values.systolicBpMmHg} onChange={update} min="50" max="300" />
          <NumberField slug="grace-acs" name="creatinineMgDl" label="Creatinine (mg/dL)" value={values.creatinineMgDl} onChange={update} min="0.1" max="25" />
          <div className="calc-input-group">
            <label className="calc-input-label" htmlFor="grace-acs-killipClass">Killip class</label>
            <select
              id="grace-acs-killipClass"
              className="calc-input-field"
              value={values.killipClass}
              onChange={(event) => update('killipClass', event.target.value)}
            >
              {['I', 'II', 'III', 'IV'].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </div>
        <fieldset className="calc-timi-criteria">
          <legend>Additional admission findings</legend>
          {[
            ['cardiacArrestAtAdmission', 'Cardiac arrest at admission'],
            ['stSegmentDeviation', 'ST-segment deviation'],
            ['elevatedCardiacEnzymes', 'Elevated cardiac enzymes'],
          ].map(([key, label]) => (
            <CheckboxField
              key={key}
              slug="grace-acs"
              item={{ key, label }}
              checked={values[key]}
              onChange={(name, checked) => update(name, checked)}
            />
          ))}
        </fieldset>
        <div className="calc-actions">
          <button type="submit" className="calc-calculate-btn">Calculate GRACE ACS</button>
          <button type="button" className="calc-reset-btn" onClick={() => { setResult(null); setErrors([]); }}>Clear Result</button>
        </div>
      </form>
    </CalculatorShell>
  );
}

export function NihssCalculator({ onResultChange }) {
  const initial = () => Object.fromEntries(NIHSS_ITEM_META.map((item) => [item.key, '0']));
  const [scores, setScores] = useState(initial);
  const [errors, setErrors] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);

  const calculate = (event) => {
    event.preventDefault();
    const validation = validateNihssInputs(scores);
    if (!validation.valid) {
      setErrors(validation.errors);
      setResult(null);
      return;
    }
    setErrors([]);
    const total = computeNihssTotal(validation.scores);
    const interpretation = interpretNihssSeverity(total.total);
    setResult(interpretation ? { ...interpretation, ...total } : null);
  };

  return (
    <CalculatorShell
      slug="nihss"
      title="NIH Stroke Scale"
      notice="Structured neurologic deficit scoring from the existing NIHSS utility."
      result={result}
      emptyText="Score NIHSS items to calculate the total."
      scoreLabel="NIHSS total"
      scoreDisplay={result ? String(result.total) : ''}
      onResultChange={onResultChange}
    >
      <form className="calc-pr1-form" onSubmit={calculate}>
        <ValidationErrors errors={errors} />
        <div className="calc-input-grid">
          {NIHSS_ITEM_META.map((item) => {
            const options = Array.from({ length: item.max - item.min + 1 }, (_, index) => item.min + index);
            return (
              <div className="calc-input-group" key={item.key}>
                <label className="calc-input-label" htmlFor={`nihss-${item.key}`}>{item.label}</label>
                <select
                  id={`nihss-${item.key}`}
                  className="calc-input-field"
                  value={scores[item.key]}
                  onChange={(event) => setScores((prev) => ({ ...prev, [item.key]: event.target.value }))}
                >
                  {options.map((value) => <option key={value} value={value}>{value}</option>)}
                  {item.untestableCode !== null ? <option value={item.untestableCode}>{item.untestableCode} - untestable</option> : null}
                </select>
              </div>
            );
          })}
        </div>
        <div className="calc-actions">
          <button type="submit" className="calc-calculate-btn">Calculate NIHSS</button>
          <button type="button" className="calc-reset-btn" onClick={() => { setScores(initial()); setResult(null); setErrors([]); }}>Reset</button>
        </div>
      </form>
    </CalculatorShell>
  );
}

export function CanadianCSpineCalculator({ onResultChange }) {
  const highInitial = () => resetObject(CCR_HIGH_RISK_META.map((item) => item.key));
  const lowInitial = () => resetObject(CCR_LOW_RISK_META.map((item) => item.key));
  const [highRisk, setHighRisk] = useState(highInitial);
  const [lowRisk, setLowRisk] = useState(lowInitial);
  const [rotation, setRotation] = useState({ activeRotationLeft45: false, activeRotationRight45: false });
  const [applicability, setApplicability] = useState({
    gcs15AndStable: true,
    bluntTraumaContext: true,
    unreliableExamOrIntoxication: false,
    pediatricUnder16: false,
  });
  const [result, setResult] = useState<any>(null);

  const calculate = (event) => {
    event.preventDefault();
    const warnings = ccrApplicabilityWarnings(applicability);
    const applied = applyCanadianCSpineRule({
      highRisk: evaluateCcrHighRisk(highRisk),
      lowRisk: evaluateCcrLowRisk(lowRisk),
      ...rotation,
    });
    const interpretation = interpretCanadianCSpine(applied, { applicabilityWarnings: warnings });
    setResult(interpretation ? { ...interpretation, ...applied } : null);
  };

  return (
    <CalculatorShell
      slug="canadian-c-spine"
      title="Canadian C-Spine Rule"
      notice="Applies the existing Canadian C-Spine Rule utility for alert, stable blunt trauma."
      result={result}
      emptyText="Complete high-risk, low-risk, and active rotation checks."
      scoreLabel="CCR output"
      scoreDisplay={result ? (result.imagingIndicatedByRule ? 'Imaging indicated' : 'Not indicated') : ''}
      onResultChange={onResultChange}
    >
      <form className="calc-pr1-form" onSubmit={calculate}>
        <fieldset className="calc-timi-criteria">
          <legend>Applicability</legend>
          {[
            ['gcs15AndStable', 'Alert and stable (GCS 15)'],
            ['bluntTraumaContext', 'Blunt trauma context'],
            ['unreliableExamOrIntoxication', 'Unreliable exam or intoxication'],
            ['pediatricUnder16', 'Age under 16'],
          ].map(([key, label]) => (
            <CheckboxField key={key} slug="canadian-c-spine" item={{ key, label }} checked={applicability[key]} onChange={(name, checked) => setApplicability((prev) => ({ ...prev, [name]: checked }))} />
          ))}
        </fieldset>
        <fieldset className="calc-timi-criteria">
          <legend>High-risk factors</legend>
          {CCR_HIGH_RISK_META.map((item) => <CheckboxField key={item.key} slug="canadian-c-spine" item={item} checked={highRisk[item.key]} onChange={(key, value) => setHighRisk((prev) => ({ ...prev, [key]: value }))} />)}
        </fieldset>
        <fieldset className="calc-timi-criteria">
          <legend>Low-risk criteria and active rotation</legend>
          {CCR_LOW_RISK_META.map((item) => <CheckboxField key={item.key} slug="canadian-c-spine" item={item} checked={lowRisk[item.key]} onChange={(key, value) => setLowRisk((prev) => ({ ...prev, [key]: value }))} />)}
          {[
            ['activeRotationLeft45', 'Can actively rotate neck 45° left'],
            ['activeRotationRight45', 'Can actively rotate neck 45° right'],
          ].map(([key, label]) => <CheckboxField key={key} slug="canadian-c-spine" item={{ key, label }} checked={rotation[key]} onChange={(name, checked) => setRotation((prev) => ({ ...prev, [name]: checked }))} />)}
        </fieldset>
        <div className="calc-actions">
          <button type="submit" className="calc-calculate-btn">Calculate Canadian C-Spine</button>
          <button type="button" className="calc-reset-btn" onClick={() => { setHighRisk(highInitial()); setLowRisk(lowInitial()); setRotation({ activeRotationLeft45: false, activeRotationRight45: false }); setResult(null); }}>Reset</button>
        </div>
      </form>
    </CalculatorShell>
  );
}

export function OttawaAnkleCalculator({ onResultChange }) {
  const examInitial = () => resetObject([
    'painMalleolarZone',
    'tendernessLateralMalleolus',
    'tendernessMedialMalleolus',
    'painMidfootZone',
    'tendernessNavicular',
    'tendernessFifthMetatarsalBase',
    'unableToBearWeightBothTimes',
  ]);
  const [exam, setExam] = useState(examInitial);
  const [applicability, setApplicability] = useState({
    acuteAnkleFootInjury: true,
    neurovascularCompromise: false,
    openFractureOrGrossDeformity: false,
    severeTraumaOrMultisystem: false,
    pediatricUnder18: false,
  });
  const [result, setResult] = useState<any>(null);

  const calculate = (event) => {
    event.preventDefault();
    const hardStop = Boolean(
      applicability.neurovascularCompromise ||
        applicability.openFractureOrGrossDeformity ||
        applicability.severeTraumaOrMultisystem
    );
    const applied = applyOttawaAnkleFootRules(exam, {
      applicabilityWarnings: ottawaApplicabilityWarnings(applicability),
      rulesApplicable: ottawaRulesApplicable(hardStop),
    });
    const interpretation = interpretOttawaAnkleFootRules(applied);
    setResult(interpretation ? { ...interpretation, ...applied } : null);
  };

  return (
    <CalculatorShell
      slug="ottawa-ankle"
      title="Ottawa Ankle and Foot Rules"
      notice="Uses existing Ottawa ankle/foot decision-support utility for acute injury contexts."
      result={result}
      emptyText="Complete ankle, foot, and weight-bearing findings."
      scoreLabel="Ottawa output"
      scoreDisplay={result ? `${result.ankleRadiographIndicated ? 'Ankle x-ray' : 'No ankle x-ray'} / ${result.footRadiographIndicated ? 'Foot x-ray' : 'No foot x-ray'}` : ''}
      onResultChange={onResultChange}
    >
      <form className="calc-pr1-form" onSubmit={calculate}>
        <fieldset className="calc-timi-criteria">
          <legend>Applicability</legend>
          {[
            ['acuteAnkleFootInjury', 'Acute ankle/foot injury context'],
            ['neurovascularCompromise', 'Neurovascular compromise'],
            ['openFractureOrGrossDeformity', 'Open fracture or gross deformity'],
            ['severeTraumaOrMultisystem', 'Severe or multisystem trauma'],
            ['pediatricUnder18', 'Age under 18'],
          ].map(([key, label]) => <CheckboxField key={key} slug="ottawa-ankle" item={{ key, label }} checked={applicability[key]} onChange={(name, checked) => setApplicability((prev) => ({ ...prev, [name]: checked }))} />)}
        </fieldset>
        <fieldset className="calc-timi-criteria">
          <legend>Exam findings</legend>
          {[
            ['painMalleolarZone', 'Pain in malleolar zone'],
            ['tendernessLateralMalleolus', 'Tenderness posterior edge/tip lateral malleolus'],
            ['tendernessMedialMalleolus', 'Tenderness posterior edge/tip medial malleolus'],
            ['painMidfootZone', 'Pain in midfoot zone'],
            ['tendernessNavicular', 'Tenderness at navicular'],
            ['tendernessFifthMetatarsalBase', 'Tenderness base of fifth metatarsal'],
            ['unableToBearWeightBothTimes', 'Unable to bear weight for 4 steps immediately and now'],
          ].map(([key, label]) => <CheckboxField key={key} slug="ottawa-ankle" item={{ key, label }} checked={exam[key]} onChange={(name, checked) => setExam((prev) => ({ ...prev, [name]: checked }))} />)}
        </fieldset>
        <div className="calc-actions">
          <button type="submit" className="calc-calculate-btn">Calculate Ottawa Ankle</button>
          <button type="button" className="calc-reset-btn" onClick={() => { setExam(examInitial()); setResult(null); }}>Reset</button>
        </div>
      </form>
    </CalculatorShell>
  );
}

export function NexusCSpineCalculator({ onResultChange }) {
  const [inputs, setInputs] = useState({
    midlineTenderness: false,
    intoxication: false,
    neurologicDeficit: false,
    distractingInjury: false,
    normalAlertness: true,
  });
  const [result, setResult] = useState<any>(null);

  const calculate = (event) => {
    event.preventDefault();
    setResult(evaluateNexusCSpine(inputs));
  };

  return (
    <CalculatorShell
      slug="nexus-cspine"
      title="NEXUS C-Spine Rule"
      notice="Applies the existing NEXUS C-Spine utility; it does not clear the cervical spine."
      result={result}
      emptyText="Select NEXUS criteria to calculate low-risk status."
      scoreLabel="NEXUS output"
      scoreDisplay={result ? (result.lowRiskByRule ? 'Low-risk' : 'Criteria present') : ''}
      onResultChange={onResultChange}
    >
      <form className="calc-pr1-form" onSubmit={calculate}>
        <fieldset className="calc-timi-criteria">
          <legend>NEXUS criteria</legend>
          {NEXUS_CRITERIA_META.map((item) => <CheckboxField key={item.key} slug="nexus-cspine" item={item} checked={inputs[item.key]} onChange={(key, checked) => setInputs((prev) => ({ ...prev, [key]: checked }))} />)}
        </fieldset>
        <div className="calc-actions">
          <button type="submit" className="calc-calculate-btn">Calculate NEXUS C-Spine</button>
          <button type="button" className="calc-reset-btn" onClick={() => { setInputs({ midlineTenderness: false, intoxication: false, neurologicDeficit: false, distractingInjury: false, normalAlertness: true }); setResult(null); }}>Reset</button>
        </div>
      </form>
    </CalculatorShell>
  );
}

export function PecarnHeadCalculator({ onResultChange }) {
  const [inputs, setInputs] = useState({
    ageCategory: 'under_2',
    alteredMentalStatus: false,
    lossOfConsciousness: false,
    vomiting: false,
    severeMechanism: false,
    skullFractureSigns: false,
  });
  const [result, setResult] = useState<any>(null);

  const calculate = (event) => {
    event.preventDefault();
    setResult(evaluatePecarnHead(inputs));
  };

  return (
    <CalculatorShell
      slug="pecarn-head"
      title="PECARN Head Injury Rule"
      notice="Uses the existing PECARN pediatric head injury utility for informational stratification."
      result={result}
      emptyText="Select age group and injury criteria."
      scoreLabel="PECARN stratum"
      scoreDisplay={result ? result.riskStratum : ''}
      onResultChange={onResultChange}
    >
      <form className="calc-pr1-form" onSubmit={calculate}>
        <div className="calc-input-group">
          <label className="calc-input-label" htmlFor="pecarn-head-ageCategory">Age group</label>
          <select id="pecarn-head-ageCategory" className="calc-input-field" value={inputs.ageCategory} onChange={(event) => setInputs((prev) => ({ ...prev, ageCategory: event.target.value }))}>
            {PECARN_AGE_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <fieldset className="calc-timi-criteria">
          <legend>PECARN criteria</legend>
          {[
            ['alteredMentalStatus', 'GCS <15 or altered mental status'],
            ['lossOfConsciousness', 'Loss of consciousness'],
            ['vomiting', 'Vomiting'],
            ['severeMechanism', 'Severe mechanism'],
            ['skullFractureSigns', 'Palpable/basilar skull fracture signs'],
          ].map(([key, label]) => <CheckboxField key={key} slug="pecarn-head" item={{ key, label }} checked={inputs[key]} onChange={(name, checked) => setInputs((prev) => ({ ...prev, [name]: checked }))} />)}
        </fieldset>
        <div className="calc-actions">
          <button type="submit" className="calc-calculate-btn">Calculate PECARN Head</button>
          <button type="button" className="calc-reset-btn" onClick={() => { setInputs({ ageCategory: 'under_2', alteredMentalStatus: false, lossOfConsciousness: false, vomiting: false, severeMechanism: false, skullFractureSigns: false }); setResult(null); }}>Reset</button>
        </div>
      </form>
    </CalculatorShell>
  );
}

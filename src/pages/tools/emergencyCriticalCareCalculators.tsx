import { useEffect, useMemo, useRef, useState } from 'react';
import { getCalculatorSubIcon } from '../../navigation/iconRegistry';
import {
  CalcDecisionSupportLead as SharedCalcDecisionSupportLead,
  CalcPanelTitle,
  CalcResultsEmptyIcon,
  CalcResultsPanel,
  ResultsPanelTitle,
  ValidationErrors,
  scrollResultsIntoView,
} from './calculatorPrimitives';
import {
  APACHE_II_COMPONENTS_META,
  CURB65_CRITERIA_META,
  EMERGENCY_DECISION_SUPPORT_DISCLAIMER,
  GCS_COMPONENTS_META,
  PEDIATRIC_CAUTION,
  PEWS_DIMENSIONS_META,
  calculateApacheIIScore,
  calculateCurb65Score,
  calculateGcsScore,
  calculatePewsScore,
  computeMewsBreakdown,
  computeRevisedTraumaScore,
  interpretApacheIIScore,
  interpretCurb65Score,
  interpretGcsScore,
  interpretMewsScore,
  interpretPewsScore,
  interpretRevisedTraumaScore,
  sumMewsScore,
  validateApacheIIInputs,
  validateMewsInputs,
  validateRequiredSelections,
  validateRtsInputs,
} from '../../utils/emergencyCriticalCareCalculators';

function CalcDecisionSupportLead() {
  return <SharedCalcDecisionSupportLead>{EMERGENCY_DECISION_SUPPORT_DISCLAIMER}</SharedCalcDecisionSupportLead>;
}

function ResultPanel({ title, icon, result, emptyText, renderDetails }) {
  return (
    <CalcResultsPanel ariaLabel={`${title} results`}>
      <ResultsPanelTitle />
      {result ? (
        <>
          <div className={`calc-score-display ${result.severity}`}>
            <div className="calc-score-label">{result.scoreLabel}</div>
            <div className="calc-score-value">{result.scoreDisplay}</div>
            <div className="calc-score-interpretation">{result.label}</div>
          </div>
          {renderDetails?.()}
          <section
            className={`calc-interpretation-box ${result.severity}${result.severity !== 'normal' ? ' calc-interpretation-box--risk-emphasis' : ''}`}
            role="region"
            aria-label={`${title} interpretation`}
          >
            <h3 className="calc-interpretation-title">Interpretation</h3>
            <p className="calc-interpretation-text">{result.interpretation}</p>
            <p className="calc-interpretation-text">
              <strong>Risk category:</strong> {result.riskCategory}
            </p>
          </section>
          <section className="calc-interpretation-box warning" role="region" aria-label={`${title} warnings`}>
            <h3 className="calc-interpretation-title">Warnings</h3>
            <ul className="calc-breakdown-list">
              {(result.warnings || ['Clinical decision support only. Not a diagnosis.']).map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
              <li>{EMERGENCY_DECISION_SUPPORT_DISCLAIMER}</li>
            </ul>
          </section>
          <section className="calc-interpretation-box normal" role="region" aria-label={`${title} references`}>
            <h3 className="calc-interpretation-title">References</h3>
            <p className="calc-interpretation-text">{result.referenceLine}</p>
          </section>
        </>
      ) : (
        <div className="calc-results-empty">
          <CalcResultsEmptyIcon icon={icon} />
          <p>{emptyText}</p>
        </div>
      )}
    </CalcResultsPanel>
  );
}

function ErrorList({ errors }) {
  return <ValidationErrors errors={errors} />;
}

function Shell({ slug, title, subtitle, pediatric = false, children, result, emptyText, onResultChange, payload, renderDetails = undefined }: any) {
  const icon = getCalculatorSubIcon(slug);
  const resultsRef = useRef(null);

  useEffect(() => {
    onResultChange?.(result ? payload(result) : null);
  }, [onResultChange, payload, result]);

  useEffect(() => {
    if (result) scrollResultsIntoView(resultsRef.current);
  }, [result]);

  return (
    <div className={`calculator-interface calculator-interface--${slug}`}>
      <div className="calculator-inputs">
        <CalcPanelTitle icon={icon}>{title}</CalcPanelTitle>
        <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
          <CalcDecisionSupportLead />
          <p className="calc-disclaimer-detail">{subtitle}</p>
          {pediatric ? <p className="calc-disclaimer-detail">{PEDIATRIC_CAUTION}</p> : null}
        </div>
        {children}
      </div>
      <div ref={resultsRef}>
        <ResultPanel title={title} icon={icon} result={result} emptyText={emptyText} renderDetails={renderDetails} />
      </div>
    </div>
  );
}

function SelectField({ id, label, value, options, onChange }) {
  return (
    <div className="calc-form-group">
      <label htmlFor={id} className="calc-label">
        {label}
      </label>
      <select id={id} className="calc-select" value={value} onChange={(e) => onChange(e.target.value)} required>
        <option value="">Select...</option>
        {options.map((option, index) => (
          <option key={`${option.label}-${option.value}-${index}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function NumericField({ id, label, value, onChange, min, max, step = '1' }) {
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
        onChange={(e) => onChange(e.target.value)}
        required
      />
    </div>
  );
}

function CalculatorActions({ calculateLabel, onReset }) {
  return (
    <div className="calc-actions">
      <button type="submit" className="calc-calculate-btn">
        {calculateLabel}
      </button>
      <button type="button" className="calc-reset-btn" onClick={onReset}>
        Reset
      </button>
    </div>
  );
}

function SelectScoreCalculator({
  slug,
  title,
  subtitle,
  fields,
  calculate,
  interpret,
  scoreLabel,
  emptyText,
  onResultChange,
  pediatric = false,
}) {
  const initial = useMemo(() => Object.fromEntries(fields.map((field) => [field.key, ''])), [fields]);
  const [inputs, setInputs] = useState(initial);
  const [result, setResult] = useState<any>(null);
  const [errors, setErrors] = useState<any[]>([]);
  const labelByKey = useMemo(() => Object.fromEntries(fields.map((field) => [field.key, field.label])), [fields]);

  const update = (key, value) => setInputs((current) => ({ ...current, [key]: value }));
  const reset = () => {
    setInputs(initial);
    setResult(null);
    setErrors([]);
  };

  const submit = (event) => {
    event.preventDefault();
    const validation = validateRequiredSelections(inputs, fields.map((field) => field.key), labelByKey);
    if (!validation.ok) {
      setErrors(validation.errors);
      setResult(null);
      return;
    }
    const total = calculate(inputs);
    const interpretation = interpret(total);
    setErrors([]);
    setResult({
      ...interpretation,
      total,
      scoreLabel,
      scoreDisplay: String(total),
    });
  };

  return (
    <Shell
      slug={slug}
      title={title}
      subtitle={subtitle}
      result={result}
      emptyText={emptyText}
      onResultChange={onResultChange}
      pediatric={pediatric}
      payload={(r) => ({ score: r.total, riskCategory: r.riskCategory, severity: r.severity })}
    >
      <form className="calc-pr1-form" onSubmit={submit}>
        <div className="calc-form-grid">
          {fields.map((field) => (
            <SelectField
              key={field.key}
              id={`${slug}-${field.key}`}
              label={field.label}
              value={inputs[field.key]}
              options={field.options}
              onChange={(value) => update(field.key, value)}
            />
          ))}
        </div>
        <ErrorList errors={errors} />
        <CalculatorActions calculateLabel={`Calculate ${title}`} onReset={reset} />
      </form>
    </Shell>
  );
}

export function GcsCalculator({ onResultChange }) {
  return (
    <SelectScoreCalculator
      slug="gcs"
      title="Glasgow Coma Scale (GCS)"
      subtitle="Score eye, verbal, and motor responses. Intubation, sedation, intoxication, aphasia, and paralysis can make a raw total misleading."
      fields={GCS_COMPONENTS_META}
      calculate={calculateGcsScore}
      interpret={interpretGcsScore}
      scoreLabel="GCS total"
      emptyText="Select eye, verbal, and motor responses"
      onResultChange={onResultChange}
    />
  );
}

export function Curb65Calculator({ onResultChange }) {
  const initial = Object.fromEntries(CURB65_CRITERIA_META.map((item) => [item.key, false]));
  const [inputs, setInputs] = useState(initial);
  const [result, setResult] = useState<any>(null);

  const submit = (event) => {
    event.preventDefault();
    const score = calculateCurb65Score(inputs);
    setResult({
      ...interpretCurb65Score(score),
      total: score,
      scoreLabel: 'CURB-65 score',
      scoreDisplay: String(score),
    });
  };

  const reset = () => {
    setInputs(initial);
    setResult(null);
  };

  return (
    <Shell
      slug="curb-65"
      title="CURB-65"
      subtitle="Community-acquired pneumonia severity score using confusion, urea/BUN, respiratory rate, blood pressure, and age."
      result={result}
      emptyText="Check the CURB-65 criteria that are present"
      onResultChange={onResultChange}
      payload={(r) => ({ score: r.total, riskCategory: r.riskCategory, severity: r.severity })}
    >
      <form className="calc-pr1-form" onSubmit={submit}>
        <fieldset className="calc-has-bled-fieldset">
          <legend>Criteria</legend>
          {CURB65_CRITERIA_META.map((item) => (
            <label key={item.key} className="calc-checkbox-row">
              <input
                type="checkbox"
                checked={inputs[item.key]}
                onChange={(event) => setInputs((current) => ({ ...current, [item.key]: event.target.checked }))}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </fieldset>
        <CalculatorActions calculateLabel="Calculate CURB-65" onReset={reset} />
      </form>
    </Shell>
  );
}

export function ApacheIICalculator({ onResultChange }) {
  const initial = Object.fromEntries(APACHE_II_COMPONENTS_META.map((field) => [field.key, '']));
  const [inputs, setInputs] = useState({ ...initial, gcs: '', acuteRenalFailure: false });
  const [result, setResult] = useState<any>(null);
  const [errors, setErrors] = useState<any[]>([]);

  const update = (key, value) => setInputs((current) => ({ ...current, [key]: value }));
  const reset = () => {
    setInputs({ ...initial, gcs: '', acuteRenalFailure: false });
    setResult(null);
    setErrors([]);
  };

  const submit = (event) => {
    event.preventDefault();
    const validation = validateApacheIIInputs(inputs);
    if (!validation.ok) {
      setErrors(validation.errors);
      setResult(null);
      return;
    }
    const score = calculateApacheIIScore(inputs);
    if (!score) return;
    const interpretation = interpretApacheIIScore(score.total);
    setErrors([]);
    setResult({
      ...interpretation,
      ...score,
      scoreLabel: 'APACHE II score',
      scoreDisplay: String(score.total),
    });
  };

  return (
    <Shell
      slug="apache-ii"
      title="APACHE II"
      subtitle="Uses published APACHE II point bands for acute physiology, GCS contribution, age, and chronic health. Mortality estimates are diagnosis-specific and are not generated here."
      result={result}
      emptyText="Select APACHE II point bands and enter GCS"
      onResultChange={onResultChange}
      payload={(r) => ({
        score: r.total,
        acutePhysiology: r.acutePhysiology,
        gcsContribution: r.gcsContribution,
        riskCategory: r.riskCategory,
        severity: r.severity,
      })}
      renderDetails={() => (
        <div className="calc-breakdown-list" aria-label="APACHE II score breakdown">
          <div>Acute physiology score: {result.acutePhysiology}</div>
          <div>GCS contribution: {result.gcsContribution}</div>
          <div>Acute renal failure creatinine adjustment: {result.renalAdjustment}</div>
        </div>
      )}
    >
      <form className="calc-pr1-form" onSubmit={submit}>
        <div className="calc-form-grid">
          {APACHE_II_COMPONENTS_META.map((field) => (
            <SelectField
              key={field.key}
              id={`apache-ii-${field.key}`}
              label={field.label}
              value={inputs[field.key]}
              options={field.options}
              onChange={(value) => update(field.key, value)}
            />
          ))}
          <NumericField id="apache-ii-gcs" label="Glasgow Coma Scale total" value={inputs.gcs} onChange={(value) => update('gcs', value)} min="3" max="15" />
        </div>
        <label className="calc-checkbox-row">
          <input
            type="checkbox"
            checked={inputs.acuteRenalFailure}
            onChange={(event) => update('acuteRenalFailure', event.target.checked)}
          />
          <span>Acute renal failure present: double APACHE II creatinine points.</span>
        </label>
        <ErrorList errors={errors} />
        <CalculatorActions calculateLabel="Calculate APACHE II" onReset={reset} />
      </form>
    </Shell>
  );
}

export function MewsCalculator({ onResultChange }) {
  const [inputs, setInputs] = useState({
    respiratoryRate: '',
    heartRate: '',
    systolicBp: '',
    temperature: '',
    avpu: '',
  });
  const [result, setResult] = useState<any>(null);
  const [errors, setErrors] = useState<any[]>([]);

  const update = (key, value) => setInputs((current) => ({ ...current, [key]: value }));
  const reset = () => {
    setInputs({ respiratoryRate: '', heartRate: '', systolicBp: '', temperature: '', avpu: '' });
    setResult(null);
    setErrors([]);
  };

  const submit = (event) => {
    event.preventDefault();
    const validation = validateMewsInputs(inputs);
    if (!validation.ok) {
      setErrors(validation.errors);
      setResult(null);
      return;
    }
    const breakdown = computeMewsBreakdown(inputs);
    const score = sumMewsScore(breakdown);
    setErrors([]);
    setResult({
      ...interpretMewsScore(score),
      breakdown,
      total: score,
      scoreLabel: 'MEWS',
      scoreDisplay: String(score),
    });
  };

  return (
    <Shell
      slug="mews"
      title="Modified Early Warning Score (MEWS)"
      subtitle="Adult early-warning score from respiratory rate, heart rate, systolic BP, temperature, and AVPU."
      result={result}
      emptyText="Enter adult vital signs and AVPU"
      onResultChange={onResultChange}
      payload={(r) => ({ score: r.total, breakdown: r.breakdown, riskCategory: r.riskCategory, severity: r.severity })}
      renderDetails={() => (
        <div className="calc-breakdown-list" aria-label="MEWS score breakdown">
          {Object.entries(result.breakdown).map(([key, value]) => (
            <div key={key}>
              {key}: {value as any}
            </div>
          ))}
        </div>
      )}
    >
      <form className="calc-pr1-form" onSubmit={submit}>
        <div className="calc-form-grid">
          <NumericField id="mews-rr" label="Respiratory rate (/min)" value={inputs.respiratoryRate} onChange={(value) => update('respiratoryRate', value)} min="0" max="80" />
          <NumericField id="mews-hr" label="Heart rate (/min)" value={inputs.heartRate} onChange={(value) => update('heartRate', value)} min="20" max="250" />
          <NumericField id="mews-sbp" label="Systolic BP (mmHg)" value={inputs.systolicBp} onChange={(value) => update('systolicBp', value)} min="40" max="300" />
          <NumericField id="mews-temp" label="Temperature (C)" value={inputs.temperature} onChange={(value) => update('temperature', value)} min="30" max="43" step="0.1" />
          <SelectField
            id="mews-avpu"
            label="AVPU"
            value={inputs.avpu}
            options={[
              { value: 0, label: 'Alert (0)' },
              { value: 1, label: 'Responds to voice (1)' },
              { value: 2, label: 'Responds to pain (2)' },
              { value: 3, label: 'Unresponsive (3)' },
            ]}
            onChange={(value) => update('avpu', value)}
          />
        </div>
        <ErrorList errors={errors} />
        <CalculatorActions calculateLabel="Calculate MEWS" onReset={reset} />
      </form>
    </Shell>
  );
}

export function RevisedTraumaScoreCalculator({ onResultChange }) {
  const [inputs, setInputs] = useState({ gcs: '', systolicBp: '', respiratoryRate: '' });
  const [result, setResult] = useState<any>(null);
  const [errors, setErrors] = useState<any[]>([]);

  const update = (key, value) => setInputs((current) => ({ ...current, [key]: value }));
  const reset = () => {
    setInputs({ gcs: '', systolicBp: '', respiratoryRate: '' });
    setResult(null);
    setErrors([]);
  };

  const submit = (event) => {
    event.preventDefault();
    const validation = validateRtsInputs(inputs);
    if (!validation.ok) {
      setErrors(validation.errors);
      setResult(null);
      return;
    }
    const score = computeRevisedTraumaScore(inputs);
    if (!score) return;
    setErrors([]);
    setResult({
      ...interpretRevisedTraumaScore(score.weighted),
      ...score,
      scoreLabel: 'Weighted RTS',
      scoreDisplay: score.weighted.toFixed(4),
    });
  };

  return (
    <Shell
      slug="revised-trauma-score"
      title="Revised Trauma Score"
      subtitle="Physiologic trauma severity score using coded GCS, systolic blood pressure, and respiratory rate."
      result={result}
      emptyText="Enter trauma physiology values"
      onResultChange={onResultChange}
      payload={(r) => ({ weighted: r.weighted, unweighted: r.unweighted, riskCategory: r.riskCategory, severity: r.severity })}
      renderDetails={() => (
        <div className="calc-breakdown-list" aria-label="RTS coded component breakdown">
          <div>GCS code: {result.gcsCode}</div>
          <div>SBP code: {result.sbpCode}</div>
          <div>RR code: {result.rrCode}</div>
          <div>Unweighted code sum: {result.unweighted}</div>
        </div>
      )}
    >
      <form className="calc-pr1-form" onSubmit={submit}>
        <div className="calc-form-grid">
          <NumericField id="rts-gcs" label="GCS total" value={inputs.gcs} onChange={(value) => update('gcs', value)} min="3" max="15" />
          <NumericField id="rts-sbp" label="Systolic BP (mmHg)" value={inputs.systolicBp} onChange={(value) => update('systolicBp', value)} min="0" max="300" />
          <NumericField id="rts-rr" label="Respiratory rate (/min)" value={inputs.respiratoryRate} onChange={(value) => update('respiratoryRate', value)} min="0" max="80" />
        </div>
        <ErrorList errors={errors} />
        <CalculatorActions calculateLabel="Calculate Revised Trauma Score" onReset={reset} />
      </form>
    </Shell>
  );
}

export function PewsCalculator({ onResultChange }) {
  return (
    <SelectScoreCalculator
      slug="pews"
      title="Pediatric Early Warning Score (PEWS)"
      subtitle="Brighton-style PEWS support from behavior, cardiovascular status, respiratory status, frequent nebulizers, and persistent postoperative vomiting."
      fields={PEWS_DIMENSIONS_META}
      calculate={calculatePewsScore}
      interpret={interpretPewsScore}
      scoreLabel="PEWS"
      emptyText="Select pediatric early-warning findings"
      onResultChange={onResultChange}
      pediatric
    />
  );
}

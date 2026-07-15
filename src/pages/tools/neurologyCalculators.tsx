import { useEffect, useRef, useState } from 'react';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS, getCalculatorSubIcon } from '../../navigation/iconRegistry';
import { CalcPanelTitle, ResultsPanelTitle, scrollResultsIntoView } from './calculatorPrimitives';
import {
  FOUR_SCORE_OPTIONS,
  HUNT_HESS_GRADE_OPTIONS,
  MODIFIED_RANKIN_OPTIONS,
  NEUROLOGY_SAFETY_DISCLAIMER,
  NIHSS_SUMMARY_OPTIONS,
  PEDIATRIC_GCS_OPTIONS,
  computeFourScore,
  computeHuntHessScale,
  computeIchScore,
  computeModifiedRankinScale,
  computeNihssSummaryView,
  computePediatricGcs,
} from '../../utils/neurologyCalculators';

function DecisionSupportNotice({ children }) {
  const urgencyText = NEUROLOGY_SAFETY_DISCLAIMER.replace(/^Clinical decision support only\. /, '');
  return (
    <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
      <p className="calc-ds-lead">
        <strong>Decision support only.</strong> Neurologic emergencies require urgent local pathways first.
      </p>
      <p className="calc-disclaimer-detail">{children}</p>
      <p className="calc-disclaimer-detail">{urgencyText}</p>
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

function TextField({ slug, field, value, onChange }) {
  return (
    <div className="calc-input-group">
      <label className="calc-input-label" htmlFor={`${slug}-${field.name}`}>
        {field.label}
      </label>
      <input
        id={`${slug}-${field.name}`}
        className="calc-input-field"
        type="number"
        min={field.min}
        max={field.max}
        step={field.step || 'any'}
        value={value}
        onChange={(event) => onChange(field.name, event.target.value)}
        inputMode="decimal"
      />
      {field.help ? <span className="calc-input-help">{field.help}</span> : null}
    </div>
  );
}

function SelectField({ slug, field, value, onChange }) {
  return (
    <div className="calc-input-group">
      <label className="calc-input-label" htmlFor={`${slug}-${field.name}`}>
        {field.label}
      </label>
      <select
        id={`${slug}-${field.name}`}
        className="calc-select-field"
        value={value}
        onChange={(event) => onChange(field.name, event.target.value)}
      >
        <option value="">Select...</option>
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {field.help ? <span className="calc-input-help">{field.help}</span> : null}
    </div>
  );
}

function ResultPanel({ config, result }) {
  const icon = getCalculatorSubIcon(config.slug);
  return result ? (
    <>
      <div className={`calc-score-display ${result.severity || 'normal'}`} role="status">
        <div className="calc-score-label">{config.primaryLabel}</div>
        <div className="calc-score-value">{config.primaryValue(result)}</div>
        <div className="calc-score-interpretation">{result.label}</div>
      </div>
      <section
        className={`calc-interpretation-box ${result.severity || 'normal'}`}
        aria-labelledby={`${config.slug}-interpretation-heading`}
      >
        <h3 id={`${config.slug}-interpretation-heading`} className="calc-interpretation-title">
          Interpretation
        </h3>
        <p>{result.interpretation}</p>
        <p className="calc-disclaimer-detail">{result.disclaimer}</p>
        <p className="calc-reference-line">{result.referenceLine}</p>
      </section>
      {result.components ? (
        <section className="calc-interpretation-box normal" aria-label="Component summary">
          <h3 className="calc-interpretation-title">Component Summary</h3>
          <ul className="calc-breakdown-list">
            {Object.entries(result.components).map(([key, value]) => (
              <li key={key}>
                <strong>{key.replace(/([A-Z])/g, ' $1')}:</strong> {value as any}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  ) : (
    <div className="calc-results-empty">
      <div className="calc-results-empty-icon" aria-hidden>
        <NavIcon icon={icon} size={56} />
      </div>
      <p>{config.emptyText}</p>
    </div>
  );
}

function NeurologyCalculator({ config, onResultChange }) {
  const icon = getCalculatorSubIcon(config.slug);
  const [form, setForm] = useState(config.initial);
  const [errors, setErrors] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    onResultChange?.(result);
  }, [onResultChange, result]);

  useEffect(() => {
    if (result) scrollResultsIntoView(resultsRef.current);
  }, [result]);

  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const reset = () => {
    setForm(config.initial);
    setErrors([]);
    setResult(null);
  };
  const calculate = () => {
    const computed = config.compute(form);
    if (!computed.ok) {
      setErrors(computed.errors || ['Unable to calculate from entered values.']);
      setResult(null);
      return;
    }
    setErrors([]);
    setResult(computed);
  };

  return (
    <div className={`calculator-interface calculator-interface--${config.slug}`}>
      <div className="calculator-inputs">
        <CalcPanelTitle icon={icon}>
          <span id={`${config.slug}-form-title`}>{config.title}</span>
        </CalcPanelTitle>
        <DecisionSupportNotice>{config.notice}</DecisionSupportNotice>
        <form
          className="calc-pr1-form"
          noValidate
          aria-labelledby={`${config.slug}-form-title`}
          onSubmit={(event) => {
            event.preventDefault();
            calculate();
          }}
        >
          <ValidationErrors errors={errors} />
          <div className="calc-input-grid--responsive">
            {config.fields.map((field) =>
              field.type === 'select' ? (
                <SelectField
                  key={field.name}
                  slug={config.slug}
                  field={field}
                  value={form[field.name]}
                  onChange={update}
                />
              ) : (
                <TextField
                  key={field.name}
                  slug={config.slug}
                  field={field}
                  value={form[field.name]}
                  onChange={update}
                />
              )
            )}
          </div>
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
      <div
        className="calculator-results"
        ref={resultsRef}
        tabIndex={-1}
        aria-live="polite"
        aria-label={`${config.title} results`}
      >
        <ResultsPanelTitle />
        <ResultPanel config={config} result={result} />
      </div>
    </div>
  );
}

const yesNoOptions = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

const configBySlug = {
  'hunt-hess-scale': {
    slug: 'hunt-hess-scale',
    title: 'Hunt-Hess Scale',
    notice: 'Aneurysmal SAH severity documentation only; neurosurgical and emergency pathways take priority.',
    initial: { grade: '' },
    fields: [{ name: 'grade', label: 'Clinical grade', type: 'select', options: HUNT_HESS_GRADE_OPTIONS }],
    compute: computeHuntHessScale,
    emptyText: 'Select the Hunt-Hess clinical grade.',
    primaryLabel: 'Hunt-Hess',
    primaryValue: (result) => `${result.score}`,
  },
  'ich-score': {
    slug: 'ich-score',
    title: 'ICH Score',
    notice: 'Intracerebral hemorrhage severity context only; do not delay imaging, BP pathway, or neurosurgical review.',
    initial: { age: '', gcs: '', volumeMl: '', intraventricularHemorrhage: '', infratentorialOrigin: '' },
    fields: [
      { name: 'age', label: 'Age (years)', min: 0, max: 120, step: '1' },
      { name: 'gcs', label: 'GCS', min: 3, max: 15, step: '1' },
      { name: 'volumeMl', label: 'ICH volume (mL)', min: 0, max: 300 },
      { name: 'intraventricularHemorrhage', label: 'Intraventricular hemorrhage', type: 'select', options: yesNoOptions },
      { name: 'infratentorialOrigin', label: 'Infratentorial origin', type: 'select', options: yesNoOptions },
    ],
    compute: computeIchScore,
    emptyText: 'Enter age, GCS, hematoma volume, IVH status, and origin.',
    primaryLabel: 'ICH Score',
    primaryValue: (result) => `${result.score}`,
  },
  'four-score': {
    slug: 'four-score',
    title: 'FOUR Score',
    notice: 'Coma exam documentation only; airway, ventilation, and neurocritical-care review take priority.',
    initial: { eye: '', motor: '', brainstem: '', respiration: '' },
    fields: [
      { name: 'eye', label: 'Eye response', type: 'select', options: FOUR_SCORE_OPTIONS.eye },
      { name: 'motor', label: 'Motor response', type: 'select', options: FOUR_SCORE_OPTIONS.motor },
      { name: 'brainstem', label: 'Brainstem reflexes', type: 'select', options: FOUR_SCORE_OPTIONS.brainstem },
      { name: 'respiration', label: 'Respiration', type: 'select', options: FOUR_SCORE_OPTIONS.respiration },
    ],
    compute: computeFourScore,
    emptyText: 'Select eye, motor, brainstem, and respiratory components.',
    primaryLabel: 'FOUR',
    primaryValue: (result) => `${result.score}/16`,
  },
  'modified-rankin-scale': {
    slug: 'modified-rankin-scale',
    title: 'Modified Rankin Scale',
    notice: 'Global disability documentation only; not an acute treatment or disposition decision.',
    initial: { score: '' },
    fields: [{ name: 'score', label: 'mRS level', type: 'select', options: MODIFIED_RANKIN_OPTIONS }],
    compute: computeModifiedRankinScale,
    emptyText: 'Select the modified Rankin Scale level.',
    primaryLabel: 'mRS',
    primaryValue: (result) => `${result.score}`,
  },
  'nihss-summary-view': {
    slug: 'nihss-summary-view',
    title: 'NIHSS Summary View',
    notice: 'Stroke exam summary only; activate stroke pathways and imaging immediately when indicated.',
    initial: Object.fromEntries(Object.keys(NIHSS_SUMMARY_OPTIONS).map((key) => [key, ''])),
    fields: Object.entries(NIHSS_SUMMARY_OPTIONS).map(([name, options]) => ({
      name,
      label: name.replace(/([A-Z])/g, ' $1'),
      type: 'select',
      options,
    })),
    compute: computeNihssSummaryView,
    emptyText: 'Select NIHSS item scores to summarize total severity.',
    primaryLabel: 'NIHSS',
    primaryValue: (result) => `${result.score}/42`,
  },
  'pediatric-gcs': {
    slug: 'pediatric-gcs',
    title: 'Pediatric GCS',
    notice: 'Pediatric consciousness documentation only; urgent pediatric, trauma, seizure, airway, or hypoglycemia pathways take priority.',
    initial: { eye: '', verbal: '', motor: '' },
    fields: [
      { name: 'eye', label: 'Eye opening', type: 'select', options: PEDIATRIC_GCS_OPTIONS.eye },
      { name: 'verbal', label: 'Verbal response', type: 'select', options: PEDIATRIC_GCS_OPTIONS.verbal },
      { name: 'motor', label: 'Motor response', type: 'select', options: PEDIATRIC_GCS_OPTIONS.motor },
    ],
    compute: computePediatricGcs,
    emptyText: 'Select eye, verbal, and motor responses.',
    primaryLabel: 'Pediatric GCS',
    primaryValue: (result) => `${result.score}/15`,
  },
};

export function HuntHessScaleCalculator({ onResultChange }) {
  return <NeurologyCalculator config={configBySlug['hunt-hess-scale']} onResultChange={onResultChange} />;
}

export function IchScoreCalculator({ onResultChange }) {
  return <NeurologyCalculator config={configBySlug['ich-score']} onResultChange={onResultChange} />;
}

export function FourScoreCalculator({ onResultChange }) {
  return <NeurologyCalculator config={configBySlug['four-score']} onResultChange={onResultChange} />;
}

export function ModifiedRankinScaleCalculator({ onResultChange }) {
  return <NeurologyCalculator config={configBySlug['modified-rankin-scale']} onResultChange={onResultChange} />;
}

export function NihssSummaryViewCalculator({ onResultChange }) {
  return <NeurologyCalculator config={configBySlug['nihss-summary-view']} onResultChange={onResultChange} />;
}

export function PediatricGcsCalculator({ onResultChange }) {
  return <NeurologyCalculator config={configBySlug['pediatric-gcs']} onResultChange={onResultChange} />;
}


import { useEffect, useRef, useState } from 'react';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS, getCalculatorSubIcon } from '../../navigation/iconRegistry';
import { CalcPanelTitle, ResultsPanelTitle, scrollResultsIntoView } from './calculatorPrimitives';
import {
  CRISIS_SENSITIVE_SAFETY_MESSAGE,
  PSYCHIATRY_SCREENING_SAFETY_DISCLAIMER,
  computeCageResult,
  computeColumbiaSuicideSeverityWorkflow,
  computeEpworthSleepinessResult,
  computeMdqResult,
  computeMmseResult,
  computeMocaPlaceholderWorkflow,
  computePcl5Result,
} from '../../utils/psychiatryScreeningCalculators';

const yesNoOptions = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

const pclOptions = [
  { value: '0', label: '0 - Not at all' },
  { value: '1', label: '1 - A little bit' },
  { value: '2', label: '2 - Moderately' },
  { value: '3', label: '3 - Quite a bit' },
  { value: '4', label: '4 - Extremely' },
];

const epworthOptions = [
  { value: '0', label: '0 - Would never doze' },
  { value: '1', label: '1 - Slight chance of dozing' },
  { value: '2', label: '2 - Moderate chance of dozing' },
  { value: '3', label: '3 - High chance of dozing' },
];

function scoreFields(prefix, count, labelPrefix, options) {
  return Array.from({ length: count }, (_, index) => ({
    name: `${prefix}${index + 1}`,
    label: `${labelPrefix} ${index + 1}`,
    type: 'select',
    options,
  }));
}

function Field({ config, field, value, onChange }) {
  const id = `${config.slug}-${field.name}`;
  return (
    <div className="calc-input-group">
      <label className="calc-input-label" htmlFor={id}>
        {field.label}
      </label>
      {field.type === 'select' ? (
        <select
          id={id}
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
      ) : (
        <input
          id={id}
          className="calc-input-field"
          type={field.type || 'number'}
          min={field.min}
          max={field.max}
          step={field.step || '1'}
          value={value}
          onChange={(event) => onChange(field.name, event.target.value)}
          inputMode="numeric"
        />
      )}
      {field.help ? <span className="calc-input-help">{field.help}</span> : null}
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

function ResultPanel({ config, result }) {
  const icon = getCalculatorSubIcon(config.slug);
  if (!result) {
    return (
      <div className="calc-results-empty" role="status">
        <div className="calc-results-empty-icon" aria-hidden>
          <NavIcon icon={icon} size={56} />
        </div>
        <p>{config.emptyText}</p>
      </div>
    );
  }

  return (
    <>
      {result.safetyAlert ? (
        <div className="calc-has-bled-anticoag-warning" role="alert">
          <strong>Safety review required</strong>
          <p>{result.safetyAlert}</p>
        </div>
      ) : null}
      <div className={`calc-score-display ${result.severity || 'normal'}`} role="status">
        <div className="calc-score-label">{config.primaryLabel}</div>
        <div className="calc-score-value">{result.score}</div>
        <div className="calc-score-interpretation">{result.label}</div>
      </div>
      <section
        className={`calc-interpretation-box ${result.severity || 'normal'}`}
        role="region"
        aria-labelledby={`${config.slug}-interpretation-heading`}
      >
        <h3 id={`${config.slug}-interpretation-heading`} className="calc-interpretation-title">
          Screening Interpretation
        </h3>
        <p>{result.interpretation}</p>
        <p className="calc-disclaimer-detail">{result.disclaimer}</p>
        <p className="calc-reference-line">{result.referenceLine}</p>
      </section>
      {result.components ? (
        <section className="calc-interpretation-box normal" role="region" aria-label="Component summary">
          <h3 className="calc-interpretation-title">Component Summary</h3>
          <ul className="calc-breakdown-list">
            {Object.entries(result.components).map(([key, value]) => (
              <li key={key}>
                <strong>{key.replace(/([A-Z])/g, ' $1')}:</strong> {String(value)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function PsychiatryScreeningCalculator({ config, onResultChange }) {
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

        <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
          <p className="calc-ds-lead">
            <strong>Mental-health screening only.</strong> Human clinical review is required.
          </p>
          <p className="calc-disclaimer-detail">{config.notice}</p>
          <p className="calc-disclaimer-detail">{PSYCHIATRY_SCREENING_SAFETY_DISCLAIMER}</p>
          <p className="calc-disclaimer-detail">{CRISIS_SENSITIVE_SAFETY_MESSAGE}</p>
        </div>

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
            {config.fields.map((field) => (
              <Field
                key={field.name}
                config={config}
                field={field}
                value={form[field.name]}
                onChange={update}
              />
            ))}
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
        aria-live={result?.severity === 'critical' ? 'assertive' : 'polite'}
        aria-label={`${config.title} results`}
      >
        <ResultsPanelTitle />
        <ResultPanel config={config} result={result} />
      </div>
    </div>
  );
}

const configBySlug = {
  cage: {
    slug: 'cage',
    title: 'CAGE Alcohol Screen',
    notice: 'Four-question alcohol screen. Does not diagnose alcohol use disorder or provide withdrawal-management advice.',
    initial: { cutDown: '', annoyed: '', guilty: '', eyeOpener: '' },
    fields: [
      { name: 'cutDown', label: 'Felt you should cut down drinking?', type: 'select', options: yesNoOptions },
      { name: 'annoyed', label: 'Annoyed by criticism of drinking?', type: 'select', options: yesNoOptions },
      { name: 'guilty', label: 'Felt bad or guilty about drinking?', type: 'select', options: yesNoOptions },
      { name: 'eyeOpener', label: 'Eye-opener drink first thing in the morning?', type: 'select', options: yesNoOptions },
    ],
    compute: computeCageResult,
    emptyText: 'Answer all four CAGE questions.',
    primaryLabel: 'CAGE score',
  },
  mmse: {
    slug: 'mmse',
    title: 'MMSE Score Entry',
    notice: 'Enter domain subtotals from a governed MMSE administration. This form does not administer the copyrighted instrument.',
    initial: {
      orientationTime: '',
      orientationPlace: '',
      registration: '',
      attentionCalculation: '',
      recall: '',
      language: '',
      visuospatial: '',
    },
    fields: [
      { name: 'orientationTime', label: 'Orientation to time (0-5)', min: 0, max: 5 },
      { name: 'orientationPlace', label: 'Orientation to place (0-5)', min: 0, max: 5 },
      { name: 'registration', label: 'Registration (0-3)', min: 0, max: 3 },
      { name: 'attentionCalculation', label: 'Attention/calculation (0-5)', min: 0, max: 5 },
      { name: 'recall', label: 'Recall (0-3)', min: 0, max: 3 },
      { name: 'language', label: 'Language (0-8)', min: 0, max: 8 },
      { name: 'visuospatial', label: 'Visuospatial copying (0-1)', min: 0, max: 1 },
    ],
    compute: computeMmseResult,
    emptyText: 'Enter MMSE domain scores from a governed administration.',
    primaryLabel: 'MMSE total',
  },
  'moca-placeholder-workflow': {
    slug: 'moca-placeholder-workflow',
    title: 'MoCA Placeholder Workflow',
    notice: 'Governance workflow only. Does not show MoCA items, administer MoCA, calculate MoCA score, or diagnose cognitive impairment.',
    initial: {
      officialFormAvailable: '',
      trainedAdministrator: '',
      accommodationsReviewed: '',
      humanReviewPlan: '',
    },
    fields: [
      { name: 'officialFormAvailable', label: 'Official MoCA form/version available?', type: 'select', options: yesNoOptions },
      { name: 'trainedAdministrator', label: 'Trained administrator available?', type: 'select', options: yesNoOptions },
      { name: 'accommodationsReviewed', label: 'Language, sensory, motor, and education context reviewed?', type: 'select', options: yesNoOptions },
      { name: 'humanReviewPlan', label: 'Clinician review plan documented?', type: 'select', options: yesNoOptions },
    ],
    compute: computeMocaPlaceholderWorkflow,
    emptyText: 'Confirm governed MoCA workflow prerequisites.',
    primaryLabel: 'MoCA workflow',
  },
  pcl5: {
    slug: 'pcl5',
    title: 'PCL-5 Score Entry',
    notice: 'PTSD symptom screening support only. Requires trauma-exposure context and clinician review.',
    initial: {
      eventCriterionReviewed: '',
      currentSafetyConcern: '',
      ...Object.fromEntries(scoreFields('q', 20, 'PCL-5 item', pclOptions).map((field) => [field.name, ''])),
    },
    fields: [
      { name: 'eventCriterionReviewed', label: 'Trauma exposure context reviewed?', type: 'select', options: yesNoOptions },
      { name: 'currentSafetyConcern', label: 'Current self-harm, suicidal ideation, or danger present?', type: 'select', options: yesNoOptions },
      ...scoreFields('q', 20, 'PCL-5 item', pclOptions),
    ],
    compute: computePcl5Result,
    emptyText: 'Enter all 20 PCL-5 item scores and safety context.',
    primaryLabel: 'PCL-5 total',
  },
  mdq: {
    slug: 'mdq',
    title: 'Mood Disorder Questionnaire (MDQ)',
    notice: 'Bipolar-spectrum screening support only. Does not diagnose mania, hypomania, bipolar disorder, or medication need.',
    initial: { symptomCount: '', samePeriod: '', impairment: '', urgentSafetyConcern: '' },
    fields: [
      { name: 'symptomCount', label: 'Yes symptoms (0-13)', min: 0, max: 13 },
      { name: 'samePeriod', label: 'Symptoms occurred during the same period?', type: 'select', options: yesNoOptions },
      {
        name: 'impairment',
        label: 'Functional impairment',
        type: 'select',
        options: [
          { value: 'none', label: 'No problem' },
          { value: 'minor', label: 'Minor problem' },
          { value: 'moderate', label: 'Moderate problem' },
          { value: 'serious', label: 'Serious problem' },
        ],
      },
      { name: 'urgentSafetyConcern', label: 'Psychosis, unsafe behavior, suicidal ideation, or danger present?', type: 'select', options: yesNoOptions },
    ],
    compute: computeMdqResult,
    emptyText: 'Enter MDQ summary fields and safety context.',
    primaryLabel: 'MDQ screen',
  },
  'epworth-sleepiness-scale': {
    slug: 'epworth-sleepiness-scale',
    title: 'Epworth Sleepiness Scale',
    notice: 'Daytime sleepiness screening support only. Does not diagnose sleep apnea, narcolepsy, or medication effects.',
    initial: {
      safetySensitiveActivity: '',
      ...Object.fromEntries(scoreFields('q', 8, 'Epworth situation', epworthOptions).map((field) => [field.name, ''])),
    },
    fields: [
      { name: 'safetySensitiveActivity', label: 'Sleepiness during driving, machinery, clinical duty, or other safety-sensitive activity?', type: 'select', options: yesNoOptions },
      ...scoreFields('q', 8, 'Epworth situation', epworthOptions),
    ],
    compute: computeEpworthSleepinessResult,
    emptyText: 'Enter all eight Epworth situation scores.',
    primaryLabel: 'Epworth total',
  },
  'columbia-suicide-severity-workflow': {
    slug: 'columbia-suicide-severity-workflow',
    title: 'Columbia Suicide Severity Workflow Entry',
    notice: 'Workflow routing support only. Does not administer or score the official C-SSRS and does not replace immediate safety assessment.',
    initial: { ideation: '', intentOrPlan: '', behavior: '', currentUnsafe: '', directHumanReview: '' },
    fields: [
      { name: 'ideation', label: 'Suicidal ideation disclosed?', type: 'select', options: yesNoOptions },
      { name: 'intentOrPlan', label: 'Intent or plan disclosed?', type: 'select', options: yesNoOptions },
      { name: 'behavior', label: 'Recent suicidal or preparatory behavior disclosed?', type: 'select', options: yesNoOptions },
      { name: 'currentUnsafe', label: 'Unable to maintain immediate safety?', type: 'select', options: yesNoOptions },
      { name: 'directHumanReview', label: 'Direct clinician/crisis review arranged?', type: 'select', options: yesNoOptions },
    ],
    compute: computeColumbiaSuicideSeverityWorkflow,
    emptyText: 'Enter suicide-safety workflow flags.',
    primaryLabel: 'Workflow status',
  },
};

export function CageCalculator({ onResultChange }) {
  return <PsychiatryScreeningCalculator config={configBySlug.cage} onResultChange={onResultChange} />;
}

export function MmseCalculator({ onResultChange }) {
  return <PsychiatryScreeningCalculator config={configBySlug.mmse} onResultChange={onResultChange} />;
}

export function MocaPlaceholderWorkflow({ onResultChange }) {
  return <PsychiatryScreeningCalculator config={configBySlug['moca-placeholder-workflow']} onResultChange={onResultChange} />;
}

export function Pcl5Calculator({ onResultChange }) {
  return <PsychiatryScreeningCalculator config={configBySlug.pcl5} onResultChange={onResultChange} />;
}

export function MdqCalculator({ onResultChange }) {
  return <PsychiatryScreeningCalculator config={configBySlug.mdq} onResultChange={onResultChange} />;
}

export function EpworthSleepinessScaleCalculator({ onResultChange }) {
  return <PsychiatryScreeningCalculator config={configBySlug['epworth-sleepiness-scale']} onResultChange={onResultChange} />;
}

export function ColumbiaSuicideSeverityWorkflow({ onResultChange }) {
  return <PsychiatryScreeningCalculator config={configBySlug['columbia-suicide-severity-workflow']} onResultChange={onResultChange} />;
}

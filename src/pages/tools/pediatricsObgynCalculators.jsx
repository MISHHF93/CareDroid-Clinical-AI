import { useEffect, useRef, useState } from 'react';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS, getCalculatorSubIcon } from '../../navigation/iconRegistry';
import {
  PEDIATRIC_DOSING_PLACEHOLDER_DISCLAIMER,
  PEDIATRICS_OBGYN_SAFETY_DISCLAIMER,
  computeFentonGrowthChartHelper,
  computeGestationalAge,
  computeNeonatalBilirubinRiskHelper,
  computePediatricBpPercentile,
  computePediatricDoseSafetyCheckerPlaceholder,
  computePregnancyDueDate,
} from '../../utils/pediatricsObgynCalculators';

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

function scrollResultsIntoView(el) {
  if (!el) return;
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.focus({ preventScroll: true });
  el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
}

function DecisionSupportNotice({ children, dosingPlaceholder = false }) {
  return (
    <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
      <p className="calc-ds-lead">
        <strong>Pediatric/OB decision support only.</strong> Use clinician review and local protocols.
      </p>
      <p className="calc-disclaimer-detail">{children}</p>
      <p className="calc-disclaimer-detail">
        {dosingPlaceholder ? PEDIATRIC_DOSING_PLACEHOLDER_DISCLAIMER : PEDIATRICS_OBGYN_SAFETY_DISCLAIMER}
      </p>
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

function Field({ slug, field, value, onChange }) {
  return (
    <div className="calc-input-group">
      <label className="calc-input-label" htmlFor={`${slug}-${field.name}`}>
        {field.label}
      </label>
      {field.type === 'select' ? (
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
      ) : (
        <input
          id={`${slug}-${field.name}`}
          className="calc-input-field"
          type={field.type || 'number'}
          min={field.min}
          max={field.max}
          step={field.step || 'any'}
          value={value}
          onChange={(event) => onChange(field.name, event.target.value)}
          inputMode={field.type === 'date' ? undefined : 'decimal'}
          placeholder={field.placeholder}
        />
      )}
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
        <div className="calc-score-value">{result.score}</div>
        <div className="calc-score-interpretation">{result.label}</div>
      </div>
      <section
        className={`calc-interpretation-box ${result.severity || 'normal'}`}
        role="region"
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
        <section className="calc-interpretation-box normal" role="region" aria-label="Component summary">
          <h3 className="calc-interpretation-title">Component Summary</h3>
          <ul className="calc-breakdown-list">
            {Object.entries(result.components).map(([key, value]) => (
              <li key={key}>
                <strong>{key.replace(/([A-Z])/g, ' $1')}:</strong>{' '}
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
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

function PediatricsObgynCalculator({ config, onResultChange }) {
  const icon = getCalculatorSubIcon(config.slug);
  const [form, setForm] = useState(config.initial);
  const [errors, setErrors] = useState([]);
  const [result, setResult] = useState(null);
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
        <DecisionSupportNotice dosingPlaceholder={config.dosingPlaceholder}>
          {config.notice}
        </DecisionSupportNotice>
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
                slug={config.slug}
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
        aria-live="polite"
        aria-label={`${config.title} results`}
      >
        <ResultsPanelTitle />
        <ResultPanel config={config} result={result} />
      </div>
    </div>
  );
}

const methodOptions = [
  { value: 'lmp', label: 'Last menstrual period (LMP)' },
  { value: 'conception', label: 'Conception / ovulation date' },
  { value: 'ultrasound', label: 'Ultrasound dating' },
];

const yesNoOptions = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

const configBySlug = {
  'gestational-age-calculator': {
    slug: 'gestational-age-calculator',
    title: 'Gestational Age Calculator',
    notice: 'Calculates gestational age from LMP, conception, or ultrasound dating. Confirm dating hierarchy with obstetric policy.',
    initial: {
      method: 'lmp',
      lmpDate: '',
      conceptionDate: '',
      ultrasoundDate: '',
      ultrasoundWeeks: '',
      ultrasoundDays: '0',
      asOfDate: '',
    },
    fields: [
      { name: 'method', label: 'Dating method', type: 'select', options: methodOptions },
      { name: 'lmpDate', label: 'LMP date', type: 'date' },
      { name: 'conceptionDate', label: 'Conception / ovulation date', type: 'date' },
      { name: 'ultrasoundDate', label: 'Ultrasound date', type: 'date' },
      { name: 'ultrasoundWeeks', label: 'Ultrasound GA weeks', min: 4, max: 42, step: '1' },
      { name: 'ultrasoundDays', label: 'Ultrasound GA days', min: 0, max: 6, step: '1' },
      { name: 'asOfDate', label: 'Assessment date', type: 'date' },
    ],
    compute: computeGestationalAge,
    emptyText: 'Enter a dating anchor and assessment date.',
    primaryLabel: 'Gestational age',
  },
  'pregnancy-due-date-calculator': {
    slug: 'pregnancy-due-date-calculator',
    title: 'Pregnancy Due Date Calculator',
    notice: 'Estimates due date for documentation. Confirm against ACOG dating criteria and local workflow.',
    initial: {
      method: 'lmp',
      lmpDate: '',
      conceptionDate: '',
      ultrasoundDate: '',
      ultrasoundWeeks: '',
      ultrasoundDays: '0',
    },
    fields: [
      { name: 'method', label: 'Dating method', type: 'select', options: methodOptions },
      { name: 'lmpDate', label: 'LMP date', type: 'date' },
      { name: 'conceptionDate', label: 'Conception / ovulation date', type: 'date' },
      { name: 'ultrasoundDate', label: 'Ultrasound date', type: 'date' },
      { name: 'ultrasoundWeeks', label: 'Ultrasound GA weeks', min: 4, max: 42, step: '1' },
      { name: 'ultrasoundDays', label: 'Ultrasound GA days', min: 0, max: 6, step: '1' },
    ],
    compute: computePregnancyDueDate,
    emptyText: 'Enter LMP, conception, or ultrasound dating details.',
    primaryLabel: 'Estimated due date',
  },
  'pediatric-bp-percentile': {
    slug: 'pediatric-bp-percentile',
    title: 'Pediatric BP Percentile',
    notice: 'Screening-band support only. Confirm with correct cuff, repeat manual readings, and AAP source tables.',
    initial: { ageYears: '', sex: '', systolic: '', diastolic: '' },
    fields: [
      { name: 'ageYears', label: 'Age (years)', min: 1, max: 17, step: '1' },
      {
        name: 'sex',
        label: 'Sex assigned at birth for source-table context',
        type: 'select',
        options: [
          { value: 'female', label: 'Female' },
          { value: 'male', label: 'Male' },
        ],
      },
      { name: 'systolic', label: 'Systolic BP (mmHg)', min: 40, max: 260, step: '1' },
      { name: 'diastolic', label: 'Diastolic BP (mmHg)', min: 20, max: 160, step: '1' },
    ],
    compute: computePediatricBpPercentile,
    emptyText: 'Enter age, sex, systolic BP, and diastolic BP.',
    primaryLabel: 'BP band',
  },
  'fenton-growth-chart-helper': {
    slug: 'fenton-growth-chart-helper',
    title: 'Fenton Growth Chart Helper',
    notice: 'Classifies already-derived Fenton percentiles. Use official charts and neonatal review for decisions.',
    initial: {
      gestationalAgeWeeks: '',
      weightPercentile: '',
      lengthPercentile: '',
      headCircumferencePercentile: '',
    },
    fields: [
      { name: 'gestationalAgeWeeks', label: 'Gestational/postmenstrual age (weeks)', min: 22, max: 50 },
      { name: 'weightPercentile', label: 'Weight percentile from source chart', min: 0, max: 100 },
      { name: 'lengthPercentile', label: 'Length percentile from source chart', min: 0, max: 100 },
      {
        name: 'headCircumferencePercentile',
        label: 'Head circumference percentile from source chart',
        min: 0,
        max: 100,
      },
    ],
    compute: computeFentonGrowthChartHelper,
    emptyText: 'Enter gestational age and percentiles from the source Fenton chart.',
    primaryLabel: 'Growth band',
  },
  'neonatal-bilirubin-risk-helper': {
    slug: 'neonatal-bilirubin-risk-helper',
    title: 'Neonatal Bilirubin Risk Helper',
    notice: 'Prompts AAP 2022 nomogram review. Does not recommend phototherapy, exchange transfusion, or disposition.',
    initial: { ageHours: '', bilirubin: '', gestationalAgeWeeks: '', neurotoxicityRiskFactors: '' },
    fields: [
      { name: 'ageHours', label: 'Age at bilirubin measurement (hours)', min: 0, max: 336 },
      { name: 'bilirubin', label: 'Total bilirubin (mg/dL)', min: 0, max: 50 },
      { name: 'gestationalAgeWeeks', label: 'Gestational age at birth (weeks)', min: 35, max: 44 },
      {
        name: 'neurotoxicityRiskFactors',
        label: 'Neurotoxicity risk factors present',
        type: 'select',
        options: yesNoOptions,
      },
    ],
    compute: computeNeonatalBilirubinRiskHelper,
    emptyText: 'Enter bilirubin, age in hours, gestational age, and risk-factor status.',
    primaryLabel: 'Bilirubin review',
  },
  'pediatric-dose-safety-checker': {
    slug: 'pediatric-dose-safety-checker',
    title: 'Pediatric Dose Safety Checker',
    notice: 'Placeholder only: this form documents safety checks and blocks patient-specific dose calculation.',
    dosingPlaceholder: true,
    initial: { medicationName: '', weightKg: '', governedProtocol: '' },
    fields: [
      { name: 'medicationName', label: 'Medication or class', type: 'text', placeholder: 'e.g. antibiotic, analgesic' },
      { name: 'weightKg', label: 'Weight (kg)', min: 0, max: 250 },
      {
        name: 'governedProtocol',
        label: 'Governed institutional protocol available',
        type: 'select',
        options: yesNoOptions,
      },
    ],
    compute: computePediatricDoseSafetyCheckerPlaceholder,
    emptyText: 'Enter medication context and weight to view safety-check prompts. No dose will be calculated.',
    primaryLabel: 'Dose safety status',
  },
};

export function GestationalAgeCalculator({ onResultChange }) {
  return <PediatricsObgynCalculator config={configBySlug['gestational-age-calculator']} onResultChange={onResultChange} />;
}

export function PregnancyDueDateCalculator({ onResultChange }) {
  return <PediatricsObgynCalculator config={configBySlug['pregnancy-due-date-calculator']} onResultChange={onResultChange} />;
}

export function PediatricBpPercentileCalculator({ onResultChange }) {
  return <PediatricsObgynCalculator config={configBySlug['pediatric-bp-percentile']} onResultChange={onResultChange} />;
}

export function FentonGrowthChartHelper({ onResultChange }) {
  return <PediatricsObgynCalculator config={configBySlug['fenton-growth-chart-helper']} onResultChange={onResultChange} />;
}

export function NeonatalBilirubinRiskHelper({ onResultChange }) {
  return <PediatricsObgynCalculator config={configBySlug['neonatal-bilirubin-risk-helper']} onResultChange={onResultChange} />;
}

export function PediatricDoseSafetyChecker({ onResultChange }) {
  return <PediatricsObgynCalculator config={configBySlug['pediatric-dose-safety-checker']} onResultChange={onResultChange} />;
}

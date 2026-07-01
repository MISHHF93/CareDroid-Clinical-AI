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

const PEDIATRIC_EMERGENCY_DRUGS = Object.freeze([
  {
    name: 'Adrenaline / Epinephrine',
    indication: 'Cardiac arrest IV/IO',
    doseText: '0.01 mg/kg of 1:10,000',
    calc: (kg) => `${roundDose(0.01 * kg, 2)} mg (${roundDose(0.1 * kg, 2)} mL of 0.1 mg/mL)`,
    risk: 'critical',
  },
  {
    name: 'Atropine',
    indication: 'Symptomatic bradycardia',
    doseText: '0.02 mg/kg; min 0.1 mg, max 0.5 mg child',
    calc: (kg) => `${roundDose(Math.min(Math.max(0.02 * kg, 0.1), 0.5), 2)} mg`,
    risk: 'high',
  },
  {
    name: 'Adenosine',
    indication: 'SVT first / second dose',
    doseText: '0.1 mg/kg max 6 mg; then 0.2 mg/kg max 12 mg',
    calc: (kg) =>
      `${roundDose(Math.min(0.1 * kg, 6), 1)} mg, then ${roundDose(Math.min(0.2 * kg, 12), 1)} mg`,
    risk: 'high',
  },
  {
    name: 'Amiodarone',
    indication: 'Refractory VF/pulseless VT',
    doseText: '5 mg/kg IV/IO; max 300 mg',
    calc: (kg) => `${roundDose(Math.min(5 * kg, 300), 0)} mg`,
    risk: 'high',
  },
  {
    name: 'Glucose',
    indication: 'Hypoglycemia, D10W',
    doseText: 'D10W 5 mL/kg',
    calc: (kg) => `${roundDose(5 * kg, 0)} mL D10W`,
    risk: 'moderate',
  },
  {
    name: 'Mannitol',
    indication: 'Raised ICP reference range',
    doseText: '0.5-1 g/kg',
    calc: (kg) => `${roundDose(0.5 * kg, 1)}-${roundDose(1 * kg, 1)} g`,
    risk: 'high',
  },
  {
    name: 'Ketamine',
    indication: 'RSI induction reference range',
    doseText: '1-2 mg/kg IV',
    calc: (kg) => `${roundDose(1 * kg, 0)}-${roundDose(2 * kg, 0)} mg`,
    risk: 'critical',
  },
  {
    name: 'Rocuronium',
    indication: 'RSI paralysis reference',
    doseText: '1 mg/kg IV',
    calc: (kg) => `${roundDose(1 * kg, 0)} mg`,
    risk: 'critical',
  },
  {
    name: 'Suxamethonium / Succinylcholine',
    indication: 'RSI paralysis reference',
    doseText: '1-2 mg/kg IV',
    calc: (kg) => `${roundDose(1 * kg, 0)}-${roundDose(2 * kg, 0)} mg`,
    risk: 'critical',
  },
  {
    name: 'Fluid bolus',
    indication: 'Shock bolus reference',
    doseText: '10-20 mL/kg isotonic crystalloid',
    calc: (kg) => `${roundDose(10 * kg, 0)}-${roundDose(20 * kg, 0)} mL`,
    risk: 'moderate',
  },
]);

function roundDose(value, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function estimateWeightFromAge(ageValue, unit) {
  const age = Number(ageValue);
  if (!Number.isFinite(age) || age < 0) return null;
  if (unit === 'months') return Math.max(3, roundDose(0.5 * age + 4, 1));
  return Math.min(70, Math.max(8, roundDose(2 * (age + 4), 1)));
}

function PediatricEmergencyDrugCalculator({ onResultChange, patientContext = null as any }) {
  const patientAge = (patientContext as any)?.age;
  const [weightKg, setWeightKg] = useState('');
  const [age, setAge] = useState(patientAge !== null && patientAge !== undefined ? String(patientAge) : '');
  const [ageUnit, setAgeUnit] = useState('years');
  const [result, setResult] = useState<any>(null);
  const [errors, setErrors] = useState<any[]>([]);
  const resultsRef = useRef(null);

  useEffect(() => {
    onResultChange?.(result);
  }, [onResultChange, result]);

  useEffect(() => {
    if (result) scrollResultsIntoView(resultsRef.current);
  }, [result]);

  const calculate = () => {
    const enteredWeight = Number(weightKg);
    const estimatedWeight = estimateWeightFromAge(age, ageUnit);
    const effectiveWeight =
      Number.isFinite(enteredWeight) && enteredWeight > 0 ? enteredWeight : estimatedWeight;

    if (!effectiveWeight || !Number.isFinite(effectiveWeight) || effectiveWeight <= 0) {
      setErrors(['Enter weight in kg or age to estimate weight.']);
      setResult(null);
      return;
    }

    if (effectiveWeight < 2 || effectiveWeight > 80) {
      setErrors(['Weight must be between 2 and 80 kg for this ED quick-reference.']);
      setResult(null);
      return;
    }

    const source = Number.isFinite(enteredWeight) && enteredWeight > 0 ? 'entered weight' : 'age-estimated weight';
    const rows = PEDIATRIC_EMERGENCY_DRUGS.map((drug) => ({
      ...drug,
      calculatedDose: drug.calc(effectiveWeight),
    }));
    const nextResult = {
      score: `${roundDose(effectiveWeight, 1)} kg`,
      value: `${roundDose(effectiveWeight, 1)} kg`,
      label: 'Emergency drug reference generated',
      interpretation: `Pediatric emergency drug reference using ${source}. Verify local protocols, concentrations, max doses, contraindications, and independent double-check before administration.`,
      severity: rows.some((row) => row.risk === 'critical') ? 'critical' : 'warning',
      riskBand: 'High-alert medication reference',
      recommendation:
        'Use as a rapid ED reference only. Confirm dose, concentration, route, indication, allergies, renal/hepatic context, and local pediatric/PALS policy.',
      weightKg: roundDose(effectiveWeight, 1),
      source,
      rows,
    };
    setErrors([]);
    setResult(nextResult);
  };

  const reset = () => {
    setWeightKg('');
    setAge(patientAge !== null && patientAge !== undefined ? String(patientAge) : '');
    setAgeUnit('years');
    setResult(null);
    setErrors([]);
  };

  return (
    <div className="calculator-interface calculator-interface--pediatric-dose-safety-checker">
      <div className="calculator-inputs">
        <CalcPanelTitle icon={getCalculatorSubIcon('pediatric-dose-safety-checker')}>
          <span id="pediatric-dose-safety-checker-form-title">Pediatric Dose Safety Checker</span>
        </CalcPanelTitle>
        <DecisionSupportNotice>
          Weight-based ED reference for common pediatric emergency drugs. Prefer measured weight. If unavailable,
          age-estimated weight is a fallback and must be checked against local Broselow/length-based systems.
        </DecisionSupportNotice>
        <form
          className="calc-pr1-form"
          noValidate
          aria-labelledby="pediatric-dose-safety-checker-form-title"
          onSubmit={(event) => {
            event.preventDefault();
            calculate();
          }}
        >
          <ValidationErrors errors={errors} />
          <div className="calc-input-grid--responsive">
            <div className="calc-input-group">
              <label className="calc-input-label" htmlFor="peds-drug-weight">
                Weight (kg)
              </label>
              <input
                id="peds-drug-weight"
                className="calc-input-field"
                type="number"
                min="2"
                max="80"
                step="0.1"
                value={weightKg}
                onChange={(event) => setWeightKg(event.target.value)}
                inputMode="decimal"
                placeholder="Preferred"
              />
              <span className="calc-input-help">Use measured/resuscitation weight whenever available.</span>
            </div>
            <div className="calc-input-group">
              <label className="calc-input-label" htmlFor="peds-drug-age">
                Age if weight unavailable
              </label>
              <input
                id="peds-drug-age"
                className="calc-input-field"
                type="number"
                min="0"
                max="18"
                step="0.1"
                value={age}
                onChange={(event) => setAge(event.target.value)}
                inputMode="decimal"
              />
            </div>
            <div className="calc-input-group">
              <label className="calc-input-label" htmlFor="peds-drug-age-unit">
                Age unit
              </label>
              <select
                id="peds-drug-age-unit"
                className="calc-select-field"
                value={ageUnit}
                onChange={(event) => setAgeUnit(event.target.value)}
              >
                <option value="years">Years</option>
                <option value="months">Months</option>
              </select>
            </div>
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
        aria-label="Pediatric emergency drug calculator results"
      >
        <ResultsPanelTitle />
        {result ? (
          <>
            <div className={`calc-score-display ${result.severity}`} role="status">
              <div className="calc-score-label">Reference weight</div>
              <div className="calc-score-value">{result.weightKg} kg</div>
              <div className="calc-score-interpretation">{result.riskBand}</div>
            </div>
            <section className="calc-interpretation-box critical" role="region" aria-label="Safety warning">
              <h3 className="calc-interpretation-title">Independent Verification Required</h3>
              <p>{result.recommendation}</p>
            </section>
            <div className="pediatric-drug-reference-table" role="table" aria-label="Pediatric emergency drug reference">
              <div role="row" className="pediatric-drug-reference-table__header">
                <span role="columnheader">Drug</span>
                <span role="columnheader">Reference dose</span>
                <span role="columnheader">Calculated</span>
                <span role="columnheader">Risk</span>
              </div>
              {result.rows.map((row) => (
                <div
                  key={row.name}
                  role="row"
                  className={`pediatric-drug-reference-table__row pediatric-drug-reference-table__row--${row.risk}`}
                >
                  <span role="cell">
                    <strong>{row.name}</strong>
                    <small>{row.indication}</small>
                  </span>
                  <span role="cell">{row.doseText}</span>
                  <span role="cell">{row.calculatedDose}</span>
                  <span role="cell">{row.risk}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="calc-results-empty">
            <div className="calc-results-empty-icon" aria-hidden>
              <NavIcon icon={getCalculatorSubIcon('pediatric-dose-safety-checker')} size={56} />
            </div>
            <p>Enter weight or age to generate pediatric emergency drug and fluid bolus references.</p>
          </div>
        )}
      </div>
    </div>
  );
}

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
    notice: 'Weight-based ED reference for common pediatric emergency drugs.',
    dosingPlaceholder: false,
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
    compute: () => ({ ok: false, errors: ['Use the pediatric emergency drug calculator interface.'] }),
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

export function PediatricDoseSafetyChecker({ onResultChange, patientContext = null }) {
  return <PediatricEmergencyDrugCalculator onResultChange={onResultChange} patientContext={patientContext} />;
}

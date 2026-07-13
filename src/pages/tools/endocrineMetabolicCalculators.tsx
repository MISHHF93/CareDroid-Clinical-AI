import { useEffect, useRef, useState } from 'react';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS, getCalculatorSubIcon } from '../../navigation/iconRegistry';
import {
  CalcFieldValidationErrors,
  CalcPanelTitle,
  ConfigDrivenCalculatorField,
  ResultsPanelTitle,
  scrollResultsIntoView,
} from './calculatorPrimitives';
import {
  computeAdjustedBodyWeight,
  computeBsaMosteller,
  computeCorrectedCalcium,
  computeHomaIr,
  computeIdealBodyWeight,
  computeSerumOsmolality,
  computeWaistHipRatio,
} from '../../utils/endocrineMetabolicCalculators';

function DecisionSupportNotice({ children }) {
  return (
    <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
      <p className="calc-ds-lead">
        <strong>Decision support only.</strong> No insulin or medication dosing automation; follow local endocrine
        and metabolic protocols.
      </p>
      <p className="calc-disclaimer-detail">{children}</p>
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
      <p className="calc-result-safety-footer" role="note">
        Output reflects entered values and may omit important endocrine, metabolic, assay, nutrition, and acuity
        context.
      </p>
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

function EndocrineMetabolicCalculator({ config, onResultChange }) {
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
          <CalcFieldValidationErrors errors={errors} />
          <div className="calc-input-grid--responsive">
            {config.fields.map((field) => (
              <ConfigDrivenCalculatorField
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

const glucoseUnitOptions = [
  { value: 'mg_dl', label: 'mg/dL' },
  { value: 'mmol_l', label: 'mmol/L' },
];

const bunUnitOptions = [
  { value: 'mg_dl', label: 'BUN mg/dL' },
  { value: 'mmol_l_urea', label: 'Urea mmol/L' },
];

const weightUnitOptions = [
  { value: 'kg', label: 'kg' },
  { value: 'lb', label: 'lb' },
];

const heightUnitOptions = [
  { value: 'cm', label: 'cm' },
  { value: 'in', label: 'inches' },
];

const sexOptions = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
];

const CONFIGS = {
  'homa-ir': {
    slug: 'homa-ir',
    title: 'HOMA-IR',
    notice: 'Insulin resistance estimate only; does not diagnose diabetes or recommend insulin or medication changes.',
    initial: { fastingGlucose: '', glucoseUnit: 'mg_dl', fastingInsulinUiuMl: '' },
    fields: [
      { name: 'fastingGlucose', label: 'Fasting glucose', min: 20, max: 2000 },
      { name: 'glucoseUnit', label: 'Glucose unit', type: 'select', options: glucoseUnitOptions },
      { name: 'fastingInsulinUiuMl', label: 'Fasting insulin (uIU/mL)', min: 0.2, max: 300 },
    ],
    compute: computeHomaIr,
    emptyText: 'Enter fasting glucose and fasting insulin to estimate HOMA-IR.',
    primaryLabel: 'HOMA-IR',
    primaryValue: (result) => `${result.homaIr}`,
  },
  'corrected-calcium': {
    slug: 'corrected-calcium',
    title: 'Corrected Calcium',
    notice: 'Albumin correction support only; ionized calcium and clinical context may be needed.',
    initial: { calcium: '', calciumUnit: 'mg_dl', albumin: '', albuminUnit: 'g_dl' },
    fields: [
      { name: 'calcium', label: 'Measured total calcium', min: 1, max: 20 },
      {
        name: 'calciumUnit',
        label: 'Calcium unit',
        type: 'select',
        options: [
          { value: 'mg_dl', label: 'mg/dL' },
          { value: 'mmol_l', label: 'mmol/L' },
        ],
      },
      { name: 'albumin', label: 'Albumin', min: 1, max: 60 },
      {
        name: 'albuminUnit',
        label: 'Albumin unit',
        type: 'select',
        options: [
          { value: 'g_dl', label: 'g/dL' },
          { value: 'g_l', label: 'g/L' },
        ],
      },
    ],
    compute: computeCorrectedCalcium,
    emptyText: 'Enter total calcium and albumin to calculate corrected calcium.',
    primaryLabel: 'Corrected calcium',
    primaryValue: (result) => `${result.correctedCalciumMgDl} mg/dL`,
  },
  'serum-osmolality': {
    slug: 'serum-osmolality',
    title: 'Serum Osmolality',
    notice: 'Calculated osmolality support only; compare with measured osmolality and tonicity when available.',
    initial: { sodium: '', glucose: '', glucoseUnit: 'mg_dl', bun: '', bunUnit: 'mg_dl', ethanol: '0', ethanolUnit: 'mg_dl' },
    fields: [
      { name: 'sodium', label: 'Sodium (mEq/L)', min: 90, max: 190 },
      { name: 'glucose', label: 'Glucose', min: 20, max: 2000 },
      { name: 'glucoseUnit', label: 'Glucose unit', type: 'select', options: glucoseUnitOptions },
      { name: 'bun', label: 'BUN / serum urea', min: 1, max: 300 },
      { name: 'bunUnit', label: 'BUN / urea unit', type: 'select', options: bunUnitOptions },
      { name: 'ethanol', label: 'Ethanol (optional)', min: 0, max: 600 },
      { name: 'ethanolUnit', label: 'Ethanol unit', type: 'select', options: glucoseUnitOptions },
    ],
    compute: computeSerumOsmolality,
    emptyText: 'Enter chemistry values to calculate serum osmolality.',
    primaryLabel: 'Calculated osmolality',
    primaryValue: (result) => `${result.calculatedOsmolality} mOsm/kg`,
  },
  bsa: {
    slug: 'bsa',
    title: 'Body Surface Area',
    notice: 'Mosteller BSA estimate only; does not recommend medication or chemotherapy dosing.',
    initial: { weight: '', weightUnit: 'kg', height: '', heightUnit: 'cm' },
    fields: [
      { name: 'weight', label: 'Weight', min: 1, max: 800 },
      { name: 'weightUnit', label: 'Weight unit', type: 'select', options: weightUnitOptions },
      { name: 'height', label: 'Height', min: 20, max: 100 },
      { name: 'heightUnit', label: 'Height unit', type: 'select', options: heightUnitOptions },
    ],
    compute: computeBsaMosteller,
    emptyText: 'Enter height and weight to estimate body surface area.',
    primaryLabel: 'BSA',
    primaryValue: (result) => `${result.bsaM2} m2`,
  },
  'ideal-body-weight': {
    slug: 'ideal-body-weight',
    title: 'Ideal Body Weight',
    notice: 'Devine IBW estimate only; not a health target or medication dosing recommendation.',
    initial: { sex: '', height: '', heightUnit: 'cm' },
    fields: [
      { name: 'sex', label: 'Sex', type: 'select', options: sexOptions },
      { name: 'height', label: 'Height', min: 48, max: 96 },
      { name: 'heightUnit', label: 'Height unit', type: 'select', options: heightUnitOptions },
    ],
    compute: computeIdealBodyWeight,
    emptyText: 'Enter sex and height to estimate ideal body weight.',
    primaryLabel: 'IBW',
    primaryValue: (result) => `${result.idealBodyWeightKg} kg`,
  },
  'adjusted-body-weight': {
    slug: 'adjusted-body-weight',
    title: 'Adjusted Body Weight',
    notice: 'Adjusted body weight estimate only; not medication, insulin, nutrition, or fluid dosing automation.',
    initial: { sex: '', height: '', heightUnit: 'cm', actualWeight: '', weightUnit: 'kg', correctionFactor: '0.4' },
    fields: [
      { name: 'sex', label: 'Sex', type: 'select', options: sexOptions },
      { name: 'height', label: 'Height', min: 48, max: 96 },
      { name: 'heightUnit', label: 'Height unit', type: 'select', options: heightUnitOptions },
      { name: 'actualWeight', label: 'Actual weight', min: 1, max: 800 },
      { name: 'weightUnit', label: 'Weight unit', type: 'select', options: weightUnitOptions },
      {
        name: 'correctionFactor',
        label: 'Correction factor',
        type: 'select',
        options: [
          { value: '0.4', label: '0.4 common convention' },
          { value: '0.3', label: '0.3 protocol-specific' },
          { value: '0.25', label: '0.25 protocol-specific' },
        ],
      },
    ],
    compute: computeAdjustedBodyWeight,
    emptyText: 'Enter sex, height, actual weight, and correction factor to estimate adjusted body weight.',
    primaryLabel: 'AdjBW',
    primaryValue: (result) => `${result.adjustedBodyWeightKg} kg`,
  },
  'waist-hip-ratio': {
    slug: 'waist-hip-ratio',
    title: 'Waist-to-Hip Ratio',
    notice: 'Central adiposity pattern support only; does not diagnose cardiometabolic disease.',
    initial: { sex: '', waist: '', hip: '' },
    fields: [
      { name: 'sex', label: 'Sex', type: 'select', options: sexOptions },
      { name: 'waist', label: 'Waist circumference', min: 20, max: 250, help: 'Use the same unit as hip.' },
      { name: 'hip', label: 'Hip circumference', min: 20, max: 250, help: 'Use the same unit as waist.' },
    ],
    compute: computeWaistHipRatio,
    emptyText: 'Enter waist and hip circumferences to calculate the ratio.',
    primaryLabel: 'Waist-to-hip ratio',
    primaryValue: (result) => `${result.waistHipRatio}`,
  },
};

export function HomaIrCalculator({ onResultChange }) {
  return <EndocrineMetabolicCalculator config={CONFIGS['homa-ir']} onResultChange={onResultChange} />;
}

export function CorrectedCalciumCalculator({ onResultChange }) {
  return <EndocrineMetabolicCalculator config={CONFIGS['corrected-calcium']} onResultChange={onResultChange} />;
}

export function SerumOsmolalityCalculator({ onResultChange }) {
  return <EndocrineMetabolicCalculator config={CONFIGS['serum-osmolality']} onResultChange={onResultChange} />;
}

export function BsaCalculator({ onResultChange }) {
  return <EndocrineMetabolicCalculator config={CONFIGS.bsa} onResultChange={onResultChange} />;
}

export function IdealBodyWeightCalculator({ onResultChange }) {
  return <EndocrineMetabolicCalculator config={CONFIGS['ideal-body-weight']} onResultChange={onResultChange} />;
}

export function AdjustedBodyWeightCalculator({ onResultChange }) {
  return <EndocrineMetabolicCalculator config={CONFIGS['adjusted-body-weight']} onResultChange={onResultChange} />;
}

export function WaistHipRatioCalculator({ onResultChange }) {
  return <EndocrineMetabolicCalculator config={CONFIGS['waist-hip-ratio']} onResultChange={onResultChange} />;
}

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
  computeBunCreatinineRatio,
  computeCorrectedSodium,
  computeCreatinineClearanceCockcroftGault,
  computeEgfrCkdEpi2021,
  computeFeNa,
  computeFeUrea,
  computeFreeWaterDeficit,
  computeKfre4Variable,
  computeOsmolalGap,
} from '../../utils/nephrologyCalculators';

function DecisionSupportNotice({ children }) {
  return (
    <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
      <p className="calc-ds-lead">
        <strong>Decision support only.</strong> Does not diagnose, prescribe fluids, initiate dialysis, or automate
        medication dosing; follow local protocols.
      </p>
      <p className="calc-disclaimer-detail">{children}</p>
    </div>
  );
}

function ResultPanel({ slug, result, emptyText, primaryLabel, primaryValue }) {
  const icon = getCalculatorSubIcon(slug);
  return result ? (
    <>
      <div className={`calc-score-display ${result.severity || 'normal'}`} role="status">
        <div className="calc-score-label">{primaryLabel}</div>
        <div className="calc-score-value">{primaryValue}</div>
        <div className="calc-score-interpretation">{result.label}</div>
      </div>
      <section
        className={`calc-interpretation-box ${result.severity || 'normal'}`}
        role="region"
        aria-labelledby={`${slug}-interpretation-heading`}
      >
        <h3 id={`${slug}-interpretation-heading`} className="calc-interpretation-title">
          Interpretation
        </h3>
        <p>{result.interpretation}</p>
        <p className="calc-disclaimer-detail">{result.disclaimer}</p>
        <p className="calc-reference-line">{result.referenceLine}</p>
      </section>
      <p className="calc-result-safety-footer" role="note">
        Output reflects entered values and may omit important renal, volume, toxicology, and critical-care context.
      </p>
    </>
  ) : (
    <div className="calc-results-empty">
      <div className="calc-results-empty-icon" aria-hidden>
        <NavIcon icon={icon} size={56} />
      </div>
      <p>{emptyText}</p>
    </div>
  );
}

function NephrologyCalculator({ config, onResultChange }) {
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
        <ResultPanel
          slug={config.slug}
          result={result}
          emptyText={config.emptyText}
          primaryLabel={config.primaryLabel}
          primaryValue={result ? config.primaryValue(result) : ''}
        />
      </div>
    </div>
  );
}

const sexOptions = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
];

const creatinineUnitOptions = [
  { value: 'mg_dl', label: 'mg/dL' },
  { value: 'umol_l', label: 'umol/L' },
];

const glucoseUnitOptions = [
  { value: 'mg_dl', label: 'mg/dL' },
  { value: 'mmol_l', label: 'mmol/L' },
];

const bunUnitOptions = [
  { value: 'mg_dl', label: 'BUN mg/dL' },
  { value: 'mmol_l_urea', label: 'Urea mmol/L' },
];

const CONFIGS = {
  'egfr-ckd-epi': {
    slug: 'egfr-ckd-epi',
    title: 'eGFR CKD-EPI 2021',
    notice: 'Race-free eGFR estimate only; does not diagnose AKI/CKD or automate renal medication dosing.',
    initial: { ageYears: '', sex: '', serumCreatinine: '', creatinineUnit: 'mg_dl' },
    fields: [
      { name: 'ageYears', label: 'Age (years)', min: 18, max: 120 },
      { name: 'sex', label: 'Sex', type: 'select', options: sexOptions },
      { name: 'serumCreatinine', label: 'Serum creatinine', min: 0.2, max: 25 },
      { name: 'creatinineUnit', label: 'Creatinine unit', type: 'select', options: creatinineUnitOptions },
    ],
    compute: computeEgfrCkdEpi2021,
    emptyText: 'Enter age, sex, and creatinine to estimate eGFR.',
    primaryLabel: 'eGFR',
    primaryValue: (result) => `${result.egfrMlMin173} mL/min/1.73 m2`,
  },
  'creatinine-clearance-cg': {
    slug: 'creatinine-clearance-cg',
    title: 'Creatinine Clearance Cockcroft-Gault',
    notice: 'Creatinine clearance estimate only; verify weight selection and do not use as automated dosing advice.',
    initial: { ageYears: '', sex: '', weightKg: '', serumCreatinine: '', creatinineUnit: 'mg_dl' },
    fields: [
      { name: 'ageYears', label: 'Age (years)', min: 18, max: 120 },
      { name: 'sex', label: 'Sex', type: 'select', options: sexOptions },
      { name: 'weightKg', label: 'Weight used for equation (kg)', min: 20, max: 350 },
      { name: 'serumCreatinine', label: 'Serum creatinine', min: 0.2, max: 25 },
      { name: 'creatinineUnit', label: 'Creatinine unit', type: 'select', options: creatinineUnitOptions },
    ],
    compute: computeCreatinineClearanceCockcroftGault,
    emptyText: 'Enter age, sex, weight, and creatinine to estimate creatinine clearance.',
    primaryLabel: 'CrCl',
    primaryValue: (result) => `${result.creatinineClearanceMlMin} mL/min`,
  },
  fena: {
    slug: 'fena',
    title: 'Fractional Excretion of Sodium (FeNa)',
    notice: 'Urine electrolyte pattern support only; thresholds are unreliable in many AKI contexts.',
    initial: {
      serumSodium: '',
      urineSodium: '',
      serumCreatinine: '',
      serumCreatinineUnit: 'mg_dl',
      urineCreatinine: '',
      urineCreatinineUnit: 'mg_dl',
    },
    fields: [
      { name: 'serumSodium', label: 'Serum sodium (mEq/L)', min: 90, max: 190 },
      { name: 'urineSodium', label: 'Urine sodium (mEq/L)', min: 0, max: 300 },
      { name: 'serumCreatinine', label: 'Serum creatinine', min: 0.2, max: 25 },
      { name: 'serumCreatinineUnit', label: 'Serum creatinine unit', type: 'select', options: creatinineUnitOptions },
      { name: 'urineCreatinine', label: 'Urine creatinine', min: 1, max: 5000 },
      { name: 'urineCreatinineUnit', label: 'Urine creatinine unit', type: 'select', options: creatinineUnitOptions },
    ],
    compute: computeFeNa,
    emptyText: 'Enter serum and urine sodium/creatinine to calculate FeNa.',
    primaryLabel: 'FeNa',
    primaryValue: (result) => `${result.fractionalExcretionPct}%`,
  },
  feurea: {
    slug: 'feurea',
    title: 'Fractional Excretion of Urea (FeUrea)',
    notice: 'Urine urea pattern support only; use with timing, diuretics, and clinical context.',
    initial: {
      bun: '',
      bunUnit: 'mg_dl',
      urineUreaNitrogen: '',
      urineUreaUnit: 'mg_dl',
      serumCreatinine: '',
      serumCreatinineUnit: 'mg_dl',
      urineCreatinine: '',
      urineCreatinineUnit: 'mg_dl',
    },
    fields: [
      { name: 'bun', label: 'BUN / serum urea', min: 1, max: 300 },
      { name: 'bunUnit', label: 'BUN / urea unit', type: 'select', options: bunUnitOptions },
      { name: 'urineUreaNitrogen', label: 'Urine urea nitrogen', min: 1, max: 5000 },
      { name: 'urineUreaUnit', label: 'Urine urea unit', type: 'select', options: bunUnitOptions },
      { name: 'serumCreatinine', label: 'Serum creatinine', min: 0.2, max: 25 },
      { name: 'serumCreatinineUnit', label: 'Serum creatinine unit', type: 'select', options: creatinineUnitOptions },
      { name: 'urineCreatinine', label: 'Urine creatinine', min: 1, max: 5000 },
      { name: 'urineCreatinineUnit', label: 'Urine creatinine unit', type: 'select', options: creatinineUnitOptions },
    ],
    compute: computeFeUrea,
    emptyText: 'Enter serum and urine urea/creatinine values to calculate FeUrea.',
    primaryLabel: 'FeUrea',
    primaryValue: (result) => `${result.fractionalExcretionPct}%`,
  },
  kfre: {
    slug: 'kfre',
    title: 'Kidney Failure Risk Equation',
    notice: 'CKD risk estimation only; does not recommend nephrology referral timing, transplant referral, or dialysis.',
    initial: { ageYears: '', sex: '', egfrMlMin173: '', acrMgG: '' },
    fields: [
      { name: 'ageYears', label: 'Age (years)', min: 18, max: 120 },
      { name: 'sex', label: 'Sex', type: 'select', options: sexOptions },
      { name: 'egfrMlMin173', label: 'eGFR (mL/min/1.73 m2)', min: 1, max: 120 },
      { name: 'acrMgG', label: 'Urine ACR (mg/g)', min: 0.1, max: 10000 },
    ],
    compute: computeKfre4Variable,
    emptyText: 'Enter age, sex, eGFR, and ACR to estimate kidney failure risk.',
    primaryLabel: '5-year risk',
    primaryValue: (result) => `${result.fiveYearRiskPct}%`,
  },
  'bun-creatinine-ratio': {
    slug: 'bun-creatinine-ratio',
    title: 'BUN/Creatinine Ratio',
    notice: 'Nonspecific azotemia pattern support only; does not diagnose volume depletion or GI bleeding.',
    initial: { bun: '', bunUnit: 'mg_dl', serumCreatinine: '', creatinineUnit: 'mg_dl' },
    fields: [
      { name: 'bun', label: 'BUN / serum urea', min: 1, max: 300 },
      { name: 'bunUnit', label: 'BUN / urea unit', type: 'select', options: bunUnitOptions },
      { name: 'serumCreatinine', label: 'Serum creatinine', min: 0.2, max: 25 },
      { name: 'creatinineUnit', label: 'Creatinine unit', type: 'select', options: creatinineUnitOptions },
    ],
    compute: computeBunCreatinineRatio,
    emptyText: 'Enter BUN and creatinine to calculate the ratio.',
    primaryLabel: 'BUN/Cr',
    primaryValue: (result) => `${result.ratio}:1`,
  },
  'corrected-sodium': {
    slug: 'corrected-sodium',
    title: 'Corrected Sodium',
    notice: 'Hyperglycemia correction support only; does not recommend sodium correction strategy.',
    initial: { sodium: '', glucose: '', glucoseUnit: 'mg_dl', correctionFactor: '1.6' },
    fields: [
      { name: 'sodium', label: 'Measured sodium (mEq/L)', min: 90, max: 190 },
      { name: 'glucose', label: 'Glucose', min: 20, max: 2000 },
      { name: 'glucoseUnit', label: 'Glucose unit', type: 'select', options: glucoseUnitOptions },
      {
        name: 'correctionFactor',
        label: 'Correction factor per 100 mg/dL',
        type: 'select',
        options: [
          { value: '1.6', label: '1.6 mEq/L' },
          { value: '2.4', label: '2.4 mEq/L' },
        ],
      },
    ],
    compute: computeCorrectedSodium,
    emptyText: 'Enter measured sodium and glucose to calculate corrected sodium.',
    primaryLabel: 'Corrected Na',
    primaryValue: (result) => `${result.correctedSodium} mEq/L`,
  },
  'free-water-deficit': {
    slug: 'free-water-deficit',
    title: 'Free Water Deficit',
    notice: 'Volume estimate only; does not prescribe fluid type, route, rate, or monitoring interval.',
    initial: { sodium: '', weightKg: '', tbwFactor: '', targetSodium: '140' },
    fields: [
      { name: 'sodium', label: 'Serum sodium (mEq/L)', min: 120, max: 190 },
      { name: 'weightKg', label: 'Weight (kg)', min: 1, max: 350 },
      {
        name: 'tbwFactor',
        label: 'Total body water factor',
        type: 'select',
        options: [
          { value: '0.6', label: '0.60 adult male estimate' },
          { value: '0.5', label: '0.50 adult female / older male estimate' },
          { value: '0.45', label: '0.45 older female estimate' },
          { value: '0.4', label: '0.40 low lean mass estimate' },
        ],
      },
      { name: 'targetSodium', label: 'Target sodium for estimate (mEq/L)', min: 130, max: 145 },
    ],
    compute: computeFreeWaterDeficit,
    emptyText: 'Enter sodium, weight, and TBW factor to estimate free water deficit.',
    primaryLabel: 'Water deficit',
    primaryValue: (result) => `${result.deficitLiters} L`,
  },
  'osmolal-gap': {
    slug: 'osmolal-gap',
    title: 'Osmolal Gap',
    notice: 'Toxicology and acid-base context only; does not diagnose toxic alcohol ingestion or recommend treatment.',
    initial: {
      sodium: '',
      glucose: '',
      glucoseUnit: 'mg_dl',
      bun: '',
      bunUnit: 'mg_dl',
      ethanol: '0',
      ethanolUnit: 'mg_dl',
      measuredOsmolality: '',
    },
    fields: [
      { name: 'sodium', label: 'Sodium (mEq/L)', min: 90, max: 190 },
      { name: 'glucose', label: 'Glucose', min: 20, max: 2000 },
      { name: 'glucoseUnit', label: 'Glucose unit', type: 'select', options: glucoseUnitOptions },
      { name: 'bun', label: 'BUN / serum urea', min: 1, max: 300 },
      { name: 'bunUnit', label: 'BUN / urea unit', type: 'select', options: bunUnitOptions },
      { name: 'ethanol', label: 'Ethanol (optional)', min: 0, max: 600 },
      { name: 'ethanolUnit', label: 'Ethanol unit', type: 'select', options: glucoseUnitOptions },
      { name: 'measuredOsmolality', label: 'Measured osmolality (mOsm/kg)', min: 200, max: 450 },
    ],
    compute: computeOsmolalGap,
    emptyText: 'Enter measured osmolality and chemistry values to calculate the osmolal gap.',
    primaryLabel: 'Osmolal gap',
    primaryValue: (result) => `${result.osmolalGap} mOsm/kg`,
  },
};

export function EgfrCkdEpiCalculator({ onResultChange }) {
  return <NephrologyCalculator config={CONFIGS['egfr-ckd-epi']} onResultChange={onResultChange} />;
}

export function CreatinineClearanceCgCalculator({ onResultChange }) {
  return <NephrologyCalculator config={CONFIGS['creatinine-clearance-cg']} onResultChange={onResultChange} />;
}

export function FeNaCalculator({ onResultChange }) {
  return <NephrologyCalculator config={CONFIGS.fena} onResultChange={onResultChange} />;
}

export function FeUreaCalculator({ onResultChange }) {
  return <NephrologyCalculator config={CONFIGS.feurea} onResultChange={onResultChange} />;
}

export function KfreCalculator({ onResultChange }) {
  return <NephrologyCalculator config={CONFIGS.kfre} onResultChange={onResultChange} />;
}

export function BunCreatinineRatioCalculator({ onResultChange }) {
  return <NephrologyCalculator config={CONFIGS['bun-creatinine-ratio']} onResultChange={onResultChange} />;
}

export function CorrectedSodiumCalculator({ onResultChange }) {
  return <NephrologyCalculator config={CONFIGS['corrected-sodium']} onResultChange={onResultChange} />;
}

export function FreeWaterDeficitCalculator({ onResultChange }) {
  return <NephrologyCalculator config={CONFIGS['free-water-deficit']} onResultChange={onResultChange} />;
}

export function OsmolalGapCalculator({ onResultChange }) {
  return <NephrologyCalculator config={CONFIGS['osmolal-gap']} onResultChange={onResultChange} />;
}

import { useEffect, useRef, useState } from 'react';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS, getCalculatorSubIcon } from '../../navigation/iconRegistry';
import {
  CalcCheckboxGroup,
  CalcFieldValidationErrors,
  CalcPanelTitle,
  ConfigDrivenCalculatorField,
  ResultsPanelTitle,
  scrollResultsIntoView,
} from './calculatorPrimitives';
import {
  computeAaGradient,
  computeAsthmaSeverityScore,
  computeBodeIndex,
  computeCopdGoldAssessment,
  computePao2Fio2Ratio,
  computePneumoniaSeverityIndex,
  computeRoxIndex,
} from '../../utils/pulmonologyCalculators';

function DecisionSupportNotice({ children }) {
  return (
    <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
      <p className="calc-ds-lead">
        <strong>Decision support only.</strong> Does not diagnose or replace clinician judgment; follow local protocols.
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
  );
}

function PulmonologyCalculator({ config, onResultChange }) {
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
          <CalcCheckboxGroup fields={config.checkboxes || []} form={form} onChange={update} />
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

const mmrcOptions = [
  { value: '0', label: '0 - Breathless only with strenuous exercise' },
  { value: '1', label: '1 - Short of breath hurrying or walking up hill' },
  { value: '2', label: '2 - Walks slower than peers / stops on level ground' },
  { value: '3', label: '3 - Stops after about 100 m or a few minutes' },
  { value: '4', label: '4 - Too breathless to leave house / dressing' },
];

const CONFIGS = {
  'bode-index': {
    slug: 'bode-index',
    title: 'BODE Index',
    notice: 'COPD prognosis context only; does not diagnose COPD or recommend therapy.',
    initial: { bmi: '', fev1PctPredicted: '', sixMinuteWalkMeters: '', mmrcDyspnea: '' },
    fields: [
      { name: 'bmi', label: 'BMI (kg/m2)', min: 8, max: 80 },
      { name: 'fev1PctPredicted', label: 'FEV1 percent predicted', min: 1, max: 150 },
      { name: 'sixMinuteWalkMeters', label: '6-minute walk distance (m)', min: 0, max: 800 },
      { name: 'mmrcDyspnea', label: 'mMRC dyspnea grade', type: 'select', options: mmrcOptions },
    ],
    compute: computeBodeIndex,
    emptyText: 'Enter BODE inputs to view COPD prognosis context.',
    primaryLabel: 'BODE Index',
    primaryValue: (result) => `${result.totalScore}/10`,
  },
  'copd-gold-assessment': {
    slug: 'copd-gold-assessment',
    title: 'COPD GOLD Assessment',
    notice: 'GOLD grouping support only; does not diagnose COPD or recommend inhalers.',
    initial: { mmrcGrade: '', catScore: '', moderateExacerbations: '', severeExacerbations: '', fev1PctPredicted: '' },
    fields: [
      { name: 'mmrcGrade', label: 'mMRC dyspnea grade', type: 'select', options: mmrcOptions },
      { name: 'catScore', label: 'CAT score (optional if mMRC entered)', min: 0, max: 40 },
      { name: 'moderateExacerbations', label: 'Moderate exacerbations in past year', min: 0, max: 20, step: 1 },
      { name: 'severeExacerbations', label: 'Severe exacerbations / hospitalizations', min: 0, max: 20, step: 1 },
      { name: 'fev1PctPredicted', label: 'FEV1 percent predicted (optional)', min: 1, max: 150 },
    ],
    compute: computeCopdGoldAssessment,
    emptyText: 'Enter symptoms and exacerbation history to view GOLD group context.',
    primaryLabel: 'GOLD group',
    primaryValue: (result) => `Group ${result.group}`,
  },
  'aa-gradient': {
    slug: 'aa-gradient',
    title: 'A-a Gradient',
    notice: 'ABG oxygenation context only; verify FiO2, altitude, and specimen quality.',
    initial: { ageYears: '', fio2Pct: '21', pao2MmHg: '', paco2MmHg: '', atmosphericPressureMmHg: '760', respiratoryQuotient: '0.8' },
    fields: [
      { name: 'ageYears', label: 'Age (years)', min: 0, max: 120 },
      { name: 'fio2Pct', label: 'FiO2 (%)', min: 21, max: 100 },
      { name: 'pao2MmHg', label: 'PaO2 (mmHg)', min: 20, max: 700 },
      { name: 'paco2MmHg', label: 'PaCO2 (mmHg)', min: 10, max: 120 },
      { name: 'atmosphericPressureMmHg', label: 'Atmospheric pressure (mmHg)', min: 400, max: 800 },
      { name: 'respiratoryQuotient', label: 'Respiratory quotient', min: 0.6, max: 1.2 },
    ],
    compute: computeAaGradient,
    emptyText: 'Enter ABG values to calculate the A-a gradient.',
    primaryLabel: 'A-a gradient',
    primaryValue: (result) => `${result.gradient} mmHg`,
  },
  'pao2-fio2-ratio': {
    slug: 'pao2-fio2-ratio',
    title: 'PaO2/FiO2 Ratio',
    notice: 'Oxygenation threshold support only; does not diagnose ARDS or set ventilator strategy.',
    initial: { pao2MmHg: '', fio2Pct: '' },
    fields: [
      { name: 'pao2MmHg', label: 'PaO2 (mmHg)', min: 20, max: 700 },
      { name: 'fio2Pct', label: 'FiO2 (%)', min: 21, max: 100 },
    ],
    compute: computePao2Fio2Ratio,
    emptyText: 'Enter PaO2 and FiO2 to calculate the ratio.',
    primaryLabel: 'PaO2/FiO2',
    primaryValue: (result) => result.ratio,
  },
  'rox-index': {
    slug: 'rox-index',
    title: 'ROX Index',
    notice: 'High-flow oxygen monitoring adjunct only; use serial reassessment and local escalation policy.',
    initial: { spo2Pct: '', fio2Pct: '', respiratoryRate: '' },
    fields: [
      { name: 'spo2Pct', label: 'SpO2 (%)', min: 50, max: 100 },
      { name: 'fio2Pct', label: 'FiO2 (%)', min: 21, max: 100 },
      { name: 'respiratoryRate', label: 'Respiratory rate (/min)', min: 4, max: 80 },
    ],
    compute: computeRoxIndex,
    emptyText: 'Enter SpO2, FiO2, and respiratory rate to calculate ROX.',
    primaryLabel: 'ROX index',
    primaryValue: (result) => result.roxIndex,
  },
  'pneumonia-severity-index': {
    slug: 'pneumonia-severity-index',
    title: 'Pneumonia Severity Index',
    notice: 'Community-acquired pneumonia risk context only; does not recommend antibiotics or disposition.',
    initial: {
      ageYears: '',
      sex: '',
      nursingHomeResident: false,
      neoplasticDisease: false,
      liverDisease: false,
      congestiveHeartFailure: false,
      cerebrovascularDisease: false,
      renalDisease: false,
      alteredMentalStatus: false,
      respiratoryRate30OrMore: false,
      systolicBpUnder90: false,
      temperatureExtreme: false,
      pulse125OrMore: false,
      phUnder735: false,
      bun30OrMore: false,
      sodiumUnder130: false,
      glucose250OrMore: false,
      hematocritUnder30: false,
      pao2Under60: false,
      pleuralEffusion: false,
    },
    fields: [
      { name: 'ageYears', label: 'Age (years)', min: 0, max: 120 },
      { name: 'sex', label: 'Sex', type: 'select', options: [{ value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }] },
    ],
    checkboxes: [
      ['nursingHomeResident', 'Nursing home resident'],
      ['neoplasticDisease', 'Neoplastic disease'],
      ['liverDisease', 'Liver disease'],
      ['congestiveHeartFailure', 'Congestive heart failure'],
      ['cerebrovascularDisease', 'Cerebrovascular disease'],
      ['renalDisease', 'Renal disease'],
      ['alteredMentalStatus', 'Altered mental status'],
      ['respiratoryRate30OrMore', 'Respiratory rate >= 30/min'],
      ['systolicBpUnder90', 'Systolic BP < 90 mmHg'],
      ['temperatureExtreme', 'Temperature < 35 C or >= 40 C'],
      ['pulse125OrMore', 'Pulse >= 125/min'],
      ['phUnder735', 'Arterial pH < 7.35'],
      ['bun30OrMore', 'BUN >= 30 mg/dL'],
      ['sodiumUnder130', 'Sodium < 130 mEq/L'],
      ['glucose250OrMore', 'Glucose >= 250 mg/dL'],
      ['hematocritUnder30', 'Hematocrit < 30%'],
      ['pao2Under60', 'PaO2 < 60 mmHg'],
      ['pleuralEffusion', 'Pleural effusion'],
    ].map(([name, label]) => ({ name, label })),
    compute: computePneumoniaSeverityIndex,
    emptyText: 'Enter PSI demographics and selected findings to view risk class.',
    primaryLabel: 'PSI class',
    primaryValue: (result) => `${result.riskClass} (${result.points} pts)`,
  },
  'asthma-severity-score': {
    slug: 'asthma-severity-score',
    title: 'Asthma Severity Score',
    notice: 'Acute asthma severity helper only; life-threatening features require immediate local emergency pathways.',
    initial: {
      pefPctPersonalBest: '',
      spo2Pct: '',
      respiratoryRate: '',
      silentChest: false,
      alteredMentalStatus: false,
      exhaustion: false,
      speaksWordsOnly: false,
      speaksPhrasesOnly: false,
      accessoryMuscleUse: false,
    },
    fields: [
      { name: 'pefPctPersonalBest', label: 'PEF percent personal best/predicted', min: 0, max: 150 },
      { name: 'spo2Pct', label: 'SpO2 (%)', min: 50, max: 100 },
      { name: 'respiratoryRate', label: 'Respiratory rate (/min)', min: 4, max: 80 },
    ],
    checkboxes: [
      ['silentChest', 'Silent chest'],
      ['alteredMentalStatus', 'Altered mental status'],
      ['exhaustion', 'Exhaustion'],
      ['speaksWordsOnly', 'Speaks words only'],
      ['speaksPhrasesOnly', 'Speaks phrases only'],
      ['accessoryMuscleUse', 'Accessory muscle use'],
    ].map(([name, label]) => ({ name, label })),
    compute: computeAsthmaSeverityScore,
    emptyText: 'Enter acute asthma findings to view severity context.',
    primaryLabel: 'Severity band',
    primaryValue: (result) => result.riskBand.replaceAll('_', ' '),
  },
};

export function BodeIndexCalculator({ onResultChange }) {
  return <PulmonologyCalculator config={CONFIGS['bode-index']} onResultChange={onResultChange} />;
}

export function CopdGoldAssessmentCalculator({ onResultChange }) {
  return <PulmonologyCalculator config={CONFIGS['copd-gold-assessment']} onResultChange={onResultChange} />;
}

export function AaGradientCalculator({ onResultChange }) {
  return <PulmonologyCalculator config={CONFIGS['aa-gradient']} onResultChange={onResultChange} />;
}

export function Pao2Fio2RatioCalculator({ onResultChange }) {
  return <PulmonologyCalculator config={CONFIGS['pao2-fio2-ratio']} onResultChange={onResultChange} />;
}

export function RoxIndexCalculator({ onResultChange }) {
  return <PulmonologyCalculator config={CONFIGS['rox-index']} onResultChange={onResultChange} />;
}

export function PneumoniaSeverityIndexCalculator({ onResultChange }) {
  return <PulmonologyCalculator config={CONFIGS['pneumonia-severity-index']} onResultChange={onResultChange} />;
}

export function AsthmaSeverityScoreCalculator({ onResultChange }) {
  return <PulmonologyCalculator config={CONFIGS['asthma-severity-score']} onResultChange={onResultChange} />;
}

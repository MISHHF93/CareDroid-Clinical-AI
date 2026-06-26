import { useMemo, useState } from 'react';
import { useEmergencyStore } from '../../store/emergencyStore';
import { saveCalculatorResult } from './calculatorSave';

const MAX_SCORE_BY_ID = Object.freeze({
  sofa: 24,
  qsofa: 3,
  news2: 20,
  'apache-ii': 71,
  'curb-65': 5,
  gcs: 15,
  mews: 14,
  'revised-trauma-score': 12,
  pews: 13,
  'child-pugh': 15,
  'has-bled': 9,
  meld: 40,
  'meld-na': 40,
  'timi-ua-nstemi': 7,
  'heart-score': 10,
  'centor-mcisaac': 5,
  'apgar-score': 10,
  'braden-scale': 23,
  'morse-fall-scale': 125,
  'ranson-criteria': 11,
  'bisap-score': 5,
  fib4: 'n/a',
  'glasgow-blatchford-score': 23,
  'rockall-score': 11,
  'wells-pe': 12.5,
  perc: 8,
  'grace-acs': 372,
  abcd2: 7,
  nihss: 42,
  'canadian-c-spine': 'n/a',
  'ottawa-ankle': 'n/a',
  'nexus-cspine': 'n/a',
  'pecarn-head': 'n/a',
  'shock-index': 'n/a',
  'anion-gap': 'n/a',
  rass: 4,
});

function patientName(patient) {
  return patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.mrn : '';
}

function scoreTotal(result) {
  if (!result) return null;
  return (
    result.totalScore ??
    result.score ??
    result.total ??
    result.qsofaScore ??
    result.news2Score ??
    result.value ??
    null
  );
}

function scoreBand(result) {
  if (!result) return 'Result captured';
  return (
    result.interpretation ||
    result.riskBand ||
    result.severity ||
    result.category ||
    result.label ||
    'Result captured'
  );
}

function isCriticalBand(band, result) {
  return /critical|high|severe|red|positive|unsafe/i.test(`${band} ${result?.recommendation || ''}`);
}

function LightweightCalculatorPreview({ calculator, patientContext, onResultChange }) {
  const [score, setScore] = useState('');
  const [interpretation, setInterpretation] = useState('');

  const captureResult = () => {
    const trimmedScore = score.trim();
    const numericScore = Number(trimmedScore);
    onResultChange({
      score: trimmedScore && Number.isFinite(numericScore) ? numericScore : trimmedScore || 'Captured',
      interpretation: interpretation.trim() || 'Result captured',
      calculatorId: calculator.id,
      patientId: patientContext?.id,
    });
  };

  return (
    <div className="clinical-calculator-hub__select">
      <h2>{calculator.name}</h2>
      <p>{calculator.description}</p>
      <p>
        Lightweight demo capture is enabled for this legacy calculator. Time-critical calculators use dedicated
        optimized components.
      </p>
      <label>
        Score or result
        <input value={score} onChange={(event) => setScore(event.target.value)} placeholder="Enter score" />
      </label>
      <label>
        Interpretation
        <input
          value={interpretation}
          onChange={(event) => setInterpretation(event.target.value)}
          placeholder="Low risk, positive, severe..."
        />
      </label>
      <button type="button" onClick={captureResult}>
        Capture result
      </button>
    </div>
  );
}

export default function LegacyCalculatorWrapper({ calculator, patientId, onClose }) {
  const patients = useEmergencyStore((state) => state.patients);
  const patient = patientId ? patients.find((candidate) => candidate.id === patientId) : undefined;
  const [result, setResult] = useState<any>(null);
  const patientContext = useMemo(() => {
    if (!patient) return null;
    const latestVitals = Array.isArray(patient.vitals) ? patient.vitals.at(-1) : patient.vitals;
    return {
      id: patient.id,
      name: patientName(patient),
      mrn: patient.mrn,
      age: patient.age,
      sex: patient.sex,
      vitals: latestVitals || {},
    };
  }, [patient]);

  const total = scoreTotal(result);
  const band = scoreBand(result);
  const canSave = Boolean(patient?.id && result && total !== null && total !== undefined);

  const saveToPatient = () => {
    if (!patient || !canSave) return;
    const saved = saveCalculatorResult({
      patientId: patient.id,
      scoreId: calculator.id,
      scoreName: calculator.name,
      total,
      max: MAX_SCORE_BY_ID[calculator.id] ?? 'n/a',
      band,
      fields: result,
      staffId: patient.assignedStaffId || undefined,
      critical: isCriticalBand(band, result),
    });
    if (saved) onClose();
  };

  return (
    <div>
      <div className="clinical-calculator-shell__header">
        <button type="button" onClick={onClose}>
          All calculators
        </button>
        <div>
          <span>{calculator.category}</span>
          <h2>{calculator.name}</h2>
          <p>{calculator.description}</p>
        </div>
        <button type="button" className="clinical-calculator-shell__save" onClick={saveToPatient} disabled={!canSave}>
          Save to Patient
        </button>
      </div>
      <div className="clinical-calculator-shell__context">
        <p>
          {patient ? `${patientName(patient)} (${patient.mrn}) is linked for saving.` : 'Standalone launch. Select a patient to enable saving.'}
        </p>
      </div>
      <LightweightCalculatorPreview
        calculator={calculator}
        patientContext={patientContext}
        onResultChange={setResult}
      />
    </div>
  );
}

export function createLegacyCalculatorComponent(calculator) {
  function LegacyCalculatorComponent({ patientId, onClose }) {
    return <LegacyCalculatorWrapper calculator={calculator} patientId={patientId} onClose={onClose} />;
  }

  LegacyCalculatorComponent.displayName = `LegacyCalculator_${calculator.id.replace(/[^a-z0-9]/gi, '_')}`;
  return LegacyCalculatorComponent;
}

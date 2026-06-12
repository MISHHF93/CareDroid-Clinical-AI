import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Baby, Printer, Save, X } from 'lucide-react';
import { useEmergencyStore } from '../../store/emergencyStore';
import './PediatricDrugCalculator.css';

const CRITICAL_GROUPS = new Set(['resuscitation', 'rsi']);

export const PEDIATRIC_DRUGS = [
  {
    id: 'epi-arrest',
    group: 'resuscitation',
    drug: 'Epinephrine (cardiac arrest)',
    dosePerKg: '0.01 mg/kg',
    units: 'mg',
    concentration: '0.1 mg/mL',
    concentrationValue: 0.1,
    route: 'IV',
    maxDose: 1,
    calculate: (kg) => kg * 0.01,
  },
  {
    id: 'epi-anaphylaxis',
    group: 'resuscitation',
    drug: 'Epinephrine (anaphylaxis)',
    dosePerKg: '0.01 mg/kg',
    units: 'mg',
    concentration: '1 mg/mL',
    concentrationValue: 1,
    route: 'IM',
    maxDose: 0.5,
    calculate: (kg) => kg * 0.01,
  },
  {
    id: 'atropine',
    group: 'resuscitation',
    drug: 'Atropine',
    dosePerKg: '0.02 mg/kg',
    units: 'mg',
    concentration: '0.1 mg/mL',
    concentrationValue: 0.1,
    route: 'IV',
    minDose: 0.1,
    maxDose: 0.5,
    calculate: (kg) => kg * 0.02,
  },
  {
    id: 'adenosine',
    group: 'resuscitation',
    drug: 'Adenosine',
    dosePerKg: '0.1 mg/kg',
    units: 'mg',
    concentration: '3 mg/mL',
    concentrationValue: 3,
    route: 'IV rapid push',
    maxDose: 6,
    calculate: (kg) => kg * 0.1,
  },
  {
    id: 'amiodarone',
    group: 'resuscitation',
    drug: 'Amiodarone',
    dosePerKg: '5 mg/kg',
    units: 'mg',
    concentration: '50 mg/mL',
    concentrationValue: 50,
    route: 'IV over 20-60 min',
    maxDose: 300,
    calculate: (kg) => kg * 5,
  },
  {
    id: 'sodium-bicarbonate',
    group: 'resuscitation',
    drug: 'Sodium Bicarbonate',
    dosePerKg: '1 mEq/kg',
    units: 'mEq',
    concentration: '1 mEq/mL',
    concentrationValue: 1,
    route: 'IV',
    maxDoseLabel: 'Protocol',
    calculate: (kg) => kg,
  },
  {
    id: 'ketamine',
    group: 'rsi',
    drug: 'Ketamine',
    dosePerKg: '1-2 mg/kg',
    units: 'mg',
    concentration: '10 mg/mL',
    concentrationValue: 10,
    route: 'IV',
    maxDose: 200,
    calculate: (kg) => [kg, kg * 2],
  },
  {
    id: 'rocuronium',
    group: 'rsi',
    drug: 'Rocuronium',
    dosePerKg: '1.2 mg/kg',
    units: 'mg',
    concentration: '10 mg/mL',
    concentrationValue: 10,
    route: 'IV',
    maxDose: 100,
    calculate: (kg) => kg * 1.2,
  },
  {
    id: 'succinylcholine',
    group: 'rsi',
    drug: 'Succinylcholine',
    dosePerKg: '2 mg/kg <10 kg; 1 mg/kg >10 kg',
    units: 'mg',
    concentration: '20 mg/mL',
    concentrationValue: 20,
    route: 'IV',
    maxDose: 150,
    calculate: (kg) => kg * (kg < 10 ? 2 : 1),
  },
  {
    id: 'midazolam',
    group: 'rsi',
    drug: 'Midazolam',
    dosePerKg: '0.1 mg/kg',
    units: 'mg',
    concentration: '5 mg/mL',
    concentrationValue: 5,
    route: 'IV',
    maxDose: 5,
    calculate: (kg) => kg * 0.1,
  },
  {
    id: 'fentanyl',
    group: 'rsi',
    drug: 'Fentanyl',
    dosePerKg: '1-2 mcg/kg',
    units: 'mcg',
    concentration: '50 mcg/mL',
    concentrationValue: 50,
    route: 'IV',
    maxDose: 100,
    calculate: (kg) => [kg, kg * 2],
  },
  {
    id: 'd10',
    group: 'metabolic',
    drug: 'Glucose 10%',
    dosePerKg: '2 mL/kg',
    units: 'mL',
    concentration: 'D10W',
    route: 'IV',
    maxDoseLabel: 'Protocol',
    volumeDose: true,
    calculate: (kg) => kg * 2,
  },
  {
    id: 'normal-saline',
    group: 'metabolic',
    drug: 'Normal saline bolus',
    dosePerKg: '10 mL/kg',
    units: 'mL',
    concentration: '0.9% NaCl',
    route: 'IV (sepsis)',
    maxDose: 1000,
    volumeDose: true,
    calculate: (kg) => kg * 10,
  },
  {
    id: 'mannitol',
    group: 'metabolic',
    drug: 'Mannitol',
    dosePerKg: '0.25-0.5 g/kg',
    units: 'g',
    concentration: '20% (0.2 g/mL)',
    concentrationValue: 0.2,
    route: 'IV',
    maxDose: 50,
    calculate: (kg) => [kg * 0.25, kg * 0.5],
  },
  {
    id: 'lorazepam',
    group: 'seizure',
    drug: 'Lorazepam',
    dosePerKg: '0.1 mg/kg',
    units: 'mg',
    concentration: '2 mg/mL',
    concentrationValue: 2,
    route: 'IV',
    maxDose: 4,
    calculate: (kg) => kg * 0.1,
  },
  {
    id: 'diazepam-rectal',
    group: 'seizure',
    drug: 'Diazepam rectal',
    dosePerKg: '0.5 mg/kg',
    units: 'mg',
    concentration: '5 mg/mL',
    concentrationValue: 5,
    route: 'Rectal',
    maxDose: 20,
    calculate: (kg) => kg * 0.5,
  },
  {
    id: 'levetiracetam',
    group: 'seizure',
    drug: 'Levetiracetam',
    dosePerKg: '20 mg/kg',
    units: 'mg',
    concentration: '100 mg/mL',
    concentrationValue: 100,
    route: 'IV',
    maxDose: 3000,
    calculate: (kg) => kg * 20,
  },
];

function parseNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampDose(value, drug) {
  let adjusted = value;
  let warning = false;
  if (typeof drug.minDose === 'number' && adjusted < drug.minDose) {
    adjusted = drug.minDose;
    warning = true;
  }
  if (typeof drug.maxDose === 'number' && adjusted > drug.maxDose) {
    adjusted = drug.maxDose;
    warning = true;
  }
  return { value: adjusted, warning };
}

function formatNumber(value, digits = 2) {
  if (!Number.isFinite(value)) return '--';
  if (value >= 100) return String(Math.round(value));
  if (value >= 10) return String(Math.round(value * 10) / 10);
  return String(Math.round(value * 10 ** digits) / 10 ** digits);
}

function formatDoseValue(value, units) {
  return `${formatNumber(value)} ${units}`;
}

function doseRange(rawDose) {
  return Array.isArray(rawDose) ? rawDose : [rawDose, rawDose];
}

function formatDose(dose, drug) {
  if (!dose.weightKg) return '--';
  if (dose.isRange) return `${formatDoseValue(dose.low, drug.units)} - ${formatDoseValue(dose.high, drug.units)}`;
  return formatDoseValue(dose.low, drug.units);
}

function formatVolume(dose, drug) {
  if (!dose.weightKg) return '--';
  if (drug.volumeDose) return formatDoseValue(dose.low, 'mL');
  if (!drug.concentrationValue) return '--';
  if (dose.isRange) {
    return `${formatNumber(dose.low / drug.concentrationValue)} - ${formatNumber(
      dose.high / drug.concentrationValue
    )} mL`;
  }
  return `${formatNumber(dose.low / drug.concentrationValue)} mL`;
}

function maxDoseLabel(drug) {
  if (drug.maxDoseLabel) return drug.maxDoseLabel;
  if (typeof drug.maxDose !== 'number') return '--';
  const minLabel = typeof drug.minDose === 'number' ? `min ${formatDoseValue(drug.minDose, drug.units)}; ` : '';
  return `${minLabel}${formatDoseValue(drug.maxDose, drug.units)}`;
}

export function estimateWeightByLuscombe(ageYears) {
  const numericAge = parseNumber(ageYears);
  if (numericAge === null || numericAge < 1) return null;
  return Math.max(1, 3 * numericAge + 7);
}

export function ageFromDob(dob) {
  if (!dob) return null;
  const birthDate = new Date(`${dob}T00:00:00`);
  if (!Number.isFinite(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return Math.max(0, age);
}

export function patientWeightKg(patient) {
  const vitals = patient?.vitals || {};
  return (
    parseNumber(vitals.weightKg) ??
    parseNumber(vitals.weight_kg) ??
    parseNumber(vitals.weight) ??
    parseNumber(vitals.massKg) ??
    null
  );
}

export function patientEstimatedWeightKg(patient) {
  const directWeight = patientWeightKg(patient);
  if (directWeight) return directWeight;
  const age = parseNumber(patient?.age) ?? ageFromDob(patient?.dob);
  return estimateWeightByLuscombe(age);
}

export function calculatePediatricDrugRows(weightKg) {
  const numericWeight = parseNumber(weightKg);
  return PEDIATRIC_DRUGS.map((drug) => {
    if (!numericWeight || numericWeight <= 0) {
      return {
        ...drug,
        weightKg: null,
        calculatedDose: '--',
        volumeToDraw: '--',
        warning: false,
      };
    }
    const rawRange = doseRange(drug.calculate(numericWeight));
    const low = clampDose(rawRange[0], drug);
    const high = clampDose(rawRange[1], drug);
    const dose = {
      weightKg: numericWeight,
      low: low.value,
      high: high.value,
      isRange: rawRange[0] !== rawRange[1],
    };
    return {
      ...drug,
      weightKg: numericWeight,
      calculatedDose: formatDose(dose, drug),
      volumeToDraw: formatVolume(dose, drug),
      warning: low.warning || high.warning,
    };
  });
}

export default function PediatricDrugCalculator({ open, patient = null, onClose }) {
  const updatePatient = useEmergencyStore((state) => state.updatePatient);
  const [weightInput, setWeightInput] = useState('');
  const [ageInput, setAgeInput] = useState('');
  const weightRef = useRef(null);
  const linkedWeight = patient ? patientEstimatedWeightKg(patient) : null;
  const effectiveWeight = parseNumber(weightInput) || estimateWeightByLuscombe(ageInput) || null;
  const rows = useMemo(() => calculatePediatricDrugRows(effectiveWeight), [effectiveWeight]);
  const canSave = Boolean(patient?.id && effectiveWeight);

  useEffect(() => {
    if (!open) return undefined;
    const patientAge = patient?.age ?? ageFromDob(patient?.dob);
    setWeightInput('');
    setAgeInput(patientAge !== null && patientAge !== undefined ? String(patientAge) : '');
    const timer = window.setTimeout(() => weightRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open, patient?.age, patient?.dob, patient?.id]);

  if (!open) return null;

  const usePatientWeight = () => {
    if (!linkedWeight) return;
    setWeightInput(formatNumber(linkedWeight));
  };

  const saveToPatient = () => {
    if (!canSave) return;
    const timestamp = new Date().toISOString();
    const currentPatient =
      useEmergencyStore.getState().patients.find((candidate) => candidate.id === patient.id) || patient;
    updatePatient(patient.id, {
      timeline: [
        ...currentPatient.timeline,
        {
          id: `evt-${patient.id}-peds-drugs-${Date.now()}`,
          patientId: patient.id,
          type: 'NoteAdded',
          timestamp,
          summary: `Pediatric drug reference generated at ${formatNumber(effectiveWeight)} kg.`,
          metadata: {
            weightKg: Number(formatNumber(effectiveWeight)),
            drugCount: rows.length,
            source: 'PediatricDrugCalculator',
          },
        },
      ],
    });
  };

  const modal = (
    <div
      className="pediatric-drug-calculator"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pediatric-drug-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose?.();
        }
      }}
    >
      <section className="pediatric-drug-calculator__panel">
        <header className="pediatric-drug-calculator__header">
          <div>
            <span>Resuscitation bay</span>
            <h2 id="pediatric-drug-title">
              <Baby size={28} aria-hidden />
              Pediatric Drug Calculator
            </h2>
          </div>
          <div className="pediatric-drug-calculator__header-actions">
            <button type="button" onClick={() => window.print()}>
              <Printer size={16} aria-hidden />
              Print
            </button>
            <button type="button" onClick={saveToPatient} disabled={!canSave}>
              <Save size={16} aria-hidden />
              Save to Patient
            </button>
            <button type="button" onClick={onClose} aria-label="Close pediatric drug calculator">
              <X size={18} aria-hidden />
            </button>
          </div>
        </header>

        <section className="pediatric-drug-calculator__inputs" aria-label="Pediatric dosing inputs">
          <label>
            Weight
            <div className="pediatric-drug-calculator__weight-field">
              <input
                ref={weightRef}
                value={weightInput}
                inputMode="decimal"
                placeholder="14"
                aria-label="Weight in kg"
                onChange={(event) => setWeightInput(event.target.value.replace(/[^\d.]/g, ''))}
              />
              <span>kg</span>
            </div>
          </label>
          <label>
            Age <small>optional, estimates weight if weight is empty</small>
            <input
              value={ageInput}
              inputMode="numeric"
              placeholder="years"
              aria-label="Age in years"
              onChange={(event) => setAgeInput(event.target.value.replace(/[^\d.]/g, ''))}
            />
          </label>
          {patient ? (
            <button type="button" className="pediatric-drug-calculator__patient-weight" onClick={usePatientWeight}>
              Use patient weight
              <small>
                {linkedWeight ? `${formatNumber(linkedWeight)} kg` : 'Estimate unavailable'}
              </small>
            </button>
          ) : null}
          <div className="pediatric-drug-calculator__summary" role="status">
            <span>Dosing weight</span>
            <strong>{effectiveWeight ? `${formatNumber(effectiveWeight)} kg` : '-- kg'}</strong>
            {patient ? <small>{patient.firstName} {patient.lastName} linked</small> : <small>No patient linked</small>}
          </div>
        </section>

        <div className="pediatric-drug-calculator__table-wrap">
          <table className="pediatric-drug-calculator__table">
            <thead>
              <tr>
                <th>Drug</th>
                <th>Dose per kg</th>
                <th>Calculated dose</th>
                <th>Max dose</th>
                <th>Concentration</th>
                <th>Volume to draw</th>
                <th>Route</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={[
                    CRITICAL_GROUPS.has(row.group) ? 'pediatric-drug-calculator__row--critical' : '',
                    row.warning ? 'pediatric-drug-calculator__row--warning' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <td>
                    <strong>{row.drug}</strong>
                    {row.warning ? <small>Dose capped or minimum applied</small> : null}
                  </td>
                  <td>{row.dosePerKg}</td>
                  <td>{row.calculatedDose}</td>
                  <td>{maxDoseLabel(row)}</td>
                  <td>{row.concentration}</td>
                  <td className="pediatric-drug-calculator__volume">{row.volumeToDraw}</td>
                  <td>{row.route}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
}

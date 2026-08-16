import { useEffect, useMemo, useRef, useState } from 'react';
import { MEDICAL_THEME } from '../../config/medicalTheme.constants';
import { useEmergencyStore } from '../../store/emergencyStore';
import { saveCalculatorResult } from './calculatorSave';
import { pediatricDoseCrossCheckWarning } from '../../data/pediatricDoseCrossCheck';
import './mobileCalculator.css';
import './PediatricDrugCalc.css';

type PediatricDrugCalcProps = {
  patientId?: string;
  onClose: () => void;
};

interface Drug {
  name: string;
  category: string;
  dosePerKg: number;
  unit: string;
  min?: number;
  max: number;
  critical?: boolean;
}

export const PEDIATRIC_DRUG_CALC_DRUGS: Drug[] = [
  { name: 'Epinephrine IV (arrest)', category: 'Resus', dosePerKg: 0.01, unit: 'mg', max: 1, critical: true },
  { name: 'Epinephrine IM (anaphylaxis)', category: 'Resus', dosePerKg: 0.01, unit: 'mg', max: 0.5, critical: true },
  { name: 'Atropine', category: 'Resus', dosePerKg: 0.02, unit: 'mg', min: 0.1, max: 0.5, critical: true },
  { name: 'Adenosine', category: 'Resus', dosePerKg: 0.1, unit: 'mg', max: 6 },
  { name: 'Amiodarone', category: 'Resus', dosePerKg: 5, unit: 'mg', max: 300 },
  { name: 'Ketamine IV', category: 'RSI', dosePerKg: 2, unit: 'mg', max: 200 },
  { name: 'Rocuronium', category: 'RSI', dosePerKg: 1.2, unit: 'mg', max: 100, critical: true },
  { name: 'Midazolam IV', category: 'Sedation', dosePerKg: 0.1, unit: 'mg', max: 5 },
  { name: 'Lorazepam (seizure)', category: 'Seizure', dosePerKg: 0.1, unit: 'mg', max: 4 },
  { name: 'Levetiracetam', category: 'Seizure', dosePerKg: 20, unit: 'mg', max: 3000 },
  { name: 'Dextrose 10%', category: 'Metabolic', dosePerKg: 2, unit: 'ml', max: 50 },
  { name: 'NS bolus (sepsis)', category: 'Fluids', dosePerKg: 10, unit: 'ml', max: 500 },
];

function parseWeight(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function calculatedDose(weight: number | null, drug: Drug): string {
  if (weight === null) return '--';
  const rawDose = weight * drug.dosePerKg;
  const doseWithMinimum = drug.min === undefined ? rawDose : Math.max(rawDose, drug.min);
  return Math.min(doseWithMinimum, drug.max).toFixed(2);
}

function dosePerKgLabel(drug: Drug): string {
  const minimum = drug.min === undefined ? '' : `, min ${drug.min}`;
  return `${drug.dosePerKg} ${drug.unit}/kg${minimum}`;
}

export default function PediatricDrugCalc({ patientId, onClose }: PediatricDrugCalcProps) {
  const patients = useEmergencyStore((state) => state.patients);
  const patient = patientId ? patients.find((candidate) => candidate.id === patientId) : undefined;
  const [weightInput, setWeightInput] = useState('');
  const weight = useMemo(() => parseWeight(weightInput), [weightInput]);
  const canEstimateWeight = Boolean(patient && patient.age < 18);
  const estimatedWeight = patient ? patient.age * 2 + 8 : null;
  const weightInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    weightInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const saveToPatient = () => {
    if (!patient || weight === null) return;
    const rows = PEDIATRIC_DRUG_CALC_DRUGS.map((drug) => ({
      drug: drug.name,
      category: drug.category,
      dosePerKg: dosePerKgLabel(drug),
      calculatedDose: `${calculatedDose(weight, drug)} ${drug.unit}`,
      max: drug.max,
      unit: drug.unit,
      critical: Boolean(drug.critical),
    }));
    const saved = saveCalculatorResult({
      patientId: patient.id,
      scoreId: 'pediatric-dose-safety-checker',
      scoreName: 'Pediatric Drug Calculator',
      total: rows.length,
      max: rows.length,
      band: 'Dosing reference generated',
      fields: {
        weightKg: weight,
        rows,
      },
      staffId: patient.assignedStaffId || undefined,
      critical: false,
    });
    if (saved) onClose();
  };

  return (
    <div
      className="clinical-calculator-modal u-modal-scrim"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pediatric-drug-title"
      
    >
      <style>
        {`
          @media print {
            body * {
              visibility: hidden !important;
            }

            .pediatric-drug-print-area,
            .pediatric-drug-print-area * {
              visibility: visible !important;
            }

            .pediatric-drug-print-area {
              position: absolute !important;
              inset: 0 auto auto 0 !important;
              width: 100% !important;
              padding: 24px !important;
              background: white !important;
              color: #111827 !important;
            }

            .pediatric-drug-print-area table {
              width: 100% !important;
              border-collapse: collapse !important;
              font-size: 18px !important;
            }

            .pediatric-drug-print-area th,
            .pediatric-drug-print-area td {
              border: 2px solid #111827 !important;
              padding: 12px !important;
              color: #111827 !important;
            }

            .pediatric-drug-print-area [data-print-hide='true'] {
              display: none !important;
            }
          }
        `}
      </style>
      <div className="clinical-calculator-modal__panel pdc-panel">
        <header
          data-print-hide="true"
          className="u-panel-header-row"
        >
          <div>
            <h2 id="pediatric-drug-title" className="u-title-18">
              Pediatric Drug Calculator
            </h2>
            {patient ? (
              <div className="pdc-patient-subtitle">
                {patient.firstName} {patient.lastName} · Age {patient.age} · {patient.mrn}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close pediatric drug calculator"
            className="u-icon-btn-32"
          >
            X
          </button>
        </header>

        <div className="pdc-body">
          <section
            className="clinical-calculator-modal__mobile-stack pdc-input-row"
            data-print-hide="true"
          >
            <label className="u-flex-col-gap-6">
              <span className="pdc-input-label">Weight (kg)</span>
              <input
                ref={weightInputRef}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={weightInput}
                onChange={(event) => setWeightInput(event.target.value)}
                placeholder="Enter weight in kg"
                className="pdc-weight-input"
              />
            </label>
            {canEstimateWeight && estimatedWeight !== null ? (
              <button
                className="clinical-calculator-modal__submit pdc-estimate-btn"
                type="button"
                onClick={() => setWeightInput(String(estimatedWeight))}
              >
                Use estimated weight
              </button>
            ) : null}
            <button type="button" onClick={() => window.print()} className="pdc-print-btn">
              Print
            </button>
            {patient ? (
              <button
                type="button"
                onClick={saveToPatient}
                disabled={weight === null}
                style={{
                  border: '1px solid #0ea5e9',
                  borderRadius: 10,
                  background: weight === null ? '#e0f2fe' : MEDICAL_THEME.accent,
                  color: 'var(--medical-ink, #111827)',
                  cursor: weight === null ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  padding: '12px 14px',
                }}
              >
                Save to Patient
              </button>
            ) : null}
          </section>

          {canEstimateWeight && estimatedWeight !== null ? (
            <div data-print-hide="true" className="pdc-estimate-note">
              Estimated weight uses Luscombe formula: (age x 2) + 8 kg = {estimatedWeight} kg.
            </div>
          ) : null}

          <section className="pediatric-drug-print-area">
            <div data-print-hide="true" className="u-mb-12">
              <h3 className="pdc-table-title">Pediatric Drug Doses</h3>
              <div className="pdc-weight-summary">
                Weight: {weight === null ? 'not entered' : `${weight.toFixed(1)} kg`}
              </div>
            </div>
            <div className="pdc-table-scroll">
              <table className="pdc-table">
                <thead>
                  <tr className="pdc-table-head-row">
                    <th className="u-pad-10-border-b">Drug</th>
                    <th className="u-pad-10-border-b">Dose/kg</th>
                    <th className="u-pad-10-border-b">CALCULATED DOSE</th>
                    <th className="u-pad-10-border-b">Max</th>
                    <th className="u-pad-10-border-b">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {PEDIATRIC_DRUG_CALC_DRUGS.map((drug) => {
                    const crossCheckWarning = pediatricDoseCrossCheckWarning(drug.name);
                    return (
                    <tr
                      key={drug.name}
                      className={drug.critical ? 'pdc-drug-row pdc-drug-row--critical' : 'pdc-drug-row'}
                    >
                      <td className="u-pad-10-border-b">
                        <strong>{drug.name}</strong>
                        <div className="pdc-drug-category">{drug.category}</div>
                        {crossCheckWarning ? (
                          <div
                            className="pdc-cross-check-warning"
                            role="alert"
                            data-print-hide="true"
                            title={`Pediatric Dose Safety Checker tool lists ${crossCheckWarning.checkerName} at ${crossCheckWarning.checkerDose} instead. ${crossCheckWarning.note} Verify against institutional protocol before administering.`}
                          >
                            ⚠ Conflicts with other in-app reference ({crossCheckWarning.checkerDose}) — verify before administering
                          </div>
                        ) : null}
                      </td>
                      <td className="pdc-muted-cell">
                        {dosePerKgLabel(drug)}
                      </td>
                      <td
                        style={{
                          padding: 10,
                          borderBottom: '1px solid #e0f2fe',
                          fontWeight: 800,
                          fontSize: 16,
                          color: weight === null ? MEDICAL_THEME.inkMuted : MEDICAL_THEME.accent,
                        }}
                      >
                        {calculatedDose(weight, drug)}
                      </td>
                      <td className="pdc-muted-cell">
                        {drug.max.toFixed(drug.max < 10 ? 2 : 0)}
                      </td>
                      <td className="pdc-muted-cell">{drug.unit}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

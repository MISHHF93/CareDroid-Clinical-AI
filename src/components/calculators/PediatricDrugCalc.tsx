import { useEffect, useMemo, useState } from 'react';
import { useEmergencyStore } from '../../store/emergencyStore';
import { saveCalculatorResult } from './calculatorSave';
import './mobileCalculator.css';

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

const DRUGS: Drug[] = [
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const saveToPatient = () => {
    if (!patient || weight === null) return;
    const rows = DRUGS.map((drug) => ({
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
      className="clinical-calculator-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pediatric-drug-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'rgba(0,0,0,0.62)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
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
      <div
        className="clinical-calculator-modal__panel"
        style={{
          width: '100%',
          maxWidth: 760,
          maxHeight: '92vh',
          overflowY: 'auto',
          background: '#111827',
          border: '1px solid #1F2937',
          borderRadius: 12,
          color: '#F9FAFB',
          boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
        }}
      >
        <header
          data-print-hide="true"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: 16,
            borderBottom: '1px solid #1F2937',
          }}
        >
          <div>
            <h2 id="pediatric-drug-title" style={{ margin: 0, fontSize: 18, fontWeight: 650 }}>
              Pediatric Drug Calculator
            </h2>
            {patient ? (
              <div style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>
                {patient.firstName} {patient.lastName} · Age {patient.age} · {patient.mrn}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close pediatric drug calculator"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid #374151',
              background: 'transparent',
              color: '#F9FAFB',
              cursor: 'pointer',
            }}
          >
            X
          </button>
        </header>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section
            className="clinical-calculator-modal__mobile-stack"
            data-print-hide="true"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(220px, 1fr) auto auto',
              gap: 10,
              alignItems: 'end',
            }}
          >
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ color: '#9CA3AF', fontSize: 12, fontWeight: 700 }}>Weight (kg)</span>
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={weightInput}
                onChange={(event) => setWeightInput(event.target.value)}
                placeholder="Enter weight in kg"
                style={{
                  width: '100%',
                  border: '1px solid #374151',
                  borderRadius: 12,
                  background: '#0B1120',
                  color: '#F9FAFB',
                  fontSize: 24,
                  fontWeight: 700,
                  padding: '12px 14px',
                  outline: 'none',
                }}
              />
            </label>
            {canEstimateWeight && estimatedWeight !== null ? (
              <button
                className="clinical-calculator-modal__submit"
                type="button"
                onClick={() => setWeightInput(String(estimatedWeight))}
                style={{
                  border: '1px solid #2563EB',
                  borderRadius: 10,
                  background: '#2563EB',
                  color: '#F9FAFB',
                  cursor: 'pointer',
                  fontWeight: 700,
                  padding: '12px 14px',
                  whiteSpace: 'nowrap',
                }}
              >
                Use estimated weight
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                border: '1px solid #374151',
                borderRadius: 10,
                background: 'transparent',
                color: '#F9FAFB',
                cursor: 'pointer',
                fontWeight: 700,
                padding: '12px 14px',
              }}
            >
              Print
            </button>
            {patient ? (
              <button
                type="button"
                onClick={saveToPatient}
                disabled={weight === null}
                style={{
                  border: '1px solid #2563EB',
                  borderRadius: 10,
                  background: weight === null ? '#1F2937' : '#2563EB',
                  color: '#F9FAFB',
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
            <div data-print-hide="true" style={{ color: '#60A5FA', fontSize: 12 }}>
              Estimated weight uses Luscombe formula: (age x 2) + 8 kg = {estimatedWeight} kg.
            </div>
          ) : null}

          <section className="pediatric-drug-print-area">
            <div data-print-hide="true" style={{ marginBottom: 12 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>Pediatric Drug Doses</h3>
              <div style={{ color: '#9CA3AF', fontSize: 13 }}>
                Weight: {weight === null ? 'not entered' : `${weight.toFixed(1)} kg`}
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
                <thead>
                  <tr style={{ background: '#0B1120', color: '#9CA3AF', textAlign: 'left', fontSize: 12 }}>
                    <th style={{ padding: 10, borderBottom: '1px solid #1F2937' }}>Drug</th>
                    <th style={{ padding: 10, borderBottom: '1px solid #1F2937' }}>Dose/kg</th>
                    <th style={{ padding: 10, borderBottom: '1px solid #1F2937' }}>CALCULATED DOSE</th>
                    <th style={{ padding: 10, borderBottom: '1px solid #1F2937' }}>Max</th>
                    <th style={{ padding: 10, borderBottom: '1px solid #1F2937' }}>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {DRUGS.map((drug) => (
                    <tr
                      key={drug.name}
                      style={{
                        borderLeft: drug.critical ? '4px solid #EF4444' : '4px solid transparent',
                        background: drug.critical ? '#7F1D1D20' : 'transparent',
                      }}
                    >
                      <td style={{ padding: 10, borderBottom: '1px solid #1F2937' }}>
                        <strong>{drug.name}</strong>
                        <div style={{ color: '#9CA3AF', fontSize: 12 }}>{drug.category}</div>
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #1F2937', color: '#D1D5DB' }}>
                        {dosePerKgLabel(drug)}
                      </td>
                      <td
                        style={{
                          padding: 10,
                          borderBottom: '1px solid #1F2937',
                          fontWeight: 800,
                          fontSize: 16,
                          color: weight === null ? '#6B7280' : '#F9FAFB',
                        }}
                      >
                        {calculatedDose(weight, drug)}
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #1F2937', color: '#D1D5DB' }}>
                        {drug.max.toFixed(drug.max < 10 ? 2 : 0)}
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #1F2937', color: '#D1D5DB' }}>{drug.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

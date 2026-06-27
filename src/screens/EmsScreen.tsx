import React, { useState } from 'react';
import { EmsModuleFeature } from '../features/ems-module/EmsModuleFeature';
import { HandoffChecklist } from '../domain/ems/HandoffChecklist';
import type { EmsUnit } from '../types/emergency';
import type { HandoffStep } from '../domain/ems';
import './screens.css';

const DEFAULT_HANDOFF_STEPS: HandoffStep[] = [
  { id: 'vitals',     label: 'Vitals confirmed', done: false },
  { id: 'identity',   label: 'Patient identity verified', done: false },
  { id: 'allergies',  label: 'Allergies noted', done: false },
  { id: 'meds',       label: 'Current medications reviewed', done: false },
  { id: 'narrative',  label: 'EMS narrative handed off', done: false },
  { id: 'debrief',    label: 'Unit debrief complete', done: false },
];

export function EmsScreen() {
  const [selectedUnit, setSelectedUnit] = useState<EmsUnit | null>(null);
  const [steps, setSteps] = useState<HandoffStep[]>(DEFAULT_HANDOFF_STEPS);

  function handleStepChange(id: string, done: boolean) {
    setSteps((prev) => prev.map((s) => s.id === id ? { ...s, done } : s));
  }

  return (
    <div className="cd-screen">
      <div className="cd-screen__header">
        <span className="cd-screen__title">EMS Pipeline</span>
      </div>
      <div className="cd-screen__body">
        <div className="cd-split cd-split--right-heavy">
          <div className="cd-split__pane cd-split__pane--left">
            <EmsModuleFeature onSelectUnit={setSelectedUnit} />
          </div>
          <div className="cd-split__pane" style={{ padding: 'var(--cd-space-4)' }}>
            {selectedUnit ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--cd-space-4)' }}>
                <div>
                  <h2 style={{ fontSize: 'var(--cd-text-lg)', fontWeight: 'var(--cd-font-bold)', color: 'var(--cd-text-primary)', marginBottom: 'var(--cd-space-1)' }}>
                    Unit {selectedUnit.unitNumber} Handoff
                  </h2>
                  <p style={{ fontSize: 'var(--cd-text-sm)', color: 'var(--cd-text-secondary)' }}>
                    Status: {selectedUnit.status}{selectedUnit.etaMinutes != null ? ` · ETA ${selectedUnit.etaMinutes}m` : ''}
                  </p>
                </div>
                <HandoffChecklist steps={steps} onChange={handleStepChange} />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--cd-text-disabled)', fontSize: 'var(--cd-text-sm)' }}>
                Select a unit to begin handoff
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

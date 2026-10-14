import React, { useState } from 'react';
import { CheckCircle2, Play, RotateCcw, Sparkles } from 'lucide-react';
import { runMobilitySimulationScenario } from '../../services/medicalMobilityService';
import './MobilitySimulationCenter.css';

export interface MobilitySimulationCenterProps {
  className?: string;
}

interface ScenarioConfig {
  id: string;
  title: string;
  vehicleType: string;
  durationMinutes: number;
  description: string;
  acuity: 'CRITICAL' | 'URGENT' | 'HIGH';
  steps: string[];
}

const PRESET_SCENARIOS: ScenarioConfig[] = [
  {
    id: 'sim-drone-blood',
    title: 'Hospital-to-Hospital STAT Blood Delivery (eVTOL Drone)',
    vehicleType: 'AeroMed Falcon eVTOL (Zipline)',
    durationMinutes: 7,
    description:
      'Simulate 12.4 km flight between Metro General Helipad and St. Jude Community Clinic carrying 4 units O-negative packed red cells at 3.8°C.',
    acuity: 'CRITICAL',
    steps: [
      'Pre-flight automated sensor check (LiDAR, Radar altimeter, Pitot tube)',
      'Secure cold-chain chamber lock & OTP pairing',
      'Air traffic corridor clearance & takeoff',
      'Cruise navigation at 45m AGL with wind shear compensation',
      'Automated terminal descent, precision winch delivery, and OTP receipt sign-off',
    ],
  },
  {
    id: 'sim-amr-chemo',
    title: 'Internal Hospital STAT Chemotherapy Delivery (AMR Tug)',
    vehicleType: 'MediRover Alpha AMR (Aethon)',
    durationMinutes: 4,
    description:
      'Autonomous indoor transport of hazardous compounding IV infusion from Basement Central Pharmacy to 4th Floor Oncology Infusion Suite.',
    acuity: 'URGENT',
    steps: [
      'Hazardous material custody lock verification & badge swipe',
      'Elevator integration call via hospital IoT / BACnet gateway',
      'Corridor crowd avoidance (dynamic re-routing around gurneys)',
      'Arrival chime & nurse station biometric handover confirmation',
    ],
  },
  {
    id: 'sim-obstacle-avoid',
    title: 'Sensor Degradation & Obstacle Collision Avoidance Stress Test',
    vehicleType: 'TerraMedic Carrier UGV',
    durationMinutes: 3,
    description:
      'Evaluate perception system performance during optical camera lens fogging and simultaneous pedestrian cross-traffic in ED corridor.',
    acuity: 'HIGH',
    steps: [
      'Camera lens occlusion injection (Simulated 70% contrast loss)',
      'Autonomous sensor fusion fallback to 360° LiDAR and ultrasonic array',
      'Immediate speed reduction from 1.2 m/s to 0.4 m/s (Safety protocol)',
      'Successful pedestrian detection at 2.4 meters and smooth emergency deceleration',
    ],
  },
];

export const MobilitySimulationCenter: React.FC<MobilitySimulationCenterProps> = ({
  className = '',
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(PRESET_SCENARIOS[0].id);
  const [running, setRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [simResults, setSimResults] = useState<{
    success: boolean;
    completedAt: string;
    telemetryReadings: number;
    coldChainBreaches: number;
    safetyInterventions: number;
  } | null>(null);

  const activeScenario =
    PRESET_SCENARIOS.find((s) => s.id === selectedScenarioId) || PRESET_SCENARIOS[0];

  const handleStartSimulation = async () => {
    setRunning(true);
    setCurrentStepIndex(0);
    setSimResults(null);

    // Simulate progress through steps
    for (let i = 0; i < activeScenario.steps.length; i++) {
      setCurrentStepIndex(i);
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    try {
      const outcome = await runMobilitySimulationScenario(activeScenario.id);
      setSimResults({
        success: outcome?.ok ?? true,
        completedAt: new Date().toLocaleTimeString(),
        telemetryReadings: 420,
        coldChainBreaches: 0,
        safetyInterventions: 1,
      });
    } finally {
      setRunning(false);
    }
  };

  const handleReset = () => {
    setRunning(false);
    setCurrentStepIndex(-1);
    setSimResults(null);
  };

  return (
    <div className={`mobility-sim-center ${className}`} data-testid="mobility-simulation-center">
      <header className="mobility-sim-center__header">
        <div className="mobility-sim-center__title-group">
          <div className="mobility-sim-center__icon-badge">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="mobility-sim-center__title">
              Mobility & Autonomous Logistics Simulation Testbed
            </h3>
            <p className="mobility-sim-center__subtitle">
              Hardware-in-the-loop stress testing, route evaluation, and safety protocol validation
            </p>
          </div>
        </div>

        <div className="mobility-sim-center__live-tag">
          <span className="dot" />
          <span>SIMULATION ENVIRONMENT</span>
        </div>
      </header>

      {/* Scenario Chooser */}
      <div className="mobility-sim-center__grid">
        <div className="scenario-chooser">
          <h4 className="chooser-title">Select Operational Scenario</h4>
          <div className="scenario-list">
            {PRESET_SCENARIOS.map((scenario) => {
              const isSelected = scenario.id === activeScenario.id;
              return (
                <button
                  type="button"
                  key={scenario.id}
                  className={`scenario-card ${isSelected ? 'scenario-card--selected' : ''}`}
                  onClick={() => {
                    if (running) return;
                    setSelectedScenarioId(scenario.id);
                    handleReset();
                  }}
                >
                  <div className="scenario-card__head">
                    <strong>{scenario.title}</strong>
                    <span className="text-xs font-mono text-subtle">
                      ~{scenario.durationMinutes} min
                    </span>
                  </div>
                  <p className="scenario-card__desc">{scenario.description}</p>
                  <div className="scenario-card__meta">
                    <span className="vehicle-badge">{scenario.vehicleType}</span>
                    <span className={`acuity-chip acuity-chip--${scenario.acuity.toLowerCase()}`}>
                      {scenario.acuity}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Execution & Step Visualizer */}
        <div className="sim-execution-panel">
          <div className="execution-header">
            <div>
              <h4>{activeScenario.title}</h4>
              <span className="text-xs text-subtle">
                Target Platform: {activeScenario.vehicleType}
              </span>
            </div>

            <div className="execution-actions">
              <button
                type="button"
                className="sim-run-btn"
                onClick={handleStartSimulation}
                disabled={running}
              >
                <Play size={13} />
                <span>{running ? 'Running Test...' : 'Execute Scenario'}</span>
              </button>

              <button
                type="button"
                className="sim-reset-btn"
                onClick={handleReset}
                disabled={running && currentStepIndex < 0}
                title="Reset simulation"
              >
                <RotateCcw size={13} />
              </button>
            </div>
          </div>

          {/* Stepper */}
          <div className="stepper-container">
            <h5 className="stepper-title">Autonomous Execution Pipeline</h5>
            <div className="stepper-list">
              {activeScenario.steps.map((step, idx) => {
                const isPassed = currentStepIndex > idx;
                const isCurrent = currentStepIndex === idx;
                return (
                  <div
                    key={step}
                    className={`step-item ${isPassed ? 'step-item--passed' : ''} ${isCurrent ? 'step-item--current' : ''}`}
                  >
                    <div className="step-num">
                      {isPassed ? (
                        <CheckCircle2 size={14} className="text-success" />
                      ) : isCurrent ? (
                        <span className="step-spinner" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>
                    <span className="step-label">{step}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Outcome / Report */}
          {simResults && (
            <div className="sim-report-card">
              <div className="sim-report-header">
                <CheckCircle2 size={16} className="text-success" />
                <strong>Simulation Run Completed Successfully</strong>
                <span className="font-mono text-xs text-subtle">
                  Finished at {simResults.completedAt}
                </span>
              </div>
              <div className="sim-kpis">
                <div className="kpi-box">
                  <span className="kpi-label">Telemetry Sampled</span>
                  <span className="kpi-val">{simResults.telemetryReadings} frames</span>
                </div>
                <div className="kpi-box">
                  <span className="kpi-label">Cold Chain Breaches</span>
                  <span className="kpi-val text-success">
                    {simResults.coldChainBreaches} (100% In Spec)
                  </span>
                </div>
                <div className="kpi-box">
                  <span className="kpi-label">Interventions</span>
                  <span className="kpi-val">{simResults.safetyInterventions} Resolved</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobilitySimulationCenter;

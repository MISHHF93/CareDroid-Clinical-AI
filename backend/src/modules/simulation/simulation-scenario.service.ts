import { Injectable, NotFoundException } from '@nestjs/common';
import { SimulationScenario } from './simulation.types';

const DATA_MODE = 'Demo training simulation - Not live patient data';

const SCENARIOS: SimulationScenario[] = [
  [
    'sepsis-deterioration',
    'Sepsis Deterioration',
    'Emergency Medicine',
    'Emergency',
    'timed-emergency-drill',
  ],
  ['chest-pain-acs', 'Chest Pain ACS', 'Cardiology', 'Cardiology', 'branching-decision-scenario'],
  ['stroke-alert', 'Stroke Alert', 'Neurology', 'Emergency', 'team-based-simulation'],
  [
    'respiratory-failure',
    'Respiratory Failure',
    'Respiratory',
    'Respiratory',
    'ai-tutor-guided-case',
  ],
  ['trauma-triage', 'Trauma Triage', 'Trauma', 'Trauma', 'timed-emergency-drill'],
  ['dka-management', 'DKA Management', 'Endocrine', 'Critical Care', 'branching-decision-scenario'],
  ['pediatric-fever', 'Pediatric Fever', 'Pediatrics', 'Pediatrics', 'virtual-patient-case'],
  ['ob-hemorrhage', 'OB Hemorrhage', 'OB/GYN', 'OB/GYN', 'team-based-simulation'],
  [
    'medication-safety-event',
    'Medication Safety Event',
    'Pharmacy',
    'Medication Safety',
    'procedural-checklist',
  ],
  ['anaphylaxis', 'Anaphylaxis', 'Emergency Medicine', 'Emergency', 'timed-emergency-drill'],
  [
    'cardiac-arrest',
    'Cardiac Arrest',
    'Emergency Medicine',
    'Critical Care',
    'team-based-simulation',
  ],
  ['gi-bleed', 'GI Bleed', 'Gastroenterology', 'Critical Care', 'virtual-patient-case'],
  [
    'abnormal-lab-escalation',
    'Abnormal Lab Escalation',
    'Laboratory',
    'Laboratory',
    'lab-interpretation-simulation',
  ],
  [
    'device-alarm-failure',
    'Device Alarm Failure',
    'Biomedical Engineering',
    'Medical IoT / Device Failure',
    'device-alarm-simulation',
  ],
  [
    'hospital-bed-surge',
    'Hospital Bed Surge',
    'Operations',
    'Fleet / Disaster Response',
    'hospital-operations-simulation',
  ],
  [
    'mass-casualty-incident',
    'Mass Casualty Incident',
    'Disaster Response',
    'Fleet / Disaster Response',
    'disaster-mass-casualty-scenario',
  ],
].map(([id, title, specialty, category, type], index) => ({
  id,
  title,
  specialty,
  category,
  type: type as SimulationScenario['type'],
  difficulty: index % 3 === 0 ? 'Advanced' : index % 2 === 0 ? 'Intermediate' : 'Beginner',
  estimatedDurationMinutes: 10 + (index % 5) * 3,
  learningObjectives: [
    `Recognize the key safety risk in ${title}`,
    'Use available tools as decision support only',
    'Practice closed-loop escalation and debriefing',
  ],
  requiredTools:
    category === 'Laboratory'
      ? ['Laboratory', 'Lab Interpreter']
      : category.includes('IoT')
        ? ['Medical IoT', 'Device Fleet']
        : category.includes('Fleet')
          ? ['Hospital Map', 'Fleet Map']
          : ['AI Tutor', 'Clinical calculators', 'Team communication'],
  targetRoles: category.includes('Fleet')
    ? ['operations', 'fleet operator']
    : category.includes('IoT')
      ? ['biomedical engineer', 'nurse']
      : ['emergency physician', 'nurse', 'medical student'],
  status: 'demo-ready',
  dataMode: DATA_MODE,
  caseStem: `${title} demo scenario for simulation, competency tracking, and structured debriefing.`,
  criticalActions: [
    'Recognize deterioration or safety risk',
    'Verify objective data',
    'Escalate using closed-loop communication',
    'Document tool usage and debrief learning point',
  ],
}));

@Injectable()
export class SimulationScenarioService {
  getScenarios() {
    return {
      sourceStatus: 'demo-local-state',
      dataMode: DATA_MODE,
      scenarios: SCENARIOS,
    };
  }

  getScenario(id: string) {
    const scenario = SCENARIOS.find((item) => item.id === id);
    if (!scenario) throw new NotFoundException(`Simulation scenario not found: ${id}`);
    return {
      sourceStatus: 'demo-local-state',
      dataMode: DATA_MODE,
      scenario,
    };
  }

  findScenario(id: string) {
    return SCENARIOS.find((item) => item.id === id) || null;
  }

  recommend(role = 'medical student') {
    const normalized = role.toLowerCase();
    const scenarios =
      normalized.includes('fleet') || normalized.includes('operations')
        ? SCENARIOS.filter((item) => item.category.includes('Fleet'))
        : normalized.includes('biomedical')
          ? SCENARIOS.filter((item) => item.category.includes('IoT'))
          : normalized.includes('nurse')
            ? SCENARIOS.filter((item) =>
                ['Medication Safety', 'Laboratory', 'Medical IoT / Device Failure'].includes(
                  item.category,
                ),
              )
            : SCENARIOS.filter((item) =>
                ['Emergency', 'Cardiology', 'Trauma'].includes(item.category),
              );
    return {
      sourceStatus: 'demo-local-state',
      role,
      scenarios: scenarios.slice(0, 4),
    };
  }
}

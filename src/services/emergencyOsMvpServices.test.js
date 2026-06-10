import { describe, expect, it } from 'vitest';
import DoorToDoctorIntelligenceService from './doorToDoctorIntelligenceService';
import EmsOffloadCommandCenterService from './emsOffloadCommandCenterService';
import EmergencyDemoEnvironmentService from './emergencyDemoEnvironmentService';
import EmergencyEscalationEngineService from './emergencyEscalationEngineService';
import EmergencyKPILayerService from './emergencyKpiLayerService';
import EmergencyResourceBoardService from './emergencyResourceBoardService';
import EmergencySimulationScenariosService from './emergencySimulationScenariosService';
import ReassessmentAutomationService from './reassessmentAutomationService';
import WaitingRoomIntelligenceService from './waitingRoomIntelligenceService';

describe('Emergency OS MVP services', () => {
  it('builds throughput, waiting room, reassessment, EMS, resource, escalation, KPI, simulation, and demo contracts', () => {
    const throughput = DoorToDoctorIntelligenceService.getDashboard();
    const waitingRoom = WaitingRoomIntelligenceService.getWaitingRoomDashboard();
    const reassessment = ReassessmentAutomationService.getDashboard();
    const ems = EmsOffloadCommandCenterService.getDashboard();
    const resources = EmergencyResourceBoardService.getResourceBoard();
    const escalations = EmergencyEscalationEngineService.getEscalationDashboard();
    const kpis = EmergencyKPILayerService.getKpiLayer();
    const simulations = EmergencySimulationScenariosService.getScenarioDashboard();
    const demo = EmergencyDemoEnvironmentService.getDemoEnvironment();

    expect(throughput.kpi.metricId).toBe('doorToDoctor');
    expect(throughput.checkpoints).toEqual(['arrivalTime', 'triageTime', 'providerTime']);
    expect(waitingRoom.riskState).toMatch(/Normal|Busy|Critical/);
    expect(waitingRoom.sourceState).toMatch(/Demo data/);
    expect(reassessment.queue.label).toBe('ReassessmentQueue');
    expect(reassessment.queue.items.length).toBeGreaterThan(0);
    expect(ems.metrics.waitingHandoffs).toBeGreaterThan(0);
    expect(resources.resources.map((resource) => resource.label)).toEqual(
      expect.arrayContaining(['Rooms', 'Stretchers', 'Monitors', 'Telemetry Units', 'Infusion Pumps'])
    );
    expect(escalations.escalations.length).toBeGreaterThan(0);
    expect(kpis.metricById).toEqual(
      expect.objectContaining({
        doorToDoctor: expect.objectContaining({
          label: 'Door-to-Doctor',
          median: expect.any(Number),
          p90: expect.any(Number),
          longestActiveDuration: expect.any(Number),
        }),
        lengthOfStay: expect.objectContaining({
          label: 'Length of Stay',
          median: expect.any(Number),
          p90: expect.any(Number),
          longestActiveDuration: expect.any(Number),
        }),
        emsOffload: expect.objectContaining({ label: 'EMS Offload' }),
      })
    );
    expect(simulations.scenarios.map((scenario) => scenario.scenarioName)).toEqual(
      expect.arrayContaining(['Mass Casualty', 'Sepsis Surge', 'Stroke Surge', 'EMS Overload', 'Boarding Crisis'])
    );
    expect(demo.metrics.patientCount).toBeGreaterThanOrEqual(100);
    expect(demo.labels).toEqual(expect.arrayContaining(['Demo data', 'No live integration']));
  });
});

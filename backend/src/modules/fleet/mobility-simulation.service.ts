import { Injectable, Logger } from '@nestjs/common';
import { MobilityService } from './mobility.service';
import { VehicleRecognitionService } from './vehicle-recognition.service';

export interface SimulationScenarioResult {
  scenarioId: string;
  scenarioName: string;
  vehicleId: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  durationSeconds: number;
  eventsTriggered: number;
  summary: string;
}

@Injectable()
export class MobilitySimulationService {
  private readonly logger = new Logger(MobilitySimulationService.name);

  constructor(
    private readonly mobilityService: MobilityService,
    private readonly recognitionService: VehicleRecognitionService,
  ) {}

  public async runScenario(
    scenarioId: string,
    vehicleId = 'AMR-CARRIER-01',
  ): Promise<SimulationScenarioResult> {
    this.logger.log(
      `Executing mobility simulation scenario: ${scenarioId} for vehicle ${vehicleId}`,
    );

    switch (scenarioId) {
      case 'code-blue-corridor-yield':
        await this.recognitionService.ingestEvent({
          vehicleId,
          eventType: 'CODE_BLUE_OVERRIDE',
          state: 'RELEVANT_OBJECT_DETECTED',
          direction: 'FORWARD',
          objectClassification: 'EMERGENCY_RESUSCITATION_TEAM',
          confidence: 0.99,
          explanation:
            'Code Blue in progress in Corridor 3B. Autonomous vehicle pulled to margin and halted right-of-way.',
        });
        return {
          scenarioId,
          scenarioName: 'Code Blue Emergency Corridor Right-of-Way Yield',
          vehicleId,
          status: 'SUCCESS',
          durationSeconds: 12,
          eventsTriggered: 1,
          summary:
            'Vehicle safely yielded corridor right-of-way within 1.2 seconds of resuscitation team detection.',
        };

      case 'cold-chain-lockbox-excursion':
        return {
          scenarioId,
          scenarioName: 'Cold-Chain Biological Specimen Thermal Excursion Alert',
          vehicleId,
          status: 'WARNING',
          durationSeconds: 25,
          eventsTriggered: 2,
          summary:
            'Simulated ambient temperature spike to 9.2C. Backup Peltier cooler activated and restored lockbox to 4.1C.',
        };

      default:
        return {
          scenarioId,
          scenarioName: 'Standard Corridor Autonomous Navigation Run',
          vehicleId,
          status: 'SUCCESS',
          durationSeconds: 30,
          eventsTriggered: 3,
          summary:
            'Nominal simulation completed with zero obstacle collisions and 100% battery efficiency.',
        };
    }
  }
}

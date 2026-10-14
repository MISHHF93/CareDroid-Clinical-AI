import { Injectable, Logger } from '@nestjs/common';
import { RecognitionEvent, RecognitionState } from './mobility.types';

@Injectable()
export class VehicleRecognitionService {
  private readonly logger = new Logger(VehicleRecognitionService.name);

  private readonly events: RecognitionEvent[] = [];

  constructor() {
    this.seedDefaultEvents();
  }

  private seedDefaultEvents(): void {
    const defaultEvent: RecognitionEvent = {
      id: 'REC-EVT-001',
      vehicleId: 'AMR-CARRIER-01',
      eventType: 'OBSTACLE_SCAN',
      state: 'RECOGNITION_COMPLETED_NO_RELEVANT_OBJECT',
      direction: 'FORWARD',
      coverageSector: 'CENTER_60_DEG',
      confidence: 0.98,
      sensorHealth: { primaryOptical: true, secondaryLidar: true, rearSonar: true },
      explanation: 'Forward corridor clear. Path safe for autonomous navigation.',
      timestampIso: new Date().toISOString(),
    };

    this.events.unshift(defaultEvent);
  }

  public getEvents(vehicleId?: string): RecognitionEvent[] {
    if (vehicleId) {
      return this.events.filter((e) => e.vehicleId === vehicleId);
    }
    return this.events;
  }

  public getLatestEvent(vehicleId: string): RecognitionEvent | undefined {
    return this.events.find((e) => e.vehicleId === vehicleId);
  }

  public async ingestEvent(params: {
    vehicleId: string;
    eventType: string;
    state: RecognitionState;
    direction?: 'FORWARD' | 'REAR' | 'PORT' | 'STARBOARD' | 'OMNIDIRECTIONAL';
    coverageSector?: string;
    objectClassification?: string;
    confidence?: number;
    sensorHealth?: { primaryOptical?: boolean; secondaryLidar?: boolean; rearSonar?: boolean };
    explanation?: string;
  }): Promise<RecognitionEvent> {
    const event: RecognitionEvent = {
      id: `REC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      vehicleId: params.vehicleId,
      eventType: params.eventType,
      state: params.state,
      direction: params.direction || 'FORWARD',
      coverageSector: params.coverageSector || 'CENTER_60_DEG',
      objectClassification: params.objectClassification,
      confidence: params.confidence ?? 0.9,
      sensorHealth: params.sensorHealth || {
        primaryOptical: true,
        secondaryLidar: true,
        rearSonar: true,
      },
      explanation: params.explanation || 'Sensor evaluation completed.',
      timestampIso: new Date().toISOString(),
    };

    this.events.unshift(event);
    if (this.events.length > 500) {
      this.events.pop();
    }

    return event;
  }
}

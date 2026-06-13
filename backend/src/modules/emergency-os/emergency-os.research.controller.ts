import { Body, Controller, Post } from '@nestjs/common';
import {
  AICallInterrogationService,
  type EmergencyCall,
} from '../../services/ai-call-interrogation.service';
import { FederatedEMSService, type EMS112Call } from '../../services/federated-ems.service';
import { LMECSService, type HospitalClient } from '../../services/lmecs.service';
import {
  OrganizationalDigitalTwin,
  type EDState,
} from '../../services/organizational-digital-twin.service';
import { ERPulseHandoverService } from '../../services/smart-handover-v2.service';

interface HandoverRequest {
  patientId?: string;
  patient?: Record<string, unknown>;
}

interface CallInterrogationRequest {
  callId?: string;
  audioBase64?: string;
  transcriptHint?: string;
  callerLanguage?: string;
  backgroundNoise?: number;
  timestamp?: string;
}

@Controller('handover')
export class ERPulseHandoverController {
  constructor(private readonly handoverService: ERPulseHandoverService) {}

  @Post('er-pulse')
  generateERPulseHandover(@Body() dto: HandoverRequest) {
    const patientId =
      dto.patientId || String(dto.patient?.patientId || dto.patient?.id || 'demo-patient');
    return this.handoverService.generateHandoverSummary(patientId, dto.patient as any);
  }
}

@Controller('ems/federated')
export class FederatedEMSController {
  constructor(private readonly federatedEMSService: FederatedEMSService) {}

  @Post('112-call')
  async process112Call(@Body() dto: Partial<EMS112Call>) {
    const call = this.normalizeCall(dto);
    const [triage, dispatch] = await Promise.all([
      this.federatedEMSService.processEmergencyCall(call),
      this.federatedEMSService.coordinateDispatch(call),
    ]);

    return {
      callId: call.callId,
      triage,
      dispatch,
      privacyMode: 'edge-inference-federated-learning',
      researchMetrics: {
        triageAccuracyTarget: 0.72,
        dispatchTimeReductionTarget: 0.27,
        bandwidthSavingsTarget: 0.985,
      },
    };
  }

  private normalizeCall(dto: Partial<EMS112Call>): EMS112Call {
    return {
      callId: dto.callId || `112-${Date.now()}`,
      timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
      location: dto.location || { lat: 43.6532, lng: -79.3832, accuracy: 25 },
      urgencyLevel: dto.urgencyLevel || 'emergency',
      callerMetadata: {
        language: dto.callerMetadata?.language || 'en',
        distressLevel: dto.callerMetadata?.distressLevel ?? 7,
        backgroundNoise: dto.callerMetadata?.backgroundNoise ?? 35,
      },
      wearableData: dto.wearableData,
    };
  }
}

@Controller('federated/lmecs')
export class LMECSController {
  constructor(private readonly lmecsService: LMECSService) {}

  @Post('select')
  selectClients(@Body() dto: { clients?: HospitalClient[] }) {
    const clients = dto.clients?.length ? dto.clients : this.defaultClients();
    return this.lmecsService.selectOptimalClients(clients);
  }

  @Post('predict')
  predictSeverity(@Body() dto: { patientData?: Record<string, unknown>; hospitalId?: string }) {
    return this.lmecsService.predictSeverity(
      dto.patientData || {},
      dto.hospitalId || 'demo-hospital',
    );
  }

  private defaultClients(): HospitalClient[] {
    const now = new Date();
    return [
      {
        id: 'ed-client-a',
        dataDistribution: 'similar',
        localModelPerformance: { accuracy: 0.81, loss: 0.22, lastEvaluation: now },
        selectionPriority: 0,
      },
      {
        id: 'ed-client-b',
        dataDistribution: 'dissimilar',
        localModelPerformance: { accuracy: 0.84, loss: 0.2, lastEvaluation: now },
        selectionPriority: 0,
      },
      {
        id: 'ed-client-c',
        dataDistribution: 'dissimilar',
        localModelPerformance: { accuracy: 0.76, loss: 0.29, lastEvaluation: now },
        selectionPriority: 0,
      },
    ];
  }
}

@Controller('ems')
export class AICallInterrogationController {
  constructor(private readonly callInterrogationService: AICallInterrogationService) {}

  @Post('ai-call-interrogation')
  async detectOHCA(@Body() dto: CallInterrogationRequest) {
    const call = this.normalizeEmergencyCall(dto);
    const detection = await this.callInterrogationService.detectOHCA(call);
    const dispatch = await this.callInterrogationService.recommendDispatch(detection);
    return { callId: call.callId, detection, dispatch };
  }

  @Post('ai-call-interrogation/ecg')
  interpretECG(@Body() dto: { ecgData?: number[] }) {
    return this.callInterrogationService.interpretECG(dto.ecgData || []);
  }

  private normalizeEmergencyCall(dto: CallInterrogationRequest): EmergencyCall {
    return {
      callId: dto.callId || `ems-call-${Date.now()}`,
      audioStream: dto.audioBase64
        ? Buffer.from(dto.audioBase64, 'base64')
        : Buffer.from(dto.transcriptHint || '', 'utf8'),
      callerLanguage: dto.callerLanguage || 'en',
      backgroundNoise: dto.backgroundNoise ?? 30,
      timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
      transcriptHint: dto.transcriptHint,
    };
  }
}

@Controller('emergency/digital-twin/organizational')
export class OrganizationalDigitalTwinController {
  constructor(private readonly organizationalDigitalTwin: OrganizationalDigitalTwin) {}

  @Post('synchronize')
  synchronizePatientFlow(@Body() dto: Partial<EDState>) {
    return this.organizationalDigitalTwin.synchronizePatientFlow(dto);
  }

  @Post('simulate')
  runPredictiveSimulation(@Body() dto: { scenario?: string }) {
    return this.organizationalDigitalTwin.runPredictiveSimulation(dto.scenario || 'baseline');
  }
}

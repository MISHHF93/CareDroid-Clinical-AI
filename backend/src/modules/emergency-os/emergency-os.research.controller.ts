import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  AICallInterrogationService,
  type EmergencyCall,
} from '../../services/ai-call-interrogation.service';
import { FederatedEMSService, type EMS112Call } from '../../services/federated-ems.service';
import { LMECSService, type HospitalClient } from '../../services/lmecs.service';
import { OrganizationalDigitalTwin } from '../../services/organizational-digital-twin.service';
import { ERPulseHandoverService } from '../../services/smart-handover-v2.service';
import { SkipTenantIsolation } from '../tenant-context/tenant-scope.decorator';
import {
  HandoverRequestDto,
  Process112CallDto,
  SelectClientsDto,
  PredictSeverityDto,
  CallInterrogationRequestDto,
  InterpretEcgDto,
  SynchronizePatientFlowDto,
  RunPredictiveSimulationDto,
  FederatedTrainingRoundDto,
} from './dto/emergency-os-research-actions.dto';

/**
 * These research/demo controllers (federated EMS, LMECS, AI call
 * interrogation, digital twin, ER Pulse handover) previously had no guards at
 * all — unlike every other emergency-os controller, they accepted patient
 * data (chief complaints, ECG samples, wearable data, patient records) from
 * completely unauthenticated requests. They're @SkipTenantIsolation() rather
 * than tenant-scoped like EmergencyOsController because they don't carry an
 * organizationId/workspaceId and operate on request-body payloads directly,
 * not tenant-scoped DB records — but they still require a valid authenticated
 * user, matching every other PHI-adjacent endpoint in this module.
 */

@UseGuards(AuthGuard('jwt'))
@SkipTenantIsolation()
@Controller('handover')
export class ERPulseHandoverController {
  constructor(private readonly handoverService: ERPulseHandoverService) {}

  @Post('er-pulse')
  generateERPulseHandover(@Body() dto: HandoverRequestDto) {
    const patientId =
      dto.patientId || String(dto.patient?.patientId || dto.patient?.id || 'demo-patient');
    return this.handoverService.generateHandoverSummary(patientId, dto.patient as any);
  }
}

@UseGuards(AuthGuard('jwt'))
@SkipTenantIsolation()
@Controller('ems/federated')
export class FederatedEMSController {
  constructor(private readonly federatedEMSService: FederatedEMSService) {}

  @Get()
  info() {
    return {
      path: '/federated',
      version: 'v1',
      description: 'federated learning',
      status: 'active',
    };
  }

  @Get('health')
  health() {
    return {
      status: 'ready',
      service: 'federated-ems',
    };
  }

  @Post('round')
  async trainingRound(@Body() dto: FederatedTrainingRoundDto) {
    const hospitalId = dto.hospitalId || dto.hospital_id || 'integration-hospital';
    const localModel = dto.localModel || dto.local_model;

    this.federatedEMSService.registerLocalModel({
      hospitalId,
      localModel: localModel || { urgency: 0.35, distress: 0.24, physiology: 0.31 },
      globalModelVersion: dto.globalModelVersion || 'fed-ems-edge-v1',
      lastSync: new Date(),
      dataQualityScore: Number(dto.dataQualityScore ?? 0.9),
    });
    await this.federatedEMSService.federatedTrainingRound();

    return {
      success: true,
      round: {
        status: 'completed',
        contributor: hospitalId,
      },
    };
  }

  @Post('112-call')
  async process112Call(@Body() dto: Process112CallDto) {
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

  private normalizeCall(dto: Process112CallDto): EMS112Call {
    return {
      callId: dto.callId || `112-${Date.now()}`,
      timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
      location: {
        lat: dto.location?.lat ?? 43.6532,
        lng: dto.location?.lng ?? -79.3832,
        accuracy: dto.location?.accuracy ?? 25,
      },
      urgencyLevel: dto.urgencyLevel || 'emergency',
      callerMetadata: {
        language: dto.callerMetadata?.language || 'en',
        distressLevel: dto.callerMetadata?.distressLevel ?? 7,
        backgroundNoise: dto.callerMetadata?.backgroundNoise ?? 35,
      },
      wearableData: dto.wearableData
        ? {
            heartRate: dto.wearableData.heartRate ?? 0,
            oxygenSaturation: dto.wearableData.oxygenSaturation ?? 0,
            fallDetected: dto.wearableData.fallDetected ?? false,
          }
        : undefined,
    };
  }
}

@UseGuards(AuthGuard('jwt'))
@SkipTenantIsolation()
@Controller('federated/lmecs')
export class LMECSController {
  constructor(private readonly lmecsService: LMECSService) {}

  @Post('select')
  selectClients(@Body() dto: SelectClientsDto) {
    const clients = dto.clients?.length ? dto.clients : this.defaultClients();
    return this.lmecsService.selectOptimalClients(clients);
  }

  @Post('predict')
  predictSeverity(@Body() dto: PredictSeverityDto) {
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

@UseGuards(AuthGuard('jwt'))
@SkipTenantIsolation()
@Controller('ems')
export class AICallInterrogationController {
  constructor(private readonly callInterrogationService: AICallInterrogationService) {}

  @Post('ai-call-interrogation')
  async detectOHCA(@Body() dto: CallInterrogationRequestDto) {
    const call = this.normalizeEmergencyCall(dto);
    const detection = await this.callInterrogationService.detectOHCA(call);
    const dispatch = await this.callInterrogationService.recommendDispatch(detection);
    return { callId: call.callId, detection, dispatch };
  }

  @Post('ai-call-interrogation/ecg')
  interpretECG(@Body() dto: InterpretEcgDto) {
    return this.callInterrogationService.interpretECG(dto.ecgData || []);
  }

  private normalizeEmergencyCall(dto: CallInterrogationRequestDto): EmergencyCall {
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

@UseGuards(AuthGuard('jwt'))
@SkipTenantIsolation()
@Controller('emergency/digital-twin/organizational')
export class OrganizationalDigitalTwinController {
  constructor(private readonly organizationalDigitalTwin: OrganizationalDigitalTwin) {}

  @Post('synchronize')
  synchronizePatientFlow(@Body() dto: SynchronizePatientFlowDto) {
    return this.organizationalDigitalTwin.synchronizePatientFlow(dto);
  }

  @Post('simulate')
  runPredictiveSimulation(@Body() dto: RunPredictiveSimulationDto) {
    return this.organizationalDigitalTwin.runPredictiveSimulation(dto.scenario || 'baseline');
  }
}

import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAIPrompt } from '../../../../lib/ai/promptRegistry';
import { appendRequiredDisclaimer } from '../../../../lib/ai/safetyPolicy';
import {
  buildOperationalContextFromCounts,
  buildTriageAssistEnvelope,
  mergeLlmTriageEnrichment,
  patientInputFromEmergencyRecord,
  type TriageAssistEnvelope,
} from '../../../../lib/patient-orchestration';
import { ChatService } from '../chat/chat.service';
import {
  EmergencyPatientService,
  EmergencySettingsService,
} from './emergency-os.services';
import { OperationalIntelligenceService } from './emergency-os.operational-intelligence.service';
import type { EmergencyPatient } from './emergency-os.types';

export interface TriageAssistHandoffContext {
  source?: string;
  arrivalReason?: string;
  encounterId?: string | null;
  verificationSummary?: string;
  complaintCategory?: string;
}

@Injectable()
export class PatientOrchestrationService {
  private readonly logger = new Logger(PatientOrchestrationService.name);

  constructor(
    private readonly patientService: EmergencyPatientService,
    private readonly settingsService: EmergencySettingsService,
    private readonly operationalIntelligenceService: OperationalIntelligenceService,
    private readonly configService: ConfigService,
    @Optional() private readonly chatService?: ChatService,
  ) {}

  async buildTriageAssist(
    patientId: string,
    handoffContext: TriageAssistHandoffContext = {},
  ): Promise<TriageAssistEnvelope> {
    const patient = this.patientService
      .listPatients()
      .find((candidate) => candidate.id === patientId);
    if (!patient) {
      throw new Error(`Emergency patient ${patientId} not found`);
    }

    const operationalContext = this.buildOperationalContext();
    const patientInput = patientInputFromEmergencyRecord({
      ...patient,
      chiefComplaint: handoffContext.arrivalReason || patient.chiefComplaint,
      complaintCategory: handoffContext.complaintCategory || patient.complaintCategory,
    });

    let envelope = buildTriageAssistEnvelope(patientInput, {
      operationalContext,
      handoffContext: handoffContext as Record<string, unknown>,
    });

    if (this.isLlmTriageAssistEnabled()) {
      try {
        const enrichment = await this.enrichWithLlm(patient, envelope, handoffContext);
        envelope = mergeLlmTriageEnrichment(envelope, enrichment);
      } catch (error) {
        this.logger.warn(
          `LLM triage assist enrichment failed for ${patientId}: ${(error as Error).message}`,
        );
      }
    }

    this.patientService.patchPatient(patientId, {
      triageAssist: envelope,
      triageAssistGeneratedAt: envelope.generatedAt,
    });

    return envelope;
  }

  private buildOperationalContext() {
    const patients = this.patientService.listPatients();
    const oiEnvelope = this.operationalIntelligenceService.getSnapshotEnvelope();
    const capacityBand =
      (oiEnvelope?.data as { scores?: Array<{ id?: string; band?: string }> })?.scores?.find(
        (score) => score.id === 'capacity',
      )?.band || undefined;

    return buildOperationalContextFromCounts({
      triageCount: patients.filter((patient) => patient.state === 'Triage').length,
      waitingCount: patients.filter((patient) => patient.state === 'Waiting').length,
      emsInboundCount: patients.filter((patient) => patient.flags?.includes('EMSArrival')).length,
      capacityBand,
    });
  }

  private isLlmTriageAssistEnabled(): boolean {
    const settings = this.settingsService.getSettings().data;
    const apiKey =
      this.configService.get<string>('ANTHROPIC_API_KEY') ||
      process.env.ANTHROPIC_API_KEY ||
      '';
    return Boolean(settings.aiSettings?.triageAssistEnabled && apiKey && this.chatService);
  }

  private async enrichWithLlm(
    patient: EmergencyPatient,
    envelope: TriageAssistEnvelope,
    handoffContext: TriageAssistHandoffContext,
  ) {
    const prompt = getAIPrompt('triage-assistant');
    const message = [
      'Review this post-handoff triage assist request. Respond with 2-4 short rationale bullets only.',
      `Patient: ${patient.firstName} ${patient.lastName} (${patient.mrn})`,
      `Complaint: ${handoffContext.arrivalReason || patient.chiefComplaint}`,
      `Category: ${handoffContext.complaintCategory || patient.complaintCategory}`,
      `Rule engine suggested ${envelope.suggestedPriority} (${envelope.ruleTriggered}).`,
      `Baseline rationale: ${envelope.rationale.join(' | ')}`,
      'Do not change priority autonomously. Flag reassessment needs if appropriate.',
    ].join('\n');

    const response = await this.chatService!.processMessage(
      message,
      undefined,
      'triage-assist',
      undefined,
      'triage-orchestration',
      'triage_nurse',
      undefined,
      {
        aiRequest: {
          requestType: prompt.requestType,
          patientId: patient.id,
          purpose: 'Post-handoff triage assist enrichment',
          sourceModule: 'patient-orchestration',
        },
      },
      undefined,
      [],
    );

    const text = appendRequiredDisclaimer(response.text || '');
    const bullets = text
      .split('\n')
      .map((line) => line.replace(/^[-*•\d.)]+\s*/, '').trim())
      .filter((line) => line.length > 12);

    return {
      summary: bullets[0] || text.slice(0, 240),
      additionalRationale: bullets.slice(1, 4),
      reassessmentFlags: bullets.filter((line) => /reassess/i.test(line)),
    };
  }
}

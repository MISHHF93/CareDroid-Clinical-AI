import { Module } from '@nestjs/common';
import { EmergencyOsModule } from '../emergency-os/emergency-os.module';
import { ToolOrchestratorModule } from '../medical-control-plane/tool-orchestrator/tool-orchestrator.module';
import { AiModule } from '../ai/ai.module';
import { AuditModule } from '../audit/audit.module';
import { ChiefInvestigationService } from './chief-investigation.service';
import { ChiefInvestigationController } from './chief-investigation.controller';

/**
 * First vertical slice of the Clinical Agent Command Platform.
 * See CLINICAL_AGENT_COMMAND_PLATFORM.md — this module proves the full chain:
 * human command -> context verification -> planning -> capability discovery ->
 * deterministic tool invocation -> evidence/provenance -> synthesis with
 * truthful states -> human approval gate (AiActionProposal) -> audit/event.
 */
@Module({
  imports: [EmergencyOsModule, ToolOrchestratorModule, AiModule, AuditModule],
  controllers: [ChiefInvestigationController],
  providers: [ChiefInvestigationService],
  exports: [ChiefInvestigationService],
})
export class ChiefInvestigationModule {}

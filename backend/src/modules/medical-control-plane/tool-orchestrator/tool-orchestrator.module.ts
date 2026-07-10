import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ToolOrchestratorService } from './tool-orchestrator.service';
import { ToolOrchestratorController } from './tool-orchestrator.controller';
import { SofaCalculatorService } from './services/sofa-calculator.service';
import { DrugCheckerService } from './services/drug-checker.service';
import { LabInterpreterService } from './services/lab-interpreter.service';
import { HeartScoreService } from './services/heart-score.service';
import { Cha2ds2VascCalculatorService } from './services/cha2ds2vasc-calculator.service';
import { WellsPeService } from './services/wells-pe.service';
import { ShockIndexService } from './services/shock-index.service';
import { Apache2CalculatorService } from './services/apache2-calculator.service';
import { AnionGapService } from './services/anion-gap.service';
import { AaGradientService } from './services/aa-gradient.service';
import { News2Service } from './services/news2.service';
import { Abcd2Service } from './services/abcd2.service';
import { CanadianCSpineService } from './services/canadian-c-spine.service';
import { NexusCSpineService } from './services/nexus-cspine.service';
import { GcsCalculatorService } from './services/gcs-calculator.service';
import { AiModule } from '../../ai/ai.module';
import { AuditModule } from '../../audit/audit.module';
import { MetricsModule } from '../../metrics/metrics.module';
import { ToolResult } from './entities/tool-result.entity';
import { PlatformGovernanceModule } from '../../platform-governance';

@Module({
  imports: [
    AiModule,
    AuditModule,
    MetricsModule,
    PlatformGovernanceModule,
    TypeOrmModule.forFeature([ToolResult]),
  ],
  controllers: [ToolOrchestratorController],
  providers: [
    ToolOrchestratorService,
    SofaCalculatorService,
    DrugCheckerService,
    LabInterpreterService,
    HeartScoreService,
    Cha2ds2VascCalculatorService,
    WellsPeService,
    ShockIndexService,
    Apache2CalculatorService,
    AnionGapService,
    AaGradientService,
    News2Service,
    Abcd2Service,
    CanadianCSpineService,
    NexusCSpineService,
    GcsCalculatorService,
  ],
  exports: [ToolOrchestratorService],
})
export class ToolOrchestratorModule {}

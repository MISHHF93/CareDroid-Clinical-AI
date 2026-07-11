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
import { Chads2Service } from './services/chads2.service';
import { DukeTreadmillScoreService } from './services/duke-treadmill-score.service';
import { ReynoldsRiskScoreService } from './services/reynolds-risk-score.service';
import { HasBledService } from './services/has-bled.service';
import { TimiUaNstemiService } from './services/timi-ua-nstemi.service';
import { FraminghamRiskService } from './services/framingham-risk.service';
import { GraceAcsService } from './services/grace-acs.service';
import { CorrectedCalciumService } from './services/corrected-calcium.service';
import { CorrectedSodiumService } from './services/corrected-sodium.service';
import { FenaService } from './services/fena.service';
import { FeureaService } from './services/feurea.service';
import { OsmolalGapService } from './services/osmolal-gap.service';
import { SerumOsmolalityService } from './services/serum-osmolality.service';
import { Pao2Fio2RatioService } from './services/pao2-fio2-ratio.service';
import { RoxIndexService } from './services/rox-index.service';
import { MewsService } from './services/mews.service';
import { RevisedTraumaScoreService } from './services/revised-trauma-score.service';
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
    Chads2Service,
    DukeTreadmillScoreService,
    ReynoldsRiskScoreService,
    HasBledService,
    TimiUaNstemiService,
    FraminghamRiskService,
    GraceAcsService,
    CorrectedCalciumService,
    CorrectedSodiumService,
    FenaService,
    FeureaService,
    OsmolalGapService,
    SerumOsmolalityService,
    Pao2Fio2RatioService,
    RoxIndexService,
    MewsService,
    RevisedTraumaScoreService,
  ],
  exports: [ToolOrchestratorService],
})
export class ToolOrchestratorModule {}

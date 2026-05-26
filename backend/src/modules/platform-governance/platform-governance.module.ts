import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { MetricsModule } from '../metrics/metrics.module';
import { PlatformGovernanceController } from './platform-governance.controller';
import { PlatformGovernanceService } from './platform-governance.service';
import {
  PlatformConsentRecord,
  PlatformEquityMetric,
  PlatformGovernancePolicy,
  PlatformObservabilityEvent,
  PlatformPrivacyRequest,
  PlatformRegulatoryClassification,
  PlatformReviewItem,
  PlatformSecurityEvent,
  PlatformSourceProvenance,
  PlatformValidationScenario,
} from './entities/platform-governance.entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlatformGovernancePolicy,
      PlatformSecurityEvent,
      PlatformRegulatoryClassification,
      PlatformEquityMetric,
      PlatformValidationScenario,
      PlatformReviewItem,
      PlatformConsentRecord,
      PlatformPrivacyRequest,
      PlatformObservabilityEvent,
      PlatformSourceProvenance,
    ]),
    AuditModule,
    MetricsModule,
  ],
  controllers: [PlatformGovernanceController],
  providers: [PlatformGovernanceService],
  exports: [PlatformGovernanceService],
})
export class PlatformGovernanceModule {}

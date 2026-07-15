import { forwardRef, Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PlatformSystemsController } from './platform-systems.controller';
import { GovernanceController } from './governance.controller';
import { ClinicalIntelligenceController } from './clinical-intelligence.controller';
import { PlatformSystemsService } from './platform-systems.service';
import { PlatformGovernanceModule } from '../platform-governance';
import { EmergencyOsModule } from '../emergency-os/emergency-os.module';

@Module({
  imports: [AuditModule, PlatformGovernanceModule, forwardRef(() => EmergencyOsModule)],
  controllers: [PlatformSystemsController, GovernanceController, ClinicalIntelligenceController],
  providers: [PlatformSystemsService],
  exports: [PlatformSystemsService],
})
export class PlatformSystemsModule {}

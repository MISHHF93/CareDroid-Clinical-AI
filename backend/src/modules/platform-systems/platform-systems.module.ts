import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PlatformSystemsController } from './platform-systems.controller';
import { PlatformSystemsService } from './platform-systems.service';
import { PlatformGovernanceModule } from '../platform-governance';

@Module({
  imports: [AuditModule, PlatformGovernanceModule],
  controllers: [PlatformSystemsController],
  providers: [PlatformSystemsService],
  exports: [PlatformSystemsService],
})
export class PlatformSystemsModule {}

import { Module } from '@nestjs/common';
import { PlatformSystemsController } from './platform-systems.controller';
import { PlatformSystemsService } from './platform-systems.service';
import { PlatformGovernanceModule } from '../platform-governance';

@Module({
  imports: [PlatformGovernanceModule],
  controllers: [PlatformSystemsController],
  providers: [PlatformSystemsService],
  exports: [PlatformSystemsService],
})
export class PlatformSystemsModule {}

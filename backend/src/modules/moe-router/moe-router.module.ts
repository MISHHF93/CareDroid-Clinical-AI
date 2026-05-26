import { Module } from '@nestjs/common';
import { ExpertSelectorService } from './expert-selector.service';
import { MoERouterService } from './moe-router.service';

@Module({
  providers: [ExpertSelectorService, MoERouterService],
  exports: [ExpertSelectorService, MoERouterService],
})
export class MoERouterModule {}

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { AIQuery } from './entities/ai-query.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { User } from '../users/entities/user.entity';
import { AuditModule } from '../audit/audit.module';
import { MetricsModule } from '../metrics/metrics.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PlatformGovernanceModule } from '../platform-governance';
import { PlatformAssetsModule } from '../platform-assets/platform-assets.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { IntentClassifierModule } from '../medical-control-plane/intent-classifier/intent-classifier.module';
import {
  AiContextManagerService,
  AiGatewayService,
  AiResponseComposerService,
  AiRoutingEngineService,
} from './foundation';

@Module({
  imports: [
    TypeOrmModule.forFeature([AIQuery, Subscription, User]),
    AuditModule,
    MetricsModule,
    OrganizationsModule,
    PlatformGovernanceModule,
    PlatformAssetsModule,
    SubscriptionsModule,
    forwardRef(() => IntentClassifierModule),
  ],
  controllers: [AIController],
  providers: [
    AIService,
    AiGatewayService,
    AiRoutingEngineService,
    AiContextManagerService,
    AiResponseComposerService,
  ],
  exports: [
    AIService,
    AiGatewayService,
    AiRoutingEngineService,
    AiContextManagerService,
    AiResponseComposerService,
  ],
})
export class AiModule {}

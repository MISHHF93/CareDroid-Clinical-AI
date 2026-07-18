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
import { CollaborationHubModule } from '../collaboration-hub/collaboration-hub.module';
import {
  AiContextManagerService,
  AiResponseComposerService,
  AiRoutingEngineService,
} from './foundation';
import { AiActionProposalService } from './ai-action-proposal.service';
import { AIActionProposalRecord } from './entities/ai-action-proposal-record.entity';
import { AIActionProposalAuditEntry } from './entities/ai-action-proposal-audit-entry.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AIQuery,
      AIActionProposalRecord,
      AIActionProposalAuditEntry,
      Subscription,
      User,
    ]),
    AuditModule,
    MetricsModule,
    OrganizationsModule,
    PlatformGovernanceModule,
    PlatformAssetsModule,
    SubscriptionsModule,
    CollaborationHubModule,
    forwardRef(() => IntentClassifierModule),
  ],
  controllers: [AIController],
  providers: [
    AIService,
    AiActionProposalService,
    AiRoutingEngineService,
    AiContextManagerService,
    AiResponseComposerService,
  ],
  exports: [
    AIService,
    AiActionProposalService,
    AiRoutingEngineService,
    AiContextManagerService,
    AiResponseComposerService,
  ],
})
export class AiModule {}

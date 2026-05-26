import { Body, Controller, Get, Injectable, Module, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PlatformGovernanceModule, PlatformGovernanceService } from '../platform-governance';

@Injectable()
export class ReviewQueueService {
  constructor(private readonly platformGovernance: PlatformGovernanceService) {}

  list() {
    return this.platformGovernance.listReviewItems();
  }

  decide(itemId: string, decision: Record<string, unknown>) {
    return this.platformGovernance.decideReviewItem(itemId, decision);
  }
}

@Controller('human-review')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class HumanReviewController {
  constructor(private readonly reviewQueue: ReviewQueueService) {}

  @Get('items')
  @Permissions(Permission.VIEW_REVIEW_QUEUE)
  async listItems() {
    const items = await this.reviewQueue.list();
    return {
      status: 'review_required',
      panels: {
        awaitingReview: items,
        reviewStatus: items,
        reviewer: items.map((item: any) => ({
          id: item.id,
          reviewer: item.assignedTo || 'unassigned',
        })),
        comments: [],
      },
    };
  }

  @Post('items/:itemId/decision')
  @Permissions(Permission.REVIEW_CLINICAL_AI)
  decide(@Param('itemId') itemId: string, @Body() body: Record<string, unknown>) {
    return this.reviewQueue.decide(itemId, body);
  }
}

@Module({
  imports: [PlatformGovernanceModule],
  controllers: [HumanReviewController],
  providers: [ReviewQueueService],
  exports: [ReviewQueueService],
})
export class HumanReviewModule {}

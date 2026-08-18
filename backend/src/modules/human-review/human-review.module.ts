import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PlatformGovernanceModule, PlatformGovernanceService } from '../platform-governance';

@Injectable()
export class ReviewQueueService {
  constructor(private readonly platformGovernance: PlatformGovernanceService) {}

  list(organizationId?: string) {
    return this.platformGovernance.listReviewItems(organizationId);
  }

  decide(itemId: string, decision: Record<string, unknown>, organizationId?: string) {
    return this.platformGovernance.decideReviewItem(itemId, decision, organizationId);
  }
}

@Controller('human-review')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class HumanReviewController {
  constructor(private readonly reviewQueue: ReviewQueueService) {}

  @Get('items')
  @Permissions(Permission.VIEW_REVIEW_QUEUE)
  async listItems(@Req() req: any) {
    // HEAL-338: was unscoped -- PHYSICIAN (an org-scoped role) could list
    // and (via the decision route below) approve/reject every organization's
    // clinical-AI safety review queue.
    const items = await this.reviewQueue.list(req.tenantContext?.organizationId);
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
  decide(@Param('itemId') itemId: string, @Body() body: Record<string, unknown>, @Req() req: any) {
    return this.reviewQueue.decide(itemId, body, req.tenantContext?.organizationId);
  }
}

@Module({
  imports: [PlatformGovernanceModule],
  controllers: [HumanReviewController],
  providers: [ReviewQueueService],
  exports: [ReviewQueueService],
})
export class HumanReviewModule {}

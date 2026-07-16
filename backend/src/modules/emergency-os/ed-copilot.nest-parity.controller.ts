/**
 * Nest parity for Express `POST /api/copilot/query` (Architect Mode P0).
 * Prefer `POST /api/emergency/copilot/query` for full entitlement + audit.
 * This controller provides the same public path Nest-side so Express can be retired.
 */
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { EDCopilotService } from './emergency-os.services';
import { buildAccountableRecommendationDto } from '../ai/dto/accountable-recommendation.dto';

@ApiTags('copilot')
@ApiBearerAuth()
@Controller('copilot')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class EdCopilotNestParityController {
  constructor(private readonly copilotService: EDCopilotService) {}

  @Post('query')
  @RequirePermission(Permission.USE_AI_CHAT)
  @ApiOperation({ summary: 'ED Copilot query (Nest parity for Express /api/copilot/query)' })
  async query(
    @Body() body: { query?: string; user_role?: string; context?: Record<string, unknown> },
  ) {
    if (!body?.query || !body?.user_role) {
      return {
        success: false,
        error: {
          code: 'VALIDATION',
          message: 'query and user_role are required',
          statusCode: 400,
        },
      };
    }

    const response = this.copilotService.processQuery({
      query: body.query,
      user_role: body.user_role,
      context: body.context,
    }) as unknown as Record<string, unknown>;

    const data =
      response.data && typeof response.data === 'object'
        ? (response.data as Record<string, unknown>)
        : response;
    const suggestion =
      String(response.suggestion || data.response || data.answer || data.message || '') ||
      'No suggestion generated.';
    const requiresReview = Boolean(
      response.requires_review ?? data.requires_review ?? true,
    );
    const confidenceRaw = response.confidence ?? data.confidence;
    const confidence = typeof confidenceRaw === 'number' ? confidenceRaw : 0.55;

    const accountableRecommendation = buildAccountableRecommendationDto({
      content: suggestion,
      confidence,
      model: { provider: 'caredroid', name: 'ed-copilot', version: 'nest-parity' },
      promptVersion: 'ed-copilot@nest-parity',
      safetyStatus: requiresReview ? 'degraded' : 'ok',
      safetyReasons: requiresReview ? ['human_review_required'] : [],
      humanReviewRequired: requiresReview,
    });

    return {
      ...response,
      accountableRecommendation,
      requiresClinicianReview: true,
    };
  }
}

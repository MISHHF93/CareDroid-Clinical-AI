/**
 * Nest parity for Express `POST /api/copilot/query` (Architect Mode P0).
 * Prefer `POST /api/emergency/copilot/query` for full entitlement + audit.
 * This controller provides the same public path Nest-side so Express can be retired.
 *
 * Converged 2026-08-08: previously delegated to EDCopilotService.processQuery(),
 * a keyword-if/else matcher with zero LLM invocation -- this DTO's own header
 * comment already documented that a frontend sweep found zero real callers of
 * this exact path, confirmed independently by this round's repository-wide
 * call-graph trace. Now delegates to the same ChatService.processMessage()
 * canonical pipeline EmergencyOsController.queryCopilot() and the live
 * copilot chat UI use, instead of a second, fake-AI runtime answering the
 * same public contract two different ways.
 */
import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { ChatService } from '../chat/chat.service';
import { buildAccountableRecommendationDto } from '../ai/dto/accountable-recommendation.dto';
import { EdCopilotQueryDto } from './dto/ed-copilot-nest-parity.dto';

@ApiTags('copilot')
@ApiBearerAuth()
@Controller('copilot')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class EdCopilotNestParityController {
  constructor(private readonly chatService: ChatService) {}

  @Post('query')
  @RequirePermission(Permission.USE_AI_CHAT)
  @ApiOperation({ summary: 'ED Copilot query (Nest parity for Express /api/copilot/query)' })
  async query(@Body() body: EdCopilotQueryDto, @Req() request?: any) {
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

    const context = (body.context || {}) as Record<string, unknown>;
    const patientId = typeof context.patientId === 'string' ? context.patientId : undefined;
    // HEAL-334: userId already correctly used the authenticated
    // request?.user?.id, but userRole used the client-supplied body.user_role
    // directly -- unlike the canonical sibling path (chat.controller.ts's
    // sendMessage), which always uses req.user.role. Traced downstream: this
    // value only feeds intentClassifier.classify() as an NLU hint today, so
    // no confirmed permission bypass, but a spoofed role could still steer
    // intent classification toward a tool path with independently weaker
    // assumptions -- matched the safe, authenticated-first pattern used
    // everywhere else in this module for consistency.
    const chatResponse = await this.chatService.processMessage(
      body.query,
      undefined,
      'ed-copilot',
      undefined,
      request?.user?.id,
      request?.user?.role || body.user_role,
      undefined,
      { edCopilot: { enabled: true, ...context, patientId } },
    );

    const requiresReview = chatResponse.metadata?.safety?.requiresHumanReview ?? true;
    const suggestion = chatResponse.text || 'No suggestion generated.';
    const confidence =
      typeof chatResponse.metadata?.provenance?.confidence === 'number'
        ? chatResponse.metadata.provenance.confidence
        : 0.55;

    const accountableRecommendation = buildAccountableRecommendationDto({
      content: suggestion,
      confidence,
      model: {
        provider: 'caredroid',
        name: chatResponse.metadata?.provenance?.modelOrEngine || 'ed-copilot',
        version: chatResponse.metadata?.provenance?.responseSource || 'nest-parity',
      },
      promptVersion: 'ed-copilot@nest-parity',
      safetyStatus: requiresReview ? 'degraded' : 'ok',
      safetyReasons: requiresReview ? ['human_review_required'] : [],
      humanReviewRequired: requiresReview,
    });

    return {
      query: body.query,
      response: suggestion,
      answer: suggestion,
      message: suggestion,
      data: chatResponse.metadata?.edCopilot || {},
      requires_review: requiresReview,
      provenance: chatResponse.metadata?.provenance,
      accountableRecommendation,
      requiresClinicianReview: true,
    };
  }
}

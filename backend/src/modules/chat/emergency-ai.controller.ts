import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { ChatService } from './chat.service';
import { appendRequiredDisclaimer } from '../../../../lib/ai/safetyPolicy';
import { EntitlementService } from '../platform-assets/entitlement.service';
import { assertEntitlementLaunchFromRequest } from '../platform-assets/entitlement-launch.util';

class UnifiedNodeConversationalDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  messages?: Array<{ role: string; content: string }>;

  @IsOptional()
  @IsString()
  requestType?: string;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsString()
  patientId?: string;

  @IsOptional()
  @IsString()
  encounterId?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  sourceModule?: string;

  @IsOptional()
  @IsObject()
  workspaceContext?: Record<string, any>;

  @IsOptional()
  @IsObject()
  memoryContext?: Record<string, any>;
}

const UNIFIED_NODE_CONVERSATIONAL_ROUTES: Record<
  string,
  { feature: string; requestType: string }
> = {
  COPILOT_CHAT: { feature: 'ed-copilot', requestType: 'COPILOT_CHAT' },
  INTAKE_SUGGEST: { feature: 'smart-intake-ai', requestType: 'INTAKE_SUGGESTION' },
  INTAKE_SUGGESTION: { feature: 'smart-intake-ai', requestType: 'INTAKE_SUGGESTION' },
  CLINICAL_SUMMARY: { feature: 'referral-ai', requestType: 'CLINICAL_SUMMARY' },
  SHIFT_SUMMARY: { feature: 'analytics-ai', requestType: 'SHIFT_SUMMARY' },
  HANDOFF_BRIEF: { feature: 'handoff-brief', requestType: 'HANDOFF_BRIEF' },
  SCORE_ASSIST: { feature: 'clinical-chat', requestType: 'SCORE_ASSIST' },
  PROTOCOL_SUGGEST: { feature: 'clinical-chat', requestType: 'PROTOCOL_SUGGEST' },
  TRIAGE_ASSIST: { feature: 'clinical-chat', requestType: 'TRIAGE_ASSIST' },
  STAFF_BALANCE: { feature: 'ed-copilot', requestType: 'COPILOT_CHAT' },
  CAPACITY_CRISIS: { feature: 'ed-copilot', requestType: 'COPILOT_CHAT' },
};

function resolveUnifiedNodeConversationalRoute(requestType: string) {
  const route = UNIFIED_NODE_CONVERSATIONAL_ROUTES[requestType] || UNIFIED_NODE_CONVERSATIONAL_ROUTES.COPILOT_CHAT;
  return { feature: route.feature, resolvedRequestType: route.requestType };
}

class EmergencyAIMessageDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  messages?: Array<{ role: string; content: string }>;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  patientId?: string;

  @IsOptional()
  @IsString()
  encounterId?: string;

  @IsString()
  purpose: string;

  @IsString()
  sourceModule: string;

  @IsOptional()
  @IsObject()
  workspaceContext?: Record<string, any>;

  @IsOptional()
  @IsObject()
  memoryContext?: Record<string, any>;
}

@Controller()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class EmergencyAIController {
  constructor(
    private readonly chatService: ChatService,
    private readonly entitlementService: EntitlementService,
  ) {}

  @Post('emergency/copilot/message')
  @RequirePermission(Permission.USE_AI_CHAT)
  sendCopilotMessage(@Body() dto: EmergencyAIMessageDto, @Req() req?: any) {
    return this.processEmergencyMessage(dto, req, 'ed-copilot', 'COPILOT_CHAT');
  }

  @Post('emergency/intake/ai/message')
  @RequirePermission(Permission.USE_AI_CHAT)
  sendIntakeAIMessage(@Body() dto: EmergencyAIMessageDto, @Req() req?: any) {
    return this.processEmergencyMessage(dto, req, 'smart-intake-ai', 'INTAKE_SUGGESTION');
  }

  @Post('emergency/referrals/ai/message')
  @RequirePermission(Permission.USE_AI_CHAT)
  sendReferralAIMessage(@Body() dto: EmergencyAIMessageDto, @Req() req?: any) {
    return this.processEmergencyMessage(dto, req, 'referral-ai', 'CLINICAL_SUMMARY');
  }

  @Post('emergency/analytics/ai/message')
  @RequirePermission(Permission.USE_AI_CHAT)
  sendAnalyticsAIMessage(@Body() dto: EmergencyAIMessageDto, @Req() req?: any) {
    return this.processEmergencyMessage(dto, req, 'analytics-ai', 'SHIFT_SUMMARY');
  }

  /** Single conversational entry for CareDroidUnifiedAINode — routes by requestType internally. */
  @Post('ai/node/conversational')
  @RequirePermission(Permission.USE_AI_CHAT)
  sendUnifiedNodeConversational(@Body() dto: UnifiedNodeConversationalDto, @Req() req?: any) {
    const requestType = dto.requestType || 'COPILOT_CHAT';
    const { feature, resolvedRequestType } = resolveUnifiedNodeConversationalRoute(requestType);
    const emergencyDto: EmergencyAIMessageDto = {
      message: dto.message,
      messages: dto.messages,
      patientId: dto.patientId,
      encounterId: dto.encounterId,
      purpose: dto.purpose || 'CareDroid unified AI node conversational decision support',
      sourceModule: dto.sourceModule || 'care-droid-unified-ai-node',
      workspaceContext: dto.workspaceContext,
      memoryContext: dto.memoryContext,
    };
    return this.processEmergencyMessage(emergencyDto, req, feature, resolvedRequestType);
  }

  private async processEmergencyMessage(
    dto: EmergencyAIMessageDto,
    req: any,
    feature: string,
    requestType: string,
  ) {
    await assertEntitlementLaunchFromRequest(this.entitlementService, req, 'agent-clinical');
    const userId = dto.userId || req?.user?.id || 'anonymous';
    const userRole = req?.user?.role || null;
    const clientAiRequest =
      dto.workspaceContext?.aiRequest && typeof dto.workspaceContext.aiRequest === 'object'
        ? dto.workspaceContext.aiRequest
        : {};
    const workspaceContext = {
      ...(dto.workspaceContext || {}),
      aiRequest: {
        ...clientAiRequest,
        userId,
        tenantId: dto.tenantId || req?.user?.tenantId || 'default-tenant',
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        purpose: dto.purpose,
        sourceModule: dto.sourceModule,
        requestType,
      },
    };

    const response = await this.chatService.processMessage(
      dto.message,
      undefined,
      feature,
      undefined,
      userId,
      userRole,
      undefined,
      workspaceContext,
      dto.memoryContext,
      dto.messages,
    );

    return {
      response: appendRequiredDisclaimer(response.text),
      suggestions: response.suggestions,
      visualizations: response.visualizations,
      toolResult: response.toolResult,
      citations: response.citations,
      confidence: response.confidence,
      ragContext: response.ragContext,
      sourcePanel: response.sourcePanel || response.ragContext?.sourcePanel,
      metadata: {
        ...response.metadata,
        featureUsed: feature,
        timestamp: Date.now(),
        intentClassification: response.intentClassification,
        emergencyAlert: response.emergencyAlert,
        aiRequest: workspaceContext.aiRequest,
      },
    };
  }
}

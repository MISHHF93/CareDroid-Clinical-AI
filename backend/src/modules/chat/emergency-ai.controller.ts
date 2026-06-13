import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { ChatService } from './chat.service';
import { appendRequiredDisclaimer } from '../../../../lib/ai/safetyPolicy';

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
  constructor(private readonly chatService: ChatService) {}

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

  private async processEmergencyMessage(
    dto: EmergencyAIMessageDto,
    req: any,
    feature: string,
    requestType: string,
  ) {
    const userId = dto.userId || req?.user?.id || 'anonymous';
    const userRole = req?.user?.role || null;
    const workspaceContext = {
      ...(dto.workspaceContext || {}),
      aiRequest: {
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

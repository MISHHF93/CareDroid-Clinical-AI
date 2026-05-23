import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { MedicalSource } from '../rag/dto/medical-source.dto';
import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

class ChatMessage3DDto {
  @IsString()
  patientId: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  context?: {
    vitals?: Record<string, any>;
    medications?: string[];
    activeProblems?: string[];
  };
}

class ChatMessageDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  tool?: string;

  @IsOptional()
  @IsString()
  feature?: string;

  @IsOptional()
  @IsNumber()
  conversationId?: number;
}

class IntentClassifyDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsNumber()
  conversationId?: number;
}

interface ChatResponse3DDto {
  id: string;
  response: string;
  suggestions?: string[];
  visualizations?: {
    type: 'drug-interaction' | 'calculator' | 'protocol' | 'lab-order';
    data: any;
  }[];
  timestamp: number;
}

interface ChatResponseDto {
  response: string;
  suggestions?: string[];
  visualizations?: any[];
  toolResult?: {
    toolName: string;
    toolId?: string;
    parameters: any;
    result?: any;
    displayFormat?: string;
  };
  citations?: MedicalSource[];
  confidence?: number;
  ragContext?: {
    chunksRetrieved: number;
    sourcesFound: number;
  };
  metadata: {
    toolUsed?: string;
    featureUsed?: string;
    conversationId?: number;
    timestamp: number;
    intentClassification?: any;
    emergencyAlert?: any;
  };
}

@Controller('chat')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('message-3d')
  @RequirePermission(Permission.READ_PHI)
  async sendMessage3D(@Body() dto: ChatMessage3DDto): Promise<ChatResponse3DDto> {
    const response = await this.chatService.processQuery(dto.patientId, dto.message, dto.context);

    return {
      id: `response-${Date.now()}`,
      response: response.text,
      suggestions: response.suggestions,
      visualizations: response.visualizations,
      timestamp: Date.now(),
    };
  }

  @Post('intent-classify')
  @RequirePermission(Permission.USE_AI_CHAT)
  async classifyIntent(@Body() dto: IntentClassifyDto, @Req() req?: any) {
    const userId = req?.user?.id || 'anonymous';
    const userRole = req?.user?.role || null;
    return this.chatService.classifyIntentBrief(dto.message, userId, userRole, dto.conversationId);
  }

  @Post('message')
  @RequirePermission(Permission.USE_AI_CHAT)
  async sendMessage(@Body() dto: ChatMessageDto, @Req() req?: any): Promise<ChatResponseDto> {
    // Extract userId and role from request if authenticated
    const userId = req?.user?.id || 'anonymous';
    const userRole = req?.user?.role || null;

    const response = await this.chatService.processMessage(
      dto.message,
      dto.tool,
      dto.feature,
      dto.conversationId,
      userId,
      userRole,
    );

    return {
      response: response.text,
      suggestions: response.suggestions,
      visualizations: response.visualizations,
      toolResult: response.toolResult,
      citations: response.citations,
      confidence: response.confidence,
      ragContext: response.ragContext,
      metadata: {
        toolUsed: dto.tool,
        featureUsed: dto.feature,
        conversationId: dto.conversationId,
        timestamp: Date.now(),
        intentClassification: response.intentClassification,
        emergencyAlert: response.emergencyAlert,
      },
    };
  }

  @Post('suggest-action')
  @RequirePermission(Permission.READ_PHI)
  async suggestAction(@Body() body: { patientId: string; context: any }): Promise<any> {
    return this.chatService.suggestNextAction(body.patientId, body.context);
  }

  @Post('analyze-vitals')
  @RequirePermission(Permission.USE_CALCULATORS)
  async analyzeVitals(@Body() body: { vitals: Record<string, any> }): Promise<any> {
    return this.chatService.analyzeVitals(body.vitals);
  }
}

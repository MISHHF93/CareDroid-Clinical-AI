import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { ClinicalIntelligenceService } from './clinical-intelligence.service';
import { AmbientScribeGenerateDto, AmbientScribeResponseDto } from './dto/ambient-scribe.dto';
import { GuidelineRagQueryDto, GuidelineRagResponseDto } from './dto/guideline-rag.dto';
import { DifferentialAiRequestDto, DifferentialAiResponseDto } from './dto/differential-ai.dto';
import { TimelineAiRequestDto, TimelineAiResponseDto } from './dto/timeline-ai.dto';
import {
  PatientSummaryAiRequestDto,
  PatientSummaryAiResponseDto,
} from './dto/patient-summary-ai.dto';
import { OrderSetAiRequestDto, OrderSetAiResponseDto } from './dto/order-set-ai.dto';
import {
  AiExplainabilityQueryDto,
  AiExplainabilityResponseDto,
  ClinicalAuditQueryDto,
  ClinicalAuditResponseDto,
} from './dto/explainability-audit.dto';

@ApiTags('clinical-intelligence')
@ApiBearerAuth()
@Controller('clinical-intelligence')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class ClinicalIntelligenceController {
  constructor(private readonly clinicalIntelligenceService: ClinicalIntelligenceService) {}

  @Post('ambient-scribe/generate')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.USE_AI_CHAT)
  @ApiOperation({
    summary: 'Generate an ambient clinical scribe documentation draft that requires human review',
  })
  async generateAmbientScribeDraft(
    @Body() dto: AmbientScribeGenerateDto,
    @Req() req: any,
  ): Promise<AmbientScribeResponseDto> {
    return this.clinicalIntelligenceService.generateAmbientScribeDraft(
      req.user?.id || 'anonymous',
      dto,
      {
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers?.['user-agent'],
      },
    );
  }

  @Post('guideline-rag/query')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.USE_AI_CHAT)
  @ApiOperation({
    summary: 'Retrieve guideline evidence and return citation-bound recommendations',
  })
  async queryGuidelineEvidence(
    @Body() dto: GuidelineRagQueryDto,
    @Req() req: any,
  ): Promise<GuidelineRagResponseDto> {
    return this.clinicalIntelligenceService.queryGuidelineEvidence(
      req.user?.id || 'anonymous',
      dto,
      {
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers?.['user-agent'],
      },
    );
  }

  @Post('differential-ai/generate')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.USE_AI_CHAT)
  @ApiOperation({
    summary: 'Generate ranked differential diagnosis decision support with explainability',
  })
  async generateDifferentialAi(
    @Body() dto: DifferentialAiRequestDto,
    @Req() req: any,
  ): Promise<DifferentialAiResponseDto> {
    return this.clinicalIntelligenceService.generateDifferentialAi(
      req.user?.id || 'anonymous',
      dto,
      {
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers?.['user-agent'],
      },
    );
  }

  @Post('timeline-ai/generate')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.USE_AI_CHAT)
  @ApiOperation({
    summary:
      'Generate a clinical timeline with encounter summaries, trends, and abnormal progression flags',
  })
  async generateTimelineAi(
    @Body() dto: TimelineAiRequestDto,
    @Req() req: any,
  ): Promise<TimelineAiResponseDto> {
    return this.clinicalIntelligenceService.generateTimelineAi(req.user?.id || 'anonymous', dto, {
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Post('patient-summary-ai/generate')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.USE_AI_CHAT)
  @ApiOperation({
    summary:
      'Generate a structured patient summary with problems, medications, labs, alerts, and risk factors',
  })
  async generatePatientSummaryAi(
    @Body() dto: PatientSummaryAiRequestDto,
    @Req() req: any,
  ): Promise<PatientSummaryAiResponseDto> {
    return this.clinicalIntelligenceService.generatePatientSummaryAi(
      req.user?.id || 'anonymous',
      dto,
      {
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers?.['user-agent'],
      },
    );
  }

  @Post('order-set-ai/generate')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.READ_PHI, Permission.USE_AI_CHAT)
  @ApiOperation({
    summary: 'Suggest evidence-linked order bundles and protocol pathways for clinician review',
  })
  async generateOrderSetAi(
    @Body() dto: OrderSetAiRequestDto,
    @Req() req: any,
  ): Promise<OrderSetAiResponseDto> {
    return this.clinicalIntelligenceService.generateOrderSetAi(req.user?.id || 'anonymous', dto, {
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Get('ai-explainability/trace')
  @Permissions(Permission.READ_PHI, Permission.USE_AI_CHAT)
  @ApiOperation({
    summary: 'Display AI confidence, sources, reasoning, tool chain, and execution logs',
  })
  async getAiExplainabilityTrace(
    @Query() query: AiExplainabilityQueryDto,
    @Req() req: any,
  ): Promise<AiExplainabilityResponseDto> {
    return this.clinicalIntelligenceService.getAiExplainabilityTrace(
      req.user?.id || 'anonymous',
      query,
      {
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers?.['user-agent'],
      },
    );
  }

  @Get('clinical-audit/execution-logs')
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  @ApiOperation({
    summary: 'Display clinical AI execution logs and audit trace summaries',
  })
  async getClinicalAuditExecutionLogs(
    @Query() query: ClinicalAuditQueryDto,
    @Req() req: any,
  ): Promise<ClinicalAuditResponseDto> {
    return this.clinicalIntelligenceService.getClinicalAuditExecutionLogs(
      req.user?.id || 'anonymous',
      query,
      {
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers?.['user-agent'],
      },
    );
  }
}

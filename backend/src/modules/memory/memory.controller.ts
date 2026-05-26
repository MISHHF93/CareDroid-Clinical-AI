import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClinicalMemoryService } from './clinical-memory.service';
import { CreateClinicalMemoryDto } from './dto/create-clinical-memory.dto';
import { CreateLongMemoryDto } from './dto/create-long-memory.dto';
import { CreateShortMemoryDto } from './dto/create-short-memory.dto';
import {
  ClinicalMemoryQueryDto,
  LongMemoryQueryDto,
  ShortMemoryQueryDto,
} from './dto/memory-query.dto';
import { LongMemoryService } from './long-memory.service';
import { ShortMemoryService } from './short-memory.service';

@ApiTags('memory')
@Controller('memory')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class MemoryController {
  constructor(
    private readonly shortMemoryService: ShortMemoryService,
    private readonly longMemoryService: LongMemoryService,
    private readonly clinicalMemoryService: ClinicalMemoryService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get current-user memory dashboard aggregate' })
  async dashboard(@Req() req: any) {
    const userId = req.user.id;
    const [shortTerm, longTerm, clinical, recentShort, recentLong, recentClinical, savedWorkflows] =
      await Promise.all([
        this.shortMemoryService.getActiveContext(userId),
        this.longMemoryService.getContext(userId),
        this.clinicalMemoryService.getClinicalContext(userId),
        this.shortMemoryService.listForUser(userId, { limit: '10' }),
        this.longMemoryService.listForUser(userId, { limit: '10' }),
        this.clinicalMemoryService.listForUser(userId, { limit: '10' }),
        this.longMemoryService.savedWorkflowsForUser(userId),
      ]);

    const recentActivity = [
      ...recentShort.map((entry) => this.toActivity('short-term', entry)),
      ...recentLong.map((entry) => this.toActivity('long-term', entry)),
      ...recentClinical.map((entry) => this.toActivity('clinical', entry)),
    ]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 15);

    return {
      recentActivity,
      savedWorkflows,
      aiContext: {
        shortTerm,
        longTerm,
        clinical,
      },
    };
  }

  @Post('short')
  @ApiOperation({ summary: 'Persist a short-term memory snapshot' })
  async rememberShort(@Req() req: any, @Body() dto: CreateShortMemoryDto) {
    return this.shortMemoryService.remember(req.user.id, dto);
  }

  @Get('short')
  @ApiOperation({ summary: 'List current-user short-term memory' })
  async short(@Req() req: any, @Query() query: ShortMemoryQueryDto) {
    return { entries: await this.shortMemoryService.listForUser(req.user.id, query) };
  }

  @Post('long')
  @ApiOperation({ summary: 'Persist a long-term memory item' })
  async rememberLong(@Req() req: any, @Body() dto: CreateLongMemoryDto) {
    return this.longMemoryService.remember(req.user.id, dto);
  }

  @Get('long')
  @ApiOperation({ summary: 'List current-user long-term memory' })
  async long(@Req() req: any, @Query() query: LongMemoryQueryDto) {
    return { entries: await this.longMemoryService.listForUser(req.user.id, query) };
  }

  @Post('clinical')
  @ApiOperation({ summary: 'Persist clinical memory findings, summaries, or scores' })
  async rememberClinical(@Req() req: any, @Body() dto: CreateClinicalMemoryDto) {
    return this.clinicalMemoryService.record(req.user.id, dto);
  }

  @Get('clinical')
  @ApiOperation({ summary: 'List current-user clinical memory' })
  async clinical(@Req() req: any, @Query() query: ClinicalMemoryQueryDto) {
    return { entries: await this.clinicalMemoryService.listForUser(req.user.id, query) };
  }

  private toActivity(source: string, entry: any) {
    return {
      id: `${source}:${entry.id}`,
      source,
      type: entry.type,
      title: entry.title,
      workspaceId: entry.workspaceId,
      occurredAt: entry.updatedAt || entry.createdAt,
      metadata: entry.content || {},
    };
  }
}

import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { PlatformTelemetryService } from './platform-telemetry.service';

class PlatformTelemetryEventDto {
  @IsString()
  @MaxLength(200)
  id: string;

  @IsString()
  @MaxLength(120)
  category: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @MaxLength(50)
  severity: string;

  @IsString()
  @MaxLength(60)
  timestamp: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  correlationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sessionId?: string;

  @IsOptional()
  @IsNumber()
  durationMs?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  patientId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  workflowType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  source?: string;

  @IsOptional()
  @IsNumber()
  statusCode?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

class TelemetryIngestDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  sessionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  correlationId?: string;

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => PlatformTelemetryEventDto)
  events: PlatformTelemetryEventDto[];
}

@Controller('observability')
export class PlatformTelemetryController {
  constructor(private readonly telemetry: PlatformTelemetryService) {}

  @Post('events')
  ingestEvents(@Body() payload: TelemetryIngestDto) {
    return this.telemetry.ingestEvents(payload);
  }

  @Get('diagnostics')
  @UseGuards(AuthGuard('jwt'), AuthorizationGuard)
  @Permissions(Permission.VIEW_OPERATIONS, Permission.VIEW_OBSERVABILITY)
  getDiagnostics() {
    return this.telemetry.getDiagnostics();
  }

  @Get('health')
  getHealth() {
    const diagnostics = this.telemetry.getDiagnostics();
    const performance = this.telemetry.getPerformanceSummary();
    const status =
      diagnostics.totals.errorCount > 10 || performance.regressionSignals.length > 2
        ? 'degraded'
        : diagnostics.totals.slowApiCount > 0
          ? 'warning'
          : 'ok';
    return {
      status,
      generatedAt: diagnostics.generatedAt,
      bufferedEvents: diagnostics.totals.bufferedEvents,
      errorCount: diagnostics.totals.errorCount,
      slowApiCount: diagnostics.totals.slowApiCount,
      crashReports: diagnostics.totals.crashReports,
      regressionSignals: performance.regressionSignals.length,
    };
  }

  @Get('performance')
  @UseGuards(AuthGuard('jwt'), AuthorizationGuard)
  @Permissions(Permission.VIEW_OPERATIONS, Permission.VIEW_OBSERVABILITY)
  getPerformance() {
    return this.telemetry.getPerformanceSummary();
  }

  @Get('traces/:correlationId')
  @UseGuards(AuthGuard('jwt'), AuthorizationGuard)
  @Permissions(Permission.VIEW_OPERATIONS, Permission.VIEW_OBSERVABILITY)
  getTrace(@Param('correlationId') correlationId: string) {
    return this.telemetry.getTraceTimeline(correlationId);
  }
}

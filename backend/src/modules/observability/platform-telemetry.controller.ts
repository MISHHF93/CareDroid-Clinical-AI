import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
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

  // HEAL-347.83: this handler carried NO guards at all (not even JWT auth) --
  // every other handler in this file requires AuthGuard('jwt') +
  // AuthorizationGuard. It has to stay reachable pre-login (main.tsx wires
  // observabilityService.recordError() to global window.onerror/unhandled-
  // rejection handlers at the true app root, before any auth gate mounts,
  // so a crash on the login page itself can still be reported), so a hard
  // auth requirement would silently drop real pre-login crash telemetry --
  // confirmed by tracing every observabilityService consumer before touching
  // this. What's actually unjustified is accepting a client-declared
  // `patientId` on an event nobody has verified the caller may legitimately
  // associate with -- a pre-login caller has no patient in view, so a real
  // one never needs this field, while an anonymous attacker could tag
  // arbitrary events with a real patientId they merely guessed. Stripped
  // patientId at this specific unauthenticated ingress path only --
  // ingestEvents() is also called internally by this same service with a
  // real patientId from several already-authenticated code paths (see
  // platform-telemetry.service.ts), which must keep working unchanged.
  // Rate-limited as defense in depth, matching the identical
  // must-work-without-hard-auth pattern already used by
  // app-navigator.controller.ts's query() handler.
  @Post('events')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  ingestEvents(@Body() payload: TelemetryIngestDto) {
    const sanitized: TelemetryIngestDto = {
      ...payload,
      events: (payload.events || []).map((event) => {
        const { patientId: _patientId, ...rest } = event;
        return rest as PlatformTelemetryEventDto;
      }),
    };
    return this.telemetry.ingestEvents(sanitized);
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

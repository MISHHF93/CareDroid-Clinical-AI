import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import {
  PlatformTelemetryEvent,
  PlatformTelemetryService,
} from './platform-telemetry.service';

type TelemetryIngestDto = {
  sessionId?: string;
  correlationId?: string;
  events: PlatformTelemetryEvent[];
};

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
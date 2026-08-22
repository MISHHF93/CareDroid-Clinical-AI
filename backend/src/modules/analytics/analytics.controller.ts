import { Body, Controller, Get, Logger, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import type { TenantContextRequest } from '../tenant-context/tenant-context.types';
import { AnalyticsPayloadDto, CrashReportDto } from './dto/analytics-ingestion.dto';
import { AnalyticsService } from './services/analytics.service';

@Controller()
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  // HEAL-347.89: this handler had no auth guard at all -- ThrottlerGuard
  // only rate-limits, it doesn't authenticate. Any anonymous caller could
  // post up to 60 events/min, each with a client-declared `userId` string
  // the backend trusted unverified, plus an unrestricted `properties`/
  // `parameters` object. Same shape as the already-fixed telemetry-ingest
  // gap (HEAL-347.83), but unlike that one this doesn't need to stay
  // reachable pre-login: every real frontend caller of
  // analyticsService.track() (DrugChecker, ToolPageLayout,
  // fullEmergencyCareJourneyService, intakeArtifactCapture,
  // roleIntelligenceTelemetry) lives entirely inside the authenticated
  // clinical app -- none run on AuthPage or any pre-login surface -- so
  // requiring JWT auth here doesn't drop any legitimate traffic the way it
  // would have on the telemetry endpoint.
  @Post('analytics/events')
  @UseGuards(AuthGuard('jwt'), ThrottlerGuard)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async submitAnalyticsEvents(
    @Body() payload: AnalyticsPayloadDto,
    @Req() req: TenantContextRequest,
  ): Promise<{ status: string; recorded: number }> {
    const events = payload.events || [];

    const normalizedEvents = events.map((event) => {
      const eventName = event.eventName || event.event || 'unknown_event';
      const parameters = event.parameters || event.properties || {};
      const timestamp = event.timestamp
        ? new Date(event.timestamp).toISOString()
        : new Date().toISOString();

      return {
        event: eventName,
        userId: event.userId,
        sessionId: event.sessionId || payload.sessionId || 'unknown',
        properties: {
          ...parameters,
          organizationId: req.tenantContext?.organizationId,
          workspaceId: req.tenantContext?.workspaceId,
        },
        timestamp,
      };
    });

    if (normalizedEvents.length > 0) {
      await this.analyticsService.trackEventsBulk(normalizedEvents);
    }

    return { status: 'recorded', recorded: normalizedEvents.length };
  }

  @Get('analytics/metrics')
  @UseGuards(AuthGuard('jwt'), AuthorizationGuard)
  @RequirePermission(Permission.VIEW_ANALYTICS)
  async getMetrics(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
  ) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    return this.analyticsService.getEventMetrics(
      start,
      end,
      userId,
      req.tenantContext?.organizationId,
    );
  }

  // Deliberately left without AuthGuard, unlike analytics/events above:
  // crashReportingService.ts is wired to main.tsx's global window.onerror/
  // unhandledrejection handlers at the true app root, before any auth gate
  // mounts, specifically so a crash on the login page itself can still be
  // reported (same reasoning as the observability/events fix, HEAL-347.83).
  // Lower risk than that endpoint was: this DTO carries no client-declared
  // identity field to misattribute (error name/message/stack/breadcrumbs/
  // componentStack only) -- rate-limited via ThrottlerGuard as the
  // appropriate defense here.
  @Post('crashes')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async submitCrashReport(@Body() report: CrashReportDto): Promise<{ id: string; status: string }> {
    const error = report.error;
    const logId = this.sanitizeLogValue(report.id);
    const logMessage = this.sanitizeLogValue(error.message);
    const logStack = error.stack.map((line) => this.sanitizeLogValue(line)).join('\n');
    this.logger.error(`Client crash ${logId}: ${logMessage}`, logStack);

    await this.analyticsService.trackEvent('client_crash', undefined, report.sessionId, {
      crashId: report.id,
      errorName: error.name,
      errorMessage: error.message,
      environment: report.environment,
      breadcrumbCount: report.breadcrumbs.length,
      componentStack: report.componentStack,
      correlationId: report.correlationId,
    });

    return {
      id: report.id,
      status: 'recorded',
    };
  }

  @Post('health')
  async healthCheck(): Promise<{ status: string; timestamp: number }> {
    return {
      status: 'healthy',
      timestamp: Date.now(),
    };
  }

  private sanitizeLogValue(value: string): string {
    return value.replace(/[\r\n\t]/g, ' ');
  }
}

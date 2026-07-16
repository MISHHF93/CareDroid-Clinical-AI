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

  @Post('analytics/events')
  @UseGuards(ThrottlerGuard)
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

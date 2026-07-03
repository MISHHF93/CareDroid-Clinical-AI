import { Body, Controller, Get, Logger, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AnalyticsService } from './services/analytics.service';

interface AnalyticsEventDto {
  eventName?: string;
  event?: string;
  parameters?: Record<string, any>;
  properties?: Record<string, any>;
  timestamp?: number | string;
  sessionId?: string;
  userId?: string;
}

interface AnalyticsPayloadDto {
  events: AnalyticsEventDto[];
  sessionId?: string;
}

interface CrashReportDto {
  id: string;
  error: {
    name: string;
    message: string;
    stack: string[];
  };
  breadcrumbs: string[];
  timestamp: string;
  sessionId: string;
  environment: 'development' | 'staging' | 'production';
}

@Controller()
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('analytics/events')
  async submitAnalyticsEvents(
    @Body() payload: AnalyticsPayloadDto,
    @Req() req: any,
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
          organizationId: parameters.organizationId || req.tenantContext?.organizationId,
          workspaceId: parameters.workspaceId || req.tenantContext?.workspaceId,
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
  async submitCrashReport(@Body() report: CrashReportDto): Promise<{ id: string; status: string }> {
    const error = report.error || { name: 'Error', message: 'Unknown error', stack: [] };
    this.logger.error(`Client crash ${report.id}: ${error.message}`, error.stack?.join('\n'));

    await this.analyticsService.trackEvent('client_crash', undefined, report.sessionId, {
      crashId: report.id,
      errorName: error.name,
      errorMessage: error.message,
      environment: report.environment,
      breadcrumbCount: report.breadcrumbs?.length || 0,
      componentStack: (report as { componentStack?: string }).componentStack,
      correlationId: (report as { correlationId?: string }).correlationId,
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
}

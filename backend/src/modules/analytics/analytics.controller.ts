import { Controller, Post, Body, Get, Query, UseGuards } from '@nestjs/common';
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
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('analytics/events')
  async submitAnalyticsEvents(
    @Body() payload: AnalyticsPayloadDto,
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
        properties: parameters,
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
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
  ) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    return this.analyticsService.getEventMetrics(start, end, userId);
  }

  @Post('crashes')
  async submitCrashReport(@Body() report: CrashReportDto): Promise<{ id: string; status: string }> {
    console.log(`🚨 Crash Report ${report.id}`);
    console.log(`   Error: ${report.error.name} - ${report.error.message}`);
    console.log(`   Session: ${report.sessionId}`);
    console.log(`   Environment: ${report.environment}`);

    if (report.breadcrumbs.length > 0) {
      console.log(`   Breadcrumbs:`);
      report.breadcrumbs.slice(-5).forEach((crumb) => {
        console.log(`     - ${crumb}`);
      });
    }

    return {
      id: report.id,
      status: 'submitted',
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

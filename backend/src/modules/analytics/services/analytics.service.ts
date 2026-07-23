import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AnalyticsEvent } from '../entities/analytics-event.entity';

export interface EventMetrics {
  totalEvents: number;
  uniqueUsers: number;
  topEvents: Array<{ event: string; count: number }>;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly analyticsEventRepository: Repository<AnalyticsEvent>,
  ) {}

  /**
   * Track a single event
   */
  async trackEvent(
    event: string,
    userId?: string,
    sessionId?: string,
    properties?: Record<string, any>,
  ): Promise<AnalyticsEvent> {
    const analyticsEvent = this.analyticsEventRepository.create({
      event,
      userId,
      organizationId: properties?.organizationId,
      workspaceId: properties?.workspaceId,
      sessionId,
      properties: properties || {},
      platform: properties?.platform,
      userAgent: properties?.userAgent,
      screenResolution: properties?.screenResolution,
      referrer: properties?.referrer,
    });

    return await this.analyticsEventRepository.save(analyticsEvent);
  }

  /**
   * Track multiple events in bulk
   */
  async trackEventsBulk(
    events: Array<{
      event: string;
      userId?: string;
      sessionId?: string;
      properties?: Record<string, any>;
      timestamp?: string;
    }>,
  ): Promise<void> {
    const analyticsEvents = events.map((e) =>
      this.analyticsEventRepository.create({
        event: e.event,
        userId: e.userId,
        organizationId: e.properties?.organizationId,
        workspaceId: e.properties?.workspaceId,
        sessionId: e.sessionId,
        properties: e.properties || {},
        platform: e.properties?.platform,
        userAgent: e.properties?.userAgent,
        screenResolution: e.properties?.screenResolution,
        referrer: e.properties?.referrer,
        createdAt: e.timestamp ? new Date(e.timestamp) : new Date(),
      }),
    );

    await this.analyticsEventRepository.save(analyticsEvents);
    this.logger.log(`Tracked ${events.length} events in bulk`);
  }

  /**
   * Get event metrics for a date range
   */
  async getEventMetrics(
    startDate: Date,
    endDate: Date,
    userId?: string,
    organizationId?: string,
  ): Promise<EventMetrics> {
    const whereClause: any = {
      createdAt: Between(startDate, endDate),
    };

    if (userId) {
      whereClause.userId = userId;
    }
    if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    const events = await this.analyticsEventRepository.find({
      where: whereClause,
    });

    const totalEvents = events.length;
    const uniqueUsers = new Set(events.map((e) => e.userId).filter(Boolean)).size;

    // Count events by type
    const eventCounts = events.reduce(
      (acc, event) => {
        acc[event.event] = (acc[event.event] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const topEvents = Object.entries(eventCounts)
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // DAU (Daily Active Users)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dailyActiveUsers = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event.userId)', 'count')
      .where('event.createdAt > :yesterday', { yesterday })
      .andWhere(organizationId ? 'event.organizationId = :organizationId' : '1=1', {
        organizationId,
      })
      .getRawOne()
      .then((result) => parseInt(result.count) || 0);

    // WAU (Weekly Active Users)
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const weeklyActiveUsers = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event.userId)', 'count')
      .where('event.createdAt > :lastWeek', { lastWeek })
      .andWhere(organizationId ? 'event.organizationId = :organizationId' : '1=1', {
        organizationId,
      })
      .getRawOne()
      .then((result) => parseInt(result.count) || 0);

    // MAU (Monthly Active Users)
    const lastMonth = new Date();
    lastMonth.setDate(lastMonth.getDate() - 30);
    const monthlyActiveUsers = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event.userId)', 'count')
      .where('event.createdAt > :lastMonth', { lastMonth })
      .andWhere(organizationId ? 'event.organizationId = :organizationId' : '1=1', {
        organizationId,
      })
      .getRawOne()
      .then((result) => parseInt(result.count) || 0);

    return {
      totalEvents,
      uniqueUsers,
      topEvents,
      dailyActiveUsers,
      weeklyActiveUsers,
      monthlyActiveUsers,
    };
  }

  /**
   * Get events by user
   */
  async getEventsByUser(userId: string, limit: number = 100): Promise<AnalyticsEvent[]> {
    return await this.analyticsEventRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get events by session
   */
  async getEventsBySession(sessionId: string): Promise<AnalyticsEvent[]> {
    return await this.analyticsEventRepository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get funnel analytics
   */
  async getFunnelAnalytics(
    events: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ event: string; count: number; dropoff: number }>> {
    // Each step's count is independent of the others — only the dropoff calculation
    // below depends on step order — so there's no reason to await them one at a time.
    const counts = await Promise.all(
      events.map((event) =>
        this.analyticsEventRepository.count({
          where: {
            event,
            createdAt: Between(startDate, endDate),
          },
        }),
      ),
    );

    return events.map((event, i) => ({
      event,
      count: counts[i],
      dropoff: i > 0 ? counts[i - 1] - counts[i] : 0,
    }));
  }

  /**
   * Get retention metrics
   */
  async getRetentionMetrics(
    startDate: Date,
  ): Promise<Array<{ day: number; retentionRate: number }>> {
    const retentionData: Array<{ day: number; retentionRate: number }> = [];

    // Get users who signed up on start date
    const cohortUsers = await this.analyticsEventRepository
      .createQueryBuilder('event')
      .select('DISTINCT event.userId', 'userId')
      .where('event.event = :event', { event: 'user_identified' })
      .andWhere('DATE(event.createdAt) = DATE(:startDate)', { startDate })
      .getRawMany();

    const cohortUserIds = cohortUsers.map((u) => u.userId);
    const cohortSize = cohortUserIds.length;

    if (cohortSize === 0) {
      return [];
    }

    // Check retention for next 30 days
    for (let day = 1; day <= 30; day++) {
      const checkDate = new Date(startDate);
      checkDate.setDate(checkDate.getDate() + day);

      const activeUsers = await this.analyticsEventRepository
        .createQueryBuilder('event')
        .select('COUNT(DISTINCT event.userId)', 'count')
        .where('event.userId IN (:...userIds)', { userIds: cohortUserIds })
        .andWhere('DATE(event.createdAt) = DATE(:checkDate)', { checkDate })
        .getRawOne();

      const retentionRate = (parseInt(activeUsers.count) / cohortSize) * 100;

      retentionData.push({
        day,
        retentionRate: parseFloat(retentionRate.toFixed(2)),
      });
    }

    return retentionData;
  }

  /**
   * Cleanup old analytics events
   */
  async cleanupOldEvents(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.analyticsEventRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.log(`Cleaned up ${result.affected} old analytics events`);
    return result.affected || 0;
  }
}

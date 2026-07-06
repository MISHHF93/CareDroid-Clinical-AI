import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CollaborationHubService } from './collaboration-hub.service';

/**
 * Sweeps channels with a retentionPolicyDays set and soft-deletes messages past
 * that window. Uses @nestjs/schedule (already registered globally via
 * ScheduleModule.forRoot() in app.module.ts) rather than the raw node-cron
 * pattern in backend/src/scheduler/reassessment.scheduler.ts, since this job
 * doesn't depend on the optional Mongoose Emergency-OS runtime.
 */
@Injectable()
export class CollaborationRetentionScheduler {
  private readonly logger = new Logger(CollaborationRetentionScheduler.name);

  constructor(private readonly collaborationHubService: CollaborationHubService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async sweep(): Promise<void> {
    try {
      const purged = await this.collaborationHubService.purgeExpiredMessages();
      if (purged > 0) {
        this.logger.log(`Collaboration retention sweep purged ${purged} message(s).`);
      }
    } catch (error) {
      this.logger.error(
        `Collaboration retention sweep failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

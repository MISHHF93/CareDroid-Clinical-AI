import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecordUserActivityDto } from './dto/record-user-activity.dto';
import { UserActivity, UserActivityCategory } from './entities/user-activity.entity';

const CATEGORY_BUCKETS: Record<UserActivityCategory, keyof UserActivitySummary> = {
  [UserActivityCategory.CALCULATOR]: 'recentCalculators',
  [UserActivityCategory.TOOL]: 'recentTools',
  [UserActivityCategory.AI_CHAT]: 'recentAiChats',
  [UserActivityCategory.FLEET]: 'recentFleetActivity',
  [UserActivityCategory.IOT]: 'recentIotActivity',
  [UserActivityCategory.WORKSPACE]: 'recentTools',
};

export type UserActivitySummary = {
  recentCalculators: any[];
  recentTools: any[];
  recentAiChats: any[];
  recentFleetActivity: any[];
  recentIotActivity: any[];
};

@Injectable()
export class UserActivityService {
  constructor(
    @InjectRepository(UserActivity)
    private readonly activityRepository: Repository<UserActivity>,
  ) {}

  async record(userId: string, dto: RecordUserActivityDto) {
    const activity = this.activityRepository.create({
      userId,
      workspaceId: dto.workspaceId || null,
      category: dto.category,
      label: this.safeLabel(dto.label),
      route: dto.route || null,
      metadata: this.safeMetadata(dto.metadata),
      occurredAt: new Date(),
    });
    return this.serialize(await this.activityRepository.save(activity));
  }

  async listForUser(userId: string, limit = 30) {
    const activities = await this.activityRepository.find({
      where: { userId },
      order: { occurredAt: 'DESC' },
      take: limit,
    });
    return activities.map((activity) => this.serialize(activity));
  }

  async listForWorkspace(workspaceId: string, limit = 30) {
    const activities = await this.activityRepository.find({
      where: { workspaceId },
      order: { occurredAt: 'DESC' },
      take: limit,
    });
    return activities.map((activity) => this.serialize(activity));
  }

  async summaryForUser(userId: string): Promise<UserActivitySummary> {
    const activities = await this.listForUser(userId, 50);
    const summary: UserActivitySummary = {
      recentCalculators: [],
      recentTools: [],
      recentAiChats: [],
      recentFleetActivity: [],
      recentIotActivity: [],
    };

    for (const activity of activities) {
      const bucket = CATEGORY_BUCKETS[activity.category] || 'recentTools';
      if (summary[bucket].length < 5) {
        summary[bucket].push(activity);
      }
    }

    return summary;
  }

  private safeLabel(label: string) {
    return String(label || 'Activity')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 255);
  }

  private safeMetadata(metadata?: Record<string, any>) {
    if (!metadata) return {};
    const allowedKeys = ['toolId', 'calculatorId', 'workspaceType', 'source', 'status'];
    return Object.fromEntries(
      Object.entries(metadata).filter(([key]) => allowedKeys.includes(key)),
    );
  }

  private serialize(activity: UserActivity) {
    return {
      id: activity.id,
      category: activity.category,
      label: activity.label,
      route: activity.route,
      workspaceId: activity.workspaceId,
      occurredAt: activity.occurredAt,
      metadata: activity.metadata || {},
    };
  }
}

import { Injectable } from '@nestjs/common';
import { UserActivityService } from '../user-activity/user-activity.service';

@Injectable()
export class ActivityService {
  constructor(private readonly userActivityService: UserActivityService) {}

  async getSummary(userId: string) {
    return this.userActivityService.summaryForUser(userId);
  }

  async getActivity(userId: string) {
    return {
      summary: await this.userActivityService.summaryForUser(userId),
      activities: await this.userActivityService.listForUser(userId, 30),
    };
  }
}

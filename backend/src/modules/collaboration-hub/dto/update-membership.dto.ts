import { IsEnum, IsOptional } from 'class-validator';
import { CollaborationNotificationPreference } from '../entities/collaboration-channel-membership.entity';

export class UpdateMembershipDto {
  @IsOptional()
  @IsEnum(CollaborationNotificationPreference)
  notificationPreference?: CollaborationNotificationPreference;
}

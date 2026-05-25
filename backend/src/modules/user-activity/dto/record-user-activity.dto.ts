import { IsEnum, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { UserActivityCategory } from '../entities/user-activity.entity';

export class RecordUserActivityDto {
  @IsEnum(UserActivityCategory)
  category: UserActivityCategory;

  @IsString()
  @MaxLength(255)
  label: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  route?: string;

  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import {
  CollaborationChannelType,
  CollaborationDepartmentKey,
} from '../entities/collaboration-channel.entity';

export class CreateChannelDto {
  @IsEnum(CollaborationChannelType)
  type: CollaborationChannelType;

  @IsString()
  @MaxLength(160)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CollaborationDepartmentKey)
  departmentKey?: CollaborationDepartmentKey;

  @IsOptional()
  @IsString()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  workspaceId?: string;
}

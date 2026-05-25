import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { WorkspaceType } from '../entities/workspace.entity';

export class CreateWorkspaceDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsEnum(WorkspaceType)
  type: WorkspaceType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;

  @IsOptional()
  @IsArray()
  enabledToolIds?: string[];

  @IsOptional()
  @IsArray()
  enabledModules?: string[];

  @IsOptional()
  @IsBoolean()
  emergencyModeEnabled?: boolean;
}

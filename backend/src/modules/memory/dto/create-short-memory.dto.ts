import { IsEnum, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ShortMemoryType } from '../entities/short-memory-entry.entity';

export class CreateShortMemoryDto {
  @IsEnum(ShortMemoryType)
  type: ShortMemoryType;

  @IsString()
  @MaxLength(180)
  title: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, any>;

  @IsOptional()
  @IsUUID()
  workspaceId?: string;
}

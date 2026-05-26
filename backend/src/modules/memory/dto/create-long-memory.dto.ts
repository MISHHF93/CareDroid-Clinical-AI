import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { LongMemoryType } from '../entities/long-memory-entry.entity';

export class CreateLongMemoryDto {
  @IsEnum(LongMemoryType)
  type: LongMemoryType;

  @IsString()
  @MaxLength(180)
  title: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, any>;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsUUID()
  workspaceId?: string;
}

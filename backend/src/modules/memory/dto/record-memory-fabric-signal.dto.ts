import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { MemoryFabricScope, MemoryFabricSignalType } from '../memory-fabric.constants';

export class RecordMemoryFabricSignalDto {
  @IsEnum(MemoryFabricScope)
  scope: MemoryFabricScope;

  @IsEnum(MemoryFabricSignalType)
  signalType: MemoryFabricSignalType;

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

  @IsOptional()
  @IsString()
  @MaxLength(120)
  assetId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  workflowId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  artifactId?: string;
}

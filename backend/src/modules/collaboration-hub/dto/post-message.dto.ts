import { IsArray, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { CollaborationMessageSourceType } from '../entities/collaboration-message.entity';

export class PostMessageDto {
  @IsString()
  @MaxLength(8000)
  body: string;

  @IsOptional()
  @IsUUID()
  threadRootId?: string;

  @IsOptional()
  @IsArray()
  mentionedUserIds?: string[];

  @IsOptional()
  @IsEnum(CollaborationMessageSourceType)
  sourceType?: CollaborationMessageSourceType;

  @IsOptional()
  @IsString()
  sourceId?: string;
}

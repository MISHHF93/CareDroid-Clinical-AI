import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CollaborationExternalProvider } from '../entities/collaboration-external-link.entity';

export class LinkExternalProviderDto {
  @IsEnum(CollaborationExternalProvider)
  provider: CollaborationExternalProvider;

  @IsOptional()
  @IsString()
  externalChannelId?: string;

  @IsOptional()
  config?: Record<string, unknown>;
}

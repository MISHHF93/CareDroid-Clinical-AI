import { IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SavedPromptDto {
  @IsString()
  @MaxLength(160)
  title: string;

  @IsString()
  prompt: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsUUID()
  workspaceId?: string;
}

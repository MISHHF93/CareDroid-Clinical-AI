import { IsArray } from 'class-validator';

export class UpdateWorkspaceToolsDto {
  @IsArray()
  enabledToolIds: string[];
}

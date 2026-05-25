import { IsUUID } from 'class-validator';

export class SetActiveWorkspaceDto {
  @IsUUID()
  workspaceId: string;
}

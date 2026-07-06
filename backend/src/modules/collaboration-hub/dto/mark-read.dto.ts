import { IsUUID } from 'class-validator';

export class MarkReadDto {
  @IsUUID()
  lastReadMessageId: string;
}

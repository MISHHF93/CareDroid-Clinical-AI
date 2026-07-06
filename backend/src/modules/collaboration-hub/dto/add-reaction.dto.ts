import { IsString, MaxLength } from 'class-validator';

export class AddReactionDto {
  @IsString()
  @MaxLength(16)
  emoji: string;
}

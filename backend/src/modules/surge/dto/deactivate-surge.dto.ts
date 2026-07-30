import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeactivateSurgeDto {
  @IsString()
  @MaxLength(200)
  surgeEventId: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  debriefNotes?: string;
}

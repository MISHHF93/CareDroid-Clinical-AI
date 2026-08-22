import { IsDefined, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const AI_FEEDBACK_RATINGS = [
  'HELPFUL',
  'NOT_HELPFUL',
  'INCORRECT',
  'OUTDATED',
  'UNSAFE_CONCERN',
  'OTHER',
] as const;

export class SubmitAiFeedbackDto {
  @IsDefined()
  @IsString()
  @MaxLength(120)
  runId: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  capabilityId?: string;

  @IsDefined()
  @IsIn(AI_FEEDBACK_RATINGS)
  rating: (typeof AI_FEEDBACK_RATINGS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

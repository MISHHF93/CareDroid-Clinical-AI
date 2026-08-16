import { IsArray, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class MaturityAnswerDto {
  @IsString()
  questionId: string;

  // HEAL-241: MaturityAssessmentService.submitAssessment() hardcodes
  // maxPerQuestion = 4 and computes each dimension score as a fraction of
  // that fixed scale, only clamping the resulting percentage on the high
  // end (Math.min(100, score)). An out-of-range answer.value (e.g. a
  // negative number, or something far above the 1-4 scale the
  // questionnaire actually uses) was accepted by the DTO and fed straight
  // into that arithmetic, producing a negative or wildly inflated maturity
  // score and, downstream, a wrong set of recommended products.
  @IsNumber()
  @Min(1)
  @Max(4)
  value: number;
}

export class SubmitMaturityAssessmentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaturityAnswerDto)
  answers: MaturityAnswerDto[];

  @IsOptional()
  @IsString()
  organizationId?: string;
}

import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class MaturityAnswerDto {
  @IsString()
  questionId: string;

  @IsNumber()
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
